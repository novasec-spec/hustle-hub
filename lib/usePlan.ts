"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";

export type Plan = { premium: boolean; until: string | null; loading: boolean; aiUsedToday: number };

export function usePlan() {
  const [plan, setPlan] = useState<Plan>({ premium: false, until: null, loading: true, aiUsedToday: 0 });
  const reload = useCallback(async () => {
    const sb = supabaseBrowser();
    const start = new Date(); start.setUTCHours(0, 0, 0, 0); // matches the server's daily reset
    const [{ data: sub }, { count }] = await Promise.all([
      sb.from("hh_subscriptions").select("current_period_end").maybeSingle(),
      sb.from("hh_ai_usage").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
    ]);
    const until = sub?.current_period_end ?? null;
    setPlan({ premium: !!until && new Date(until) > new Date(), until, loading: false, aiUsedToday: count ?? 0 });
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { ...plan, reload };
}
