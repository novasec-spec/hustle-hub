import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import type { Provider } from "./config";

const SECRET = () => {
  const s = process.env.HH_PAYMENT_SECRET;
  if (!s) throw new Error("HH_PAYMENT_SECRET is not set");
  return s;
};

// anon client without a user session; privileged RPCs are gated by the server secret
const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export type PaymentRow = {
  id: string; user_id: string; provider: Provider; amount: number; currency: string;
  status: "pending" | "paid" | "failed" | "canceled"; provider_ref: string | null; meta: Record<string, unknown>;
};

export async function currentUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}

export async function startPayment(provider: Provider, amount: number, currency: string) {
  const { sb, user } = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in again.");
  const { data, error } = await sb.rpc("hh_start_payment", { p_provider: provider, p_amount: amount, p_currency: currency });
  if (error) throw new Error(error.message);
  return { id: data as string, user };
}

export async function setRef(id: string, ref: string, meta: Record<string, unknown> = {}) {
  const { error } = await anon().rpc("hh_set_payment_ref", { p_secret: SECRET(), p_id: id, p_ref: ref, p_meta: meta });
  if (error) throw new Error(error.message);
}

export async function getPayment(opts: { id?: string; ref?: string }): Promise<PaymentRow | null> {
  const { data, error } = await anon().rpc("hh_get_payment", { p_secret: SECRET(), p_id: opts.id ?? null, p_ref: opts.ref ?? null });
  if (error) throw new Error(error.message);
  return ((data as PaymentRow[]) ?? [])[0] ?? null;
}

export async function settle(id: string, status: "paid" | "failed" | "canceled", meta: Record<string, unknown> = {}) {
  const { data, error } = await anon().rpc("hh_settle_payment", { p_secret: SECRET(), p_id: id, p_status: status, p_meta: meta });
  if (error) throw new Error(error.message);
  return data as string;
}

/** short token bound to a payment id, used in provider callback URLs */
export const callbackToken = (id: string) => createHmac("sha256", SECRET()).update(`cb:${id}`).digest("hex").slice(0, 32);
export function checkCallbackToken(id: string, token: string | null) {
  if (!token) return false;
  const a = Buffer.from(callbackToken(id)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorResponse(e: unknown) {
  const status = e instanceof HttpError ? e.status : 500;
  const message = e instanceof Error ? e.message : "Payment error";
  if (status === 500) console.error("payment error", e);
  return Response.json({ error: status === 500 ? `Payment provider error: ${message}` : message }, { status });
}

export const originOf = (req: Request) => process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!res.ok) throw new Error(`${res.status} ${typeof body === "string" ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}
