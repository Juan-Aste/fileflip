import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectFormat } from "@/lib/detect";
import { canConvertImageOnServer, convertImageOnServer } from "./image";

const png = () =>
  sharp({ create: { width: 80, height: 40, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } })
    .png()
    .toBuffer();

describe("convertImageOnServer", () => {
  it.each(["jpg", "png", "webp", "avif", "gif", "tiff", "bmp", "ico"] as const)(
    "converts PNG to %s",
    async (to) => {
      const out = await convertImageOnServer(await png(), "png", to);
      expect(detectFormat(new Uint8Array(out), `x.${to}`)).toBe(to);
    },
  );

  it("applies quality and resize options", async () => {
    const out = await convertImageOnServer(await png(), "png", "webp", {
      quality: 50,
      resize: { mode: "percent", percent: 50 },
    });
    expect(await sharp(out).metadata()).toMatchObject({ width: 40, height: 20, format: "webp" });
  });

  it("flattens transparency over white for JPG", async () => {
    const out = await convertImageOnServer(await png(), "png", "jpg");
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(240);
    expect(data[1]).toBeGreaterThan(100);
  });

  it("renders SVG and enlarges it sharply", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12"><rect width="24" height="12"/></svg>');
    const out = await convertImageOnServer(svg, "svg", "png", { resize: { mode: "fit", width: 480 } });
    expect(await sharp(out).metadata()).toMatchObject({ width: 480, height: 240 });
  });

  it("knows which conversions sharp cannot do", () => {
    expect(canConvertImageOnServer("heic", "jpg")).toBe(false);
    expect(canConvertImageOnServer("bmp", "png")).toBe(false);
    expect(canConvertImageOnServer("png", "pdf")).toBe(false);
    expect(canConvertImageOnServer("tiff", "ico")).toBe(true);
  });

  it("rejects unsupported conversions", async () => {
    await expect(convertImageOnServer(await png(), "png", "heic")).rejects.toThrow();
  });
});
