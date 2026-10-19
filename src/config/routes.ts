import type { Locale } from "@/i18n/routing";
import { toolFromSlug } from "./tools";

/**
 * Translates a localized pathname to another locale ("/unir-pdf" in es →
 * "/merge-pdf" in en). Paths without translated slugs are returned as is.
 */
export function translatePathname(pathname: string, from: Locale, to: Locale): string {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match) return pathname;
  const tool = toolFromSlug(from, decodeURIComponent(match[1]));
  return tool ? `/${tool.slugs[to]}` : pathname;
}
