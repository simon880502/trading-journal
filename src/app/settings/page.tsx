"use client";

import Link from "next/link";
import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { DEFAULT_SETTINGS, THEMES, ThemeName } from "@/types/settings";

function ListSection({
  title,
  items,
  onAdd,
  onRemove,
  placeholder,
  uppercase,
}: {
  title: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder?: string;
  uppercase?: boolean;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = uppercase ? input.trim().toUpperCase() : input.trim();
    if (!v || items.includes(v)) return;
    onAdd(v);
    setInput("");
  }

  return (
    <div className="pixel-box p-4" style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 12 }}>► {title}</p>

      {/* Current items */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{ display: "flex", alignItems: "center", gap: 4, border: "2px solid var(--border)", padding: "4px 6px" }}
          >
            <span style={{ fontSize: 8, color: "var(--text)" }}>{item}</span>
            <button
              onClick={() => onRemove(item)}
              className="pixel-btn pixel-btn-danger"
              style={{ fontSize: 8, padding: "2px 5px", boxShadow: "none" }}
            >
              ✕
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p style={{ fontSize: 8, color: "var(--muted)" }}>EMPTY — ADD BELOW</p>
        )}
      </div>

      {/* Add row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          className="pixel-input"
          value={input}
          placeholder={placeholder ?? "..."}
          maxLength={24}
          style={{ flex: 1 }}
          onChange={(e) => setInput(uppercase ? e.target.value.toUpperCase() : e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button onClick={add} className="pixel-btn pixel-btn-filled" style={{ fontSize: 8, padding: "6px 10px" }}>
          + ADD
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update } = useSettings();

  const [emotionLabels, setEmotionLabels] = useState<string[]>([]);
  const [emotionInit, setEmotionInit] = useState(false);

  // Lazy-init emotion labels from settings (avoids hydration mismatch)
  if (!emotionInit && settings.emotionLabels.length > 0) {
    setEmotionLabels(settings.emotionLabels);
    setEmotionInit(true);
  }

  function saveEmotionLabel(index: number, value: string) {
    const next = [...emotionLabels];
    next[index] = value.toUpperCase().slice(0, 10);
    setEmotionLabels(next);
    update({ emotionLabels: next });
  }

  function resetAll() {
    if (!confirm("Reset all settings to defaults?")) return;
    update(DEFAULT_SETTINGS);
    setEmotionLabels(DEFAULT_SETTINGS.emotionLabels);
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      {/* Header */}
      <header className="pixel-box p-4" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Link href="/" className="pixel-btn" style={{ fontSize: 8, padding: "8px 12px" }}>
          ◄ BACK
        </Link>
        <h1 style={{ fontSize: 14, color: "var(--text)" }}>⚙ SETTINGS</h1>
      </header>

      {/* COLOR THEME */}
      <div className="pixel-box p-4" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 12 }}>► COLOR THEME</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(Object.entries(THEMES) as [ThemeName, typeof THEMES[ThemeName]][]).map(([name, t]) => {
            const active = (settings.theme ?? "green") === name;
            return (
              <button
                key={name}
                onClick={() => update({ theme: name })}
                style={{
                  padding: "8px 14px",
                  border: `2px solid ${t.accent}`,
                  background: active ? t.accent : "transparent",
                  color: active ? "#000" : t.accent,
                  fontFamily: "var(--font-pixel), monospace",
                  fontSize: 8,
                  cursor: "pointer",
                  boxShadow: active ? `2px 2px 0 ${t.accent2}` : "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SYMBOLS */}
      <ListSection
        title="SYMBOLS"
        items={settings.symbols}
        placeholder="e.g. SPX"
        uppercase
        onAdd={(v) => update({ symbols: [...settings.symbols, v] })}
        onRemove={(v) => update({ symbols: settings.symbols.filter((x) => x !== v) })}
      />

      {/* TIMEFRAMES */}
      <ListSection
        title="TIMEFRAMES"
        items={settings.timeframes}
        placeholder="e.g. 2H"
        uppercase
        onAdd={(v) => update({ timeframes: [...settings.timeframes, v] })}
        onRemove={(v) => update({ timeframes: settings.timeframes.filter((x) => x !== v) })}
      />

      {/* ENTRY REASONS */}
      <ListSection
        title="ENTRY REASONS"
        items={settings.entryReasons}
        placeholder="e.g. Breakout"
        onAdd={(v) => update({ entryReasons: [...settings.entryReasons, v] })}
        onRemove={(v) => update({ entryReasons: settings.entryReasons.filter((x) => x !== v) })}
      />

      {/* EXIT REASONS */}
      <ListSection
        title="EXIT REASONS"
        items={settings.exitReasons}
        placeholder="e.g. TP1"
        onAdd={(v) => update({ exitReasons: [...settings.exitReasons, v] })}
        onRemove={(v) => update({ exitReasons: settings.exitReasons.filter((x) => x !== v) })}
      />

      {/* EMOTION LABELS */}
      <div className="pixel-box p-4" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 8, color: "var(--accent)", marginBottom: 12 }}>► EMOTION LABELS (1–5)</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ flex: 1, minWidth: 80 }}>
              <p style={{ fontSize: 8, color: "var(--muted)", marginBottom: 4, textAlign: "center" }}>LVL {i + 1}</p>
              <input
                type="text"
                className="pixel-input"
                value={emotionLabels[i] ?? ""}
                maxLength={10}
                style={{ textAlign: "center" }}
                onChange={(e) => saveEmotionLabel(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={resetAll} className="pixel-btn pixel-btn-danger" style={{ fontSize: 8 }}>
          ↺ RESET TO DEFAULTS
        </button>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}
