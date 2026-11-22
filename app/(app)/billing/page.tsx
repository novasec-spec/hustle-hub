"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IoDiamondOutline, IoCheckmarkCircle, IoPhonePortraitOutline, IoCardOutline, IoLogoPaypal, IoLogoBitcoin,
  IoWalletOutline, IoTimeOutline, IoAlertCircleOutline, IoSparklesOutline, IoDownloadOutline, IoInfiniteOutline,
} from "react-icons/io5";
import { usePlan } from "@/lib/usePlan";
import { useTable } from "@/lib/useTable";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Badge, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { cx, fmtDate, money } from "@/lib/utils";

type ProviderKey = "mpesa" | "intasend" | "paystack" | "paypal" | "crypto";
type Info = { enabled: Record<ProviderKey, boolean>; mode: Record<ProviderKey, string>; price: { KES: number; USD: number }; paystackCurrency: string };
type Payment = { id: string; provider: ProviderKey; amount: number; currency: string; status: string; created_at: string; paid_at: string | null };

const PROVIDERS: { key: ProviderKey; name: string; desc: string; icon: typeof IoCardOutline; cur: "KES" | "USD" | "PAYSTACK" }[] = [
  { key: "mpesa", name: "M-Pesa", desc: "STK push straight to your phone", icon: IoPhonePortraitOutline, cur: "KES" },
  { key: "intasend", name: "IntaSend", desc: "M-Pesa or card via IntaSend checkout", icon: IoWalletOutline, cur: "KES" },
  { key: "paystack", name: "Paystack", desc: "Card, M-Pesa and more", icon: IoCardOutline, cur: "PAYSTACK" },
  { key: "paypal", name: "PayPal", desc: "PayPal balance or card", icon: IoLogoPaypal, cur: "USD" },
  { key: "crypto", name: "Crypto", desc: "BTC, ETH, USDT and 100+ coins", icon: IoLogoBitcoin, cur: "USD" },
];

const PERKS = [
  { icon: IoInfiniteOutline, text: "Unlimited AI helper (free plan: 5 a day)" },
  { icon: IoDownloadOutline, text: "Export finances to CSV" },
  { icon: IoDiamondOutline, text: "Premium badge on your workspace" },
];

