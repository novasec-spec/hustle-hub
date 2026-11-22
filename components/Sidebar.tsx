"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  IoHomeOutline, IoPeopleOutline, IoReceiptOutline, IoGridOutline, IoCalendarOutline,
  IoDocumentTextOutline, IoFolderOpenOutline, IoStatsChartOutline, IoSparklesOutline,
  IoLogOutOutline, IoMenu, IoClose,
} from "react-icons/io5";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "./Logo";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: IoHomeOutline },
  { href: "/clients", label: "Clients", icon: IoPeopleOutline },
  { href: "/invoices", label: "Invoices", icon: IoReceiptOutline },
  { href: "/projects", label: "Projects", icon: IoGridOutline },
  { href: "/content", label: "Content", icon: IoCalendarOutline },
  { href: "/notes", label: "Notes", icon: IoDocumentTextOutline },
  { href: "/files", label: "Files", icon: IoFolderOpenOutline },
  { href: "/finance", label: "Finance", icon: IoStatsChartOutline },
  { href: "/ai", label: "AI Helper", icon: IoSparklesOutline },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-brand/10 font-medium text-brand" : "text-mute hover:bg-panel2 hover:text-ink")}>
            <Icon size={19} /> {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-4 border-t border-line pt-4">
      <p className="truncate px-3 text-xs text-mute">{email}</p>
      <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-mute hover:bg-panel2 hover:text-ink">
        <IoLogOutOutline size={19} /> Sign out
      </button>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={28} />
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-panel2" aria-label="Open menu"><IoMenu size={24} /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-72 flex-col border-r border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-1"><Logo size={28} />
              <button onClick={() => setOpen(false)} aria-label="Close menu"><IoClose size={22} /></button></div>
            {nav}{footer}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-panel p-4 lg:flex">
        <div className="mb-8 px-2 pt-1"><Logo size={30} /></div>
        {nav}{footer}
      </aside>
    </>
  );
}
