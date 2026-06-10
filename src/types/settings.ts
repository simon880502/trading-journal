export const THEMES = {
  green:  { label: "GREEN",  accent: "#00ff88", accent2: "#00cc6a", shadow: "#003322" },
  cyan:   { label: "CYBER",  accent: "#00ffff", accent2: "#00cccc", shadow: "#003333" },
  purple: { label: "PLASMA", accent: "#cc44ff", accent2: "#aa22dd", shadow: "#220033" },
  amber:  { label: "AMBER",  accent: "#ffaa00", accent2: "#cc8800", shadow: "#332200" },
  red:    { label: "DANGER", accent: "#ff4466", accent2: "#cc2244", shadow: "#330011" },
  blue:   { label: "BLUE",   accent: "#4488ff", accent2: "#2266cc", shadow: "#001133" },
} as const;

export type ThemeName = keyof typeof THEMES;

export interface Settings {
  symbols: string[];
  timeframes: string[];
  entryReasons: string[];
  exitReasons: string[];
  emotionLabels: string[]; // exactly 5
  theme: ThemeName;
}

export const DEFAULT_SETTINGS: Settings = {
  symbols: ["BTC", "ETH", "XAU"],
  timeframes: ["M1", "M5", "M15", "1H", "4H", "1D"],
  entryReasons: ["Breakout", "Pullback", "S/R Level", "Trend Follow", "Pattern"],
  exitReasons: ["TP1", "TP2", "TP3", "SL", "Early SL", "Manual"],
  emotionLabels: ["TILT", "ANXIOUS", "NEUTRAL", "CONFIDENT", "FLOW"],
  theme: "green",
};
