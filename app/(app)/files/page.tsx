"use client";
import { useRef, useState } from "react";
import {
  IoCloudUploadOutline, IoFolderOpenOutline, IoDownloadOutline, IoTrashOutline, IoDocumentOutline,
  IoImageOutline, IoFilmOutline, IoMusicalNotesOutline, IoSearch,
} from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { FileRow } from "@/lib/types";
import { Empty, ErrorBar, PageHeader, Spinner } from "@/components/ui";
import { bytes, cx, fmtDate } from "@/lib/utils";

const BUCKET = "hh-files";
const iconFor = (m?: string | null) =>
  m?.startsWith("image/") ? IoImageOutline : m?.startsWith("video/") ? IoFilmOutline : m?.startsWith("audio/") ? IoMusicalNotesOutline : IoDocumentOutline;

export default function FilesPage() {
  const files = useTable<FileRow>("hh_files");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const sb = supabaseBrowser();
  const used = files.rows.reduce((s, f) => s + (f.size ?? 0), 0);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); return; }
    for (const f of Array.from(list)) {
      if (f.size > 50 * 1024 * 1024) { files.setError(`${f.name} is over the 50 MB limit`); continue; }
      const path = `${user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined });
      if (error) { files.setError(error.message); continue; }
      await files.insert({ name: f.name, path, size: f.size, mime: f.type || null });
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }
  async function download(f: FileRow) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 60, { download: f.name });
    if (error) files.setError(error.message); else window.open(data.signedUrl, "_blank");
  }
  async function del(f: FileRow) {
    if (!confirm(`Delete ${f.name}?`)) return;
    await sb.storage.from(BUCKET).remove([f.path]);
    await files.remove(f.id);
  }

  const list = files.rows.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Files" subtitle={`${files.rows.length} files · ${bytes(used)} used · private to you`} />
      <ErrorBar error={files.error} onClose={() => files.setError(null)} />

      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={cx("mb-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition",
          drag ? "border-brand bg-brand/5" : "border-line bg-panel hover:border-brand/50")}>
        <IoCloudUploadOutline size={32} className="text-brand" />
        <p className="mt-2 font-medium">{busy ? "Uploading…" : "Drop files here or tap to upload"}</p>
        <p className="text-xs text-mute">Contracts, briefs, thumbnails, raw clips · up to 50 MB each</p>
        <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>

      {files.rows.length > 0 && (
        <div className="relative mb-3">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="input pl-9" placeholder="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {files.loading ? <Spinner /> : !files.rows.length ? (
        <Empty icon={<IoFolderOpenOutline size={28} />} title="No files yet" hint="Upload anything you need to keep with your work." />
      ) : (
        <div className="card divide-y divide-line p-0">
          {list.map((f) => {
            const Icon = iconFor(f.mime);
            return (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                <div className="rounded-lg bg-panel2 p-2 text-brand"><Icon size={18} /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-mute">{bytes(f.size)} · {fmtDate(f.created_at.slice(0, 10))}</p></div>
                <button className="rounded-lg p-2 text-mute hover:bg-line hover:text-ink" onClick={() => download(f)} aria-label="Download"><IoDownloadOutline /></button>
                <button className="rounded-lg p-2 text-mute hover:bg-bad/10 hover:text-bad" onClick={() => del(f)} aria-label="Delete"><IoTrashOutline /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
