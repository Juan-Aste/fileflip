import type { Locale } from "@/i18n/routing";

// BCP 47 tags used for Intl formatting of each UI locale.
export const intlLocale: Record<Locale, string> = {
  es: "es-419",
  en: "en-US",
  pt: "pt-BR",
  fr: "fr-FR",
  zh: "zh-CN",
};

const UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(intlLocale[locale], options).format(value);
}

/** Human-readable file size using 1024 steps, e.g. "1,5 MB". */
export function formatBytes(bytes: number, locale: Locale) {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return formatNumber(value, locale, {
    style: "unit",
    unit: UNITS[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  });
}

// Country conventions for local currencies, so an Argentine reading Spanish
// sees "$ 4.990" rather than the generic Latin American "ARS 4,990".
const currencyLocale: Record<string, string> = {
  ARS: "es-AR",
  MXN: "es-MX",
  CLP: "es-CL",
  COP: "es-CO",
  UYU: "es-UY",
  PEN: "es-PE",
  BRL: "pt-BR",
};

/** Money with the currency's usual symbol; whole amounts drop the decimals. */
export function formatCurrency(amount: number, currency: string, locale: Locale) {
  const local = currencyLocale[currency];
  const tag =
    local && local.startsWith(`${locale}-`) ? local : intlLocale[locale];
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : undefined,
  }).format(amount);
}

export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
) {
  return new Intl.DateTimeFormat(intlLocale[locale], options).format(
    new Date(date),
  );
}

export function formatPercent(ratio: number, locale: Locale) {
  return formatNumber(ratio, locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
}
