import { timingSafeEqual } from "node:crypto";
import { generateText } from "ai";
import { aiModels } from "@/lib/ai-models";
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
  try { const r = await fn(); return typeof r === "string" ? { ok: true, via: r } : { ok: true }; }
  catch (e) { return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) }; }
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("not found", { status: 404 });
  const env = process.env;
  const gemini = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  const results = await Promise.all([
    gemini ? check(async () => {
      const errors: string[] = [];
      for (const { name, model } of aiModels().filter((m) => m.name.startsWith("google/"))) {
        try {
          const { text } = await generateText({ model, prompt: "Reply with OK", maxOutputTokens: 20, maxRetries: 0 });
          if (text) return name;
        } catch (e) { errors.push(`${name}: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`); }
      }
      throw new Error(errors.join(" | "));
    }) : { ok: false, error: "not set" },
    env.MPESA_CONSUMER_KEY ? check(async () => { await mpesaToken(); }) : { ok: false, error: "not set" },
    env.PAYPAL_CLIENT_ID ? check(async () => { await paypalToken(); }) : { ok: false, error: "not set" },
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
