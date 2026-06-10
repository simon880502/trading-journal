"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Settings, DEFAULT_SETTINGS, THEMES, ThemeName } from "@/types/settings";
import { supabase } from "@/lib/supabase";

const LS_KEY = "tj_settings";

function saveLocal(s: Settings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

function loadLocal(): Settings | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) {
      const parsed = JSON.parse(v) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): Settings {
  const dbTheme = row.theme && row.theme in THEMES ? (row.theme as ThemeName) : null;
  return {
    symbols:       row.symbols        ?? DEFAULT_SETTINGS.symbols,
    timeframes:    row.timeframes     ?? DEFAULT_SETTINGS.timeframes,
    entryReasons:  row.entry_reasons  ?? DEFAULT_SETTINGS.entryReasons,
    exitReasons:   row.exit_reasons   ?? DEFAULT_SETTINGS.exitReasons,
    emotionLabels: row.emotion_labels ?? DEFAULT_SETTINGS.emotionLabels,
    theme:         dbTheme ?? loadLocal()?.theme ?? DEFAULT_SETTINGS.theme,
  };
}

function toDb(patch: Partial<Settings>) {
  const result: Record<string, unknown> = {};
  if (patch.symbols       !== undefined) result.symbols        = patch.symbols;
  if (patch.timeframes    !== undefined) result.timeframes     = patch.timeframes;
  if (patch.entryReasons  !== undefined) result.entry_reasons  = patch.entryReasons;
  if (patch.exitReasons   !== undefined) result.exit_reasons   = patch.exitReasons;
  if (patch.emotionLabels !== undefined) result.emotion_labels = patch.emotionLabels;
  if (patch.theme         !== undefined) result.theme          = patch.theme;
  return result;
}

const SettingsContext = createContext<{
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Apply cached settings immediately before Supabase responds
    const cached = loadLocal();
    if (cached) setSettings(cached);

    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const fetched = fromDb(data);
          setSettings(fetched);
          saveLocal(fetched); // keep localStorage in sync with Supabase
        }
      });
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next); // persist all settings locally immediately
      return next;
    });
    supabase.from("settings").update(toDb(patch)).eq("id", 1);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
