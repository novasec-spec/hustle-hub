import { NextResponse } from "next/server";
import { checkCallbackToken, originOf, settle } from "@/lib/payments/server";

// PayPal sends the customer here when they cancel on the PayPal page.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pid = q.get("pid") ?? "";
  if (checkCallbackToken(pid, q.get("t"))) {
    try { await settle(pid, "canceled", { reason: "canceled_on_paypal" }); } catch (e) { console.error("paypal cancel", e); }
  }
  return NextResponse.redirect(`${originOf(req)}/billing?canceled=paypal`);
}
