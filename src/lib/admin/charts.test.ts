import { describe, expect, it } from "vitest";
import { barShares, labelIndexes, lineGeometry, niceMax, tickCountFor } from "./charts";

describe("niceMax", () => {
  it("rounds up to 1, 2, 2.5 or 5 × 10^n, at least 4", () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(3)).toBe(4);
    expect(niceMax(4.5)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(18)).toBe(20);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(1000)).toBe(1000);
  });
});

describe("lineGeometry", () => {
  it("maps values to the plot area with the baseline at the bottom", () => {
    const g = lineGeometry(
      [
        { key: "a", value: 0 },
        { key: "b", value: 5 },
        { key: "c", value: 10 },
      ],
      200,
      100,
    );
    expect(g.yMax).toBe(10);
    expect(g.points.map((p) => [p.x, p.y])).toEqual([
      [0, 100],
      [100, 50],
      [200, 0],
    ]);
    expect(g.path).toBe("M0 100 L100 50 L200 0");
    expect(g.area).toBe("M0 100 L100 50 L200 0 L200 100 L0 100 Z");
    expect(g.ticks.map((t) => t.value)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("centers a single point and handles an empty series", () => {
    expect(lineGeometry([{ key: "a", value: 3 }], 200, 100).points[0].x).toBe(100);
    const empty = lineGeometry([], 200, 100);
    expect(empty.path).toBe("");
    expect(empty.area).toBe("");
  });
});

describe("tickCountFor", () => {
  it("keeps tick values whole", () => {
    for (const max of [4, 5, 10, 20, 25, 50, 100, 250, 1000]) {
      const n = tickCountFor(max);
      expect(Number.isInteger(max / n)).toBe(true);
    }
  });
});

describe("labelIndexes", () => {
  it("keeps the first and last label and spreads the rest", () => {
    expect(labelIndexes(3)).toEqual([0, 1, 2]);
    expect(labelIndexes(30, 6)).toEqual([0, 6, 12, 17, 23, 29]);
  });
});

describe("barShares", () => {
  it("is relative to the largest row", () => {
    expect(barShares([{ count: 10 }, { count: 5 }, { count: 0 }])).toEqual([1, 0.5, 0]);
    expect(barShares([{ count: 0 }])).toEqual([0]);
  });
});
