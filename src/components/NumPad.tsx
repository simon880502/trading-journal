"use client";

import { useState } from "react";

interface NumPadProps {
  label: string;
  value: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

const ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "DEL"],
];

export function NumPad({ label, value, onConfirm, onClose }: NumPadProps) {
  const [local, setLocal] = useState(value || "");

  function press(key: string) {
    setLocal((prev) => {
      if (key === "DEL") return prev.slice(0, -1);
      if (key === "." && prev.includes(".")) return prev;
      if (key === "0" && prev === "0") return prev;
      if (key !== "." && key !== "DEL" && prev === "0") return key;
      return prev + key;
    });
  }

  function confirm() {
    onConfirm(local.replace(/\.$/, "") || "0");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pixel-box p-4" style={{ width: "min(92vw, 320px)" }}>
        {/* Label */}
        <p style={{ fontSize: 8, color: "var(--muted)", marginBottom: 8 }}>{label}</p>

        {/* Display */}
        <div
          style={{
            background: "#000",
            border: "2px solid var(--accent)",
            padding: "10px 12px",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: 20, color: "var(--accent)", letterSpacing: 1 }}>
            {local || "0"}
          </span>
          <span className="blink" style={{ fontSize: 16, color: "var(--accent)" }}>▮</span>
        </div>

        {/* Digit grid */}
        {ROWS.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className={key === "DEL" ? "pixel-btn pixel-btn-danger" : "pixel-btn"}
                style={{
                  flex: 1,
                  padding: "18px 4px",
                  fontSize: key === "DEL" ? 10 : 16,
                  textAlign: "center",
                  letterSpacing: key === "DEL" ? 1 : 0,
                }}
              >
                {key === "DEL" ? "⌫ DEL" : key}
              </button>
            ))}
          </div>
        ))}

        {/* CLR + DONE */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setLocal("")}
            className="pixel-btn pixel-btn-danger"
            style={{ flex: 1, padding: "16px 4px", fontSize: 10 }}
          >
            CLR
          </button>
          <button
            type="button"
            onClick={confirm}
            className="pixel-btn pixel-btn-filled"
            style={{ flex: 2, padding: "16px 4px", fontSize: 12 }}
          >
            DONE ►
          </button>
        </div>
      </div>
    </div>
  );
}
