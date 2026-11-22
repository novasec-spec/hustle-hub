"use client";
import { useMemo, useState } from "react";
import { IoAdd, IoReceiptOutline, IoCheckmarkCircleOutline, IoTrashOutline, IoPaperPlaneOutline, IoPrintOutline } from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Client, Invoice } from "@/lib/types";
import { Badge, Empty, ErrorBar, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { fmtDate, isOverdue, money, today } from "@/lib/utils";

export default function InvoicesPage() {
  const inv = useTable<Invoice>("hh_invoices");
  const clients = useTable<Client>("hh_clients", { order: "name", ascending: true });
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "paid" | "overdue">("all");
  const nextNo = `INV-${String(inv.rows.length + 1).padStart(4, "0")}`;
  const due14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [form, setForm] = useState({ client_id: "", number: "", description: "", amount: "", currency: "USD", issue_date: today(), due_date: due14 });

  const clientName = (id: string | null) => clients.rows.find((c) => c.id === id)?.name ?? "No client";
  const withStatus = useMemo(() => inv.rows.map((i) => ({ ...i, status: isOverdue(i.due_date, i.status) && i.status !== "draft" ? "overdue" as const : i.status })), [inv.rows]);
  const list = withStatus.filter((i) => filter === "all" || (filter === "open" ? ["sent", "draft"].includes(i.status) : i.status === filter));

  const totals = useMemo(() => ({
    outstanding: withStatus.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0),
    overdue: withStatus.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0),
    paid: withStatus.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0),
  }), [withStatus]);

  function startNew() {
    setForm({ client_id: clients.rows[0]?.id ?? "", number: nextNo, description: "", amount: "", currency: "USD", issue_date: today(), due_date: due14 });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await inv.insert({ ...form, client_id: form.client_id || null, amount: Number(form.amount), due_date: form.due_date || null, status: "draft" });
    setOpen(false);
  }
  async function markPaid(i: Invoice) {
    const ok = await inv.update(i.id, { status: "paid", paid_at: new Date().toISOString() });
    if (ok) {
      await supabaseBrowser().from("hh_transactions").insert({
        kind: "income", amount: i.amount, category: "Client work", date: today(),
        description: `${i.number} · ${clientName(i.client_id)}`, invoice_id: i.id,
      });
    }
  }

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Bill clients and track what you're owed"
        action={<button className="btn-primary" onClick={startNew}><IoAdd size={18} /> New invoice</button>} />
      <ErrorBar error={inv.error} onClose={() => inv.setError(null)} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="label">Outstanding</p><p className="text-2xl font-semibold text-brand">{money(totals.outstanding)}</p></div>
        <div className="card"><p className="label">Overdue</p><p className="text-2xl font-semibold text-bad">{money(totals.overdue)}</p></div>
        <div className="card"><p className="label">Collected</p><p className="text-2xl font-semibold text-ok">{money(totals.paid)}</p></div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "open", "overdue", "paid"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "btn-primary capitalize" : "btn-ghost capitalize"}>{s}</button>
        ))}
      </div>

      {inv.loading ? <Spinner /> : list.length === 0 ? (
        <Empty icon={<IoReceiptOutline size={28} />} title="No invoices here" hint="Create an invoice, send it, and mark it paid to log the income automatically."
          action={!inv.rows.length && <button className="btn-primary" onClick={startNew}><IoAdd /> Create invoice</button>} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-mute">
              <tr><th className="p-4">Invoice</th><th>Client</th><th>Due</th><th>Amount</th><th>Status</th><th className="pr-4 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-b border-line/60 last:border-0 hover:bg-panel2/50">
                  <td className="p-4"><button className="font-medium hover:text-brand" onClick={() => setView(i)}>{i.number}</button>
                    <p className="max-w-[200px] truncate text-xs text-mute">{i.description}</p></td>
                  <td>{clientName(i.client_id)}</td>
                  <td className="text-mute">{fmtDate(i.due_date)}</td>
                  <td className="font-medium">{money(i.amount, i.currency)}</td>
                  <td><Badge value={i.status} /></td>
                  <td className="pr-4">
                    <div className="flex justify-end gap-1">
                      {i.status === "draft" && <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => inv.update(i.id, { status: "sent" })}><IoPaperPlaneOutline /> Mark sent</button>}
                      {i.status !== "paid" && i.status !== "draft" && <button className="btn-ghost px-2.5 py-1.5 text-xs text-ok" onClick={() => markPaid(i)}><IoCheckmarkCircleOutline /> Paid</button>}
                      <button className="rounded-lg p-1.5 text-mute hover:bg-bad/10 hover:text-bad" onClick={() => confirm(`Delete ${i.number}?`) && inv.remove(i.id)} aria-label="Delete"><IoTrashOutline /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New invoice">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number"><input className="input" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            <Field label="Client">
              <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">No client</option>
                {clients.rows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><input className="input" placeholder="e.g. Logo design, 3 revisions" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Amount"><input className="input" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field></div>
            <Field label="Currency">
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {["USD", "KES", "EUR", "GBP", "NGN", "ZAR"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issued"><input className="input" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Due"><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          <button className="btn-primary w-full">Create invoice</button>
        </form>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.number ?? ""} wide>
        {view && (
          <div>
            <div id="invoice-print" className="rounded-xl bg-white p-6 text-black">
              <div className="flex justify-between">
                <div><p className="text-2xl font-bold">INVOICE</p><p className="text-sm text-gray-500">{view.number}</p></div>
                <div className="text-right text-sm"><p>Issued {fmtDate(view.issue_date)}</p><p>Due {fmtDate(view.due_date)}</p></div>
              </div>
              <div className="mt-6 text-sm"><p className="text-gray-500">Bill to</p><p className="font-semibold">{clientName(view.client_id)}</p>
                <p>{clients.rows.find((c) => c.id === view.client_id)?.email}</p></div>
              <table className="mt-6 w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-2">Description</th><th className="text-right">Amount</th></tr></thead>
                <tbody><tr className="border-b"><td className="py-3">{view.description || "Services"}</td><td className="text-right">{money(view.amount, view.currency)}</td></tr></tbody></table>
              <p className="mt-4 text-right text-lg font-bold">Total {money(view.amount, view.currency)}</p>
            </div>
            <button className="btn-ghost mt-4 w-full" onClick={() => window.print()}><IoPrintOutline /> Print / Save PDF</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
