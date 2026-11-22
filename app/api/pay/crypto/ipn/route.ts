import { createHmac, timingSafeEqual } from "node:crypto";
import { PRICE } from "@/lib/payments/config";
import { getPayment, settle } from "@/lib/payments/server";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const sortDeep = (v: Json): Json =>
  Array.isArray(v) ? v.map(sortDeep)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep((v as Record<string, Json>)[k])]))
  : v;

function validSig(body: Record<string, Json>, sig: string | null) {
  if (!sig) return false;
  const secret = process.env.NOWPAYMENTS_IPN_SECRET!.trim();
  // NOWPayments signs the key-sorted JSON; accept both their documented JS and Python sort styles.
  const candidates = [JSON.stringify(sortDeep(body)), JSON.stringify(body, Object.keys(body).sort())];
  return candidates.some((s) => {
    const h = Buffer.from(createHmac("sha512", secret).update(s).digest("hex"));
    const g = Buffer.from(sig.toLowerCase());
    return h.length === g.length && timingSafeEqual(h, g);
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, Json>;
    if (!validSig(body, req.headers.get("x-nowpayments-sig"))) return new Response("bad signature", { status: 401 });
    const pid = String(body.order_id ?? "");
    const p = await getPayment({ id: pid });
    if (!p || p.status !== "pending") return new Response("ok");

    const status = String(body.payment_status ?? "");
    const priceOk = Number(body.price_amount ?? 0) >= PRICE.USD && String(body.price_currency ?? "").toLowerCase() === "usd";
    if ((status === "finished" || status === "confirmed") && priceOk) {
      await settle(pid, "paid", { crypto: body.pay_currency ?? null, np_payment_id: body.payment_id ?? null });
    } else if (["failed", "expired", "refunded"].includes(status)) {
      await settle(pid, "failed", { crypto_status: status });
    }
    return new Response("ok");
  } catch (e) {
    console.error("nowpayments ipn", e);
    return new Response("error", { status: 500 });
  }
}
