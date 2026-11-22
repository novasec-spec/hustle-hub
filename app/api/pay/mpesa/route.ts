import { PRICE, enabledProviders } from "@/lib/payments/config";
import { mpesaBase, mpesaShortcode, mpesaToken, normalizePhone, stkPassword } from "@/lib/payments/providers";
import { callbackToken, errorResponse, getPayment, HttpError, originOf, readJson, setRef, settle, startPayment, currentUser } from "@/lib/payments/server";

// Safaricom Daraja M-Pesa Express (STK Push). Sandbox defaults: shortcode 174379 + public sandbox passkey.

/** POST { phone } → sends the STK prompt to the phone */
export async function POST(req: Request) {
  try {
    if (!enabledProviders().mpesa) throw new HttpError(400, "M-Pesa isn't configured yet.");
    const { phone } = await req.json().catch(() => ({}));
    const msisdn = normalizePhone(String(phone ?? ""));
    if (!msisdn) throw new HttpError(400, "Enter a Safaricom number like 0712 345 678.");

    const { id } = await startPayment("mpesa", PRICE.KES, "KES");
    const { timestamp, password } = stkPassword();
    const r = await fetch(`${mpesaBase()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await mpesaToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: mpesaShortcode(), Password: password, Timestamp: timestamp,
        TransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
        Amount: Math.ceil(PRICE.KES), PartyA: msisdn, PartyB: mpesaShortcode(), PhoneNumber: msisdn,
        CallBackURL: `${originOf(req)}/api/pay/mpesa/callback?pid=${id}&t=${callbackToken(id)}`,
        AccountReference: "HustleHub", TransactionDesc: "Hustle Hub Premium",
      }),
    });
    const data = await readJson<{ CheckoutRequestID: string; ResponseCode: string; CustomerMessage: string }>(r);
    if (data.ResponseCode !== "0") { await settle(id, "failed", { stk: data }); throw new HttpError(400, data.CustomerMessage || "M-Pesa rejected the request."); }
    await setRef(id, data.CheckoutRequestID, { phone: msisdn.replace(/(\d{6})\d{3}/, "$1***") });
    return Response.json({ paymentId: id, message: "Check your phone and enter your M-Pesa PIN." });
  } catch (e) { return errorResponse(e); }
}

/** GET ?pid= → asks Daraja for the result (fallback if the callback hasn't arrived) */
export async function GET(req: Request) {
  try {
    const pid = new URL(req.url).searchParams.get("pid");
    const { sb, user } = await currentUser();
    if (!user || !pid) throw new HttpError(401, "Please sign in again.");
    const { data: own } = await sb.from("hh_payments").select("id,status").eq("id", pid).single();
    if (!own) throw new HttpError(404, "Payment not found.");
    if (own.status !== "pending") return Response.json({ status: own.status });

    const p = await getPayment({ id: pid });
    if (!p?.provider_ref) return Response.json({ status: "pending" });
    const { timestamp, password } = stkPassword();
    const r = await fetch(`${mpesaBase()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await mpesaToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: mpesaShortcode(), Password: password, Timestamp: timestamp, CheckoutRequestID: p.provider_ref }),
    });
    const q = await r.json().catch(() => ({}));
    // still processing → Daraja returns an error code like 500.001.1001
    if (q.ResultCode === undefined) return Response.json({ status: "pending" });
    const status = String(q.ResultCode) === "0" ? "paid" : "failed";
    return Response.json({ status: await settle(pid, status, { query: q }) });
  } catch (e) { return errorResponse(e); }
}
