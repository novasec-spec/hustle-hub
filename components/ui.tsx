"use client";
import { useEffect, type ReactNode } from "react";
import { IoClose, IoAlertCircleOutline } from "react-icons/io5";
import { cx } from "@/lib/utils";

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-mute hover:bg-line hover:text-ink" aria-label="Close"><IoClose size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="mb-3 rounded-2xl bg-panel2 p-4 text-brand">{icon}</div>
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-mute">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBar({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
      <IoAlertCircleOutline size={18} /> <span className="flex-1">{error}</span>
      <button onClick={onClose}><IoClose /></button>
    </div>
  );
}

const TONES: Record<string, string> = {
  lead: "bg-info/15 text-info", active: "bg-ok/15 text-ok", past: "bg-mute/15 text-mute",
  draft: "bg-mute/15 text-mute", sent: "bg-info/15 text-info", paid: "bg-ok/15 text-ok", overdue: "bg-bad/15 text-bad",
  low: "bg-mute/15 text-mute", medium: "bg-brand/15 text-brand", high: "bg-bad/15 text-bad",
  idea: "bg-mute/15 text-mute", scripting: "bg-info/15 text-info", filming: "bg-brand2/15 text-brand2",
  editing: "bg-brand/15 text-brand", scheduled: "bg-info/15 text-info", posted: "bg-ok/15 text-ok",
  income: "bg-ok/15 text-ok", expense: "bg-bad/15 text-bad",
};
export function Badge({ value }: { value: string }) {
  return <span className={cx("chip capitalize", TONES[value] ?? "bg-line text-mute")}>{value}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}

export function Spinner() {
  return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" /></div>;
}
