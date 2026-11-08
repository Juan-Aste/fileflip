import type { Conversion } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { pt } from "./pt";
import type {
  ConversionContent,
  ConversionContentMap,
  ConversionKey,
} from "./types";
import { zh } from "./zh";

export type { ConversionContent } from "./types";

export const conversionContentByLocale: Record<Locale, ConversionContentMap> = {
  es,
  en,
  pt,
  fr,
  zh,
};

export const conversionKey = (
  c: Pick<Conversion, "from" | "to">,
): ConversionKey => `${c.from}>${c.to}`;

/** Own text of an indexed conversion page, if it has been written. */
export function conversionContent(
  c: Pick<Conversion, "from" | "to">,
  locale: Locale,
): ConversionContent | undefined {
  return conversionContentByLocale[locale][conversionKey(c)];
}
