"use client";
import { useMemo, useState } from "react";
import { IoAdd, IoPeopleOutline, IoSearch, IoMailOutline, IoCallOutline, IoTrashOutline, IoCreateOutline } from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Client, Invoice } from "@/lib/types";
import { Badge, Empty, ErrorBar, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { money } from "@/lib/utils";

const blank = { name: "", email: "", phone: "", company: "", status: "lead" as Client["status"], notes: "" };

export default function ClientsPage() {
  const clients = useTable<Client>("hh_clients");
  const invoices = useTable<Invoice>("hh_invoices");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Client["status"]>("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const billed = useMemo(() => {
    const m: Record<string, { paid: number; open: number }> = {};
    invoices.rows.forEach((i) => {
      if (!i.client_id) return;
      m[i.client_id] ??= { paid: 0, open: 0 };
      if (i.status === "paid") m[i.client_id].paid += Number(i.amount);
      else m[i.client_id].open += Number(i.amount);
    });
    return m;
  }, [invoices.rows]);

  const list = clients.rows.filter((c) =>
    (filter === "all" || c.status === filter) &&
    [c.name, c.company, c.email].some((v) => v?.toLowerCase().includes(q.toLowerCase())));

  function startNew() { setEditing(null); setForm(blank); setOpen(true); }
  function startEdit(c: Client) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", company: c.company ?? "", status: c.status, notes: c.notes ?? "" });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = { ...form, email: form.email || null, phone: form.phone || null, company: form.company || null, notes: form.notes || null };
    if (editing) await clients.update(editing.id, v); else await clients.insert(v);
    setOpen(false);
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${clients.rows.length} total · ${clients.rows.filter((c) => c.status === "active").length} active`}
        action={<button className="btn-primary" onClick={startNew}><IoAdd size={18} /> New client</button>} />
      <ErrorBar error={clients.error} onClose={() => clients.setError(null)} />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="input pl-9" placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {(["all", "lead", "active", "past"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "btn-primary capitalize" : "btn-ghost capitalize"}>{s}</button>
        ))}
      </div>

      {clients.loading ? <Spinner /> : list.length === 0 ? (
        <Empty icon={<IoPeopleOutline size={28} />} title={clients.rows.length ? "No matches" : "No clients yet"}
          hint="Add your first client to start tracking work and invoices."
          action={!clients.rows.length && <button className="btn-primary" onClick={startNew}><IoAdd /> Add client</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand2 font-semibold text-black">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-mute">{c.company || "Independent"}</p>
                  </div>
                </div>
                <Badge value={c.status} />
              </div>
              <div className="mt-4 space-y-1 text-sm text-mute">
                {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-ink"><IoMailOutline /> {c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-ink"><IoCallOutline /> {c.phone}</a>}
                {c.notes && <p className="line-clamp-2 pt-1 text-xs">{c.notes}</p>}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 mt-4 text-xs">
                <span className="text-mute">Paid <span className="font-medium text-ok">{money(billed[c.id]?.paid)}</span> · Open <span className="font-medium text-brand">{money(billed[c.id]?.open)}</span></span>
                <div className="flex gap-1">
                  <button className="rounded-lg p-1.5 text-mute hover:bg-line hover:text-ink" onClick={() => startEdit(c)} aria-label="Edit"><IoCreateOutline size={16} /></button>
                  <button className="rounded-lg p-1.5 text-mute hover:bg-bad/10 hover:text-bad" onClick={() => confirm(`Delete ${c.name}?`) && clients.remove(c.id)} aria-label="Delete"><IoTrashOutline size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit client" : "New client"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company"><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client["status"] })}>
                <option value="lead">Lead</option><option value="active">Active</option><option value="past">Past</option>
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea className="input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <button className="btn-primary w-full">{editing ? "Save changes" : "Add client"}</button>
        </form>
      </Modal>
    </div>
  );
}
