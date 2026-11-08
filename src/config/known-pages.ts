import { locales, type Locale } from "@/i18n/routing";
import { allToolsSlugs, categorySlug, publishedCategories } from "./categories";
import { conversionPages, conversionSlug } from "./conversion-pages";
import { creditsSlugs } from "./credits";
import { availableTools, tools } from "./tools";
import { longtailPages, longtailTranslation } from "@/content/longtail";
import { guideLocales, guidePath, guides, guidesSlugs } from "@/content/guides/meta";

// Every page whose slug is translated, with its path in each language where it
// exists (without the locale prefix): { es: "/unir-pdf", en: "/merge-pdf", ... }.
// The middleware uses it to send a slug of one language under another
// language's prefix (/es/merge-pdf, /zh/extraer-audio-de-video) or without a
// prefix (/csv-to-pdf) to the right page with one 301 (Search Console reported
// 339 such URLs as 404 on 2026-11-07, see docs/seo/gsc-2026-11-07).
// Pages with the same path in every language (/privacy, /terms, /contact...)
// are not here: they never had a foreign slug.

export type LocalizedPaths = Partial<Record<Locale, string>>;

function everyLocale(path: (l: Locale) => string): LocalizedPaths {
  return Object.fromEntries(locales.map((l) => [l, path(l)]));
}

function buildPages(): LocalizedPaths[] {
  const pages: LocalizedPaths[] = [
    everyLocale((l) => `/${allToolsSlugs[l]}`),
    everyLocale((l) => `/${creditsSlugs[l]}`),
    Object.fromEntries(guideLocales.map((l) => [l, `/${guidesSlugs[l]}`])),
    ...publishedCategories.map((c) => everyLocale((l) => `/${categorySlug(c, l)}`)),
    ...availableTools.map((id) => everyLocale((l) => `/${tools[id].slugs[l]}`)),
    ...conversionPages.map((c) => everyLocale((l) => `/${conversionSlug(c, l)}`)),
  ];
  const seenLongtail = new Set<string>();
  for (const page of longtailPages) {
    if (seenLongtail.has(page.id)) continue;
    const versions: LocalizedPaths = {};
    for (const l of locales) {
      const t = longtailTranslation(page, l);
      if (t) {
        versions[l] = `/${t.slug}`;
        seenLongtail.add(t.id);
      }
    }
    pages.push(versions);
  }
  for (const guide of guides) {
    const versions: LocalizedPaths = {};
    for (const l of locales) {
      const path = guidePath(guide, l);
      if (path) versions[l] = path;
    }
    if (Object.keys(versions).length) pages.push(versions);
  }
  return pages;
}

export const knownPages: readonly LocalizedPaths[] = buildPages();

/** path → pages that use it, with the languages where they use it (first language wins on ties). */
const byPath = new Map<string, { page: LocalizedPaths; locales: Locale[] }[]>();
for (const page of knownPages) {
  for (const l of locales) {
    const path = page[l];
    if (!path) continue;
    const list = byPath.get(path) ?? [];
    const entry = list.find((e) => e.page === page);
    if (entry) entry.locales.push(l);
    else list.push({ page, locales: [l] });
    byPath.set(path, list);
  }
}

function normalize(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // keep it as is
  }
  return decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded;
}

/** Whether `path` (no locale prefix) is a page with translated slugs in `locale`. */
export function isKnownPath(locale: Locale, path: string): boolean {
  return byPath.get(normalize(path))?.some((e) => e.locales.includes(locale)) ?? false;
}

/** Where a page missing in a language goes: guides → that language's index, else its home. */
function fallback(page: LocalizedPaths, locale: Locale): string {
  const isGuide = Object.values(page).some((p) => p?.split("/").length === 3);
  return isGuide && guideLocales.includes(locale) ? `/${locale}/${guidesSlugs[locale]}` : `/${locale}`;
}

/**
 * Full path (with prefix) for a URL under `/${locale}` whose slug belongs to
 * another language, or undefined when it is already right or unknown.
 */
export function foreignSlugRedirect(locale: Locale, path: string): string | undefined {
  const entries = byPath.get(normalize(path));
  if (!entries || entries.some((e) => e.locales.includes(locale))) return undefined;
  const { page } = entries[0];
  const target = page[locale];
  return target ? `/${locale}${target}` : fallback(page, locale);
}

/** Public pages with the same path in every language (Search Console saw them without prefix). */
const samePathPages = ["/privacy", "/terms", "/contact", "/about"];

/** Order used to guess the language of a slug without prefix. */
const detectionOrder: Locale[] = ["es", "en", "pt", "fr", "zh"];

/**
 * Full path for a URL without locale prefix whose slug is a known page
 * (/unir-pdf → /es/unir-pdf, /csv-to-pdf → /en/csv-to-pdf), or undefined.
 */
export function unprefixedRedirect(path: string): string | undefined {
  const normalized = normalize(path);
  // Same path in every language: the default one, so the redirect can be permanent.
  if (samePathPages.includes(normalized)) return `/${detectionOrder[0]}${normalized}`;
  const entries = byPath.get(normalized);
  if (!entries) return undefined;
  for (const l of detectionOrder) {
    const entry = entries.find((e) => e.locales.includes(l));
    if (entry) return `/${l}${entry.page[l]}`;
  }
  return undefined;
}
