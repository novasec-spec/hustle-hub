// Shared payment settings. Every provider is optional and switches on when its env vars are set.
export type Provider = "mpesa" | "intasend" | "paystack" | "paypal" | "crypto";

export const PRICE = {
  KES: Number(process.env.PREMIUM_PRICE_KES || 650),
  USD: Number(process.env.PREMIUM_PRICE_USD || 5),
};
export const FREE_AI_PER_DAY = 5;

const has = (...keys: string[]) => keys.every((k) => !!process.env[k]);

export function enabledProviders(): Record<Provider, boolean> {
  return {
    mpesa: has("MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET"),
    intasend: has("INTASEND_PUBLISHABLE_KEY"),
    paystack: has("PAYSTACK_SECRET_KEY"),
    paypal: has("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"),
    crypto: has("NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"),
  };
}

/** live mode is opt-in per provider; everything defaults to sandbox/test */
export const isLive = (p: Provider) => process.env[`${p.toUpperCase()}_ENV`] === "live";
