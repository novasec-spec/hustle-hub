"use client";
import { useMemo, useState } from "react";
import {
  IoAdd, IoChevronBack, IoChevronForward, IoSparklesOutline, IoTrashOutline, IoCalendarOutline, IoListOutline, IoCopyOutline,
} from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Content } from "@/lib/types";
import { Badge, ErrorBar, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { PLATFORMS, PlatformIcon } from "@/components/platform";
import { askAI } from "@/lib/ai";
import { cx, fmtDate, today } from "@/lib/utils";

const STAGES: Content["status"][] = ["idea", "scripting", "filming", "editing", "scheduled", "posted"];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
type Form = { title: string; platform: Content["platform"]; status: Content["status"]; scheduled_for: string; caption: string };

export default function ContentPage() {
  const items = useTable<Content>("hh_content", { order: "scheduled_for", ascending: true });
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [view, setView] = useState<"calendar" | "pipeline">("calendar");
  const [platform, setPlatform] = useState<"all" | Content["platform"]>("all");
  const [editing, setEditing] = useState<Content | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ title: "", platform: "youtube", status: "idea", scheduled_for: today(), caption: "" });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);

  const rows = items.rows.filter((c) => platform === "all" || c.platform === platform);
  const days = useMemo(() => {
    const start = new Date(month); start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  function openNew(date?: string) {
    setEditing(null); setAiErr(null);
    setForm({ title: "", platform: platform === "all" ? "youtube" : platform, status: date ? "scheduled" : "idea", scheduled_for: date ?? today(), caption: "" });
    setOpen(true);
  }
  function openEdit(c: Content) {
    setEditing(c); setAiErr(null);
    setForm({ title: c.title, platform: c.platform, status: c.status, scheduled_for: c.scheduled_for ?? "", caption: c.caption ?? "" });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = { ...form, scheduled_for: form.scheduled_for || null, caption: form.caption || null };
    if (editing) await items.update(editing.id, v); else await items.insert(v);
    setOpen(false);
  }
  async function genCaption() {
    if (!form.title) { setAiErr("Add a title first so the AI knows what the post is about."); return; }
    setAiBusy(true); setAiErr(null);
    try { setForm((f) => ({ ...f, caption: "" })); const text = await askAI("caption", { topic: form.title, platform: PLATFORMS[form.platform].label }); setForm((f) => ({ ...f, caption: text })); }
    catch (e) { setAiErr((e as Error).message); }
    setAiBusy(false);
  }

  return (
    <div>
      <PageHeader title="Content calendar" subtitle="Plan posts for YouTube, TikTok and Instagram"
        action={<button className="btn-primary" onClick={() => openNew()}><IoAdd size={18} /> New post</button>} />
      <ErrorBar error={items.error} onClose={() => items.setError(null)} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-panel p-1">
          <button onClick={() => setView("calendar")} className={cx("btn px-3 py-1.5", view === "calendar" ? "bg-panel2 text-ink" : "text-mute")}><IoCalendarOutline /> Calendar</button>
          <button onClick={() => setView("pipeline")} className={cx("btn px-3 py-1.5", view === "pipeline" ? "bg-panel2 text-ink" : "text-mute")}><IoListOutline /> Pipeline</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPlatform("all")} className={platform === "all" ? "btn-primary" : "btn-ghost"}>All</button>
          {(Object.keys(PLATFORMS) as Content["platform"][]).map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={platform === p ? "btn-primary" : "btn-ghost"}><PlatformIcon p={p} /> {PLATFORMS[p].label}</button>
          ))}
        </div>
      </div>

      {items.loading ? <Spinner /> : view === "calendar" ? (
        <div className="card p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button className="btn-ghost px-2.5" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><IoChevronBack /></button>
            <p className="font-semibold">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <button className="btn-ghost px-2.5" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><IoChevronForward /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-mute">{WEEK.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = iso(d);
              const posts = rows.filter((c) => c.scheduled_for === key);
              const inMonth = d.getMonth() === month.getMonth();
              return (
                <div key={key} onClick={() => openNew(key)}
                  className={cx("min-h-[72px] cursor-pointer rounded-lg border p-1 text-left transition hover:border-brand/50 sm:min-h-[96px]",
                    inMonth ? "border-line bg-panel2/50" : "border-transparent opacity-40", key === today() && "border-brand")}>
                  <p className={cx("px-1 text-xs", key === today() ? "font-bold text-brand" : "text-mute")}>{d.getDate()}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {posts.slice(0, 3).map((c) => (
                      <button key={c.id} onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        className={cx("flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-line", c.status === "posted" && "opacity-60")}>
                        <PlatformIcon p={c.platform} size={10} /> <span className="hidden truncate sm:inline">{c.title}</span>
                      </button>
                    ))}
                    {posts.length > 3 && <p className="px-1 text-[10px] text-mute">+{posts.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((s) => {
            const list = rows.filter((c) => c.status === s);
            return (
              <div key={s} className="w-64 shrink-0 rounded-2xl border border-line bg-panel/60 p-3">
                <div className="mb-3 flex items-center justify-between"><Badge value={s} /><span className="text-xs text-mute">{list.length}</span></div>
                <div className="space-y-2">
                  {list.map((c) => (
                    <button key={c.id} onClick={() => openEdit(c)} className="w-full rounded-xl border border-line bg-panel2 p-3 text-left hover:border-brand/50">
                      <div className="flex items-center gap-2"><PlatformIcon p={c.platform} /><p className="truncate text-sm font-medium">{c.title}</p></div>
                      <p className="mt-1 text-xs text-mute">{fmtDate(c.scheduled_for)}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit post" : "New post"} wide>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title / idea"><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Day in the life of a freelance editor" /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Platform">
              <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Content["platform"] })}>
                {(Object.keys(PLATFORMS) as Content["platform"][]).map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select className="input capitalize" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Content["status"] })}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Publish date"><input className="input" type="date" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></Field>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Caption</span>
              <div className="flex gap-1">
                {form.caption && <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => navigator.clipboard.writeText(form.caption)}><IoCopyOutline /> Copy</button>}
                <button type="button" className="btn-ghost px-2.5 py-1 text-xs text-brand" onClick={genCaption} disabled={aiBusy}>
                  <IoSparklesOutline /> {aiBusy ? "Writing…" : "Write with AI"}
                </button>
              </div>
            </div>
            <textarea className="input min-h-32" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            {aiErr && <p className="mt-1 text-xs text-bad">{aiErr}</p>}
          </div>
          <div className="flex gap-2">
            {editing && <button type="button" className="btn-danger" onClick={() => { items.remove(editing.id); setOpen(false); }}><IoTrashOutline /> Delete</button>}
            <button className="btn-primary flex-1">{editing ? "Save" : "Add to calendar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
