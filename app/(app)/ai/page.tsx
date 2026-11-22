"use client";
import { useState } from "react";
import {
  IoSparklesOutline, IoCopyOutline, IoCheckmark, IoMegaphoneOutline, IoBriefcaseOutline, IoMailOutline,
  IoChatbubbleEllipsesOutline, IoSaveOutline, IoRefresh,
} from "react-icons/io5";
import { askAI, type AiKind } from "@/lib/ai";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Field, PageHeader } from "@/components/ui";
import { cx } from "@/lib/utils";

type F = { name: string; label: string; placeholder?: string; long?: boolean; options?: string[] };
const MODES: Record<AiKind, { label: string; icon: typeof IoMegaphoneOutline; fields: F[] }> = {
  caption: { label: "Caption", icon: IoMegaphoneOutline, fields: [
    { name: "platform", label: "Platform", options: ["Instagram", "TikTok", "YouTube"] },
    { name: "topic", label: "What's the post about?", placeholder: "Behind the scenes of editing a client's wedding film", long: true },
    { name: "tone", label: "Tone", options: ["Engaging and authentic", "Funny", "Inspirational", "Educational", "Bold and punchy"] },
  ] },
  proposal: { label: "Proposal", icon: IoBriefcaseOutline, fields: [
    { name: "client", label: "Client", placeholder: "Acme Coffee Co." },
    { name: "project", label: "Project", placeholder: "Brand refresh and social media kit", long: true },
    { name: "scope", label: "Deliverables", placeholder: "Logo refresh, 12 post templates, brand guide", long: true },
    { name: "budget", label: "Budget", placeholder: "$1,500" },
    { name: "timeline", label: "Timeline", placeholder: "3 weeks" },
  ] },
  email: { label: "Email", icon: IoMailOutline, fields: [
    { name: "purpose", label: "Purpose", options: ["Payment reminder", "Follow up on a proposal", "Project update", "Ask for a testimonial", "Pitch a collaboration", "Politely decline work"] },
    { name: "to", label: "Recipient", placeholder: "Sarah" },
    { name: "details", label: "Key details", placeholder: "Invoice INV-0003 for $800 was due last Friday", long: true },
    { name: "tone", label: "Tone", options: ["Friendly and professional", "Warm", "Firm but polite", "Brief"] },
  ] },
  free: { label: "Anything", icon: IoChatbubbleEllipsesOutline, fields: [
    { name: "prompt", label: "What do you need?", placeholder: "Give me 10 YouTube video ideas for a freelance photographer channel", long: true },
  ] },
};

export default function AIPage() {
  const [mode, setMode] = useState<AiKind>("caption");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const cfg = MODES[mode];
  const get = (f: F) => vals[`${mode}.${f.name}`] ?? (f.options ? f.options[0] : "");

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr(null); setSavedNote(false);
    try {
      const input = Object.fromEntries(cfg.fields.map((f) => [f.name, get(f)]));
      setOut(await askAI(mode, input));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function saveToNotes() {
    const title = `${cfg.label}: ${(get(cfg.fields[mode === "free" ? 0 : 1]) || "AI draft").slice(0, 60)}`;
    const { error } = await supabaseBrowser().from("hh_notes").insert({ title, body: out });
    if (error) setErr(error.message); else setSavedNote(true);
  }

  return (
    <div>
      <PageHeader title="AI helper" subtitle="Draft captions, proposals and client emails" />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(MODES) as AiKind[]).map((k) => {
          const { label, icon: Icon } = MODES[k];
          return (
            <button key={k} onClick={() => { setMode(k); setOut(""); setErr(null); }}
              className={cx("flex items-center gap-2 rounded-2xl border p-3 text-sm font-medium transition", mode === k ? "border-brand bg-brand/10 text-brand" : "border-line bg-panel text-mute hover:text-ink")}>
              <Icon size={18} /> {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={run} className="card space-y-3">
          {cfg.fields.map((f) => (
            <Field key={mode + f.name} label={f.label}>
              {f.options ? (
                <select className="input" value={get(f)} onChange={(e) => setVals({ ...vals, [`${mode}.${f.name}`]: e.target.value })}>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.long ? (
                <textarea className="input min-h-24" placeholder={f.placeholder} value={get(f)} onChange={(e) => setVals({ ...vals, [`${mode}.${f.name}`]: e.target.value })} />
              ) : (
                <input className="input" placeholder={f.placeholder} value={get(f)} onChange={(e) => setVals({ ...vals, [`${mode}.${f.name}`]: e.target.value })} />
              )}
            </Field>
          ))}
          <button className="btn-primary w-full py-2.5" disabled={busy}><IoSparklesOutline /> {busy ? "Writing…" : "Generate"}</button>
          {err && <p className="text-sm text-bad">{err}</p>}
        </form>

        <div className="card flex min-h-[320px] flex-col">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Result</p>
            {out && (
              <div className="flex gap-1">
                <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => run()} disabled={busy}><IoRefresh /> Retry</button>
                <button className="btn-ghost px-2.5 py-1 text-xs" onClick={saveToNotes} disabled={savedNote}>{savedNote ? <IoCheckmark /> : <IoSaveOutline />} {savedNote ? "Saved" : "Save to notes"}</button>
                <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <IoCheckmark /> : <IoCopyOutline />} {copied ? "Copied" : "Copy"}</button>
              </div>
            )}
          </div>
          {busy ? (
            <div className="space-y-2">{[90, 75, 85, 60].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />)}</div>
          ) : out ? (
            <textarea className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none" value={out} onChange={(e) => setOut(e.target.value)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-mute">
              <IoSparklesOutline size={28} className="mb-2 text-brand" /> Fill in the details and hit Generate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
