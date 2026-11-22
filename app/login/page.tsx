"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IoMailOutline, IoLockClosedOutline, IoLogoGoogle, IoArrowBack } from "react-icons/io5";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

type Mode = "signin" | "signup" | "forgot";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    params.get("error") ? { ok: false, text: "That link is invalid or expired. Try signing in." } : null
  );
  const callback = (next?: string) =>
    `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  function switchMode(m: Mode) { setMode(m); setMsg(null); }

  async function google() {
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback(), queryParams: { prompt: "select_account" } },
    });
    if (error) { setMsg({ ok: false, text: error.message }); setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    if (mode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "If that email has an account, a reset link is on its way. Check spam too." });
    } else if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: callback() },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (data.session) { router.replace("/dashboard"); router.refresh(); return; }
      else if (data.user && data.user.identities?.length === 0) {
        // Supabase returns a user with no identities when the email is already registered (no email is sent).
        setMode("signin");
        setMsg({ ok: false, text: "This email already has an account. Sign in, use Google, or reset your password." });
      }
      else setMsg({ ok: true, text: "Check your inbox (and spam) to confirm your email, then sign in." });
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        const text = error.message === "Email not confirmed"
          ? "Please confirm your email first. Check your inbox and spam folder."
          : error.message === "Invalid login credentials"
            ? "Wrong email or password. Try again or reset your password."
            : error.message;
        setMsg({ ok: false, text });
      } else { router.replace("/dashboard"); router.refresh(); return; }
    }
    setBusy(false);
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const sub = mode === "signup" ? "Start organizing your hustle." : mode === "forgot" ? "We'll email you a link to set a new password." : "Sign in to your workspace.";

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 flex justify-center"><Logo size={40} /></Link>
      <div className="card">
        {mode === "forgot" && (
          <button onClick={() => switchMode("signin")} className="mb-3 flex items-center gap-1 text-sm text-mute hover:text-ink"><IoArrowBack /> Back to sign in</button>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mb-5 mt-1 text-sm text-mute">{sub}</p>

        {mode !== "forgot" && (
          <>
            <button type="button" onClick={google} disabled={busy}
              className="btn w-full border border-line bg-white py-2.5 text-black hover:bg-gray-100">
              <IoLogoGoogle size={18} /> Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-mute">
              <div className="h-px flex-1 bg-line" /> or with email <div className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input className="input pl-9" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {mode !== "forgot" && (
            <div className="relative">
              <IoLockClosedOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input className="input pl-9" type="password" required minLength={6} placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
          )}
          {mode === "signin" && (
            <div className="text-right">
              <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-mute hover:text-brand">Forgot password?</button>
            </div>
          )}
          {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
          <button className="btn-primary w-full py-2.5" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
        </form>

        {mode !== "forgot" && (
          <p className="mt-4 text-center text-sm text-mute">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button className="font-medium text-brand" onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        )}
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
