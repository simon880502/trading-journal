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
    if (v) return { ...DEFAULT_SETTINGS, ...(JSON.parse(v) as Partial<Settings>) };
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
    theme:         dbTheme ?? DEFAULT_SETTINGS.theme,
  };
}

function toDb(s: Settings) {
  return {
    id:            1,
    symbols:       s.symbols,
    timeframes:    s.timeframes,
    entry_reasons: s.entryReasons,
    exit_reasons:  s.exitReasons,
    emotion_labels: s.emotionLabels,
    theme:         s.theme,
  };
}

const SettingsContext = createContext<{
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const cached = loadLocal();

    // Load from Supabase; only use it if localStorage is empty (first device ever)
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const fetched = fromDb(data);
          if (!cached) {
            // First time on this device: trust Supabase
            setSettings(fetched);
            saveLocal(fetched);
          }
          // If localStorage has data, don't overwrite it with potentially stale Supabase data
        }
      });

    // Use localStorage immediately (fast path)
    if (cached) setSettings(cached);
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      // Upsert full settings (creates row if missing, updates if exists)
      supabase.from("settings").upsert(toDb(next));
      return next;
    });
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
