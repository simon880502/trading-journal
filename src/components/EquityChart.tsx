"use client";

import { Trade, tradePnl } from "@/types/trade";

const W = 500;
const H = 110;
const PAD_X = 8;
const PAD_Y = 12;

export function EquityChart({ trades }: { trades: Trade[] }) {
  const closed = trades.filter((t) => t.exitPrice != null);

  if (closed.length === 0) {
    return (
      <div className="pixel-box p-4">
        <p style={{ fontSize: 8, color: "var(--muted)", marginBottom: 16 }}>► EQUITY CURVE</p>
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="blink" style={{ fontSize: 8, color: "var(--muted)" }}>NO CLOSED TRADES YET ▮</p>
        </div>
      </div>
    );
  }

  const sorted = [...closed].sort((a, b) => a.date.localeCompare(b.date));

  let cum = 0;
  const points = [{ pnl: 0 }];
  for (const t of sorted) {
    cum += tradePnl(t) ?? 0;
    points.push({ pnl: cum });
  }

  const pnls = points.map((p) => p.pnl);
  const minP = Math.min(...pnls, 0);
  const maxP = Math.max(...pnls, 0);
  const range = maxP - minP || 1;

  const toX = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const toY = (v: number) => H - PAD_Y - ((v - minP) / range) * (H - PAD_Y * 2);
  const zeroY = toY(0);

  let path = `M ${toX(0)} ${toY(points[0].pnl)}`;
  for (let i = 1; i < points.length; i++) {
    path += ` H ${toX(i)} V ${toY(points[i].pnl)}`;
  }

  const finalPnl = points[points.length - 1].pnl;

  return (
    <div className="pixel-box p-4">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 8, color: "var(--muted)" }}>► EQUITY CURVE</p>
        <p style={{ fontSize: 8, color: finalPnl >= 0 ? "var(--accent)" : "var(--red)" }}>
          {finalPnl >= 0 ? "+" : ""}${finalPnl.toFixed(2)}
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 110 }}>
        <line
          x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY}
          stroke="var(--border)" strokeWidth={1} strokeDasharray="6,4"
        />
        <path
          d={path}
          fill="none"
          stroke={finalPnl >= 0 ? "var(--accent)" : "var(--red)"}
          strokeWidth={2}
          strokeLinejoin="miter"
        />
        {points.map((p, i) => (
          <rect
            key={i}
            x={toX(i) - 3} y={toY(p.pnl) - 3}
            width={6} height={6}
            fill={p.pnl >= 0 ? "var(--accent)" : "var(--red)"}
          />
        ))}
      </svg>
    </div>
  );
}
