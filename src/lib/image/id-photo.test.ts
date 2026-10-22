import { describe, expect, it } from "vitest";
import { ID_SHEET_MM, idPhotoPresets, photoPixels, setJpegDpi, sheetLayout, type IdPhotoPreset } from "./id-photo";

describe("sheetLayout", () => {
  it("fits as many copies as possible on a 10 × 15 cm print, inside the margins and without overlaps", () => {
    const counts = Object.fromEntries((Object.keys(idPhotoPresets) as IdPhotoPreset[]).map((p) => [p, sheetLayout(p).copies.length]));
    expect(counts).toEqual({ "30x40": 9, "40x40": 6, "35x45": 8, "25x30": 15, "51x51": 2 });
    for (const preset of Object.keys(idPhotoPresets) as IdPhotoPreset[]) {
      const layout = sheetLayout(preset);
      const { width, height } = idPhotoPresets[preset];
      expect([layout.width, layout.height].sort()).toEqual([ID_SHEET_MM.width, ID_SHEET_MM.height].sort());
      for (const [i, a] of layout.copies.entries()) {
        expect(a.x).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(a.y).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(a.x + width).toBeLessThanOrEqual(layout.width - 3 + 1e-9);
        expect(a.y + height).toBeLessThanOrEqual(layout.height - 3 + 1e-9);
        for (const b of layout.copies.slice(i + 1)) {
          const apart = b.x >= a.x + width + 2 - 1e-9 || a.x >= b.x + width + 2 - 1e-9 || b.y >= a.y + height + 2 - 1e-9 || a.y >= b.y + height + 2 - 1e-9;
          expect(apart, `${preset}: copies ${i} and another are at least 2 mm apart`).toBe(true);
        }
      }
    }
  });

  it("gives the photo's pixels at 600 dpi", () => {
    expect(photoPixels("30x40")).toEqual({ width: 709, height: 945 });
    expect(photoPixels("51x51")).toEqual({ width: 1205, height: 1205 });
  });
});

describe("setJpegDpi", () => {
  const jfif = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  it("writes dots per inch into the JFIF header", () => {
    const out = setJpegDpi(jfif, 600);
    expect([...out.subarray(13, 18)]).toEqual([1, 2, 88, 2, 88]);
    expect(jfif[13], "the input is not modified").toBe(0);
  });
  it("leaves other files alone", () => {
    const exif = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0]);
    expect(setJpegDpi(exif, 600)).toBe(exif);
  });
});
