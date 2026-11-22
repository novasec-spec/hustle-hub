"use client";
import { useEffect, useRef, useState } from "react";
import { IoAdd, IoDocumentTextOutline, IoPin, IoPinOutline, IoTrashOutline, IoSearch, IoChevronBack } from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Note } from "@/lib/types";
import { Empty, ErrorBar, PageHeader, Spinner } from "@/components/ui";
import { cx } from "@/lib/utils";

export default function NotesPage() {
  const notes = useTable<Note>("hh_notes", { order: "updated_at", ascending: false });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.rows.find((n) => n.id === activeId) ?? null;
  useEffect(() => { if (active) setDraft({ title: active.title, body: active.body }); }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...notes.rows]
    .filter((n) => (n.title + n.body).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  function edit(field: "title" | "body", value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (activeId) await notes.update(activeId, { ...next, updated_at: new Date().toISOString() });
      setSaved(true);
    }, 600);
  }
  async function create() {
    const n = await notes.insert({ title: "Untitled", body: "" });
    if (n) setActiveId(n.id);
  }

  return (
    <div>
      <PageHeader title="Notes" subtitle="Ideas, meeting notes and briefs, saved as you type"
        action={<button className="btn-primary" onClick={create}><IoAdd size={18} /> New note</button>} />
      <ErrorBar error={notes.error} onClose={() => notes.setError(null)} />

      {notes.loading ? <Spinner /> : !notes.rows.length ? (
        <Empty icon={<IoDocumentTextOutline size={28} />} title="No notes yet" action={<button className="btn-primary" onClick={create}><IoAdd /> Write a note</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className={cx("space-y-2", activeId && "hidden md:block")}>
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input className="input pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {sorted.map((n) => (
              <button key={n.id} onClick={() => setActiveId(n.id)}
                className={cx("w-full rounded-xl border p-3 text-left transition", n.id === activeId ? "border-brand bg-brand/5" : "border-line bg-panel hover:bg-panel2")}>
                <div className="flex items-center gap-1.5">{n.pinned && <IoPin className="shrink-0 text-brand" size={12} />}<p className="truncate text-sm font-medium">{n.title || "Untitled"}</p></div>
                <p className="mt-0.5 line-clamp-2 text-xs text-mute">{n.body || "Empty note"}</p>
              </button>
            ))}
          </div>

          {active ? (
            <div className="card flex min-h-[60vh] flex-col">
              <div className="mb-3 flex items-center gap-2">
                <button className="rounded-lg p-1 text-mute hover:bg-line md:hidden" onClick={() => setActiveId(null)} aria-label="Back"><IoChevronBack size={20} /></button>
                <span className="text-xs text-mute">{saved ? "Saved" : "Saving…"}</span>
                <div className="ml-auto flex gap-1">
                  <button className="rounded-lg p-1.5 text-mute hover:bg-line hover:text-brand" onClick={() => notes.update(active.id, { pinned: !active.pinned })} aria-label="Pin">
                    {active.pinned ? <IoPin className="text-brand" /> : <IoPinOutline />}</button>
                  <button className="rounded-lg p-1.5 text-mute hover:bg-bad/10 hover:text-bad" onClick={() => { if (confirm("Delete this note?")) { notes.remove(active.id); setActiveId(null); } }} aria-label="Delete"><IoTrashOutline /></button>
                </div>
              </div>
              <input className="bg-transparent text-xl font-semibold outline-none" value={draft.title} onChange={(e) => edit("title", e.target.value)} placeholder="Title" />
              <textarea className="mt-3 flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-mute" value={draft.body}
                onChange={(e) => edit("body", e.target.value)} placeholder="Start writing…" />
            </div>
          ) : (
            <div className="card hidden items-center justify-center text-sm text-mute md:flex">Select a note or create a new one</div>
          )}
        </div>
      )}
    </div>
  );
}
