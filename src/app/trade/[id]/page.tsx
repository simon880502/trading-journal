"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trade, TradeMode, tradePnl, tradePct, tradeRR, tradeR } from "@/types/trade";
import { TradeModal } from "@/components/TradeModal";
import { useSettings } from "@/components/SettingsProvider";
import { useTrades } from "@/hooks/useTrades";

function fromDb(row: Record<string, unknown>): Trade {
  return {
    id:           row.id as string,
    date:         row.date as string,
    timeframe:    row.timeframe as string ?? undefined,
    symbol:       row.symbol as string,
    side:         row.side as "BUY" | "SELL",
    entry:        Number(row.entry),
    sl:           Number(row.sl),
    tp:           row.tp != null ? Number(row.tp) : undefined,
    tp2:          row.tp2 != null ? Number(row.tp2) : undefined,
    tp3:          row.tp3 != null ? Number(row.tp3) : undefined,
    exitPrice:    row.exit_price != null ? Number(row.exit_price) : undefined,
    positionSize: Number(row.position_size),
    entryReasons: (row.entry_reasons as string[]) ?? [],
    exitReason:   row.exit_reason as string ?? undefined,
    emotion:      row.emotion != null ? Number(row.emotion) : undefined,
    notes:        row.notes as string ?? undefined,
    deletedAt:    row.deleted_at as string ?? undefined,
    mode:         (row.mode as TradeMode) ?? "real",
  };
}

