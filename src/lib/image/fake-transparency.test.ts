import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { checkerJpeg, distanceToEdge, logoMasks, rgbaOf, type CheckerFixture } from "../../../tests/helpers/fake-checker";
import { detectFakeTransparency, removeFakeTransparency } from "./fake-transparency";

async function load(f: CheckerFixture, quality = 60) {
  return rgbaOf(await checkerJpeg(f, quality));
}

describe("fake transparency", () => {
  it("turns the drawn checkerboard of a medium-quality JPEG into alpha 0 and keeps the logo", async () => {
    const f: CheckerFixture = { width: 320, height: 240, cell: 16 };
    const image = await load(f);
    const found = detectFakeTransparency(image);
    expect(found).not.toBeNull();
    expect(found!.checker.cell).toBe(16);
    const out = removeFakeTransparency(image, found!);

    const { logo } = logoMasks(f.width, f.height);
    const dist = distanceToEdge(logo, f.width, f.height, 4);
    let bg = 0, bgClear = 0, fg = 0, fgKept = 0, colorOff = 0;
    for (let p = 0; p < logo.length; p++) {
      if (dist[p]! < 3) continue; // the edge itself is soft
      const a = out.data[p * 4 + 3]!;
      if (logo[p]) {
        fg++;
        if (a === 255) fgKept++;
        // Same pixels as the JPEG inside the logo.
        for (let c = 0; c < 3; c++) colorOff = Math.max(colorOff, Math.abs(out.data[p * 4 + c]! - image.data[p * 4 + c]!));
      } else {
        bg++;
        if (a === 0) bgClear++;
      }
    }
    expect(bgClear / bg).toBe(1);
    expect(fgKept / fg).toBe(1);
    expect(colorOff).toBe(0);
  });

  it("leaves no light halo around the logo", async () => {
    const f: CheckerFixture = { width: 320, height: 240, cell: 12, ox: 5, oy: 9 };
    const image = await load(f);
    const out = removeFakeTransparency(image, detectFakeTransparency(image)!);
    const { logo } = logoMasks(f.width, f.height);
    const dist = distanceToEdge(logo, f.width, f.height, 4);
    // Outside the logo, near its edge: whatever is left must be (almost) transparent
    // or coloured like the logo, never an opaque light grey.
    let light = 0, ring = 0;
    for (let p = 0; p < logo.length; p++) {
      if (logo[p] || dist[p]! > 2) continue;
      ring++;
      const [r, g, b, a] = [out.data[p * 4]!, out.data[p * 4 + 1]!, out.data[p * 4 + 2]!, out.data[p * 4 + 3]!];
      const lightGrey = Math.min(r, g, b) > 150 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
      if (a > 128 && lightGrey) light++;
    }
    expect(ring).toBeGreaterThan(100);
    expect(light / ring).toBeLessThan(0.02);
    // Soft edge: some intermediate alpha values along the outline.
    let soft = 0;
    for (let p = 0; p < logo.length; p++) if (out.data[p * 4 + 3]! > 0 && out.data[p * 4 + 3]! < 255) soft++;
    expect(soft).toBeGreaterThan(20);
  });

  it.each([6, 8, 10, 20, 25, 32, 40])("finds cells of %i px", async (cell) => {
    const f: CheckerFixture = { width: 400, height: 300, cell, ox: Math.floor(cell / 3), oy: Math.floor(cell / 2) };
    const found = detectFakeTransparency(await load(f, 70));
    expect(found).not.toBeNull();
    expect(found!.checker.cell).toBe(cell);
    expect(found!.checker.ox).toBe(f.ox);
    expect(found!.checker.oy).toBe(f.oy);
  });

  it("finds other light colour pairs (Photoshop's 255/230 style)", async () => {
    const found = detectFakeTransparency(await load({ width: 300, height: 300, cell: 10, colors: [[255, 255, 255], [232, 232, 232]] }, 75));
    expect(found).not.toBeNull();
  });

  it("does not touch a checkerboard inside the logo that does not reach the background", async () => {
    const f: CheckerFixture = { width: 320, height: 240, cell: 16, innerChecker: true };
    const image = await load(f);
    const out = removeFakeTransparency(image, detectFakeTransparency(image)!);
    const { inner } = logoMasks(f.width, f.height, true);
    let n = 0, kept = 0;
    for (let p = 0; p < inner.length; p++)
      if (inner[p]) {
        n++;
        if (out.data[p * 4 + 3] === 255) kept++;
      }
    expect(n).toBeGreaterThan(1000);
    expect(kept).toBe(n);
  });

  it("finds nothing when the only checkerboard is inside the subject (plain background)", async () => {
    const found = detectFakeTransparency(await load({ width: 320, height: 240, cell: 16, innerChecker: true, plain: [255, 255, 255] }));
    expect(found).toBeNull();
  });

  it.each([
    ["white", [255, 255, 255]],
    ["light grey", [220, 220, 220]],
  ] as const)("finds nothing on a plain %s background", async (_, plain) => {
    expect(detectFakeTransparency(await load({ width: 320, height: 240, cell: 16, plain: [...plain] }))).toBeNull();
  });

  it("finds nothing on a soft light gradient", async () => {
    const width = 300, height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const v = 200 + Math.round((55 * x) / width);
        data.set([v, v, v, 255], (y * width + x) * 4);
      }
    expect(detectFakeTransparency({ data, width, height })).toBeNull();
  });

  it.each(["photo.jpg", "people/person.jpg", "qr-photo.jpg", "photo-alpha.png", "ocr-es.png"])("finds nothing on %s", async (name) => {
    const image = await rgbaOf(await sharp(join(process.cwd(), "tests/fixtures", name)).toBuffer());
    expect(detectFakeTransparency(image)).toBeNull();
  });

  it("finds nothing on a real (lossless) transparent PNG", async () => {
    const { data, info } = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(detectFakeTransparency({ data: new Uint8ClampedArray(data), width: info.width, height: info.height })).toBeNull();
  });
});
