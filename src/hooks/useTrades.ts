"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, tradePnl } from "@/types/trade";

const KEY = "tj-trades";

function load(): Trade[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(trades: Trade[]) {
  localStorage.setItem(KEY, JSON.stringify(trades));
}

function sortDesc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => b.date.localeCompare(a.date));
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    setTrades(sortDesc(load()));
  }, []);

  const add = useCallback((t: Omit<Trade, "id">) => {
    setTrades((prev) => {
      const next = sortDesc([...prev, { ...t, id: crypto.randomUUID() }]);
      persist(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Trade, "id">>) => {
    setTrades((prev) => {
      const next = sortDesc(prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTrades((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persist(next);
      return next;
    });
  }, []);

  // Only closed trades (with exitPrice) count toward stats
  const closed = trades.filter((t) => t.exitPrice != null);
  const totalPnl = closed.reduce((s, t) => s + (tradePnl(t) ?? 0), 0);
  const wins = closed.filter((t) => (tradePnl(t) ?? 0) > 0).length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  const streak = (() => {
    if (!closed.length) return { count: 0, type: null as "W" | "L" | null };
    const sorted = [...closed].sort((a, b) => b.date.localeCompare(a.date));
    const firstType = (tradePnl(sorted[0]) ?? 0) >= 0 ? "W" : "L";
    let count = 0;
    for (const t of sorted) {
      if (((tradePnl(t) ?? 0) >= 0 ? "W" : "L") === firstType) count++;
      else break;
    }
    return { count, type: firstType };
  })();

  return { trades, add, update, remove, totalPnl, winRate, streak };
}
