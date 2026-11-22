import Link from "next/link";
import {
  IoPeopleOutline, IoReceiptOutline, IoGridOutline, IoCalendarOutline,
  IoDocumentTextOutline, IoStatsChartOutline, IoSparklesOutline, IoArrowForward,
} from "react-icons/io5";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: IoPeopleOutline, title: "Client CRM", body: "Leads, active clients and history, with contact details and notes." },
  { icon: IoReceiptOutline, title: "Invoices & payments", body: "Create invoices, track due dates, and mark them paid to log income automatically." },
  { icon: IoGridOutline, title: "Project boards", body: "Kanban boards per project with priorities and deadlines." },
  { icon: IoCalendarOutline, title: "Content calendar", body: "Plan YouTube, TikTok and Instagram posts from idea to posted." },
  { icon: IoDocumentTextOutline, title: "Notes & files", body: "Quick notes plus private file storage for contracts and assets." },
  { icon: IoStatsChartOutline, title: "Money dashboard", body: "Income vs expenses by month and by category, at a glance." },
  { icon: IoSparklesOutline, title: "AI helper", body: "Draft captions, proposals and client emails in seconds." },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/login" className="btn-ghost">Sign in</Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <span className="chip mb-5 border border-line bg-panel text-mute">For freelancers and creators</span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Run your whole hustle from <span className="bg-gradient-to-r from-brand to-brand2 bg-clip-text text-transparent">one place</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-mute sm:text-lg">
          Clients, invoices, projects, your content calendar, notes, files and finances, with an AI helper built in.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">Get started free <IoArrowForward /></Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">I have an account</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card">
            <div className="mb-3 inline-flex rounded-xl bg-brand/10 p-2.5 text-brand"><Icon size={22} /></div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-mute">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-mute">Hustle Hub © {new Date().getFullYear()}</footer>
    </main>
  );
}
