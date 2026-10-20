import { describe, expect, it } from "vitest";
import { bucketKeys, change, dayKey, parseDay, resolvePeriod } from "./period";

const now = new Date("2026-10-20T15:30:00Z");
const iso = (d: Date) => d.toISOString();

describe("resolvePeriod", () => {
  it("today: the whole UTC day, compared with yesterday", () => {
    const p = resolvePeriod({ period: "today" }, now);
    expect(iso(p.start)).toBe("2026-10-20T00:00:00.000Z");
    expect(iso(p.end)).toBe("2026-10-21T00:00:00.000Z");
    expect(iso(p.previous.start)).toBe("2026-10-19T00:00:00.000Z");
    expect(iso(p.previous.end)).toBe("2026-10-20T00:00:00.000Z");
    expect(p.bucket).toBe("day");
  });

  it("7 and 30 days include today", () => {
    const week = resolvePeriod({ period: "7d" }, now);
    expect(bucketKeys(week)).toHaveLength(7);
    expect(bucketKeys(week)[0]).toBe("2026-10-14");
    expect(dayKey(week.previous.start)).toBe("2026-10-07");
    const month = resolvePeriod({ period: "30d" }, now);
    expect(bucketKeys(month)).toHaveLength(30);
    expect(bucketKeys(month).at(-1)).toBe("2026-10-20");
  });

  it("12 months: calendar months up to the current one, per month", () => {
    const p = resolvePeriod({ period: "12m" }, now);
    expect(p.bucket).toBe("month");
    expect(bucketKeys(p)).toEqual([
      "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
      "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
    ]);
    expect(iso(p.previous.start)).toBe("2024-11-01T00:00:00.000Z");
    expect(iso(p.previous.end)).toBe("2025-11-01T00:00:00.000Z");
  });

  it("custom: inclusive dates, per day or per month when long", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-09-01", to: "2026-09-10" }, now);
    expect(bucketKeys(p)).toHaveLength(10);
    expect(dayKey(p.previous.start)).toBe("2026-08-22");
    expect(dayKey(p.previous.end)).toBe("2026-09-01");
    const long = resolvePeriod({ period: "custom", from: "2026-01-01", to: "2026-09-30" }, now);
    expect(long.bucket).toBe("month");
    expect(bucketKeys(long)).toHaveLength(9);
  });

  it("caps very long custom ranges", () => {
    const p = resolvePeriod({ period: "custom", from: "1990-01-01", to: "2026-10-20" }, now);
    expect(p.start.getUTCFullYear()).toBeGreaterThanOrEqual(2023);
  });

  it("falls back to 30 days on anything invalid", () => {
    expect(resolvePeriod({}, now).preset).toBe("30d");
    expect(resolvePeriod({ period: "forever" }, now).preset).toBe("30d");
    expect(resolvePeriod({ period: "custom", from: "2026-10-10", to: "2026-10-01" }, now).preset).toBe("30d");
    expect(resolvePeriod({ period: "custom", from: "2026-02-30", to: "2026-03-01" }, now).preset).toBe("30d");
  });
});

describe("helpers", () => {
  it("parses only real YYYY-MM-DD dates", () => {
    expect(parseDay("2026-10-20")?.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(parseDay("2026-13-01")).toBeNull();
    expect(parseDay("20/10/2026")).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });

  it("computes the change vs the previous period", () => {
    expect(change(150, 100)).toBe(0.5);
    expect(change(50, 100)).toBe(-0.5);
    expect(change(10, 0)).toBeNull();
  });
});
