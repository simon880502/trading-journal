"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { THEMES } from "@/types/settings";

export function ThemeApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    const t = THEMES[settings.theme] ?? THEMES.green;
    const root = document.documentElement;
    root.style.setProperty("--accent",  t.accent);
    root.style.setProperty("--accent2", t.accent2);
    root.style.setProperty("--shadow",  t.shadow);
  }, [settings.theme]);

  return null;
}
