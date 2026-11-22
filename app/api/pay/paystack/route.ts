import { PRICE, enabledProviders } from "@/lib/payments/config";
import { errorResponse, HttpError, originOf, readJson, setRef, startPayment } from "@/lib/payments/server";

// Paystack (Kenya): cards + M-Pesa. Test vs live is decided by the key (sk_test_… / sk_live_…).
const CURRENCY = () => (process.env.PAYSTACK_CURRENCY || "KES").toUpperCase();
const amountFor = (cur: string) => (cur === "USD" ? PRICE.USD : PRICE.KES);

export async function POST(req: Request) {
  try {
    if (!enabledProviders().paystack) throw new HttpError(400, "Paystack isn't configured yet.");
    const cur = CURRENCY();
    const { id, user } = await startPayment("paystack", amountFor(cur), cur);
    const r = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email, amount: Math.round(amountFor(cur) * 100), currency: cur, reference: id,
        callback_url: `${originOf(req)}/api/pay/paystack/return`,
        metadata: { app: "hustle-hub", payment_id: id },
      }),
    });
    const data = await readJson<{ status: boolean; message: string; data: { authorization_url: string; reference: string } }>(r);
    if (!data.status) throw new HttpError(400, data.message);
    await setRef(id, data.data.reference);
    return Response.json({ paymentId: id, url: data.data.authorization_url });
  } catch (e) { return errorResponse(e); }
}
