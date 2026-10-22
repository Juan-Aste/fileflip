import { describe, expect, it } from "vitest";
import { convertTimestamps, formatInZone, parseTimestamp, zoneOffsetMinutes } from "./time";
import { MAX_UUIDS, generateUuids } from "./uuid";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-([47])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  it("generates unique v4 ids with the version and variant bits", () => {
    const ids = generateUuids({ version: "v4", count: 2000, upperCase: false, hyphens: true });
    expect(new Set(ids).size).toBe(2000);
    for (const id of ids) expect(UUID.exec(id)?.[1]).toBe("4");
  });

  it("v7 starts with the time and sorts in creation order within the same millisecond", () => {
    const now = Date.UTC(2026, 9, 21, 6, 30);
    const ids = generateUuids({ version: "v7", count: 5000, upperCase: false, hyphens: true }, now);
    for (const id of ids) expect(UUID.exec(id)?.[1]).toBe("7");
    expect(parseInt(ids[0]!.replace(/-/g, "").slice(0, 12), 16)).toBe(now);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(5000);
  });

  it("formats in upper case and without hyphens, and clamps the count", () => {
    const [id] = generateUuids({ version: "v4", count: 1, upperCase: true, hyphens: false });
    expect(id).toMatch(/^[0-9A-F]{12}4[0-9A-F]{3}[89AB][0-9A-F]{15}$/);
    expect(generateUuids({ version: "v4", count: 0, upperCase: false, hyphens: true })).toHaveLength(1);
    expect(generateUuids({ version: "v4", count: 1e9, upperCase: false, hyphens: true })).toHaveLength(MAX_UUIDS);
  });

  it("v7 moves to the next millisecond when the counter overflows", () => {
    const now = 1_000_000;
    const zero = (n: number) => new Uint8Array(n);
    const ids = generateUuids({ version: "v7", count: 4097, upperCase: false, hyphens: false }, now, zero);
    expect(parseInt(ids[4095]!.slice(0, 12), 16)).toBe(now);
    expect(ids[4095]!.slice(12, 16)).toBe("7fff");
    expect(parseInt(ids[4096]!.slice(0, 12), 16)).toBe(now + 1);
    expect([...ids].sort()).toEqual(ids);
  });
});

describe("timestamps", () => {
  it("detects seconds, milliseconds, microseconds and nanoseconds by length", () => {
    const ms = 1_700_000_000_000;
    expect(parseTimestamp("1700000000", "auto", "UTC")).toBe(ms);
    expect(parseTimestamp("1700000000.25", "auto", "UTC")).toBe(ms + 250);
    expect(parseTimestamp("1700000000000", "auto", "UTC")).toBe(ms);
    expect(parseTimestamp("1700000000000123", "auto", "UTC")).toBe(ms);
    expect(parseTimestamp("1700000000000123456", "auto", "UTC")).toBe(ms);
    expect(parseTimestamp("-86400", "auto", "UTC")).toBe(-86_400_000);
    expect(parseTimestamp("1700000000", "ms", "UTC")).toBe(1_700_000_000);
    expect(() => parseTimestamp("9".repeat(25), "s", "UTC")).toThrow();
  });

  it("reads ISO 8601 and RFC 2822 dates, in the chosen zone when they have no offset", () => {
    expect(parseTimestamp("2023-11-14T22:13:20Z", "auto", "America/Argentina/Buenos_Aires")).toBe(1_700_000_000_000);
    expect(parseTimestamp("2023-11-14T19:13:20-03:00", "auto", "UTC")).toBe(1_700_000_000_000);
    expect(parseTimestamp("2023-11-14 19:13:20", "auto", "America/Argentina/Buenos_Aires")).toBe(1_700_000_000_000);
    expect(parseTimestamp("2023-11-15 06:13:20.5", "auto", "Asia/Shanghai")).toBe(1_700_000_000_500);
    expect(parseTimestamp("2023-11-14", "auto", "UTC")).toBe(Date.UTC(2023, 10, 14));
    expect(parseTimestamp("Tue, 14 Nov 2023 22:13:20 GMT", "auto", "Asia/Shanghai")).toBe(1_700_000_000_000);
    expect(parseTimestamp("0050-01-01T00:00:00Z", "auto", "UTC")).toBe(Date.parse("0050-01-01T00:00:00Z"));
    for (const bad of ["2023-02-29", "2024-13-01", "2023-11-14T25:00", "yesterday", "", "1e9"]) {
      expect(() => parseTimestamp(bad, "auto", "UTC"), bad).toThrow();
    }
    expect(parseTimestamp("2024-02-29", "auto", "UTC")).toBe(Date.UTC(2024, 1, 29));
  });

  it("handles daylight saving time changes", () => {
    // New York: 2024-03-10 02:30 does not exist; 2024-11-03 01:30 happens twice (the earlier, EDT, is used).
    expect(zoneOffsetMinutes(Date.UTC(2024, 0, 1), "America/New_York")).toBe(-300);
    expect(zoneOffsetMinutes(Date.UTC(2024, 6, 1), "America/New_York")).toBe(-240);
    expect(parseTimestamp("2024-07-01 12:00", "auto", "America/New_York")).toBe(Date.UTC(2024, 6, 1, 16));
    expect(parseTimestamp("2024-11-03 01:30", "auto", "America/New_York")).toBe(Date.UTC(2024, 10, 3, 5, 30));
    expect(formatInZone(Date.UTC(2024, 6, 1, 16), "America/New_York")).toEqual({ local: "2024-07-01 12:00:00.000", offset: "UTC-04:00" });
    expect(formatInZone(Date.UTC(2024, 0, 1), "Asia/Kolkata")).toEqual({ local: "2024-01-01 05:30:00.000", offset: "UTC+05:30" });
    expect(formatInZone(-1, "UTC")).toEqual({ local: "1969-12-31 23:59:59.999", offset: "UTC+00:00" });
  });

  it("converts lines to CSV and reports the line of an invalid one", () => {
    const csv = convertTimestamps("1700000000\n\n2023-11-14T22:13:20.123Z\n", "auto", "America/Sao_Paulo");
    expect(csv).toBe(
      [
        "input,unix_seconds,unix_milliseconds,iso_8601_utc,America/Sao_Paulo,utc_offset",
        "1700000000,1700000000,1700000000000,2023-11-14T22:13:20.000Z,2023-11-14 19:13:20.000,UTC-03:00",
        "2023-11-14T22:13:20.123Z,1700000000.123,1700000000123,2023-11-14T22:13:20.123Z,2023-11-14 19:13:20.123,UTC-03:00",
        "",
      ].join("\n"),
    );
    expect(() => convertTimestamps("1700000000\n  not a date", "auto", "UTC")).toThrow(
      expect.objectContaining({ code: "invalidData", position: { line: 2, column: 3 } }),
    );
    expect(() => convertTimestamps("   \n", "auto", "UTC")).toThrow(expect.objectContaining({ code: "invalidData" }));
    expect(() => convertTimestamps("1", "auto", "Mars/Olympus")).toThrow(expect.objectContaining({ code: "invalidData" }));
  });
});
