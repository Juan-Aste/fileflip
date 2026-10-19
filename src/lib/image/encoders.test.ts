import { describe, expect, it } from "vitest";
import * as UTIF from "utif2";
import { encodeBmp } from "./bmp";
import { encodeIco, icoSizes } from "./ico";
import { DEFAULT_SVG_SIZE, svgIntrinsicSize } from "./svg";

const image = (width: number, height: number, rgba: number[]) => ({
  width,
  height,
  data: new Uint8ClampedArray(Array.from({ length: width * height }, () => rgba).flat()),
});

describe("encodeBmp", () => {
  it("writes a valid 24-bit header", () => {
    const view = new DataView(encodeBmp(image(3, 2, [255, 0, 0, 255])));
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1))).toBe("BM");
    expect(view.getInt32(18, true)).toBe(3);
    expect(view.getInt32(22, true)).toBe(2);
    expect(view.getUint16(28, true)).toBe(24);
    // Rows are padded to 4 bytes: 3 px * 3 B = 9 → 12.
    expect(view.byteLength).toBe(54 + 12 * 2);
  });

  it("stores pixels as BGR, bottom-up", () => {
    const img = { width: 1, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]) };
    const px = new Uint8Array(encodeBmp(img), 54);
    expect([...px.slice(0, 3)]).toEqual([255, 0, 0]); // bottom row = blue pixel
    expect([...px.slice(4, 7)]).toEqual([0, 0, 255]); // top row = red pixel
  });
});

describe("encodeIco", () => {
  it("packs PNG entries with a directory", () => {
    const a = new Uint8Array([1, 2, 3]).buffer;
    const b = new Uint8Array([4, 5]).buffer;
    const view = new DataView(encodeIco([{ size: 16, png: a }, { size: 256, png: b }]));
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
    expect(view.getUint8(6)).toBe(16);
    expect(view.getUint8(22)).toBe(0); // 256 is stored as 0
    expect(view.getUint32(6 + 12, true)).toBe(38);
    expect(view.getUint32(22 + 12, true)).toBe(41);
    expect(view.getUint8(41)).toBe(4);
  });

  it("picks standard sizes up to the source size", () => {
    expect(icoSizes(1000)).toEqual([16, 32, 48, 64, 128, 256]);
    expect(icoSizes(40)).toEqual([16, 32]);
    expect(icoSizes(10)).toEqual([10]);
  });
});

describe("TIFF via utif2", () => {
  it("round-trips RGBA pixels", () => {
    const src = image(2, 2, [10, 20, 30, 255]);
    const tiff = UTIF.encodeImage(new Uint8Array(src.data), 2, 2);
    const [ifd] = UTIF.decode(tiff);
    UTIF.decodeImage(tiff, ifd);
    expect([...UTIF.toRGBA8(ifd).slice(0, 4)]).toEqual([10, 20, 30, 255]);
  });
});

describe("svgIntrinsicSize", () => {
  it("reads width and height, with units", () => {
    expect(svgIntrinsicSize('<svg width="120" height="80">')).toEqual({ width: 120, height: 80 });
    expect(svgIntrinsicSize("<svg width='1in' height='48pt'>")).toEqual({ width: 96, height: 64 });
  });

  it("falls back to the viewBox and its aspect ratio", () => {
    expect(svgIntrinsicSize('<svg viewBox="0 0 24 12">')).toEqual({ width: 24, height: 12 });
    expect(svgIntrinsicSize('<svg width="100%" viewBox="0,0,300,150">')).toEqual({ width: 300, height: 150 });
    expect(svgIntrinsicSize('<svg width="600" viewBox="0 0 300 150">')).toEqual({ width: 600, height: 300 });
  });

  it("uses a default when nothing is declared", () => {
    expect(svgIntrinsicSize("<svg>")).toEqual({ width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE });
  });
});
