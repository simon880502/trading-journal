"use client";

import { useMemo, useState } from "react";
import { Trade, tradeRR } from "@/types/trade";
import { Settings } from "@/types/settings";
import { NumPad } from "@/components/NumPad";

interface Props {
  onClose: () => void;
  onSave: (trade: Omit<Trade, "id">) => void;
  initial?: Trade;
  settings: Settings;
}

type NumPadTarget = {
  key: keyof FormState;
  label: string;
};

type PctMode = "price" | "percent";

interface FormState {
  date: string;
  timeframe: string;
  symbol: string;
  side: "BUY" | "SELL";
  entry: string;
  sl: string;
  tp: string;
  tp2: string;
  tp3: string;
  exitPrice: string;
  positionSize: string;
  entryReasons: string[];
  exitReason: string;
  emotion: number | null;
  notes: string;
  // percentage inputs
  slPct: string;
  tpPct: string;
  tp2Pct: string;
  tp3Pct: string;
}

const today = new Date().toISOString().slice(0, 10);

// Which exit reason maps to which price field
const EXIT_AUTO_MAP: Record<string, keyof FormState> = {
  TP1: "tp",
  TP2: "tp2",
  TP3: "tp3",
  SL:  "sl",
};

function initForm(t?: Trade): FormState {
  return {
    date:         t?.date                      ?? today,
    timeframe:    t?.timeframe                 ?? "",
    symbol:       t?.symbol                    ?? "",
    side:         t?.side                      ?? "BUY",
    entry:        t?.entry?.toString()         ?? "",
    sl:           t?.sl?.toString()            ?? "",
    tp:           t?.tp?.toString()            ?? "",
    tp2:          t?.tp2?.toString()           ?? "",
    tp3:          t?.tp3?.toString()           ?? "",
    exitPrice:    t?.exitPrice?.toString()     ?? "",
    positionSize: t?.positionSize?.toString()  ?? "",
    entryReasons: t?.entryReasons              ?? [],
    exitReason:   t?.exitReason               ?? "",
    emotion:      t?.emotion                   ?? null,
    notes:        t?.notes                     ?? "",
    slPct:        "",
    tpPct:        "",
    tp2Pct:       "",
    tp3Pct:       "",
  };
}

// Helper: compute price from percentage
function pctToPrice(entry: string, pct: string, side: "BUY" | "SELL", direction: "sl" | "tp"): string {
  const e = parseFloat(entry);
  const p = parseFloat(pct);
  if (!e || !p || isNaN(e) || isNaN(p)) return "";
  const multiplier = (direction === "sl")
    ? (side === "BUY" ? 1 - p / 100 : 1 + p / 100)
    : (side === "BUY" ? 1 + p / 100 : 1 - p / 100);
  return (e * multiplier).toFixed(4).replace(/\.?0+$/, "");
}

// Small helper: price row with numpad trigger + % mode toggle
function PriceRow({
  label,
  field,
  pctField,
  pctDir,
  form,
  set,
  openPad,
  optional,
  pctMode,
}: {
  label: string;
  field: keyof FormState;
  pctField?: keyof FormState;
  pctDir?: "sl" | "tp";
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  openPad: (t: NumPadTarget) => void;
  optional?: boolean;
  pctMode?: PctMode;
}) {
  const showPct = pctMode === "percent" && pctField && pctDir;
  const activeField = showPct ? pctField! : field;
  const computedPrice = showPct
    ? pctToPrice(form.entry, form[pctField!] as string, form.side, pctDir!)
    : null;

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 8, color: "var(--muted)", width: 52, flexShrink: 0 }}>{label}</span>
        <input
          type="number"
          className="pixel-input"
          style={{ flex: 1, marginBottom: 0 }}
          value={form[activeField] as string}
          onChange={(e) => set(activeField, e.target.value)}
          placeholder={showPct ? "0.00 %" : (optional ? "optional" : "0.00")}
          step={showPct ? "0.01" : "0.01"}
          min="0"
        />
        <button
          type="button"
          className="pixel-btn"
          onClick={() => openPad({ key: activeField, label: showPct ? label + " %" : label })}
          style={{ padding: "6px 10px", fontSize: 10, flexShrink: 0 }}
          title="Open Numpad"
        >
          #
        </button>
      </div>
      {showPct && computedPrice && (
        <div style={{ paddingLeft: 58, marginTop: 2 }}>
          <span style={{ fontSize: 7, color: "var(--accent)" }}>= {computedPrice}</span>
        </div>
      )}
    </div>
  );
}

