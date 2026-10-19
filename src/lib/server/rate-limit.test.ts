import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit per window, then asks to wait", () => {
    let now = 0;
    const limiter = new RateLimiter(3, 60_000, () => now);
    expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([0, 0, 0]);
    now = 10_000;
    expect(limiter.hit("a")).toBe(50_000);
    // Other clients are independent.
    expect(limiter.hit("b")).toBe(0);
  });

  it("frees slots as old hits leave the window", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    limiter.hit("a");
    now = 500;
    limiter.hit("a");
    now = 1000;
    expect(limiter.hit("a")).toBe(0);
    expect(limiter.hit("a")).toBeGreaterThan(0);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x", { headers });

  it("uses the first forwarded address", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
