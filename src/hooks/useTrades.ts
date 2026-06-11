"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade, tradePnl } from "@/types/trade";
import { supabase } from "@/lib/supabase";

// ── DB mapping ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): Trade {
  return {
    id:           row.id,
    date:         row.date,
    timeframe:    row.timeframe ?? undefined,
    symbol:       row.symbol,
    side:         row.side,
    entry:        Number(row.entry),
    sl:           Number(row.sl),
    tp:           row.tp           != null ? Number(row.tp)            : undefined,
    tp2:          row.tp2          != null ? Number(row.tp2)           : undefined,
    tp3:          row.tp3          != null ? Number(row.tp3)           : undefined,
    exitPrice:    row.exit_price   != null ? Number(row.exit_price)    : undefined,
    positionSize: Number(row.position_size),
    entryReasons: row.entry_reasons ?? [],
    exitReason:   row.exit_reason  ?? undefined,
    emotion:      row.emotion      ?? undefined,
    notes:        row.notes        ?? undefined,
    deletedAt:    row.deleted_at   ?? undefined,
  };
}

function toDb(t: Omit<Trade, "id">) {
  return {
    date:          t.date,
    timeframe:     t.timeframe     ?? null,
    symbol:        t.symbol,
    side:          t.side,
    entry:         t.entry,
    sl:            t.sl,
    tp:            t.tp            ?? null,
    tp2:           t.tp2           ?? null,
    tp3:           t.tp3           ?? null,
    exit_price:    t.exitPrice     ?? null,
    position_size: t.positionSize,
    entry_reasons: t.entryReasons,
    exit_reason:   t.exitReason    ?? null,
    emotion:       t.emotion       ?? null,
    notes:         t.notes         ?? null,
  };
}

function sortDesc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => b.date.localeCompare(a.date));
}

export function useTrades() {
  const [trades, setTrades]   = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("trades")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setTrades(data.map(fromDb));
        setLoading(false);
      });
  }, []);

  const add = useCallback(async (t: Omit<Trade, "id">) => {
    // Optimistic: add with temp id
    const tempId = crypto.randomUUID();
    setTrades((prev) => sortDesc([...prev, { ...t, id: tempId }]));

    const { data, error } = await supabase
      .from("trades")
      .insert(toDb(t))
      .select()
      .single();

    if (!error && data) {
      // Replace temp id with real id from DB
      setTrades((prev) =>
        sortDesc(prev.map((x) => (x.id === tempId ? fromDb(data) : x)))
      );
    }
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Omit<Trade, "id">>) => {
    setTrades((prev) =>
      sortDesc(prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    );

    await supabase.from("trades").update(toDb({ ...trades.find((t) => t.id === id)!, ...patch })).eq("id", id);
  }, [trades]);

  const remove = useCallback(async (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    const now = new Date().toISOString();
    await supabase.from("trades").update({ deleted_at: now }).eq("id", id);
  }, []);

  // Fetch soft-deleted trades
  const fetchTrashed = useCallback(async (): Promise<Trade[]> => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error || !data) return [];
    return data.map(fromDb);
  }, []);

  // Restore a trashed trade
  const restore = useCallback(async (id: string) => {
    await supabase.from("trades").update({ deleted_at: null }).eq("id", id);
  }, []);

  // Permanently delete a trade
  const purge = useCallback(async (id: string) => {
    await supabase.from("trades").delete().eq("id", id);
  }, []);

  const closed    = trades.filter((t) => t.exitPrice != null);
  const totalPnl  = closed.reduce((s, t) => s + (tradePnl(t) ?? 0), 0);
  const wins      = closed.filter((t) => (tradePnl(t) ?? 0) > 0).length;
  const winRate   = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  const streak = (() => {
    if (!closed.length) return { count: 0, type: null as "W" | "L" | null };
    const sorted    = [...closed].sort((a, b) => b.date.localeCompare(a.date));
    const firstType = (tradePnl(sorted[0]) ?? 0) >= 0 ? "W" : "L";
    let count = 0;
    for (const t of sorted) {
      if (((tradePnl(t) ?? 0) >= 0 ? "W" : "L") === firstType) count++;
      else break;
    }
    return { count, type: firstType };
  })();

  return { trades, loading, add, update, remove, fetchTrashed, restore, purge, totalPnl, winRate, streak };
}
