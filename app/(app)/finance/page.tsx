"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IoAdd, IoTrendingUp, IoTrendingDown, IoWalletOutline, IoTrashOutline, IoStatsChartOutline } from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Txn } from "@/lib/types";
import { Badge, Empty, ErrorBar, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { byCategory, CHART, monthly, PIE } from "@/lib/finance";
import { cx, fmtDate, money, today } from "@/lib/utils";

const INCOME_CATS = ["Client work", "Sponsorship", "Ad revenue", "Affiliate", "Product sales", "Other"];
const EXPENSE_CATS = ["Software", "Equipment", "Marketing", "Travel", "Contractors", "Internet & phone", "Taxes", "Other"];
const tip = { contentStyle: { background: "#181c25", border: "1px solid #252a36", borderRadius: 12, color: "#e7e9ee" }, cursor: { fill: "#ffffff08" } };

export default function FinancePage() {
  const tx = useTable<Txn>("hh_transactions", { order: "date", ascending: false });
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(6);
  const [form, setForm] = useState({ kind: "expense" as Txn["kind"], amount: "", category: "Software", description: "", date: today() });

  const months = useMemo(() => monthly(tx.rows, range), [tx.rows, range]);
  const inRange = useMemo(() => {
    const first = months[0]?.key ?? "";
    return tx.rows.filter((t) => t.date.slice(0, 7) >= first);
  }, [tx.rows, months]);
  const inc = inRange.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const exp = inRange.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const cats = byCategory(inRange, "expense");
  const incCats = byCategory(inRange, "income");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await tx.insert({ ...form, amount: Number(form.amount), description: form.description || null });
    setOpen(false);
  }
  function startNew(kind: Txn["kind"]) {
    setForm({ kind, amount: "", category: kind === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0], description: "", date: today() });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader title="Finance" subtitle="Income, expenses and profit"
        action={<div className="flex gap-2">
          <button className="btn-ghost" onClick={() => startNew("expense")}><IoTrendingDown className="text-bad" /> Expense</button>
          <button className="btn-primary" onClick={() => startNew("income")}><IoAdd size={18} /> Income</button>
        </div>} />
      <ErrorBar error={tx.error} onClose={() => tx.setError(null)} />

      <div className="mb-4 flex gap-2">
        {[3, 6, 12].map((m) => <button key={m} onClick={() => setRange(m)} className={range === m ? "btn-primary" : "btn-ghost"}>{m} months</button>)}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="label flex items-center gap-1"><IoTrendingUp /> Income</p><p className="text-2xl font-semibold text-ok">{money(inc)}</p></div>
        <div className="card"><p className="label flex items-center gap-1"><IoTrendingDown /> Expenses</p><p className="text-2xl font-semibold text-bad">{money(exp)}</p></div>
        <div className="card"><p className="label flex items-center gap-1"><IoWalletOutline /> Profit</p>
          <p className={cx("text-2xl font-semibold", inc - exp >= 0 ? "text-ink" : "text-bad")}>{money(inc - exp)}</p>
          <p className="text-xs text-mute">{inc ? `${Math.round(((inc - exp) / inc) * 100)}% margin` : "No income yet"}</p></div>
      </div>

      {tx.loading ? <Spinner /> : !tx.rows.length ? (
        <Empty icon={<IoStatsChartOutline size={28} />} title="No transactions yet" hint="Log income and expenses, or mark an invoice as paid, and your charts fill in here."
          action={<button className="btn-primary" onClick={() => startNew("income")}><IoAdd /> Log income</button>} />
      ) : (
        <>
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <p className="mb-4 font-semibold">Income vs expenses</p>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={months} barGap={4}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" stroke={CHART.axis} tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis stroke={CHART.axis} tickLine={false} axisLine={false} fontSize={12} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                    <Tooltip {...tip} formatter={(v) => money(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income" fill={CHART.income} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill={CHART.expense} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <p className="mb-2 font-semibold">Spending by category</p>
              {cats.length ? (
                <>
                  <div className="h-44">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={cats} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                          {cats.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                        </Pie>
                        <Tooltip {...tip} formatter={(v) => money(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5 text-sm">
                    {cats.slice(0, 5).map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                        <span className="flex-1 truncate text-mute">{c.name}</span><span>{money(c.value)}</span></div>
                    ))}
                  </div>
                </>
              ) : <p className="py-10 text-center text-sm text-mute">No expenses in this range</p>}
              {incCats.length > 0 && <p className="mt-4 border-t border-line pt-3 text-xs text-mute">Top income source: <span className="text-ink">{incCats[0].name}</span> ({money(incCats[0].value)})</p>}
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-mute">
                <tr><th className="p-4">Date</th><th>Description</th><th>Category</th><th>Type</th><th className="text-right">Amount</th><th className="pr-4" /></tr>
              </thead>
              <tbody>
                {tx.rows.slice(0, 50).map((t) => (
                  <tr key={t.id} className="border-b border-line/60 last:border-0">
                    <td className="p-4 text-mute">{fmtDate(t.date)}</td>
                    <td className="max-w-[220px] truncate">{t.description || "—"}</td>
                    <td className="text-mute">{t.category}</td>
                    <td><Badge value={t.kind} /></td>
                    <td className={cx("text-right font-medium", t.kind === "income" ? "text-ok" : "text-bad")}>{t.kind === "income" ? "+" : "−"}{money(t.amount)}</td>
                    <td className="pr-4 text-right"><button className="rounded-lg p-1.5 text-mute hover:bg-bad/10 hover:text-bad" onClick={() => tx.remove(t.id)} aria-label="Delete"><IoTrashOutline /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.kind === "income" ? "Log income" : "Log expense"}>
        <form onSubmit={save} className="space-y-3">
          <div className="flex rounded-xl border border-line bg-panel2 p-1">
            {(["income", "expense"] as const).map((k) => (
              <button type="button" key={k} onClick={() => setForm({ ...form, kind: k, category: k === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })}
                className={cx("btn flex-1 capitalize", form.kind === k ? (k === "income" ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad") : "text-mute")}>{k}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (USD)"><input className="input" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Date"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(form.kind === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="btn-primary w-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
