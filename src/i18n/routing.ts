import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en", "pt", "fr", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

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
