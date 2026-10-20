"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { applyTheme, THEME_STORAGE_KEY, themes, type Theme } from "./theme";

const icons: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

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

  // Also re-apply on mount: pages rendered on the client (the 404 for unknown
  // URLs uses Next's error shell) never run the inline theme script.
  useEffect(() => {
    const saved = readTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

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

  const Icon = icons[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-border px-2.5 text-sm text-muted transition hover:border-brand hover:text-foreground md:h-9"
      aria-label={`${t("toggle")}: ${t(theme)}`}
      title={`${t("toggle")}: ${t(theme)}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span className="hidden lg:inline">{t(theme)}</span>
    </button>
  );
}
