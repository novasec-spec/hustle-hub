import { timingSafeEqual } from "node:crypto";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mpesaToken, paypalToken } from "@/lib/payments/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Admin-only check that configured keys are accepted by each provider. Never returns key values.
// Call with header: x-hh-secret: <HH_PAYMENT_SECRET>
function authorized(req: Request) {
  const s = process.env.HH_PAYMENT_SECRET ?? "", h = req.headers.get("x-hh-secret") ?? "";
  return s.length > 0 && s.length === h.length && timingSafeEqual(Buffer.from(s), Buffer.from(h));
}

async function check(fn: () => Promise<unknown>) {
  try { await fn(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) }; }
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("not found", { status: 404 });
  const env = process.env;
  const gemini = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  const results = await Promise.all([
    gemini ? check(async () => {
      const { text } = await generateText({ model: createGoogleGenerativeAI({ apiKey: gemini })(env.GEMINI_MODEL || "gemini-flash-latest"), prompt: "Reply with OK", maxOutputTokens: 20, maxRetries: 0 });
      if (!text) throw new Error("empty response");
    }) : { ok: false, error: "not set" },
    env.MPESA_CONSUMER_KEY ? check(mpesaToken) : { ok: false, error: "not set" },
    env.PAYPAL_CLIENT_ID ? check(paypalToken) : { ok: false, error: "not set" },
    env.PAYSTACK_SECRET_KEY ? check(async () => {
      const r = await fetch("https://api.paystack.co/transaction?perPage=1", { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    }) : { ok: false, error: "not set" },
  ]);
  const [geminiR, mpesa, paypal, paystack] = results;
  return Response.json({
    gemini: geminiR, mpesa, paypal, paystack,
    intasend: env.INTASEND_PUBLISHABLE_KEY ? { ok: env.INTASEND_PUBLISHABLE_KEY.startsWith("ISPubKey_"), note: "format check only" } : { ok: false, error: "not set" },
    crypto: env.NOWPAYMENTS_API_KEY ? { ok: true, note: "set" } : { ok: false, error: "not set" },
  });
}
