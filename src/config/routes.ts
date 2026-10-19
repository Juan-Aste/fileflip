import type { Locale } from "@/i18n/routing";
import { conversionFromSlug, conversionSlug } from "./conversion-pages";
import { toolFromSlug } from "./tools";

/**
 * Translates a localized pathname to another locale ("/unir-pdf" in es →
 * "/merge-pdf" in en). Paths without translated slugs are returned as is.
 */
export function translatePathname(pathname: string, from: Locale, to: Locale): string {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match) return pathname;
  const slug = decodeURIComponent(match[1]);
  const tool = toolFromSlug(from, slug);
  if (tool) return `/${tool.slugs[to]}`;
  const conversion = conversionFromSlug(from, slug);
  return conversion ? `/${conversionSlug(conversion, to)}` : pathname;
}
