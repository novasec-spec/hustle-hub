import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar email={data.user.email ?? ""} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
