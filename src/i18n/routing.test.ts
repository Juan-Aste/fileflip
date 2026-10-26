import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";
import { defaultLocale, locales, routing } from "./routing";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("i18n routing", () => {
  it("supports the five locales with Spanish as default", () => {
    expect(locales).toEqual(["es", "en", "pt", "fr", "zh"]);
    expect(defaultLocale).toBe("es");
    expect(routing.localePrefix).toBe("always");
  });

  it("redirects an unprefixed URL using Accept-Language", () => {
    const res = middleware(request("/", { "accept-language": "pt-BR,pt;q=0.9" }));
    expect(res.headers.get("location")).toBe("http://localhost:3000/pt");
  });

  it("falls back to Spanish for unsupported browser languages", () => {
    const res = middleware(request("/", { "accept-language": "de-DE" }));
    expect(res.headers.get("location")).toBe("http://localhost:3000/es");
  });

  it("prefers the remembered cookie over the browser language", () => {
    const res = middleware(
      request("/", { "accept-language": "en-US", cookie: "NEXT_LOCALE=fr" }),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/fr");
  });

  it("sends no hreflang Link header (it would keep untranslated slugs)", () => {
    const res = middleware(request("/en/csv-to-pdf"));
    expect(res.headers.get("link")).toBeNull();
  });

  it("stores the locale in a long-lived cookie", () => {
    const res = middleware(request("/zh"));
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("NEXT_LOCALE=zh");
    expect(cookie).toMatch(/Max-Age=31536000/i);
  });
});
