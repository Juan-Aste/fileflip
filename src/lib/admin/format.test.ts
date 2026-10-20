import { describe, expect, it } from "vitest";
import { formatBucket, formatDuration } from "./format";

describe("formatDuration", () => {
  it("picks ms, seconds or minutes", () => {
    expect(formatDuration(850.4)).toBe("850 ms");
    expect(formatDuration(2345)).toBe("2.3 s");
    expect(formatDuration(4 * 60_000 + 10_000)).toBe("4 min");
  });
});

describe("formatBucket", () => {
  it("formats day and month keys in UTC", () => {
    expect(formatBucket("2026-10-01")).toBe("1 oct");
    expect(formatBucket("2026-01")).toBe("ene 2026");
  });
});
