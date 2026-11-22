import { NextResponse } from "next/server";
import { PRICE } from "@/lib/payments/config";
import { getPayment, originOf, settle } from "@/lib/payments/server";

// Paystack redirects here with ?reference=<our payment id>; we verify with Paystack before unlocking.
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("reference") ?? "";
  const back = (q: string) => NextResponse.redirect(`${originOf(req)}/billing?${q}`);
  try {
    if (!/^[0-9a-f-]{36}$/i.test(ref)) return back("error=link");
    const p = await getPayment({ id: ref });
    if (!p) return back("error=notfound");
    if (p.status !== "pending") return back(p.status === "paid" ? "paid=paystack" : `error=${p.status}`);

    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: "no-store",
    });
    const v = await r.json().catch(() => ({}));
    const d = v.data ?? {};
    const expected = Math.round((p.currency === "USD" ? PRICE.USD : PRICE.KES) * 100);
    if (d.status === "success" && Number(d.amount) >= expected && String(d.currency).toUpperCase() === p.currency) {
      await settle(ref, "paid", { channel: d.channel ?? null });
      return back("paid=paystack");
    }
    if (["failed", "abandoned", "reversed"].includes(d.status)) { await settle(ref, "failed", { reason: d.gateway_response ?? d.status }); return back("error=failed"); }
    return back(`pending=${ref}`);
  } catch (e) {
    console.error("paystack return", e);
    return back("error=provider");
  }
}
