import type { Txn } from "./types";

export function monthly(txns: Txn[], months = 6) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "short" }), income: 0, expense: 0 };
  });
  const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  txns.forEach((t) => {
    const i = idx[t.date.slice(0, 7)];
    if (i !== undefined) buckets[i][t.kind] += Number(t.amount);
  });
  return buckets.map((b) => ({ ...b, net: b.income - b.expense }));
}

export function byCategory(txns: Txn[], kind: Txn["kind"]) {
  const m: Record<string, number> = {};
  txns.filter((t) => t.kind === kind).forEach((t) => { m[t.category] = (m[t.category] ?? 0) + Number(t.amount); });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export const CHART = { income: "#3ccf91", expense: "#f0616d", grid: "#252a36", axis: "#8b92a3" };
export const PIE = ["#f5b83d", "#ff7a45", "#5b9cff", "#3ccf91", "#b48cff", "#f0616d", "#25c6d9", "#8b92a3"];
