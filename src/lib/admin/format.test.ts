import { describe, expect, it } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("picks ms, seconds or minutes", () => {
    expect(formatDuration(850.4)).toBe("850 ms");
    expect(formatDuration(2345)).toBe("2.3 s");
    expect(formatDuration(4 * 60_000 + 10_000)).toBe("4 min");
  });
});
