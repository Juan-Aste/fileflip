import type { Locale } from "@/i18n/routing";
import { conversions, type Conversion, type FormatId } from "./formats";

// One landing page per conversion, with a slug in each language:
// /es/jpg-a-webp, /en/jpg-to-webp, /pt/jpg-para-webp, /fr/jpg-en-webp.

const connector: Record<Locale, string> = { es: "a", en: "to", pt: "para", fr: "en", zh: "to" };

/** Words people search for, instead of bare extensions. */
const slugName: Partial<Record<FormatId, string>> = { docx: "word", xlsx: "excel", pptx: "powerpoint" };

const nameOf = (format: FormatId) => slugName[format] ?? format;

export function conversionSlug(conversion: Pick<Conversion, "from" | "to">, locale: Locale): string {
  return `${nameOf(conversion.from)}-${connector[locale]}-${nameOf(conversion.to)}`;
}

const bySlug = new Map<string, Conversion>();
for (const c of conversions.filter((c) => c.from !== c.to)) {
  for (const locale of Object.keys(connector) as Locale[]) bySlug.set(`${locale}:${conversionSlug(c, locale)}`, c);
}

export function conversionFromSlug(locale: Locale, slug: string): Conversion | undefined {
  return bySlug.get(`${locale}:${slug}`);
}

/** Every conversion with a page (same-format compression lives on the converter). */
export const conversionPages: readonly Conversion[] = conversions.filter((c) => c.from !== c.to);

/** Other conversions to link to: same input or same output. */
export function relatedConversions(conversion: Conversion, max = 8): Conversion[] {
  const sameFrom = conversionPages.filter((c) => c.from === conversion.from && c.to !== conversion.to);
  const sameTo = conversionPages.filter((c) => c.to === conversion.to && c.from !== conversion.from);
  const out: Conversion[] = [];
  for (let i = 0; out.length < max && (i < sameFrom.length || i < sameTo.length); i++) {
    if (sameFrom[i]) out.push(sameFrom[i]);
    if (sameTo[i] && out.length < max) out.push(sameTo[i]);
  }
  return out;
}
