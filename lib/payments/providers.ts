import "server-only";
import { isLive } from "./config";
import { readJson } from "./server";

/* ---------- M-Pesa (Safaricom Daraja) ---------- */
export const mpesaBase = () => (isLive("mpesa") ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");
export const mpesaShortcode = () => process.env.MPESA_SHORTCODE || "174379";
// public Daraja sandbox passkey for shortcode 174379
const mpesaPasskey = () => process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

export async function mpesaToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const r = await fetch(`${mpesaBase()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" });
  return (await readJson<{ access_token: string }>(r)).access_token;
}

export function stkPassword() {
  // Daraja expects the timestamp in Kenyan time (EAT)
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const timestamp = `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
  return { timestamp, password: Buffer.from(`${mpesaShortcode()}${mpesaPasskey()}${timestamp}`).toString("base64") };
}

export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`;
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return `254${d}`;
  return null;
}

/* ---------- IntaSend ---------- */
export const intasendBase = () => (isLive("intasend") ? "https://payment.intasend.com" : "https://sandbox.intasend.com");

/* ---------- PayPal ---------- */
export const paypalBase = () => (isLive("paypal") ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
export async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", cache: "no-store",
  });
  return (await readJson<{ access_token: string }>(r)).access_token;
}

/* ---------- NOWPayments (crypto) ---------- */
export const nowBase = () => (isLive("crypto") ? "https://api.nowpayments.io/v1" : "https://api-sandbox.nowpayments.io/v1");
