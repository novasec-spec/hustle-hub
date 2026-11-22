"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IoLockClosedOutline } from "react-icons/io5";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { setMsg({ ok: false, text: "Passwords don't match." }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    if (error) { setMsg({ ok: false, text: error.message }); setBusy(false); return; }
    setMsg({ ok: true, text: "Password updated. Taking you to your dashboard…" });
    setTimeout(() => { router.replace("/dashboard"); router.refresh(); }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size={40} /></div>
        <div className="card">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="mb-5 mt-1 text-sm text-mute">Choose a password with at least 6 characters.</p>
          <form onSubmit={submit} className="space-y-3">
            {[{ v: pw, s: setPw, p: "New password" }, { v: pw2, s: setPw2, p: "Confirm new password" }].map((f) => (
              <div key={f.p} className="relative">
                <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input className="input pl-9" type="password" required minLength={6} placeholder={f.p} value={f.v} onChange={(e) => f.s(e.target.value)} autoComplete="new-password" />
              </div>
            ))}
            {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
            <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
