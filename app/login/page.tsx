"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IoMailOutline, IoLockClosedOutline } from "react-icons/io5";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    params.get("error") ? { ok: false, text: "That link is invalid or expired. Try signing in." } : null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (data.session) { router.replace("/dashboard"); router.refresh(); return; }
      else setMsg({ ok: true, text: "Check your inbox to confirm your email, then sign in." });
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message });
      else { router.replace("/dashboard"); router.refresh(); return; }
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex justify-center"><Logo size={40} /></Link>
      <div className="card">
        <h1 className="text-xl font-semibold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="mb-5 mt-1 text-sm text-mute">{mode === "signup" ? "Start organizing your hustle." : "Sign in to your workspace."}</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input className="input pl-9" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="relative">
            <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input className="input pl-9" type="password" required minLength={6} placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-mute">
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button className="font-medium text-brand" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(null); }}>
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
