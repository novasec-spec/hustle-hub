import { PRICE, enabledProviders } from "@/lib/payments/config";
import { intasendBase } from "@/lib/payments/providers";
import { callbackToken, errorResponse, HttpError, originOf, readJson, setRef, startPayment } from "@/lib/payments/server";

/** POST → creates an IntaSend checkout (M-Pesa, cards) and returns its URL */
export async function POST(req: Request) {
  try {
    if (!enabledProviders().intasend) throw new HttpError(400, "IntaSend isn't configured yet.");
    const { id, user } = await startPayment("intasend", PRICE.KES, "KES");
    const key = process.env.INTASEND_PUBLISHABLE_KEY!;
    const origin = originOf(req);
    const r = await fetch(`${intasendBase()}/api/v1/checkout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", INTASEND_PUBLIC_API_KEY: key },
      body: JSON.stringify({
        public_key: key, amount: PRICE.KES, currency: "KES", email: user.email,
        api_ref: id, host: origin, comment: "Hustle Hub Premium",
        redirect_url: `${origin}/api/pay/intasend/return?pid=${id}&t=${callbackToken(id)}`,
      }),
    });
    const data = await readJson<{ id: string; url: string; signature: string }>(r);
    await setRef(id, data.id, { signature: data.signature });
    return Response.json({ paymentId: id, url: data.url });
  } catch (e) { return errorResponse(e); }
}
