import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en", "pt", "fr", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

// Each language written in its own language, for the header switcher.
export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
  zh: "中文",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries its locale prefix (/es, /en, ...).
  localePrefix: "always",
  // Requests without a prefix are redirected using the cookie first,
  // then the browser's Accept-Language header.
  localeDetection: true,
  localeCookie: {
    name: "NEXT_LOCALE",
    // Remember the user's choice for a year (next-intl defaults to a session cookie).
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
});
