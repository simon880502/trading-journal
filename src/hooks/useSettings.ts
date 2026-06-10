"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, DEFAULT_SETTINGS, THEMES, ThemeName } from "@/types/settings";
import { supabase } from "@/lib/supabase";

const THEME_LS_KEY = "tj_theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): Settings {
  const theme = (row.theme && row.theme in THEMES ? row.theme : DEFAULT_SETTINGS.theme) as ThemeName;
  return {
    symbols:       row.symbols        ?? DEFAULT_SETTINGS.symbols,
    timeframes:    row.timeframes     ?? DEFAULT_SETTINGS.timeframes,
    entryReasons:  row.entry_reasons  ?? DEFAULT_SETTINGS.entryReasons,
    exitReasons:   row.exit_reasons   ?? DEFAULT_SETTINGS.exitReasons,
    emotionLabels: row.emotion_labels ?? DEFAULT_SETTINGS.emotionLabels,
    theme,
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

function cachedTheme(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_LS_KEY);
    if (v && v in THEMES) return v as ThemeName;
  } catch {}
  return DEFAULT_SETTINGS.theme;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    theme: DEFAULT_SETTINGS.theme,
  });

  // Load cached theme immediately on mount (before Supabase responds)
  useEffect(() => {
    const t = cachedTheme();
    if (t !== DEFAULT_SETTINGS.theme) {
      setSettings((prev) => ({ ...prev, theme: t }));
    }
  }, []);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSettings(fromDb(data));
      });
  }, []);

  // Apply CSS vars + persist to localStorage whenever theme changes
  useEffect(() => {
    const t = THEMES[settings.theme] ?? THEMES.green;
    const root = document.documentElement;
    root.style.setProperty("--accent",  t.accent);
    root.style.setProperty("--accent2", t.accent2);
    root.style.setProperty("--shadow",  t.shadow);
    try { localStorage.setItem(THEME_LS_KEY, settings.theme); } catch {}
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    supabase.from("settings").update(toDb(patch)).eq("id", 1);
  }, []);

  return { settings, update };
}
