"use client";
import { useEffect, useState } from "react";
import {
  IoAdd, IoGridOutline, IoTrashOutline, IoChevronBack, IoChevronForward, IoCalendarOutline, IoFlagOutline,
} from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Client, Project, Task } from "@/lib/types";
import { Badge, Empty, ErrorBar, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { cx, fmtDate, today } from "@/lib/utils";

const COLS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To do" }, { key: "doing", label: "In progress" }, { key: "done", label: "Done" },
];

export default function ProjectsPage() {
  const projects = useTable<Project>("hh_projects");
  const tasks = useTable<Task>("hh_tasks", { order: "created_at", ascending: true });
  const clients = useTable<Client>("hh_clients", { order: "name", ascending: true });
  const [active, setActive] = useState<string | null>(null);
  const [pOpen, setPOpen] = useState(false);
  const [pForm, setPForm] = useState({ name: "", description: "", deadline: "", client_id: "" });
  const [tForm, setTForm] = useState({ title: "", priority: "medium" as Task["priority"], due_date: "" });
  const [drag, setDrag] = useState<string | null>(null);

  useEffect(() => { if (!active && projects.rows[0]) setActive(projects.rows[0].id); }, [projects.rows, active]);

  const project = projects.rows.find((p) => p.id === active);
  const pTasks = tasks.rows.filter((t) => t.project_id === active);
  const progress = (pid: string) => {
    const t = tasks.rows.filter((x) => x.project_id === pid);
    return t.length ? Math.round((t.filter((x) => x.status === "done").length / t.length) * 100) : 0;
  };

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    const p = await projects.insert({ ...pForm, deadline: pForm.deadline || null, client_id: pForm.client_id || null, description: pForm.description || null });
    if (p) setActive(p.id);
    setPOpen(false); setPForm({ name: "", description: "", deadline: "", client_id: "" });
  }
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !tForm.title.trim()) return;
    await tasks.insert({ project_id: active, title: tForm.title.trim(), priority: tForm.priority, due_date: tForm.due_date || null });
    setTForm({ title: "", priority: "medium", due_date: "" });
  }
  const move = (t: Task, dir: -1 | 1) => {
    const i = COLS.findIndex((c) => c.key === t.status) + dir;
    if (i >= 0 && i < COLS.length) tasks.update(t.id, { status: COLS[i].key });
  };

  return (
    <div>
      <PageHeader title="Projects" subtitle="Boards, tasks and deadlines"
        action={<button className="btn-primary" onClick={() => setPOpen(true)}><IoAdd size={18} /> New project</button>} />
      <ErrorBar error={projects.error || tasks.error} onClose={() => { projects.setError(null); tasks.setError(null); }} />

      {projects.loading ? <Spinner /> : !projects.rows.length ? (
        <Empty icon={<IoGridOutline size={28} />} title="No projects yet" hint="Create a project to get a task board for it."
          action={<button className="btn-primary" onClick={() => setPOpen(true)}><IoAdd /> Create project</button>} />
      ) : (
        <>
          <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
            {projects.rows.map((p) => (
              <button key={p.id} onClick={() => setActive(p.id)}
                className={cx("min-w-[180px] rounded-2xl border p-3 text-left transition", p.id === active ? "border-brand bg-brand/5" : "border-line bg-panel hover:bg-panel2")}>
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-mute">{p.deadline ? `Due ${fmtDate(p.deadline)}` : "No deadline"}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{ width: `${progress(p.id)}%` }} /></div>
              </button>
            ))}
          </div>

          {project && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <p className="text-sm text-mute">
                    {clients.rows.find((c) => c.id === project.client_id)?.name ?? "Personal"} · {progress(project.id)}% done
                    {project.description ? ` · ${project.description}` : ""}
                  </p>
                </div>
                <button className="btn-danger" onClick={() => { if (confirm(`Delete ${project.name} and its tasks?`)) { projects.remove(project.id); setActive(null); } }}>
                  <IoTrashOutline /> Delete project
                </button>
              </div>

              <form onSubmit={addTask} className="mb-4 flex flex-wrap gap-2">
                <input className="input min-w-[200px] flex-1" placeholder="Add a task…" value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} />
                <select className="input w-auto" value={tForm.priority} onChange={(e) => setTForm({ ...tForm, priority: e.target.value as Task["priority"] })}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
                <input className="input w-auto" type="date" value={tForm.due_date} onChange={(e) => setTForm({ ...tForm, due_date: e.target.value })} />
                <button className="btn-primary"><IoAdd /> Add</button>
              </form>

              <div className="grid gap-4 md:grid-cols-3">
                {COLS.map((col) => {
                  const items = pTasks.filter((t) => t.status === col.key);
                  return (
                    <div key={col.key} className="rounded-2xl border border-line bg-panel/60 p-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (drag) tasks.update(drag, { status: col.key }); setDrag(null); }}>
                      <div className="mb-3 flex items-center justify-between px-1">
                        <p className="text-sm font-semibold">{col.label}</p><span className="chip bg-line text-mute">{items.length}</span>
                      </div>
                      <div className="min-h-[80px] space-y-2">
                        {items.map((t) => (
                          <div key={t.id} draggable onDragStart={() => setDrag(t.id)}
                            className="group cursor-grab rounded-xl border border-line bg-panel2 p-3 active:cursor-grabbing">
                            <p className={cx("text-sm", t.status === "done" && "text-mute line-through")}>{t.title}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <Badge value={t.priority} />
                              {t.due_date && <span className={cx("flex items-center gap-1", t.due_date < today() && t.status !== "done" ? "text-bad" : "text-mute")}>
                                <IoCalendarOutline /> {fmtDate(t.due_date)}</span>}
                              <div className="ml-auto flex gap-0.5 opacity-70 group-hover:opacity-100">
                                <button onClick={() => move(t, -1)} disabled={col.key === "todo"} className="rounded p-1 hover:bg-line disabled:opacity-20" aria-label="Move left"><IoChevronBack /></button>
                                <button onClick={() => move(t, 1)} disabled={col.key === "done"} className="rounded p-1 hover:bg-line disabled:opacity-20" aria-label="Move right"><IoChevronForward /></button>
                                <button onClick={() => tasks.remove(t.id)} className="rounded p-1 hover:bg-bad/10 hover:text-bad" aria-label="Delete"><IoTrashOutline /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!items.length && <p className="flex items-center gap-1 px-1 py-4 text-xs text-mute"><IoFlagOutline /> Drop tasks here</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <Modal open={pOpen} onClose={() => setPOpen(false)} title="New project">
        <form onSubmit={saveProject} className="space-y-3">
          <Field label="Name"><input className="input" required value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <select className="input" value={pForm.client_id} onChange={(e) => setPForm({ ...pForm, client_id: e.target.value })}>
                <option value="">Personal</option>{clients.rows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Deadline"><input className="input" type="date" value={pForm.deadline} onChange={(e) => setPForm({ ...pForm, deadline: e.target.value })} /></Field>
          </div>
          <button className="btn-primary w-full">Create project</button>
        </form>
      </Modal>
    </div>
  );
}
