// Pro plan prices. Edit the numbers here: everything else (pricing page,
// checkout amounts, currency formatting) reads from this file.
//
// Countries where Mercado Pago operates are charged in local currency through
// Mercado Pago. Everyone else sees USD and goes through the international
// provider (to be chosen: Lemon Squeezy, Paddle...).

export const mercadoPagoCountries = ["AR", "BR", "MX", "CL", "CO", "UY", "PE"] as const;
export type MercadoPagoCountry = (typeof mercadoPagoCountries)[number];
export type PricingRegion = MercadoPagoCountry | "INTL";
export type BillingPeriod = "monthly" | "yearly";
export type PaymentProviderId = "mercadopago" | "international";

export interface RegionPrice {
  currency: string;
  monthly: number;
  /** Charged once a year (about two months free). */
  yearly: number;
  provider: PaymentProviderId;
}

export const prices: Record<PricingRegion, RegionPrice> = {
  AR: { currency: "ARS", monthly: 4500, yearly: 45000, provider: "mercadopago" },
  BR: { currency: "BRL", monthly: 19.9, yearly: 199, provider: "mercadopago" },
  MX: { currency: "MXN", monthly: 79, yearly: 790, provider: "mercadopago" },
  CL: { currency: "CLP", monthly: 3990, yearly: 39900, provider: "mercadopago" },
  CO: { currency: "COP", monthly: 16900, yearly: 169000, provider: "mercadopago" },
  UY: { currency: "UYU", monthly: 179, yearly: 1790, provider: "mercadopago" },
  PE: { currency: "PEN", monthly: 14.9, yearly: 149, provider: "mercadopago" },
  INTL: { currency: "USD", monthly: 4.99, yearly: 49, provider: "international" },
};

export const pricingRegions = Object.keys(prices) as PricingRegion[];

/** Manual choice from the country selector. */
export const COUNTRY_COOKIE = "ff_country";

// Geolocation headers set by common hosts/CDNs in front of Railway.
const GEO_HEADERS = ["cf-ipcountry", "x-country-code", "x-geo-country", "cloudfront-viewer-country"];

export function isPricingRegion(value: unknown): value is PricingRegion {
  return typeof value === "string" && value in prices;
}

/** Maps any ISO country code to its pricing region. */
export function regionForCountry(country: string | null | undefined): PricingRegion {
  const code = country?.trim().toUpperCase();
  return code && (mercadoPagoCountries as readonly string[]).includes(code) ? (code as MercadoPagoCountry) : "INTL";
}

/** Region from Accept-Language: "es-AR" → AR, "pt-BR" → BR, "pt" → BR. */
export function regionFromLanguage(acceptLanguage: string | null | undefined): PricingRegion | null {
  const tags = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean);
  for (const tag of tags) {
    const [lang, region] = tag.split("-");
    if (region && regionForCountry(region) !== "INTL") return regionForCountry(region);
    if (lang?.toLowerCase() === "pt" && !region) return "BR";
  }
  return null;
}

/**
 * Picks the pricing region: manual choice (cookie) → hosting geolocation
 * header → browser language → international.
 */
/** ISO country set by the CDN/proxy in front of the app (Cloudflare...), uppercased. */
export function countryFromHeaders(headers: Headers): string | null {
  for (const name of GEO_HEADERS) {
    const value = headers.get(name);
    // "XX" / "T1" are Cloudflare's unknown / Tor markers.
    if (value && /^[A-Za-z]{2}$/.test(value) && !/^(xx|t1)$/i.test(value)) return value.toUpperCase();
  }
  return null;
}

export function detectRegion(headers: Headers, cookieValue?: string | null): PricingRegion {
  if (isPricingRegion(cookieValue)) return cookieValue;
  const country = countryFromHeaders(headers);
  if (country) return regionForCountry(country);
  return regionFromLanguage(headers.get("accept-language")) ?? "INTL";
}

export function priceFor(region: PricingRegion, period: BillingPeriod): { amount: number; currency: string } {
  const price = prices[region];
  return { amount: price[period], currency: price.currency };
}

/** Yearly saving vs paying monthly, as a 0–1 ratio. */
export function yearlySaving(region: PricingRegion): number {
  const { monthly, yearly } = prices[region];
  return 1 - yearly / (monthly * 12);
}
