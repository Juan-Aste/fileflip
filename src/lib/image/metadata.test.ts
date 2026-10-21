import { describe, expect, it } from "vitest";
import exifr from "exifr";
import sharp from "sharp";
import { MalformedImageError, stripJpeg, stripPng, stripWebp, summarizeMetadata, webpExif } from "./metadata";

const exif = {
  IFD0: { Make: "Fileflect", Model: "Test Cam", Software: "gen 1.0", Artist: "Nadie" },
  IFD2: { DateTimeOriginal: "2024:05:01 10:20:30" },
  IFD3: { GPSLatitudeRef: "S", GPSLatitude: "34/1 36/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "58/1 22/1 0/1" },
};
const base = () => sharp({ create: { width: 48, height: 32, channels: 3, background: "#3a7bd5" } }).composite([
  { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="32"><circle cx="12" cy="10" r="8" fill="#f26b3a"/></svg>') },
]);
const pixels = async (buf: Uint8Array) => (await sharp(Buffer.from(buf)).ensureAlpha().raw().toBuffer()).toString("base64");

describe("stripJpeg", () => {
  it("drops EXIF/GPS, comments and trailing data, keeps orientation and the exact pixels", async () => {
    const jpg = await base().jpeg().withExif(exif).withMetadata({ orientation: 6 }).toBuffer();
    // A comment segment after SOI, and an extra picture appended after EOI (as phones do).
    const withCom = Buffer.concat([jpg.subarray(0, 2), Buffer.from([0xff, 0xfe, 0x00, 0x07]), Buffer.from("hello"), jpg.subarray(2)]);
    const input = Buffer.concat([withCom, Buffer.from(await base().jpeg().withExif(exif).toBuffer())]);
    expect((await exifr.parse(input, { gps: true }))?.latitude).toBeCloseTo(-34.6);

    const out = stripJpeg(new Uint8Array(input));
    expect(out.orientation).toBe(6);
    const tags = await exifr.parse(Buffer.from(out.bytes), { gps: true });
    expect(tags?.latitude).toBeUndefined();
    expect(tags?.Make).toBeUndefined();
    expect(tags?.DateTimeOriginal).toBeUndefined();
    expect((await sharp(Buffer.from(out.bytes)).metadata()).orientation).toBe(6);
    expect(Buffer.from(out.bytes).includes("hello")).toBe(false);
    expect(out.bytes.length).toBeLessThan(jpg.length);
    expect(await pixels(out.bytes)).toBe(await pixels(jpg));
  });

  it("adds no EXIF block when the photo is upright", async () => {
    const out = stripJpeg(new Uint8Array(await base().jpeg().withExif(exif).toBuffer()));
    expect(out.orientation).toBe(1);
    expect(await exifr.parse(Buffer.from(out.bytes))).toBeUndefined();
  });

  it("rejects files that are not complete JPEGs", async () => {
    const jpg = await base().jpeg().toBuffer();
    expect(() => stripJpeg(new Uint8Array(jpg.subarray(0, jpg.length / 2)))).toThrow(MalformedImageError);
    expect(() => stripJpeg(new TextEncoder().encode("not a jpeg"))).toThrow(MalformedImageError);
  });
});

describe("stripPng", () => {
  it("drops eXIf and text chunks, keeps the pixels", async () => {
    const png = await base().png().withExif(exif).toBuffer();
    // A tEXt chunk inserted after IHDR (CRC is not checked by the stripper).
    const text = Buffer.concat([Buffer.from([0, 0, 0, 12]), Buffer.from("tEXtComment\0hi"), Buffer.alloc(4)]);
    text.writeUInt32BE(14, 0);
    const input = Buffer.concat([png.subarray(0, 33), text.subarray(0, 4 + 4 + 14), Buffer.alloc(4), png.subarray(33)]);
    const out = Buffer.from(stripPng(new Uint8Array(input)).bytes);
    expect(out.toString("latin1")).not.toMatch(/eXIf|tEXt/);
    expect(await pixels(out)).toBe(await pixels(png));
  });

  it("rejects a truncated PNG", async () => {
    const png = await base().png().toBuffer();
    expect(() => stripPng(new Uint8Array(png.subarray(0, png.length - 20)))).toThrow(MalformedImageError);
  });
});

describe("stripWebp", () => {
  it("drops the EXIF chunk, clears the VP8X flag and fixes the RIFF size", async () => {
    const webp = await base().webp({ lossless: true }).withExif(exif).toBuffer();
    expect(webpExif(new Uint8Array(webp))).not.toBeNull();
    expect((await exifr.parse(Buffer.from(webpExif(new Uint8Array(webp))!), { gps: true }))?.longitude).toBeCloseTo(-58.367, 2);
    const out = stripWebp(new Uint8Array(webp)).bytes;
    const buf = Buffer.from(out);
    expect(buf.includes("EXIF")).toBe(false);
    expect(buf.readUInt32LE(4)).toBe(buf.length - 8);
    const vp8x = buf.indexOf("VP8X");
    if (vp8x >= 0) expect(buf[vp8x + 8]! & 0x0c).toBe(0);
    expect(webpExif(out)).toBeNull();
    expect(await pixels(out)).toBe(await pixels(webp));
  });

  it("rejects a WEBP without image data", () => {
    const riff = new Uint8Array([...new TextEncoder().encode("RIFF"), 4, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);
    expect(() => stripWebp(riff)).toThrow(MalformedImageError);
  });
});

describe("summarizeMetadata", () => {
  it("picks location, camera, date, software and author", async () => {
    const tags = await exifr.parse(await base().jpeg().withExif(exif).toBuffer(), { gps: true });
    const summary = summarizeMetadata(tags);
    expect(summary.gps?.latitude).toBeCloseTo(-34.6);
    expect(summary.gps?.longitude).toBeCloseTo(-58.367, 2);
    expect(summary.camera).toBe("Fileflect Test Cam");
    expect(summary.date).toMatch(/^2024-05-01T/);
    expect(summary.software).toBe("gen 1.0");
    expect(summary.author).toBe("Nadie");
  });

  it("does not repeat the brand in the camera name and handles nothing", () => {
    expect(summarizeMetadata({ Make: "Apple", Model: "Apple iPhone 14" }).camera).toBe("Apple iPhone 14");
    expect(summarizeMetadata(undefined)).toEqual({});
    expect(summarizeMetadata({ latitude: Number.NaN, longitude: 1 })).toEqual({});
  });
});
