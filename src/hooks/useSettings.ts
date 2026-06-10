"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, DEFAULT_SETTINGS, THEMES, ThemeName } from "@/types/settings";
import { supabase } from "@/lib/supabase";

const THEME_LS_KEY = "tj_theme";

function getLocalTheme(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_LS_KEY);
    if (v && v in THEMES) return v as ThemeName;
  } catch {}
  return DEFAULT_SETTINGS.theme;
}

// Only sets the DOM attribute — does NOT touch localStorage
function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
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
    theme:         dbTheme ?? getLocalTheme(),
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

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Read localStorage and update state (theme effect below handles DOM apply)
    const localTheme = getLocalTheme();
    if (localTheme !== DEFAULT_SETTINGS.theme) {
      setSettings((prev) => ({ ...prev, theme: localTheme }));
    }

    supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSettings(fromDb(data));
      });
  }, []);

  // Apply theme to DOM on every theme change (does NOT write localStorage)
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    // Persist theme to localStorage only when user explicitly changes it
    if (patch.theme) {
      try { localStorage.setItem(THEME_LS_KEY, patch.theme); } catch {}
    }
    setSettings((prev) => ({ ...prev, ...patch }));
    supabase.from("settings").update(toDb(patch)).eq("id", 1);
  }, []);

  return { settings, update };
}
