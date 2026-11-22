"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  IoWalletOutline, IoReceiptOutline, IoPeopleOutline, IoCheckboxOutline, IoArrowForward,
  IoCalendarOutline, IoAlertCircleOutline, IoSparklesOutline,
} from "react-icons/io5";
import { useTable } from "@/lib/useTable";
import type { Client, Content, Invoice, Task, Txn } from "@/lib/types";
import { CHART, monthly } from "@/lib/finance";
import { PlatformIcon } from "@/components/platform";
import { Badge, Spinner } from "@/components/ui";
import { fmtDate, isOverdue, money, today } from "@/lib/utils";

export default function Dashboard() {
  const tx = useTable<Txn>("hh_transactions");
  const inv = useTable<Invoice>("hh_invoices");
  const clients = useTable<Client>("hh_clients");
  const tasks = useTable<Task>("hh_tasks");
  const content = useTable<Content>("hh_content", { order: "scheduled_for", ascending: true });

  const months = useMemo(() => monthly(tx.rows, 6), [tx.rows]);
  const thisMonth = months[months.length - 1];
  const outstanding = inv.rows.filter((i) => i.status !== "paid" && i.status !== "draft");
  const overdue = outstanding.filter((i) => isOverdue(i.due_date, i.status));
  const openTasks = tasks.rows.filter((t) => t.status !== "done");
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const upcoming = [
    ...openTasks.filter((t) => t.due_date && t.due_date <= in7).map((t) => ({ id: t.id, date: t.due_date!, title: t.title, kind: "task" as const, href: "/projects" })),
    ...outstanding.filter((i) => i.due_date && i.due_date <= in7).map((i) => ({ id: i.id, date: i.due_date!, title: `${i.number} · ${money(i.amount, i.currency)}`, kind: "invoice" as const, href: "/invoices" })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const nextPosts = content.rows.filter((c) => c.status !== "posted" && c.scheduled_for && c.scheduled_for >= today()).slice(0, 5);

  const loading = tx.loading || inv.loading || clients.loading || tasks.loading || content.loading;
  const hello = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();

  const kpis = [
    { label: "Profit this month", value: money(thisMonth?.net), icon: IoWalletOutline, tone: "text-brand", href: "/finance" },
    { label: "Owed to you", value: money(outstanding.reduce((s, i) => s + Number(i.amount), 0)), icon: IoReceiptOutline, tone: overdue.length ? "text-bad" : "text-info", href: "/invoices", sub: overdue.length ? `${overdue.length} overdue` : undefined },
    { label: "Active clients", value: String(clients.rows.filter((c) => c.status === "active").length), icon: IoPeopleOutline, tone: "text-ok", href: "/clients", sub: `${clients.rows.filter((c) => c.status === "lead").length} leads` },
    { label: "Open tasks", value: String(openTasks.length), icon: IoCheckboxOutline, tone: "text-brand2", href: "/projects" },
  ];

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="h1">{hello}</h1>
        <p className="mt-1 text-sm text-mute">Here’s where your hustle stands today.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone, href, sub }) => (
          <Link key={label} href={href} className="card transition hover:border-brand/40">
            <div className={`mb-3 inline-flex rounded-xl bg-panel2 p-2 ${tone}`}><Icon size={20} /></div>
            <p className="text-xl font-semibold sm:text-2xl">{value}</p>
            <p className="text-xs text-mute">{label}{sub ? ` · ${sub}` : ""}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">Cash flow, last 6 months</p>
            <Link href="/finance" className="flex items-center gap-1 text-xs text-brand">Details <IoArrowForward /></Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CHART.income} stopOpacity={0.35} /><stop offset="1" stopColor={CHART.income} stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CHART.expense} stopOpacity={0.3} /><stop offset="1" stopColor={CHART.expense} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" stroke={CHART.axis} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis stroke={CHART.axis} tickLine={false} axisLine={false} fontSize={12} width={44} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip contentStyle={{ background: "#181c25", border: "1px solid #252a36", borderRadius: 12 }} formatter={(v) => money(Number(v))} />
                <Area type="monotone" dataKey="income" name="Income" stroke={CHART.income} fill="url(#gi)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expenses" stroke={CHART.expense} fill="url(#ge)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <p className="mb-3 font-semibold">Due this week</p>
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.map((u) => (
                <Link key={u.kind + u.id} href={u.href} className="flex items-center gap-3 rounded-xl bg-panel2 p-2.5 hover:bg-line">
                  <div className={u.date < today() ? "text-bad" : "text-brand"}>{u.kind === "task" ? <IoCheckboxOutline /> : <IoReceiptOutline />}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm">{u.title}</p>
                    <p className={`text-xs ${u.date < today() ? "text-bad" : "text-mute"}`}>{u.date < today() ? "Overdue · " : ""}{fmtDate(u.date)}</p></div>
                </Link>
              ))}
            </div>
          ) : <p className="py-6 text-center text-sm text-mute">Nothing due in the next 7 days.</p>}
          {overdue.length > 0 && (
            <Link href="/invoices" className="mt-3 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 p-2.5 text-xs text-bad">
              <IoAlertCircleOutline /> {overdue.length} overdue invoice{overdue.length > 1 ? "s" : ""}. Send a reminder?
            </Link>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Next posts</p>
            <Link href="/content" className="flex items-center gap-1 text-xs text-brand">Calendar <IoArrowForward /></Link>
          </div>
          {nextPosts.length ? (
            <div className="divide-y divide-line">
              {nextPosts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <PlatformIcon p={c.platform} size={16} />
                  <p className="flex-1 truncate text-sm">{c.title}</p>
                  <Badge value={c.status} />
                  <span className="flex items-center gap-1 text-xs text-mute"><IoCalendarOutline /> {fmtDate(c.scheduled_for)}</span>
                </div>
              ))}
            </div>
          ) : <p className="py-6 text-center text-sm text-mute">No upcoming posts scheduled.</p>}
        </div>

        <Link href="/ai" className="card flex flex-col justify-between bg-gradient-to-br from-brand/15 to-brand2/10 transition hover:border-brand/50">
          <IoSparklesOutline size={26} className="text-brand" />
          <div className="mt-6"><p className="font-semibold">AI helper</p>
            <p className="text-sm text-mute">Write a caption, proposal or follow-up email in seconds.</p></div>
        </Link>
      </div>
    </div>
  );
}
