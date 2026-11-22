import "server-only";
import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const GATEWAY_MODEL = process.env.AI_MODEL || "anthropic/claude-haiku-5.5";
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// first model from GEMINI_MODEL, then lighter/older backups for when a model is overloaded
const GEMINI_MODELS = [process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
  .filter((m, i, a) => a.indexOf(m) === i);

/** Ordered list of models to try: Gemini (if key set) then Vercel AI Gateway. */
export function aiModels(): { name: string; model: LanguageModel }[] {
  const list: { name: string; model: LanguageModel }[] = [];
  if (GEMINI_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY });
    for (const m of GEMINI_MODELS) list.push({ name: `google/${m}`, model: google(m) });
  }
  if (process.env.AI_GATEWAY_FALLBACK !== "off") list.push({ name: GATEWAY_MODEL, model: GATEWAY_MODEL });
  return list;
}
