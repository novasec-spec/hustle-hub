import { PRICE, enabledProviders } from "@/lib/payments/config";
import { paypalBase, paypalToken } from "@/lib/payments/providers";
import { callbackToken, errorResponse, HttpError, originOf, readJson, setRef, settle, startPayment } from "@/lib/payments/server";

/** POST → creates a PayPal order and returns the approval URL */
export async function POST(req: Request) {
  try {
    if (!enabledProviders().paypal) throw new HttpError(400, "PayPal isn't configured yet.");
    const { id } = await startPayment("paypal", PRICE.USD, "USD");
    const origin = originOf(req);
    const r = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await paypalToken()}`, "Content-Type": "application/json", "PayPal-Request-Id": id },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: id, custom_id: id, description: "Hustle Hub Premium (30 days)", amount: { currency_code: "USD", value: PRICE.USD.toFixed(2) } }],
        payment_source: { paypal: { experience_context: {
          brand_name: "Hustle Hub", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING",
          return_url: `${origin}/api/pay/paypal/return?pid=${id}&t=${callbackToken(id)}`,
          cancel_url: `${origin}/api/pay/paypal/cancel?pid=${id}&t=${callbackToken(id)}`,
        } } },
      }),
    });
    const order = await readJson<{ id: string; links: { rel: string; href: string }[] }>(r).catch(async (e) => { await settle(id, "failed", { error: String(e).slice(0, 200) }); throw e; });
    const link = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!link) throw new Error("PayPal did not return an approval link");
    await setRef(id, order.id);
    return Response.json({ paymentId: id, url: link.href });
  } catch (e) { return errorResponse(e); }
}
