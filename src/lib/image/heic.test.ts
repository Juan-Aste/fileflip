import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeHeic } from "./heic";

describe("decodeHeic", () => {
  it("decodes an iPhone-style HEIC to RGBA pixels", async () => {
    // 120×80: left half blue, right half red (generated with pillow-heif).
    const file = readFileSync(join(__dirname, "../../../tests/fixtures/photo.heic"));
    const image = await decodeHeic(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect([image.width, image.height]).toEqual([120, 80]);
    const [r, g, b, a] = image.data.slice(0, 4);
    expect(b).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
    expect(a).toBe(255);
    const right = image.data.slice((image.width - 1) * 4, image.width * 4);
    expect(right[0]).toBeGreaterThan(160);
    expect(g).toBeGreaterThan(80);
  });

  it("decodes a .heif with the generic mif1 brand", async () => {
    const file = readFileSync(join(__dirname, "../../../tests/fixtures/photo.heif"));
    expect(file.toString("ascii", 8, 12)).toBe("mif1");
    const image = await decodeHeic(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect([image.width, image.height]).toEqual([120, 80]);
    expect(image.data[2]).toBeGreaterThan(200); // blue on the left
  });

  it("rejects files without images", async () => {
    await expect(decodeHeic(new ArrayBuffer(16))).rejects.toThrow();
  });
});
