import { PRICE } from "@/lib/payments/config";
import { checkCallbackToken, getPayment, settle } from "@/lib/payments/server";

type StkCallback = {
  Body?: { stkCallback?: {
    CheckoutRequestID: string; ResultCode: number; ResultDesc: string;
    CallbackMetadata?: { Item: { Name: string; Value?: string | number }[] };
  } };
};

// Safaricom posts the STK result here. Always answer 200 so Daraja stops retrying.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const pid = url.searchParams.get("pid") ?? "";
  const ok = Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
  try {
    if (!checkCallbackToken(pid, url.searchParams.get("t"))) return ok;
    const body = (await req.json()) as StkCallback;
    const cb = body.Body?.stkCallback;
    const p = await getPayment({ id: pid });
    if (!cb || !p || p.provider_ref !== cb.CheckoutRequestID) return ok;

    const items = Object.fromEntries((cb.CallbackMetadata?.Item ?? []).map((i) => [i.Name, i.Value]));
    const paidEnough = Number(items.Amount ?? 0) >= Math.ceil(PRICE.KES);
    const status = cb.ResultCode === 0 && paidEnough ? "paid" : "failed";
    await settle(pid, status, { result: cb.ResultDesc, receipt: items.MpesaReceiptNumber ?? null });
  } catch (e) {
    console.error("mpesa callback", e);
  }
  return ok;
}
