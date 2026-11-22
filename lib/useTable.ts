"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";

type Opts = { order?: string; ascending?: boolean };

/** Small CRUD hook over a user-owned table. RLS scopes every query to the signed-in user. */
export function useTable<T extends { id: string }>(table: string, opts: Opts = {}) {
  const { order = "created_at", ascending = false } = opts;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sb = supabaseBrowser();

  const reload = useCallback(async () => {
    const { data, error } = await sb.from(table).select("*").order(order, { ascending });
    if (error) setError(error.message);
    else setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, order, ascending, sb]);

  useEffect(() => { reload(); }, [reload]);

  const insert = async (values: Partial<T>) => {
    const { data, error } = await sb.from(table).insert(values).select().single();
    if (error) { setError(error.message); return null; }
    await reload();
    return data as T;
  };
  const update = async (id: string, values: Partial<T>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...values } : x)));
    const { error } = await sb.from(table).update(values).eq("id", id);
    if (error) { setError(error.message); await reload(); return false; }
    return true;
  };
  const remove = async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) { setError(error.message); await reload(); }
  };

  return { rows, loading, error, setError, reload, insert, update, remove };
}
