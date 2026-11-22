import { NextResponse } from "next/server";
import { PRICE } from "@/lib/payments/config";
import { checkCallbackToken, getPayment, originOf, settle } from "@/lib/payments/server";
import { paypalBase, paypalToken } from "@/lib/payments/providers";

// After approval PayPal redirects here with ?token=<orderId>; we capture the order server-side.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pid = url.searchParams.get("pid") ?? "";
  const back = (q: string) => NextResponse.redirect(`${originOf(req)}/billing?${q}`);
  try {
    if (!checkCallbackToken(pid, url.searchParams.get("t"))) return back("error=link");
    const p = await getPayment({ id: pid });
    if (!p || !p.provider_ref) return back("error=notfound");
    if (p.status !== "pending") return back(p.status === "paid" ? "paid=paypal" : `error=${p.status}`);
    const orderId = url.searchParams.get("token");
    if (orderId && orderId !== p.provider_ref) return back("error=link");

    const r = await fetch(`${paypalBase()}/v2/checkout/orders/${p.provider_ref}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await paypalToken()}`, "Content-Type": "application/json", "PayPal-Request-Id": `cap-${pid}` },
    });
    const c = await r.json().catch(() => ({}));
    const cap = c.purchase_units?.[0]?.payments?.captures?.[0];
    const paid = c.status === "COMPLETED" && cap?.status === "COMPLETED" && Number(cap.amount?.value) >= PRICE.USD && cap.amount?.currency_code === "USD";
    // ORDER_ALREADY_CAPTURED: a refresh after success; trust the stored order only via a fresh GET
    if (!paid && c.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
      const g = await fetch(`${paypalBase()}/v2/checkout/orders/${p.provider_ref}`, { headers: { Authorization: `Bearer ${await paypalToken()}` } }).then((x) => x.json());
      if (g.status === "COMPLETED") { await settle(pid, "paid", { order: p.provider_ref }); return back("paid=paypal"); }
    }
    if (paid) { await settle(pid, "paid", { capture: cap.id }); return back("paid=paypal"); }
    await settle(pid, "failed", { paypal: c.name ?? c.status ?? "capture_failed" });
    return back("error=failed");
  } catch (e) {
    console.error("paypal return", e);
    return back("error=provider");
  }
}
