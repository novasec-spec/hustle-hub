import { NextResponse } from "next/server";
import { generateText } from "ai";
import { supabaseServer } from "@/lib/supabase/server";
import { FREE_AI_PER_DAY } from "@/lib/payments/config";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "anthropic/claude-haiku-5.5";

const SYSTEM = `You are the writing assistant inside Hustle Hub, a workspace for freelancers and content creators.
Write ready-to-use copy. No preamble like "Here's your caption", no markdown headings, no emoji unless the user asks for them.
Keep it natural, specific and human. Use the details given; invent nothing about real people or prices that were not provided (use [placeholders] instead).`;

const clip = (s: unknown, n = 2000) => String(s ?? "").slice(0, n);

function buildPrompt(kind: string, i: Record<string, string>) {
  switch (kind) {
    case "caption":
      return `Write a ${clip(i.platform, 40) || "social media"} caption for a post about: ${clip(i.topic)}.
Tone: ${clip(i.tone, 60) || "engaging and authentic"}.
${i.platform === "YouTube" ? "Give a punchy title line, then a 2-3 sentence description, then 5 relevant tags." : "Open with a strong hook line, keep it short, end with a call to action and 5-8 relevant hashtags."}`;
    case "proposal":
      return `Write a concise freelance project proposal.
Client: ${clip(i.client, 120) || "[Client]"}
Project: ${clip(i.project)}
Scope / deliverables: ${clip(i.scope) || "[to be defined]"}
Budget: ${clip(i.budget, 60) || "[budget]"}  Timeline: ${clip(i.timeline, 60) || "[timeline]"}
Structure: short intro showing understanding of the goal, deliverables as a list, timeline, investment, next step. Under 300 words.`;
    case "email":
      return `Write a professional email.
Purpose: ${clip(i.purpose, 120)}
To: ${clip(i.to, 120) || "[Name]"}
Key details: ${clip(i.details)}
Tone: ${clip(i.tone, 60) || "friendly and professional"}.
Start with "Subject: ..." on the first line, then the email body. Keep it under 180 words.`;
    default:
      return clip(i.prompt, 4000);
  }
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: { kind?: string; input?: Record<string, string> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const prompt = buildPrompt(body.kind ?? "free", body.input ?? {});
  if (!prompt.trim()) return NextResponse.json({ error: "Tell the AI what to write." }, { status: 400 });

  // Free plan: FREE_AI_PER_DAY generations per day. Premium: unlimited.
  const { data: sub } = await sb.from("hh_subscriptions").select("current_period_end").maybeSingle();
  const premium = !!sub && new Date(sub.current_period_end) > new Date();
  if (!premium) {
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from("hh_ai_usage").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString());
    if ((count ?? 0) >= FREE_AI_PER_DAY) {
      return NextResponse.json({ error: `You've used your ${FREE_AI_PER_DAY} free AI generations today. Upgrade to Premium for unlimited.`, upgrade: true }, { status: 402 });
    }
  }

  try {
    const { text } = await generateText({ model: MODEL, instructions: SYSTEM, prompt, maxOutputTokens: 900 });
    await sb.from("hh_ai_usage").insert({});
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("AI error", e);
    return NextResponse.json({ error: "The AI helper is unavailable right now. Try again in a moment." }, { status: 502 });
  }
}
