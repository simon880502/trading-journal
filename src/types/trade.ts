export type TradeMode = "real" | "sim";

export interface Trade {
  id: string;
  date: string;
  time?: string;       // HH:MM format
  accountId?: string;  // uuid
  timeframe?: string;
  symbol: string;
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp?: number;
  tp2?: number;
  tp3?: number;
  exitPrice?: number;    // auto-filled from exitReason; null = still open
  positionSize: number;  // USD dollar amount
  entryReasons: string[];
  exitReason?: string;
  emotion?: number;      // 1-5
  notes?: string;
  deletedAt?: string;  // ISO string; present = soft-deleted
  mode: TradeMode;       // "real" or "sim"
  screenshots: string[]; // public URLs
}

export function tradePnl(t: Trade): number | null {
  if (t.exitPrice == null) return null;
  const side = t.side === "BUY" ? 1 : -1;
  return t.positionSize * ((t.exitPrice - t.entry) / t.entry) * side;
}

export function tradePct(t: Trade): number | null {
  if (t.exitPrice == null) return null;
  const side = t.side === "BUY" ? 1 : -1;
  return ((t.exitPrice - t.entry) / t.entry) * 100 * side;
}

export function tradeRR(entry: number, sl: number, tp: number): number | null {
  const risk = Math.abs(entry - sl);
  if (risk === 0) return null;
  return Math.abs(tp - entry) / risk;
}

// R multiple: how many R the trade made/lost (based on exit vs entry vs sl)
export function tradeR(t: Trade): number | null {
  if (t.exitPrice == null) return null;
  const risk = Math.abs(t.entry - t.sl);
  if (risk === 0) return null;
  const side = t.side === "BUY" ? 1 : -1;
  return ((t.exitPrice - t.entry) / risk) * side;
}
