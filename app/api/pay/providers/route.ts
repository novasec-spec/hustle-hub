import { PRICE, enabledProviders, isLive, type Provider } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

export function GET() {
  const enabled = enabledProviders();
  const mode = Object.fromEntries((Object.keys(enabled) as Provider[]).map((p) => [p, isLive(p) ? "live" : "test"]));
  if (process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")) mode.paystack = "live";
  return Response.json({ enabled, mode, price: PRICE, paystackCurrency: (process.env.PAYSTACK_CURRENCY || "KES").toUpperCase() });
}
