import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { isCompleteJpeg, isCompletePng, isDamagedImage } from "./integrity";

const fixture = (name: string) => new Uint8Array(readFileSync(join("tests/fixtures", name)));

describe("isCompleteJpeg", () => {
  it("accepts complete baseline and progressive JPEGs", async () => {
    expect(isCompleteJpeg(fixture("image.jpg"))).toBe(true);
    const progressive = await sharp(fixture("image.png")).jpeg({ progressive: true }).toBuffer();
    expect(isCompleteJpeg(new Uint8Array(progressive))).toBe(true);
  });

  it("accepts restart markers and trailing data after EOI", async () => {
    const withExif = await sharp(fixture("image.png")).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const trailer = new Uint8Array([...withExif, 0x00, 0x11, 0x22]);
    expect(isCompleteJpeg(trailer)).toBe(true);
  });

  it("rejects truncated, empty and non-JPEG data", () => {
    expect(isCompleteJpeg(fixture("corrupt/truncated.jpg"))).toBe(false);
    const jpg = fixture("image.jpg");
    expect(isCompleteJpeg(jpg.subarray(0, jpg.length - 2))).toBe(false);
    expect(isCompleteJpeg(new Uint8Array())).toBe(false);
    expect(isCompleteJpeg(fixture("image.png"))).toBe(false);
  });

  it("does not stop at the end marker of an embedded thumbnail", () => {
    // APP1 segment holding a tiny "thumbnail" with its own FFD8…FFD9.
    const jpg = fixture("image.jpg");
    const thumb = [0xff, 0xd8, 0xff, 0xd9];
    const app1 = [0xff, 0xe1, 0x00, 2 + thumb.length, ...thumb];
    const withThumb = new Uint8Array([0xff, 0xd8, ...app1, ...jpg.subarray(2)]);
    expect(isCompleteJpeg(withThumb)).toBe(true);
    expect(isCompleteJpeg(withThumb.subarray(0, withThumb.length / 2))).toBe(false);
  });
});

describe("isCompletePng", () => {
  it("accepts a complete PNG", () => {
    expect(isCompletePng(fixture("image.png"))).toBe(true);
  });

  it("rejects truncated, garbage and empty files", () => {
    expect(isCompletePng(fixture("corrupt/truncated.png"))).toBe(false);
    expect(isCompletePng(fixture("corrupt/garbage.png"))).toBe(false);
    expect(isCompletePng(fixture("corrupt/empty.png"))).toBe(false);
  });
});

describe("isDamagedImage", () => {
  it("only judges JPEG and PNG", () => {
    expect(isDamagedImage(fixture("corrupt/truncated.jpg"), "jpg")).toBe(true);
    expect(isDamagedImage(fixture("image.jpg"), "jpg")).toBe(false);
    expect(isDamagedImage(new Uint8Array([1, 2, 3]), "webp")).toBe(false);
  });
});
