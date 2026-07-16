"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useAccounts } from "@/hooks/useAccounts";
import { useSettings } from "@/components/SettingsProvider";
import { TradeModal } from "@/components/TradeModal";
import { EquityChart } from "@/components/EquityChart";
import { Trade, TradeMode, tradePnl, tradePct, tradeR } from "@/types/trade";

function exportCsv(trades: Trade[]) {
  const header = "Date,Symbol,Side,Entry,SL,TP1,ExitPrice,PnL,PnL%,Emotion,EntryReasons,ExitReason,Notes\n";
  const rows = trades.map((t) => {
    const pnl = tradePnl(t);
    const pct = tradePct(t);
    return [
      t.date, t.symbol, t.side, t.entry, t.sl,
      t.tp ?? "", t.exitPrice ?? "OPEN",
      pnl != null ? pnl.toFixed(2) : "",
      pct != null ? pct.toFixed(2) : "",
      t.emotion ?? "", t.entryReasons.join(";"), t.exitReason ?? "", t.notes ?? "",
    ].join(",");
  });
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "trades.csv",
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Home() {
  const router = useRouter();
  const [mode, setModeState] = useState<TradeMode>(() => {
    // Read localStorage immediately to avoid real→sim flicker on refresh
    if (typeof window === "undefined") return "real";
    const saved = localStorage.getItem("trade_mode");
    return (saved === "real" || saved === "sim") ? saved : "real";
  });

  function setMode(m: TradeMode) {
    setModeState(m);
    localStorage.setItem("trade_mode", m);
  }

  const { accounts, activeAccount, activeId, setActiveId, addAccount } = useAccounts();
  const { trades, loading, add, update, remove, totalPnl, winRate, streak, totalR, avgR } = useTrades(mode, activeId ?? undefined);
  const { settings } = useSettings();
  const [modal, setModal] = useState<{ open: boolean; trade?: Trade }>({ open: false });

  const closedCount = trades.filter((t) => t.exitPrice != null).length;
  const openCount   = trades.filter((t) => t.exitPrice == null).length;

  const statsGrid = mode === "sim" ? [
    { label: "TOTAL",    value: String(trades.length),   sub: `${openCount} OPEN` },
    { label: "WIN RATE", value: closedCount ? `${winRate}%` : "N/A", sub: `${closedCount} CLOSED` },
    {
      label: "TOTAL R",
      value: closedCount ? `${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R` : "0R",
      pnl: totalR,
    },
    {
      label: "AVG R",
      value: closedCount ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "0R",
      pnl: avgR,
    },
  ] : [
    { label: "TOTAL",   value: String(trades.length),   sub: `${openCount} OPEN` },
    { label: "WIN RATE", value: closedCount ? `${winRate}%` : "N/A", sub: `${closedCount} CLOSED` },
    {
      label: "NET P&L",
      value: closedCount ? `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(0)}` : "$0",
      pnl: totalPnl,
    },
    {
      label: "STREAK",
      value: streak.type ? `${streak.count}${streak.type}` : "—",
      pnl: streak.type === "W" ? 1 : streak.type === "L" ? -1 : 0,
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">

      {/* HEADER */}
      <header className="pixel-box p-4">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 8, color: "var(--accent)", letterSpacing: 6 }}>► ► ► ► ► ► ► ►</p>
            <h1 style={{ fontSize: 16, color: "var(--text)", lineHeight: "28px", marginTop: 6 }}>
              TRADING JOURNAL
            </h1>
            <p style={{ fontSize: 8, color: "var(--muted)", marginTop: 4 }}>PLAYER 1 ► READY</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <p style={{ fontSize: 8, color: "var(--muted)" }}>{new Date().toISOString().slice(0, 10)}</p>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {mode === "sim" && (
                <span style={{ fontSize: 7, color: "var(--red)", border: "1px solid var(--red)", padding: "3px 6px" }}>
                  ◇ SIM
                </span>
              )}
              {/* Account switcher */}
              <select
                value={activeId ?? ""}
                onChange={e => setActiveId(e.target.value)}
                style={{ fontSize: 8, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", padding: "4px 6px", cursor: "pointer", fontFamily: "var(--font-pixel)" }}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <Link href="/settings" className="pixel-btn" style={{ fontSize: 8, padding: "6px 10px" }}>
                ⚙ SETTINGS
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
           className="lg:grid-cols-4">
        {statsGrid.map(({ label, value, pnl, sub }) => (
          <div key={label} className="pixel-box p-3" style={{ textAlign: "center" }}>
            <p style={{ fontSize: 8, color: "var(--muted)", marginBottom: 8 }}>{label}</p>
            <p style={{
              fontSize: 13,
              color: pnl == null ? "var(--accent)"
                   : pnl  > 0   ? "var(--accent)"
                   : pnl  < 0   ? "var(--red)"
                   :              "var(--muted)",
            }}>
              {value}
            </p>
            {sub && <p style={{ fontSize: 7, color: "var(--muted)", marginTop: 4 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* EQUITY CHART */}
      <EquityChart trades={trades} mode={mode} />

      {/* TRADE TABLE */}
      <div className="pixel-box p-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 8, color: "var(--text)" }}>► TRADE LOG</p>
          <button className="pixel-btn pixel-btn-filled" onClick={() => setModal({ open: true })} style={{ fontSize: 8, padding: "6px 12px" }}>
            + NEW TRADE
          </button>
        </div>

        {loading ? (
          <p className="blink" style={{ fontSize: 8, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>
            LOADING...
          </p>
        ) : trades.length === 0 ? (
          <p style={{ fontSize: 8, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>
            NO TRADES YET — HIT + NEW TRADE
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              className="pixel-table"
              style={{ fontSize: 8, borderCollapse: "collapse", width: "100%" }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}></th>
                  <th style={{ textAlign: "left"  }}>SYMBOL</th>
                  <th style={{ textAlign: "left"  }}>SIDE</th>
                  <th style={{ textAlign: "right" }}>{mode === "sim" ? "R" : "P&L"}</th>
                  <th style={{ textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const pnl = tradePnl(t);
                  const pct = tradePct(t);
                  const isOpen = t.exitPrice == null;
                  return (
                    <tr key={t.id} onClick={() => router.push(`/trade/${t.id}`)} style={{ cursor: "pointer" }}>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 8, color: "var(--muted)" }}>►</span>
                      </td>
                      <td style={{ color: "var(--text)", fontWeight: "bold" }}>{t.symbol}</td>
                      <td style={{ color: t.side === "BUY" ? "var(--buy)" : "var(--red)" }}>
                        {t.side === "BUY" ? "▲" : "▼"} {t.side}
                      </td>
                      <td style={{ textAlign: "right", color: pnl == null ? "var(--border)" : pnl >= 0 ? "var(--accent)" : "var(--red)" }}>
                        {mode === "sim"
                          ? (() => { const r = tradeR(t); return r == null ? (isOpen ? <span className="blink" style={{ color: "var(--accent)", fontSize: 7 }}>OPEN</span> : "—") : <span style={{ color: r >= 0 ? "var(--accent)" : "var(--red)" }}>{r >= 0 ? "+" : ""}{r.toFixed(2)}R</span>; })()
                          : pnl == null ? (isOpen ? <span className="blink" style={{ color: "var(--accent)", fontSize: 7 }}>OPEN</span> : "—") : `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`
                        }
                      </td>
                      <td style={{ textAlign: "right", color: pct == null ? "var(--border)" : pct >= 0 ? "var(--accent)" : "var(--red)" }}>
                        {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="pixel-btn"
          onClick={() => exportCsv(trades)}
          disabled={trades.length === 0}
          style={trades.length === 0 ? { opacity: 0.4, cursor: "not-allowed" } : {}}
        >
          EXPORT CSV ▼
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 32 }}>
        <p style={{ fontSize: 8, color: "var(--border)" }}>
          ♦ INSERT COIN TO CONTINUE <span className="blink">▮</span> ♦
        </p>
      </div>

      {/* MODAL */}
      {modal.open && (
        <TradeModal
          initial={modal.trade}
          settings={settings}
          mode={mode}
          onClose={() => setModal({ open: false })}
          onSave={(t) => {
            if (modal.trade) update(modal.trade.id, t);
            else add({ ...t, mode, accountId: activeId ?? undefined });
            setModal({ open: false });
          }}
          onDelete={(id) => { remove(id); setModal({ open: false }); }}
        />
      )}
    </div>
  );
}
