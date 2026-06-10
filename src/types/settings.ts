export interface Settings {
  symbols: string[];
  timeframes: string[];
  entryReasons: string[];
  exitReasons: string[];
  emotionLabels: string[]; // exactly 5
}

export const DEFAULT_SETTINGS: Settings = {
  symbols: ["BTC", "ETH", "XAU"],
  timeframes: ["M1", "M5", "M15", "1H", "4H", "1D"],
  entryReasons: ["Breakout", "Pullback", "S/R Level", "Trend Follow", "Pattern"],
  exitReasons: ["TP1", "TP2", "TP3", "SL", "Early SL", "Manual"],
  emotionLabels: ["TILT", "ANXIOUS", "NEUTRAL", "CONFIDENT", "FLOW"],
};
