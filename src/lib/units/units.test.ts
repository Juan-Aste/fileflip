import { describe, expect, it } from "vitest";
import { convertUnit, parseDecimal, unitCategories, units } from "./units";

describe("units", () => {
  it("uses exact definitions", () => {
    expect(convertUnit(1, "length", "in", "cm")).toBeCloseTo(2.54, 12);
    expect(convertUnit(1, "length", "mi", "km")).toBeCloseTo(1.609344, 12);
    expect(convertUnit(1, "mass", "lb", "g")).toBeCloseTo(453.59237, 9);
    expect(convertUnit(1, "volume", "gal", "l")).toBeCloseTo(3.785411784, 12);
    expect(convertUnit(1, "volume", "cup", "floz")).toBeCloseTo(8, 12);
    expect(convertUnit(1, "area", "ac", "m2")).toBeCloseTo(4046.8564224, 9);
    expect(convertUnit(100, "speed", "kmh", "ms")).toBeCloseTo(27.7778, 4);
    expect(convertUnit(1, "speed", "kn", "kmh")).toBeCloseTo(1.852, 12);
    expect(convertUnit(1, "data", "gib", "mb")).toBeCloseTo(1073.741824, 9);
    expect(convertUnit(8, "data", "bit", "b")).toBe(1);
    expect(convertUnit(1, "time", "yr", "d")).toBeCloseTo(365.2425, 9);
  });

  it("converts temperatures with their offsets", () => {
    expect(convertUnit(100, "temperature", "c", "f")).toBeCloseTo(212, 10);
    expect(convertUnit(-40, "temperature", "f", "c")).toBeCloseTo(-40, 10);
    expect(convertUnit(0, "temperature", "k", "c")).toBeCloseTo(-273.15, 10);
    expect(convertUnit(32, "temperature", "f", "k")).toBeCloseTo(273.15, 10);
  });

  it("round-trips every unit through every other in its category", () => {
    for (const category of unitCategories) {
      for (const a of units[category]) {
        for (const b of units[category]) {
          expect(convertUnit(convertUnit(123.456, category, a.id, b.id), category, b.id, a.id)).toBeCloseTo(123.456, 6);
        }
      }
      expect(new Set(units[category].map((x) => x.id)).size).toBe(units[category].length);
    }
  });

  it("reads numbers with either decimal mark", () => {
    expect(parseDecimal("1,5")).toBe(1.5);
    expect(parseDecimal("1.5")).toBe(1.5);
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("1,234.5")).toBe(1234.5);
    expect(parseDecimal("1 234 567")).toBe(1234567);
    expect(parseDecimal("1.234.567")).toBe(1234567);
    expect(parseDecimal("-3,2e3")).toBe(-3200);
    for (const bad of ["", "abc", "1..", ",", "1e", "--1"]) expect(parseDecimal(bad), bad).toBeNull();
  });
});
