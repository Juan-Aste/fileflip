import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkit from "fontkit";
import { compress, decompress } from "woff2-encoder";
import { describe, expect, it } from "vitest";
import { convertFont, detectFont, sfntToWoff, woffToSfnt, type FontContainer } from "./font";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const codec = async () => ({ compress, decompress });

/** What an independent reader (fontkit) sees in a font: names, glyphs, metrics and outlines. */
function describeFont(bytes: Uint8Array) {
  const font = fontkit.create(Buffer.from(bytes)) as fontkit.Font;
  const glyph = (cp: number) => {
    const g = font.glyphForCodePoint(cp);
    return { advance: g.advanceWidth, bbox: { ...g.bbox }, commands: g.path.commands.length };
  };
  return { family: font.familyName, glyphs: font.numGlyphs, em: font.unitsPerEm, A: glyph(0x41), ñ: glyph(0xf1), space: glyph(0x20) };
}

const inputs = ["font.ttf", "font.otf", "font.woff", "font.woff2"];
const targets: FontContainer[] = ["sfnt", "woff", "woff2"];

describe("detectFont", () => {
  it("tells containers and outline flavors apart", () => {
    expect(detectFont(fixture("font.ttf"))).toEqual({ container: "sfnt", flavor: "ttf" });
    expect(detectFont(fixture("font.otf"))).toEqual({ container: "sfnt", flavor: "otf" });
    expect(detectFont(fixture("font.woff"))).toEqual({ container: "woff", flavor: "ttf" });
    expect(detectFont(fixture("font.woff2"))).toEqual({ container: "woff2", flavor: "otf" });
    expect(detectFont(fixture("image.png"))).toBeNull();
    expect(detectFont(new TextEncoder().encode("ttcf\0\x01\0\0\0\0\0\0"))).toBeNull();
  });
});

describe("convertFont", () => {
  const reference = describeFont(fixture("font.ttf"));

  it("the fixtures describe the same font", () => {
    expect(reference).toMatchObject({ family: "Fileflect Test", glyphs: 6, em: 1000, A: { advance: 600, bbox: { minX: 20, maxX: 580, maxY: 700 } } });
    for (const name of inputs) expect(describeFont(fixture(name))).toEqual(reference);
  });

  for (const input of inputs) {
    for (const to of targets) {
      it(`${input} → ${to}`, async () => {
        const { bytes, flavor } = await convertFont(fixture(input), to, codec);
        expect(flavor).toBe(input === "font.otf" || input === "font.woff2" ? "otf" : "ttf");
        expect(detectFont(bytes)?.container).toBe(to);
        expect(describeFont(bytes)).toEqual(reference);
      });
    }
  }

  it("WOFF is smaller than the sfnt and round-trips table by table", () => {
    const ttf = fixture("font.ttf");
    const woff = sfntToWoff(ttf);
    expect(woff.length).toBeLessThan(ttf.length);
    expect(Buffer.from(woffToSfnt(woff)).equals(Buffer.from(ttf))).toBe(true);
  });

  it("refuses damaged files, a WOFF that would inflate to 1 GB, and other formats", async () => {
    await expect(convertFont(fixture("corrupt/truncated.woff2"), "sfnt", codec)).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(convertFont(fixture("corrupt/bomb.woff"), "woff2", codec)).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(convertFont(fixture("font.ttf").subarray(0, 300), "woff", codec)).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(convertFont(fixture("image.png"), "woff", codec)).rejects.toMatchObject({ code: "unsupportedFormat" });
    // A WOFF2 header claiming a 2 GB font is refused before decoding.
    const big = fixture("font.woff2").slice();
    new DataView(big.buffer).setUint32(16, 0x80000000);
    await expect(convertFont(big, "sfnt", codec)).rejects.toMatchObject({ code: "fileDamaged" });
  });
});
