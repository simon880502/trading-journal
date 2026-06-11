"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/components/SettingsProvider";
import { TradeModal } from "@/components/TradeModal";
import { EquityChart } from "@/components/EquityChart";
import { Trade, TradeMode, tradePnl, tradePct } from "@/types/trade";

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
  const [mode, setModeState] = useState<TradeMode>("real");

  // Load last used mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("trade_mode") as TradeMode | null;
    if (saved === "real" || saved === "sim") setModeState(saved);
  }, []);

  function setMode(m: TradeMode) {
    setModeState(m);
    localStorage.setItem("trade_mode", m);
  }

  const { trades, loading, add, update, remove, totalPnl, winRate, streak } = useTrades(mode);
  const { settings } = useSettings();
  const [modal, setModal] = useState<{ open: boolean; trade?: Trade }>({ open: false });

  const closedCount = trades.filter((t) => t.exitPrice != null).length;
  const openCount   = trades.filter((t) => t.exitPrice == null).length;

  const statsGrid = [
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
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["real", "sim"] as TradeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="pixel-btn"
                  style={
                    mode === m
                      ? {
                          fontSize: 8,
                          padding: "6px 10px",
                          background: m === "real" ? "var(--accent)" : "var(--red)",
                          color: "#000",
                          borderColor: m === "real" ? "var(--accent2)" : "#aa0000",
                        }
                      : { fontSize: 8, padding: "6px 10px" }
                  }
                >
                  {m === "real" ? "◈ REAL" : "◇ SIM"}
                </button>
              ))}
            </div>
            <Link href="/settings" className="pixel-btn" style={{ fontSize: 8, padding: "6px 10px" }}>
              ⚙ SETTINGS
            </Link>
          </div>
        </div>
        {/* Mode banner */}
        {mode === "sim" && (
          <div style={{
            marginTop: 10,
            padding: "4px 10px",
            background: "rgba(255,68,102,0.12)",
            border: "1px solid var(--red)",
            display: "inline-block",
          }}>
            <span style={{ fontSize: 7, color: "var(--red)" }}>
              ◇ SIMULATION MODE — trades are not real
            </span>
          </div>
        )}
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
      <EquityChart trades={trades} />

      {/* TRADE TABLE */}
      <div className="pixel-box p-4">
        <p style={{ fontSize: 8, color: "var(--text)", marginBottom: 14 }}>► TRADE LOG</p>

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
              style={{ fontSize: 8, borderCollapse: "collapse", width: "100%", minWidth: 520 }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}></th>
                  <th style={{ textAlign: "left"  }}>DATE</th>
                  <th style={{ textAlign: "left"  }}>TF</th>
                  <th style={{ textAlign: "left"  }}>SYMBOL</th>
                  <th style={{ textAlign: "left"  }}>SIDE</th>
                  <th style={{ textAlign: "right" }}>ENTRY</th>
                  <th style={{ textAlign: "right" }}>EXIT</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                  <th style={{ textAlign: "right" }}>%</th>
                  <th style={{ textAlign: "center" }}>EMO</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const pnl = tradePnl(t);
                  const pct = tradePct(t);
                  const isOpen = t.exitPrice == null;
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          className="pixel-btn"
                          onClick={() => setModal({ open: true, trade: t })}
                          style={{ fontSize: 8, padding: "4px 8px" }}
                        >
                          ✎
                        </button>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{t.date}</td>
                      <td style={{ color: "var(--accent)", fontSize: 7 }}>{t.timeframe ?? "—"}</td>
                      <td style={{ color: "var(--text)" }}>{t.symbol}</td>
                      <td style={{ color: t.side === "BUY" ? "var(--buy)" : "var(--red)" }}>
                        {t.side === "BUY" ? "▲" : "▼"} {t.side}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>
                        {t.entry.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {isOpen ? (
                          <span className="blink" style={{ color: "var(--accent)" }}>OPEN</span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>{t.exitPrice!.toLocaleString()}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", color: pnl == null ? "var(--border)" : pnl >= 0 ? "var(--accent)" : "var(--red)" }}>
                        {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`}
                      </td>
                      <td style={{ textAlign: "right", color: pct == null ? "var(--border)" : pct >= 0 ? "var(--accent)" : "var(--red)" }}>
                        {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
                      </td>
                      <td style={{ textAlign: "center", color: "var(--accent)" }}>
                        {t.emotion ?? "—"}
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button className="pixel-btn pixel-btn-filled" onClick={() => setModal({ open: true })}>
          + NEW TRADE
        </button>
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
            else add({ ...t, mode });
          }}
        />
      )}
    </div>
  );
}
