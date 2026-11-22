export const money = (n: number | string | null | undefined, currency = "USD") => {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
};

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export const today = () => new Date().toISOString().slice(0, 10);

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const bytes = (n?: number | null) => {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
};

export const isOverdue = (due?: string | null, status?: string) =>
  !!due && status !== "paid" && due < today();
