import { describe, expect, it } from "vitest";
import { jpegOrientation } from "./exif";

/** Minimal JPEG with an APP1/EXIF segment holding one Orientation entry. */
function jpegWithOrientation(value: number, little = true) {
  const u16 = (n: number) => (little ? [n & 255, n >> 8] : [n >> 8, n & 255]);
  const u32 = (n: number) => (little ? [n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24] : [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const tiff = [...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8), ...u16(1), ...u16(0x0112), ...u16(3), ...u32(1), ...u16(value), 0, 0, ...u32(0)];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda, 0, 2]);
}

describe("jpegOrientation", () => {
  it("reads little- and big-endian EXIF", () => {
    expect(jpegOrientation(jpegWithOrientation(6))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(3, false))).toBe(3);
  });

  it("defaults to 1 without EXIF or for non-JPEG data", () => {
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(jpegOrientation(new Uint8Array())).toBe(1);
  });

  it("ignores invalid values and truncated data", () => {
    expect(jpegOrientation(jpegWithOrientation(42))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(6).slice(0, 20))).toBe(1);
  });
});
