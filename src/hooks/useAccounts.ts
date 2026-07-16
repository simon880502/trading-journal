"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Account {
  id: string;
  name: string;
  createdAt: string;
}

const LS_KEY = "active_account";

function fromDb(row: Record<string, unknown>): Account {
  return {
    id:        row.id as string,
    name:      row.name as string,
    createdAt: row.created_at as string,
  };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_KEY);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const list = data.map(fromDb);
          setAccounts(list);
          // If no active account saved, use first
          const saved = localStorage.getItem(LS_KEY);
          if (!saved || !list.find(a => a.id === saved)) {
            setActiveIdState(list[0].id);
            localStorage.setItem(LS_KEY, list[0].id);
          }
        }
        setLoading(false);
      });
  }, []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  const activeAccount = accounts.find(a => a.id === activeId) ?? accounts[0] ?? null;

  const addAccount = useCallback(async (name: string) => {
    if (accounts.length >= 20) return;
    const { data, error } = await supabase
      .from("accounts")
      .insert({ name })
      .select()
      .single();
    if (!error && data) {
      const acc = fromDb(data);
      setAccounts(prev => [...prev, acc]);
      setActiveId(acc.id);
    }
  }, [accounts.length, setActiveId]);

  const renameAccount = useCallback(async (id: string, name: string) => {
    await supabase.from("accounts").update({ name }).eq("id", id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    if (accounts.length <= 1) return; // keep at least one
    await supabase.from("accounts").delete().eq("id", id);
    const remaining = accounts.filter(a => a.id !== id);
    setAccounts(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  }, [accounts, activeId, setActiveId]);

  return { accounts, activeAccount, activeId, setActiveId, addAccount, renameAccount, deleteAccount, loading };
}
