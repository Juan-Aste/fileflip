import type { Locale } from "@/i18n/routing";
import { conversionFromSlug, conversionSlug } from "./conversion-pages";
import { allToolsSlugs, categoryFromSlug, categorySlug } from "./categories";
import { creditsSlugs } from "./credits";
import { toolFromSlug } from "./tools";
import { longtailFromSlug, longtailTranslation } from "@/content/longtail";

/**
 * Translates a localized pathname to another locale ("/unir-pdf" in es →
 * "/merge-pdf" in en). Paths without translated slugs are returned as is.
 */
export function translatePathname(pathname: string, from: Locale, to: Locale): string {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match) return pathname;
  const slug = decodeURIComponent(match[1]);
  if (slug === allToolsSlugs[from]) return `/${allToolsSlugs[to]}`;
  if (slug === creditsSlugs[from]) return `/${creditsSlugs[to]}`;
  const category = categoryFromSlug(from, slug);
  if (category) return `/${categorySlug(category, to)}`;
  const tool = toolFromSlug(from, slug);
  if (tool) return `/${tool.slugs[to]}`;
  const conversion = conversionFromSlug(from, slug);
  if (conversion) return `/${conversionSlug(conversion, to)}`;
  const longtail = longtailFromSlug(from, slug);
  if (longtail) {
    // Regional pages may not exist in the other language: go to its home.
    const translated = longtailTranslation(longtail, to);
    return translated ? `/${translated.slug}` : "/";
  }
  return pathname;
}