// Section divider
function Section({ title }: { title: string }) {
  return (
    <div style={{ margin: "16px 0 10px", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
      <p style={{ fontSize: 8, color: "var(--accent)" }}>── {title}</p>
    </div>
  );
}

export function TradeModal({ onClose, onSave, initial, settings }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(initial));
  const [numpad, setNumpad] = useState<NumPadTarget | null>(null);
  const [error, setError] = useState("");
  const [pctMode, setPctMode] = useState<PctMode>("price");

  function set(k: keyof FormState, v: string | number | string[] | null) {
    setForm((p) => ({ ...p, [k]: v }));
    setError("");
  }

  function toggleEntryReason(r: string) {
    setForm((p) => ({
      ...p,
      entryReasons: p.entryReasons.includes(r)
        ? p.entryReasons.filter((x) => x !== r)
        : [...p.entryReasons, r],
    }));
  }

  function selectExitReason(reason: string) {
    const mapKey = EXIT_AUTO_MAP[reason];
    const autoPrice = mapKey ? (form[mapKey] as string) : "";
    setForm((p) => ({
      ...p,
      exitReason: reason,
      exitPrice: autoPrice || p.exitPrice,
    }));
  }

  // Live risk ratio (based on TP1)
  const rr = useMemo(() => {
    const entry = parseFloat(form.entry);
    const slVal = pctMode === "percent"
      ? parseFloat(pctToPrice(form.entry, form.slPct, form.side, "sl"))
      : parseFloat(form.sl);
    const tpVal = pctMode === "percent"
      ? parseFloat(pctToPrice(form.entry, form.tpPct, form.side, "tp"))
      : parseFloat(form.tp);
    if (!entry || !slVal || !tpVal) return null;
    return tradeRR(entry, slVal, tpVal);
  }, [form.entry, form.sl, form.tp, form.slPct, form.tpPct, form.side, pctMode]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol)               { setError("SELECT A SYMBOL");        return; }
    if (!form.date)                  { setError("DATE IS REQUIRED");       return; }
    const entry        = parseFloat(form.entry);
    const isPct = pctMode === "percent";
    const sl = isPct
      ? parseFloat(pctToPrice(form.entry, form.slPct, form.side, "sl"))
      : parseFloat(form.sl);
    const tp = isPct
      ? parseFloat(pctToPrice(form.entry, form.tpPct, form.side, "tp"))
      : parseFloat(form.tp);
    const tp2 = isPct
      ? parseFloat(pctToPrice(form.entry, form.tp2Pct, form.side, "tp"))
      : parseFloat(form.tp2);
    const tp3 = isPct
      ? parseFloat(pctToPrice(form.entry, form.tp3Pct, form.side, "tp"))
      : parseFloat(form.tp3);
    const positionSize = parseFloat(form.positionSize);
    if (isNaN(entry) || entry <= 0)            { setError("INVALID ENTRY");         return; }
    if (isNaN(sl)    || sl    <= 0)            { setError("INVALID SL");            return; }
    if (isNaN(positionSize) || positionSize <= 0) { setError("INVALID POSITION $"); return; }

    onSave({
      date:         form.date,
      symbol:       form.symbol,
      side:         form.side,
      entry,
      sl,
      tp:           tp    || undefined,
      tp2:          tp2   || undefined,
      tp3:          tp3   || undefined,
      timeframe:    form.timeframe || undefined,
      exitPrice:    parseFloat(form.exitPrice) || undefined,
      positionSize,
      entryReasons: form.entryReasons,
      exitReason:   form.exitReason || undefined,
      emotion:      form.emotion ?? undefined,
      notes:        form.notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: "rgba(0,0,0,0.88)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="pixel-box"
          style={{
            width: "100%",
            maxWidth: 420,
            margin: "0 16px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "var(--accent)" }}>
              {initial ? "► EDIT TRADE" : "► NEW TRADE"}
            </p>
          </div>

          {/* Scrollable body */}
          <form
            onSubmit={handleSubmit}
            style={{ overflowY: "auto", padding: "12px 16px", flex: 1 }}
          >
            {/* ── SYMBOL ── */}
            <label className="pixel-label">SYMBOL</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {settings.symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="pixel-btn"
                  onClick={() => set("symbol", s)}
                  style={
                    form.symbol === s
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent2)", fontSize: 8, padding: "6px 10px" }
                      : { fontSize: 8, padding: "6px 10px" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>

            {/* ── SIDE ── */}
            <Section title="DIRECTION" />
            <div style={{ display: "flex", gap: 8 }}>
              {(["BUY", "SELL"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="pixel-btn"
                  onClick={() => set("side", s)}
                  style={
                    form.side === s
                      ? {
                          flex: 1,
                          background: s === "BUY" ? "var(--buy)" : "var(--red)",
                          color: "#000",
                          borderColor: s === "BUY" ? "var(--buy2)" : "#aa0000",
                          fontSize: 8,
                        }
                      : { flex: 1, fontSize: 8 }
                  }
                >
                  {s === "BUY" ? "▲ BUY" : "▼ SELL"}
                </button>
              ))}
            </div>

            {/* ── DATE ── */}
            <Section title="DATE" />
            <input
              type="date"
              className="pixel-input"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />

            {/* ── TIMEFRAME ── */}
            <Section title="TIMEFRAME" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {settings.timeframes.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className="pixel-btn"
                  onClick={() => set("timeframe", form.timeframe === tf ? "" : tf)}
                  style={
                    form.timeframe === tf
                      ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent2)", fontSize: 8, padding: "6px 10px" }
                      : { fontSize: 8, padding: "6px 10px" }
                  }
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* ── PRICE LEVELS ── */}
            <Section title="PRICE LEVELS" />
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["price", "percent"] as PctMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="pixel-btn"
                  onClick={() => setPctMode(m)}
                  style={
                    pctMode === m
                      ? { flex: 1, background: "var(--accent)", color: "#000", borderColor: "var(--accent2)", fontSize: 8 }
                      : { flex: 1, fontSize: 8 }
                  }
                >
                  {m === "price" ? "$ PRICE" : "% PERCENT"}
                </button>
              ))}
            </div>
            <PriceRow label="ENTRY $"  field="entry" form={form} set={set} openPad={setNumpad} />
            <PriceRow label={pctMode === "percent" ? "SL %" : "SL $"}
              field="sl" pctField="slPct" pctDir="sl"
              form={form} set={set} openPad={setNumpad} pctMode={pctMode} />
            <PriceRow label={pctMode === "percent" ? "TP1 %" : "TP1 $"}
              field="tp" pctField="tpPct" pctDir="tp"
              form={form} set={set} openPad={setNumpad} optional pctMode={pctMode} />
            <PriceRow label={pctMode === "percent" ? "TP2 %" : "TP2 $"}
              field="tp2" pctField="tp2Pct" pctDir="tp"
              form={form} set={set} openPad={setNumpad} optional pctMode={pctMode} />
            <PriceRow label={pctMode === "percent" ? "TP3 %" : "TP3 $"}
              field="tp3" pctField="tp3Pct" pctDir="tp"
              form={form} set={set} openPad={setNumpad} optional pctMode={pctMode} />

            {/* Risk Ratio */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 8, color: "var(--muted)", marginRight: 8 }}>RISK RATIO</span>
              <span style={{ fontSize: 12, color: rr != null ? "var(--accent)" : "var(--border)" }}>
                {rr != null ? `1 : ${rr.toFixed(2)}` : "—"}
              </span>
            </div>

            {/* ── POSITION SIZE ── */}
            <Section title="POSITION SIZE" />
            <PriceRow label="SIZE $" field="positionSize" form={form} set={set} openPad={setNumpad} />

            {/* ── ENTRY REASONS ── */}
            <Section title="ENTRY REASONS" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {settings.entryReasons.map((r) => {
                const active = form.entryReasons.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    className="pixel-btn"
                    onClick={() => toggleEntryReason(r)}
                    style={
                      active
                        ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent2)", fontSize: 7, padding: "5px 8px" }
                        : { fontSize: 7, padding: "5px 8px" }
                    }
                  >
                    {active ? "✓ " : ""}{r}
                  </button>
                );
              })}
            </div>

            {/* ── EXIT ── */}
            <Section title="EXIT" />
            <label className="pixel-label">EXIT REASON</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {settings.exitReasons.map((r) => {
                const active = form.exitReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    className="pixel-btn"
                    onClick={() => selectExitReason(active ? "" : r)}
                    style={
                      active
                        ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent2)", fontSize: 7, padding: "5px 8px" }
                        : { fontSize: 7, padding: "5px 8px" }
                    }
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            <PriceRow label="EXIT $" field="exitPrice" form={form} set={set} openPad={setNumpad} optional />

            {/* ── EMOTION ── */}
            <Section title="EMOTION" />
            <div style={{ display: "flex", gap: 6 }}>
              {settings.emotionLabels.map((lbl, i) => {
                const lvl = i + 1;
                const active = form.emotion === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    className="pixel-btn"
                    onClick={() => set("emotion", active ? null : lvl)}
                    style={{
                      flex: 1,
                      padding: "8px 2px",
                      textAlign: "center",
                      ...(active
                        ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent2)" }
                        : {}),
                    }}
                  >
                    <span style={{ fontSize: 10, display: "block" }}>{lvl}</span>
                    <span style={{ fontSize: 6, display: "block", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden" }}>
                      {lbl.slice(0, 7)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── NOTES ── */}
            <Section title="NOTES" />
            <textarea
              className="pixel-input"
              rows={2}
              placeholder="optional..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              style={{ resize: "none" }}
            />

            {error && (
              <p style={{ fontSize: 8, color: "var(--red)", marginTop: 8 }}>✕ {error}</p>
            )}
          </form>

          {/* Fixed footer */}
          <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <button type="submit" form="" className="pixel-btn pixel-btn-filled" style={{ flex: 1 }}
              onClick={handleSubmit as unknown as React.MouseEventHandler}>
              SAVE ►
            </button>
            <button type="button" className="pixel-btn" onClick={onClose} style={{ flex: 1 }}>
              CANCEL
            </button>
          </div>
        </div>
      </div>

      {/* NumPad — renders above the modal */}
      {numpad && (
        <NumPad
          label={numpad.label}
          value={form[numpad.key] as string}
          onConfirm={(v) => set(numpad.key, v)}
          onClose={() => setNumpad(null)}
        />
      )}
    </>
  );
}
