import type { MetadataRoute } from "next";
import { allToolsSlugs, categorySlug, publishedCategories } from "@/config/categories";
import { conversionPages, conversionSlug } from "@/config/conversion-pages";
import { creditsSlugs } from "@/config/credits";
import { availableTools, tools } from "@/config/tools";
import { longtailPages, longtailTranslation } from "@/content/longtail";
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
    { path: () => "/privacy", priority: 0.3 },
    { path: () => "/terms", priority: 0.3 },
    { path: () => "/contact", priority: 0.3 },
    { path: (l: Locale) => `/${creditsSlugs[l]}`, priority: 0.2 },
    { path: (l: Locale) => `/${allToolsSlugs[l]}`, priority: 0.8 },
    ...publishedCategories.map((c) => ({ path: (l: Locale) => `/${categorySlug(c, l)}`, priority: 0.8 })),
    ...availableTools.map((id) => ({ path: (l: Locale) => `/${tools[id].slugs[l]}`, priority: 0.9 })),
    ...conversionPages.map((c) => ({ path: (l: Locale) => `/${conversionSlug(c, l)}`, priority: 0.8 })),
  ];
  const localized = pages.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path(locale)}`,
      changeFrequency: "monthly" as const,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path(l)}`])) },
    })),
  );
  // Long-tail pages exist only in the languages they were written in.
  const longtail = longtailPages.map((page) => {
    const versions = locales.flatMap((l) => {
      const t = longtailTranslation(page, l);
      return t ? [[l, `${base}/${l}/${t.slug}`] as const] : [];
    });
    return {
      url: `${base}/${page.locale}/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: Object.fromEntries(versions) },
    };
  });
  return [...localized, ...longtail];
}

/** SoftwareApplication structured data (schema.org) for a free web tool page. */
export function softwareApplicationJsonLd({
  name,
  description,
  url,
  locale,
}: {
  name: string;
  description: string;
  url: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    inLanguage: locale,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web browser",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}
