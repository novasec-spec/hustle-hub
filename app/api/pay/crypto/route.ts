import { PRICE, enabledProviders } from "@/lib/payments/config";
import { nowBase } from "@/lib/payments/providers";
import { errorResponse, HttpError, originOf, readJson, setRef, startPayment } from "@/lib/payments/server";

// NOWPayments hosted invoice: customer picks BTC, ETH, USDT, etc. Confirmation arrives by signed IPN.
export async function POST(req: Request) {
  try {
    if (!enabledProviders().crypto) throw new HttpError(400, "Crypto payments aren't configured yet.");
    const { id } = await startPayment("crypto", PRICE.USD, "USD");
    const origin = originOf(req);
    const r = await fetch(`${nowBase()}/invoice`, {
      method: "POST",
      headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: PRICE.USD, price_currency: "usd", order_id: id,
        order_description: "Hustle Hub Premium (30 days)",
        ipn_callback_url: `${origin}/api/pay/crypto/ipn`,
        success_url: `${origin}/billing?pending=${id}`,
        cancel_url: `${origin}/billing?canceled=crypto`,
      }),
    });
    const inv = await readJson<{ id: string | number; invoice_url: string }>(r);
    await setRef(id, String(inv.id));
    return Response.json({ paymentId: id, url: inv.invoice_url });
  } catch (e) { return errorResponse(e); }
}
