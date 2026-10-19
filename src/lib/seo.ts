import type { MetadataRoute } from "next";
import { conversionPages, conversionSlug } from "@/config/conversion-pages";
import { availableTools, tools } from "@/config/tools";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** A page's path in each language, e.g. l => `/${slugs[l]}` ("" for home). */
export type LocalizedPath = (locale: Locale) => string;

/** canonical + hreflang alternates (x-default → the default locale) for Next metadata. */
export function alternatesFor(locale: Locale, path: LocalizedPath) {
  return {
    canonical: `/${locale}${path(locale)}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path(l)}`])),
      "x-default": `/${defaultLocale}${path(defaultLocale)}`,
    },
  };
}

/** Every public, indexable page in every language, with its translations. */
export function sitemapEntries(base = siteUrl()): MetadataRoute.Sitemap {
  const pages: { path: LocalizedPath; priority: number }[] = [
    { path: () => "", priority: 1 },
    { path: () => "/pricing", priority: 0.6 },
    ...availableTools.map((id) => ({ path: (l: Locale) => `/${tools[id].slugs[l]}`, priority: 0.9 })),
    ...conversionPages.map((c) => ({ path: (l: Locale) => `/${conversionSlug(c, l)}`, priority: 0.8 })),
  ];
  return pages.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path(locale)}`,
      changeFrequency: "monthly" as const,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path(l)}`])) },
    })),
  );
}
