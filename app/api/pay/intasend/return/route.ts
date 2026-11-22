import { NextResponse } from "next/server";
import { PRICE } from "@/lib/payments/config";
import { checkCallbackToken, getPayment, originOf, settle } from "@/lib/payments/server";
import { intasendBase } from "@/lib/payments/providers";

// IntaSend sends the customer back here with ?tracking_id=<invoice_id>&checkout_id=...
// We never trust the redirect alone: the status is confirmed with IntaSend's API.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pid = url.searchParams.get("pid") ?? "";
  const back = (q: string) => NextResponse.redirect(`${originOf(req)}/billing?${q}`);
  try {
    if (!checkCallbackToken(pid, url.searchParams.get("t"))) return back("error=link");
    const p = await getPayment({ id: pid });
    if (!p) return back("error=notfound");
    if (p.status !== "pending") return back(p.status === "paid" ? "paid=intasend" : `error=${p.status}`);

    const invoiceId = url.searchParams.get("tracking_id") || url.searchParams.get("invoice_id");
    if (!invoiceId) return back(`pending=${pid}`);
    const key = process.env.INTASEND_PUBLISHABLE_KEY!;
    const body: Record<string, string> = { public_key: key, invoice_id: invoiceId };
    const sig = typeof p.meta.signature === "string" ? p.meta.signature : "";
    if (p.provider_ref && sig) { body.checkout_id = p.provider_ref; body.signature = sig; }
    const r = await fetch(`${intasendBase()}/api/v1/payment/status/`, {
      method: "POST", headers: { "Content-Type": "application/json", INTASEND_PUBLIC_API_KEY: key }, body: JSON.stringify(body),
    });
    const s = await r.json().catch(() => ({}));
    const inv = s.invoice ?? {};
    const state = String(inv.state ?? "").toUpperCase();
    const amountOk = Number(inv.value ?? inv.net_amount ?? 0) >= PRICE.KES * 0.95; // allow for gateway fees on net_amount
    const refOk = !inv.api_ref || inv.api_ref === pid;
    if (state === "COMPLETE" && amountOk && refOk) { await settle(pid, "paid", { invoice: invoiceId }); return back("paid=intasend"); }
    if (state === "FAILED") { await settle(pid, "failed", { invoice: invoiceId }); return back("error=failed"); }
    return back(`pending=${pid}`);
  } catch (e) {
    console.error("intasend return", e);
    return back("error=provider");
  }
}