function Row({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 8, color: "var(--muted)", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 8, color: color ?? "var(--text)", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { settings } = useSettings();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [allIds, setAllIds] = useState<string[]>([]);

  // We need mode from localStorage for useTrades
  const [mode, setMode] = useState<TradeMode>("real");
  useEffect(() => {
    const saved = localStorage.getItem("trade_mode") as TradeMode | null;
    if (saved === "real" || saved === "sim") setMode(saved);
  }, []);

  const { update, remove } = useTrades(mode);

  useEffect(() => {
    supabase
      .from("trades")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setTrade(fromDb(data as Record<string, unknown>));
        setLoading(false);
      });
  }, [id]);

  // Fetch all trade IDs for prev/next navigation
  useEffect(() => {
    supabase
      .from("trades")
      .select("id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAllIds(data.map((r: { id: string }) => r.id));
      });
  }, []);

  if (loading) return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <p className="blink" style={{ fontSize: 8, color: "var(--muted)" }}>LOADING...</p>
    </div>
  );

  if (!trade) return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <p style={{ fontSize: 8, color: "var(--red)" }}>TRADE NOT FOUND</p>
    </div>
  );

  const curIdx = allIds.indexOf(id);
  const prevId = curIdx > 0 ? allIds[curIdx - 1] : null;
  const nextId = curIdx < allIds.length - 1 ? allIds[curIdx + 1] : null;

  const pnl = tradePnl(trade);
  const pct = tradePct(trade);
  const r   = tradeR(trade);
  const rr  = trade.sl && trade.tp ? tradeRR(trade.entry, trade.sl, trade.tp) : null;
  const isOpen = trade.exitPrice == null;
  const isSim = trade.mode === "sim";
  const resultValue = isSim ? r : pnl;
  const pnlColor = resultValue == null ? "var(--muted)" : resultValue >= 0 ? "var(--accent)" : "var(--red)";

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">

      {/* HEADER */}
      <header className="pixel-box p-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button
            onClick={() => router.back()}
            className="pixel-btn"
            style={{ fontSize: 8, padding: "6px 10px" }}
          >
            ◄ BACK
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--text)" }}>{trade.symbol}</p>
            <p style={{ fontSize: 7, color: trade.side === "BUY" ? "var(--buy)" : "var(--red)", marginTop: 4 }}>
              {trade.side === "BUY" ? "▲" : "▼"} {trade.side}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setConfirmDelete(true)}
              className="pixel-btn pixel-btn-danger"
              style={{ fontSize: 8, padding: "6px 10px" }}
            >
              ✕ DEL
            </button>
            <button
              onClick={() => setEditing(true)}
              className="pixel-btn"
              style={{ fontSize: 8, padding: "6px 10px" }}
            >
              ✎ EDIT
            </button>
          </div>
        </div>
        {/* Prev / Next */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={() => prevId && router.push(`/trade/${prevId}`)}
            disabled={!prevId}
            className="pixel-btn"
            style={{ flex: 1, fontSize: 8, padding: "6px 0", opacity: prevId ? 1 : 0.3 }}
          >
            ◄ PREV
          </button>
          <span style={{ fontSize: 7, color: "var(--muted)", alignSelf: "center", whiteSpace: "nowrap" }}>
            {curIdx >= 0 ? `${curIdx + 1} / ${allIds.length}` : ""}
          </span>
          <button
            onClick={() => nextId && router.push(`/trade/${nextId}`)}
            disabled={!nextId}
            className="pixel-btn"
            style={{ flex: 1, fontSize: 8, padding: "6px 0", opacity: nextId ? 1 : 0.3 }}
          >
            NEXT ►
          </button>
        </div>
      </header>

      {/* P&L HIGHLIGHT */}
      <div className="pixel-box p-4" style={{ textAlign: "center" }}>
        <p style={{ fontSize: 7, color: "var(--muted)", marginBottom: 6 }}>
          {isOpen ? "STATUS" : "RESULT"}
        </p>
        {isOpen ? (
          <p className="blink" style={{ fontSize: 20, color: "var(--accent)" }}>● OPEN</p>
        ) : (
          <>
            <p style={{ fontSize: 22, color: pnlColor }}>
              {isSim
                ? (r != null ? `${r >= 0 ? "+" : ""}${r.toFixed(2)}R` : "—")
                : (pnl != null ? `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}` : "—")
              }
            </p>
            {!isSim && pct != null && (
              <p style={{ fontSize: 10, color: pnlColor, marginTop: 4 }}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
              </p>
            )}
          </>
        )}
      </div>

      {/* PRICE LEVELS */}
      <div className="pixel-box p-4">
        <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 10 }}>► PRICE LEVELS</p>
        <Row label="ENTRY"    value={trade.entry.toLocaleString()} />
        <Row label="STOP LOSS" value={trade.sl.toLocaleString()} color="var(--red)" />
        {trade.tp  && <Row label="TP 1" value={trade.tp.toLocaleString()}  color="var(--accent)" />}
        {trade.tp2 && <Row label="TP 2" value={trade.tp2.toLocaleString()} color="var(--accent)" />}
        {trade.tp3 && <Row label="TP 3" value={trade.tp3.toLocaleString()} color="var(--accent)" />}
        {trade.exitPrice && <Row label="EXIT" value={trade.exitPrice.toLocaleString()} />}
        {rr != null && <Row label="R:R" value={`1 : ${rr.toFixed(2)}`} color="var(--accent)" />}
      </div>

      {/* TRADE INFO */}
      <div className="pixel-box p-4">
        <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 10 }}>► TRADE INFO</p>
        <Row label="DATE"         value={trade.date} />
        <Row label="TIMEFRAME"    value={trade.timeframe ?? "—"} />
        {!isSim && <Row label="POSITION $" value={`$${trade.positionSize.toLocaleString()}`} />}
        <Row label="MODE"         value={trade.mode.toUpperCase()} color={trade.mode === "sim" ? "var(--red)" : "var(--accent)"} />
        {trade.emotion != null && (
          <Row label="EMOTION" value={`${trade.emotion} / 10`} />
        )}
      </div>

      {/* REASONS */}
      {(trade.entryReasons.length > 0 || trade.exitReason) && (
        <div className="pixel-box p-4">
          <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 10 }}>► REASONS</p>
          {trade.entryReasons.length > 0 && (
            <Row label="ENTRY" value={trade.entryReasons.join(", ")} />
          )}
          {trade.exitReason && (
            <Row label="EXIT" value={trade.exitReason} />
          )}
        </div>
      )}

      {/* NOTES */}
      {trade.notes && (
        <div className="pixel-box p-4">
          <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 10 }}>► NOTES</p>
          <p style={{ fontSize: 8, color: "var(--text)", lineHeight: 2, whiteSpace: "pre-wrap" }}>
            {trade.notes}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", paddingBottom: 32 }}>
        <p style={{ fontSize: 8, color: "var(--border)" }}>
          ♦ <span className="blink">▮</span> ♦
        </p>
      </div>

      {/* Confirm Delete Overlay */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div className="pixel-box p-5" style={{ width: "min(90vw, 300px)" }}>
            <p style={{ fontSize: 10, color: "var(--accent)", marginBottom: 8 }}>⚠ CONFIRM DELETE</p>
            <p style={{ fontSize: 8, color: "var(--muted)", marginBottom: 20, lineHeight: 2 }}>
              {trade.symbol} · {trade.side} · {trade.date}
              <br />This trade will move to Trash.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="pixel-btn pixel-btn-danger"
                style={{ flex: 1, fontSize: 12, padding: "14px 0" }}
                onClick={() => { remove(trade.id); router.back(); }}
              >
                ✕ DELETE
              </button>
              <button
                className="pixel-btn"
                style={{ flex: 1, fontSize: 12, padding: "14px 0" }}
                onClick={() => setConfirmDelete(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <TradeModal
          initial={trade}
          settings={settings}
          mode={trade.mode}
          onClose={() => setEditing(false)}
          onSave={(t) => {
            update(trade.id, t);
            setTrade({ ...trade, ...t, id: trade.id });
            setEditing(false);
          }}
          onDelete={(id) => {
            remove(id);
            router.back();
          }}
        />
      )}
    </div>
  );
}
