import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "./format";

// Intl may use narrow/non-breaking spaces; normalize them for assertions.
const n = (s: string) => s.replace(/[  ]/g, " ");

describe("formatNumber", () => {
  it("uses the locale's separators", () => {
    expect(n(formatNumber(1234567.5, "en"))).toBe("1,234,567.5");
    expect(n(formatNumber(1234567.5, "pt"))).toBe("1.234.567,5");
    expect(n(formatNumber(1234567.5, "fr"))).toBe("1 234 567,5");
  });
});

describe("formatBytes", () => {
  it("scales units by 1024", () => {
    expect(n(formatBytes(512, "en"))).toBe("512 byte");
    expect(n(formatBytes(1536, "en"))).toBe("1.5 kB");
    expect(n(formatBytes(5 * 1024 * 1024, "en"))).toBe("5 MB");
  });

  it("formats decimals per locale", () => {
    expect(n(formatBytes(1.5 * 1024 * 1024, "pt"))).toBe("1,5 MB");
  });

  it("never returns negative sizes", () => {
    expect(n(formatBytes(-10, "en"))).toBe("0 byte");
  });
});

describe("formatCurrency", () => {
  it("formats local currencies", () => {
    expect(n(formatCurrency(29.9, "BRL", "pt"))).toBe("R$ 29,90");
    expect(n(formatCurrency(4.99, "USD", "en"))).toBe("$4.99");
  });

  it("drops decimals for whole amounts", () => {
    expect(n(formatCurrency(4990, "ARS", "es"))).toBe("$ 4.990");
    expect(n(formatCurrency(4990, "ARS", "en"))).toBe("ARS 4,990");
    expect(n(formatCurrency(5, "USD", "en"))).toBe("$5");
  });
});

describe("formatDate", () => {
  it("formats dates in the user's language", () => {
    const date = new Date(Date.UTC(2026, 9, 19, 12));
    expect(formatDate(date, "en", { dateStyle: "long", timeZone: "UTC" })).toBe(
      "October 19, 2026",
    );
    expect(formatDate(date, "es", { dateStyle: "long", timeZone: "UTC" })).toBe(
      "19 de octubre de 2026",
    );
    expect(formatDate(date, "zh", { dateStyle: "long", timeZone: "UTC" })).toBe(
      "2026年10月19日",
    );
  });
});

describe("formatPercent", () => {
  it("rounds to whole percents", () => {
    expect(n(formatPercent(0.634, "en"))).toBe("63%");
    expect(n(formatPercent(0.634, "fr"))).toBe("63 %");
  });
});
