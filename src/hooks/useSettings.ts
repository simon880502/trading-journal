"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, DEFAULT_SETTINGS } from "@/types/settings";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDb(row: any): Settings {
  return {
    symbols:       row.symbols        ?? DEFAULT_SETTINGS.symbols,
    timeframes:    row.timeframes     ?? DEFAULT_SETTINGS.timeframes,
    entryReasons:  row.entry_reasons  ?? DEFAULT_SETTINGS.entryReasons,
    exitReasons:   row.exit_reasons   ?? DEFAULT_SETTINGS.exitReasons,
    emotionLabels: row.emotion_labels ?? DEFAULT_SETTINGS.emotionLabels,
  };
}

function toDb(patch: Partial<Settings>) {
  const result: Record<string, unknown> = {};
  if (patch.symbols       !== undefined) result.symbols        = patch.symbols;
  if (patch.timeframes    !== undefined) result.timeframes     = patch.timeframes;
  if (patch.entryReasons  !== undefined) result.entry_reasons  = patch.entryReasons;
  if (patch.exitReasons   !== undefined) result.exit_reasons   = patch.exitReasons;
  if (patch.emotionLabels !== undefined) result.emotion_labels = patch.emotionLabels;
  return result;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

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

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    supabase.from("settings").update(toDb(patch)).eq("id", 1);
  }, []);

  return { settings, update };
}
