import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { encodeIndexedPng, quantizedPng } from "./png-indexed";

describe("encodeIndexedPng", () => {
  it("writes a palette PNG that decoders read back pixel for pixel", async () => {
    const palette = [
      [255, 0, 0],
      [0, 0, 255, 128],
      [0, 255, 0],
    ];
    const indices = new Uint8Array([0, 1, 2, 2, 1, 0]);
    const png = Buffer.from(encodeIndexedPng(3, 2, indices, palette));
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.isPalette).toBe(true);
    expect([meta.width, meta.height]).toEqual([3, 2]);
    const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expected = [...indices].flatMap((i) => [palette[i]![0], palette[i]![1], palette[i]![2], palette[i]![3] ?? 255]);
    expect([...data]).toEqual(expected);
  });

  it("rejects bad palettes and sizes", () => {
    expect(() => encodeIndexedPng(1, 1, new Uint8Array(1), [])).toThrow();
    expect(() => encodeIndexedPng(2, 2, new Uint8Array(3), [[0, 0, 0]])).toThrow();
  });
});

describe("quantizedPng", () => {
  const gradient = (width: number, height: number, alpha: boolean) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data.set([(x * 255) / width, (y * 255) / height, 128, alpha && x < width / 2 ? 0 : 255], i);
      }
    return { width, height, data };
  };

  it("keeps at most the asked number of colors and is smaller than the RGBA PNG", async () => {
    const image = gradient(256, 256, false);
    const png = Buffer.from(await quantizedPng(image, 64));
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([256, 256]);
    const colors = new Set<number>();
    for (let i = 0; i < data.length; i += 4) colors.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
    expect(colors.size).toBeLessThanOrEqual(64);
    const rgba = await sharp(Buffer.from(image.data), { raw: { width: 256, height: 256, channels: 4 } }).png().toBuffer();
    expect(png.length).toBeLessThan(rgba.length);
  });

  it("keeps transparency", async () => {
    const png = Buffer.from(await quantizedPng(gradient(64, 64, true), 256));
    const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // left half transparent
    expect(data[(63) * 4 + 3]).toBe(255); // right edge opaque
  });
});
