import { describe, expect, it } from "vitest";
import {
  detectRegion,
  mercadoPagoCountries,
  priceFor,
  prices,
  regionForCountry,
  regionFromLanguage,
  yearlySaving,
} from "./pricing";

const headers = (h: Record<string, string>) => new Headers(h);

describe("pricing config", () => {
  it("charges every Mercado Pago country in local currency through Mercado Pago", () => {
    for (const country of mercadoPagoCountries) {
      expect(prices[country].provider).toBe("mercadopago");
      expect(prices[country].currency).not.toBe("USD");
    }
    expect(prices.INTL).toMatchObject({ currency: "USD", provider: "international" });
  });

  it("makes the yearly plan cheaper than 12 months", () => {
    for (const region of Object.keys(prices) as (keyof typeof prices)[]) {
      expect(yearlySaving(region)).toBeGreaterThan(0.1);
      expect(yearlySaving(region)).toBeLessThan(0.5);
    }
  });

  it("returns amount and currency for a period", () => {
    expect(priceFor("BR", "monthly")).toEqual({ amount: 19.9, currency: "BRL" });
    expect(priceFor("INTL", "yearly")).toEqual({ amount: 49, currency: "USD" });
  });
});

describe("regionForCountry", () => {
  it("maps Mercado Pago countries and sends the rest to INTL", () => {
    expect(regionForCountry("ar")).toBe("AR");
    expect(regionForCountry("MX")).toBe("MX");
    expect(regionForCountry("US")).toBe("INTL");
    expect(regionForCountry("ES")).toBe("INTL");
    expect(regionForCountry(undefined)).toBe("INTL");
  });
});

describe("regionFromLanguage", () => {
  it("uses the region of the browser language", () => {
    expect(regionFromLanguage("es-AR,es;q=0.9,en;q=0.8")).toBe("AR");
    expect(regionFromLanguage("pt-BR")).toBe("BR");
    expect(regionFromLanguage("pt")).toBe("BR");
    expect(regionFromLanguage("en-US,es-CL;q=0.5")).toBe("CL");
  });

  it("returns null when the language says nothing about the country", () => {
    expect(regionFromLanguage("es")).toBeNull();
    expect(regionFromLanguage("en-US")).toBeNull();
    expect(regionFromLanguage("")).toBeNull();
  });
});

describe("detectRegion", () => {
  it("prefers the manual choice, then geolocation, then language", () => {
    const h = headers({ "cf-ipcountry": "CO", "accept-language": "es-MX" });
    expect(detectRegion(h, "UY")).toBe("UY");
    expect(detectRegion(h)).toBe("CO");
    expect(detectRegion(headers({ "accept-language": "es-MX" }))).toBe("MX");
    expect(detectRegion(headers({ "x-country-code": "DE", "accept-language": "es-AR" }))).toBe("INTL");
  });

  it("ignores invalid cookie values and geo placeholders", () => {
    expect(detectRegion(headers({ "cf-ipcountry": "XX" }), "hacker")).toBe("INTL");
    expect(detectRegion(headers({ "cf-ipcountry": "T1", "accept-language": "pt-BR" }))).toBe("BR");
  });
});
