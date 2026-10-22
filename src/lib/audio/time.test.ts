import { describe, expect, it } from "vitest";
import { fadeGain, fadeLengths, formatTime, parseTime, validRange } from "./time";

describe("parseTime", () => {
  it("reads seconds, m:ss and h:mm:ss with a dot or comma", () => {
    expect(parseTime("12")).toBe(12);
    expect(parseTime(" 1:23.5 ")).toBe(83.5);
    expect(parseTime("1:23,5")).toBe(83.5);
    expect(parseTime("0:01:05")).toBe(65);
    expect(parseTime("2:00:00.0")).toBe(7200);
    expect(parseTime("90.25")).toBe(90.25);
  });

  it("rejects typos and anything that isn't a time", () => {
    for (const bad of ["", "abc", "1:75", "1:60:00", "-3", "1::2", "1:2:3:4", "1.2.3", "1e3", ":30"]) expect(parseTime(bad), bad).toBeNull();
  });

  it("round-trips formatTime to the tenth", () => {
    for (const s of [0, 0.5, 59.9, 60, 83.5, 3599.9, 3600, 7322.4]) expect(parseTime(formatTime(s))).toBeCloseTo(s, 5);
    expect(formatTime(83.46)).toBe("1:23.5");
    expect(formatTime(3725)).toBe("1:02:05.0");
    expect(formatTime(-1)).toBe("0:00.0");
  });
});

describe("ranges and fades", () => {
  it("a range must lie inside the audio and last at least 0.1 s", () => {
    expect(validRange({ start: 0, end: 2 }, 2)).toBe(true);
    // The end typed from the rounded duration may be a few hundredths over it.
    expect(validRange({ start: 0.5, end: 2.04 }, 2)).toBe(true);
    expect(validRange({ start: 1, end: 1.05 }, 2)).toBe(false);
    expect(validRange({ start: 1.5, end: 1 }, 2)).toBe(false);
    expect(validRange({ start: 0, end: 3 }, 2)).toBe(false);
  });

  it("fades rise and fall linearly and never overlap", () => {
    expect(fadeLengths(10, 2, 2)).toEqual({ fadeIn: 2, fadeOut: 2 });
    expect(fadeLengths(1, 2, 2)).toEqual({ fadeIn: 0.5, fadeOut: 0.5 });
    expect(fadeGain(0, 10, 2, 2)).toBe(0);
    expect(fadeGain(1, 10, 2, 2)).toBe(0.5);
    expect(fadeGain(5, 10, 2, 2)).toBe(1);
    expect(fadeGain(9, 10, 2, 2)).toBe(0.5);
    expect(fadeGain(10, 10, 2, 2)).toBe(0);
    expect(fadeGain(0.1, 10, 0, 0)).toBe(1);
  });
});
