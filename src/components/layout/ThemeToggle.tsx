"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { applyTheme, THEME_STORAGE_KEY, themes, type Theme } from "./theme";

const icons: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "💻" };

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return themes.includes(stored as Theme) ? (stored as Theme) : "system";
  } catch {
    return "system";
  }
}

export default function ThemeToggle() {
  const t = useTranslations("Theme");
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => setTheme(readTheme()), []);

  // Keep following the OS while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
      aria-label={`${t("toggle")}: ${t(theme)}`}
      title={`${t("toggle")}: ${t(theme)}`}
    >
      <span aria-hidden="true">{icons[theme]}</span>
      <span className="hidden sm:inline">{t(theme)}</span>
    </button>
  );
}
