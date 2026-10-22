import { describe, expect, it } from "vitest";
import { overlayMargin, overlayPlacements, overlayPositions, TILE_ANGLE } from "./overlay";

const image = { width: 1000, height: 750 };
const item = { width: 200, height: 50 };

describe("overlayPlacements", () => {
  it("puts the item in each of the 9 places, inside the margin", () => {
    const m = overlayMargin(image.width, image.height);
    expect(m).toBe(23);
    const at = Object.fromEntries(overlayPositions.map((p) => [p, overlayPlacements(image, item, p)]));
    expect(at.tl).toEqual([{ x: m + 100, y: m + 25, angle: 0 }]);
    expect(at.mc).toEqual([{ x: 500, y: 375, angle: 0 }]);
    expect(at.br).toEqual([{ x: 1000 - m - 100, y: 750 - m - 25, angle: 0 }]);
    expect(at.tr![0]!.y).toBe(at.tl![0]!.y);
    expect(at.bc![0]!.x).toBe(500);
  });

  it("tiles the whole image, corners included, tilted", () => {
    const tiles = overlayPlacements(image, item, "tile");
    expect(tiles.length).toBeGreaterThan(12);
    expect(tiles.every((t) => t.angle === TILE_ANGLE)).toBe(true);
    // Every region of the image has a tile center near it.
    for (const [x, y] of [[0, 0], [1000, 0], [0, 750], [1000, 750], [500, 375]] as const) {
      const nearest = Math.min(...tiles.map((t) => Math.hypot(t.x - x, t.y - y)));
      expect(nearest).toBeLessThan(260);
    }
    // Nothing is placed far outside.
    expect(tiles.every((t) => t.x > -250 && t.x < 1250 && t.y > -250 && t.y < 1000)).toBe(true);
  });

  it("keeps the tile count reasonable for tiny items", () => {
    expect(overlayPlacements({ width: 4000, height: 3000 }, { width: 2, height: 1 }, "tile").length).toBeLessThan(2000);
  });
});
