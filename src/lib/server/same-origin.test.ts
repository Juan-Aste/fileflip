import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const req = (headers: Record<string, string>) => new Request("http://internal:8080/api/tts", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts the site's own origin (host header or NEXT_PUBLIC_SITE_URL)", () => {
    expect(isSameOrigin(req({ origin: "https://fileflect.com", host: "fileflect.com" }), undefined)).toBe(true);
    expect(isSameOrigin(req({ origin: "https://fileflect.com", host: "internal:8080" }), "https://fileflect.com")).toBe(true);
    expect(isSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000", "sec-fetch-site": "same-origin" }), undefined)).toBe(true);
  });

  it("refuses other sites, missing or malformed Origin and cross-site fetches", () => {
    expect(isSameOrigin(req({ origin: "https://evil.example", host: "fileflect.com" }), "https://fileflect.com")).toBe(false);
    expect(isSameOrigin(req({ host: "fileflect.com" }), "https://fileflect.com")).toBe(false);
    expect(isSameOrigin(req({ origin: "null", host: "fileflect.com" }), "https://fileflect.com")).toBe(false);
    expect(isSameOrigin(req({ origin: "https://fileflect.com", host: "fileflect.com", "sec-fetch-site": "cross-site" }), undefined)).toBe(false);
  });
});