function BillingInner() {
  const plan = usePlan();
  const payments = useTable<Payment>("hh_payments");
  const params = useSearchParams();
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState<ProviderKey | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [waiting, setWaiting] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { fetch("/api/pay/providers").then((r) => r.json()).then(setInfo).catch(() => setErr("Couldn't load payment options.")); }, []);

  // handle redirects back from hosted checkouts
  useEffect(() => {
    const paid = params.get("paid"), error = params.get("error"), pending = params.get("pending"), canceled = params.get("canceled");
    if (paid) setNotice({ ok: true, text: "Payment confirmed. Premium is active." });
    else if (canceled) setNotice({ ok: false, text: "Payment canceled. You weren't charged." });
    else if (error) setNotice({ ok: false, text: error === "failed" ? "The payment didn't go through." : "We couldn't confirm that payment. If you were charged, it will update shortly." });
    else if (pending) { setNotice({ ok: true, text: "Payment received by the provider. Waiting for confirmation…" }); setWaiting(pending); }
    if (paid || error || canceled) { plan.reload(); payments.reload(); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // poll a pending payment (M-Pesa STK, crypto confirmations)
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    poll.current = setInterval(async () => {
      tries++;
      const { data: row } = await supabaseBrowser().from("hh_payments").select("provider,status").eq("id", waiting).maybeSingle();
      let status = row?.status as string | undefined;
      // M-Pesa: ask Daraja directly every few ticks in case the callback is slow
      if (row?.provider === "mpesa" && status === "pending" && tries % 2 === 0) {
        const r = await fetch(`/api/pay/mpesa?pid=${waiting}`).then((x) => x.json()).catch(() => ({}));
        if (r.status) status = r.status;
      }
      await payments.reload();
      if (status && status !== "pending") {
        clearInterval(poll.current!); setWaiting(null);
        setNotice(status === "paid" ? { ok: true, text: "Payment confirmed. Premium is active." } : { ok: false, text: "The payment didn't go through. Try again." });
        plan.reload();
        router.replace("/billing");
      } else if (tries > 40) { clearInterval(poll.current!); setWaiting(null); setNotice({ ok: false, text: "Still waiting on the provider. Refresh this page in a minute." }); }
    }, 4000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pay(key: ProviderKey) {
    if (key === "mpesa") { setMpesaOpen(true); return; }
    setBusy(key); setErr(null);
    try {
      const r = await fetch(`/api/pay/${key}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.href = d.url;
    } catch (e) { setErr((e as Error).message); setBusy(null); }
  }

  async function payMpesa(e: React.FormEvent) {
    e.preventDefault();
    setBusy("mpesa"); setErr(null);
    try {
      const r = await fetch("/api/pay/mpesa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMpesaOpen(false); setNotice({ ok: true, text: d.message }); setWaiting(d.paymentId); payments.reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }

  const priceLabel = (cur: "KES" | "USD" | "PAYSTACK") => {
    if (!info) return "";
    const c = cur === "PAYSTACK" ? info.paystackCurrency : cur;
    return money(c === "USD" ? info.price.USD : info.price.KES, c);
  };
  const anyEnabled = info && Object.values(info.enabled).some(Boolean);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Upgrade to Premium. Test mode: no real money moves until you switch keys to live." />

      {notice && (
        <div className={cx("mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm", notice.ok ? "border-ok/30 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad")}>
          {waiting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : notice.ok ? <IoCheckmarkCircle /> : <IoAlertCircleOutline />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className={cx("card lg:col-span-1", plan.premium && "border-brand/50 bg-gradient-to-br from-brand/10 to-brand2/5")}>
          <p className="label">Your plan</p>
          {plan.loading ? <Spinner /> : (
            <>
              <p className="flex items-center gap-2 text-2xl font-semibold">{plan.premium ? <><IoDiamondOutline className="text-brand" /> Premium</> : "Free"}</p>
              <p className="mt-1 text-sm text-mute">
                {plan.premium ? `Active until ${fmtDate(plan.until!.slice(0, 10))}` : `${Math.max(0, 5 - plan.aiUsedToday)} of 5 free AI generations left today`}
              </p>
            </>
          )}
          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <p key={text} className="flex items-center gap-2 text-sm"><Icon className="shrink-0 text-brand" /> {text}</p>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{plan.premium ? "Extend Premium by 30 days" : "Get Premium, 30 days"}</p>
            {info && <p className="text-sm text-mute">{money(info.price.KES, "KES")} or {money(info.price.USD, "USD")}</p>}
          </div>
          {!info ? <Spinner /> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {PROVIDERS.map(({ key, name, desc, icon: Icon, cur }) => {
                const on = info.enabled[key];
                return (
                  <button key={key} disabled={!on || !!busy} onClick={() => pay(key)}
                    className={cx("flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      on ? "border-line bg-panel2 hover:border-brand/60" : "cursor-not-allowed border-dashed border-line opacity-50")}>
                    <div className="rounded-lg bg-bg p-2 text-brand"><Icon size={20} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">{name}
                        {on && info.mode[key] === "test" && <span className="chip bg-info/15 text-info">test</span>}</p>
                      <p className="truncate text-xs text-mute">{on ? desc : "Not configured yet"}</p>
                    </div>
                    <span className="text-xs font-medium">{busy === key ? "…" : on ? priceLabel(cur) : ""}</span>
                  </button>
                );
              })}
            </div>
          )}
          {info && !anyEnabled && <p className="mt-3 text-xs text-mute">No payment providers are connected yet. Add API keys in Vercel to switch them on.</p>}
          {err && <p className="mt-3 text-sm text-bad">{err}</p>}
        </div>
      </div>

      <div className="card p-0">
        <p className="border-b border-line p-4 font-semibold">Payment history</p>
        {payments.loading ? <Spinner /> : !payments.rows.length ? (
          <p className="flex items-center gap-2 p-4 text-sm text-mute"><IoTimeOutline /> No payments yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {payments.rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <IoSparklesOutline className="text-brand" />
                <div className="min-w-0 flex-1"><p className="font-medium">Premium · {PROVIDERS.find((x) => x.key === p.provider)?.name}</p>
                  <p className="text-xs text-mute">{fmtDate(p.created_at.slice(0, 10))}</p></div>
                <span>{money(p.amount, p.currency)}</span>
                <Badge value={p.status === "pending" ? "draft" : p.status === "canceled" ? "past" : p.status === "failed" ? "overdue" : "paid"} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={mpesaOpen} onClose={() => setMpesaOpen(false)} title="Pay with M-Pesa">
        <form onSubmit={payMpesa} className="space-y-3">
          <p className="text-sm text-mute">We'll send a payment prompt for {info ? money(info.price.KES, "KES") : ""} to your phone. Enter your M-Pesa PIN to finish.</p>
          {info?.mode.mpesa === "test" && <p className="rounded-lg bg-info/10 p-2 text-xs text-info">Sandbox: use the test number from your Daraja portal (e.g. 254708374149). No real money moves.</p>}
          <Field label="Safaricom number"><input className="input" required inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn-primary w-full" disabled={busy === "mpesa"}><IoPhonePortraitOutline /> {busy === "mpesa" ? "Sending prompt…" : "Send STK push"}</button>
          {err && <p className="text-sm text-bad">{err}</p>}
        </form>
      </Modal>
    </div>
  );
}

export default function BillingPage() {
  return <Suspense fallback={<Spinner />}><BillingInner /></Suspense>;
}
