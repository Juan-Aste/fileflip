import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyEdits, rasterizePages, strokePath, type EditItem } from "./edit";
import type { RenderText } from "./stamp";

// Independent readers: poppler's pdftotext (text), pdftoppm (pixels) and pdfinfo.
const dir = mkdtempSync(join(tmpdir(), "edit-pdf-"));
let n = 0;
const write = (bytes: Uint8Array) => {
  const path = join(dir, `f${n++}.pdf`);
  writeFileSync(path, bytes);
  return path;
};
const pdftotext = (bytes: Uint8Array, page?: number) =>
  execFileSync("pdftotext", [...(page ? ["-f", String(page), "-l", String(page)] : []), "-layout", write(bytes), "-"], { encoding: "utf8" });
const pdfinfo = (bytes: Uint8Array) => execFileSync("pdfinfo", ["-f", "1", "-l", "9", write(bytes)], { encoding: "utf8" });

/** The page as poppler renders it at 72 DPI (1 px = 1 pt): RGB pixels. */
async function pixels(bytes: Uint8Array, page = 1) {
  const out = join(dir, `p${n++}`);
  execFileSync("pdftoppm", ["-r", "72", "-f", String(page), "-l", String(page), "-png", "-singlefile", write(bytes), out]);
  const { data, info } = await sharp(readFileSync(`${out}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, at: (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)] };
}

/** A4 page with a black line of text at the top and a portrait page rotated 90° (shown landscape). */
async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Numero de cuenta SECRETO 1234", { x: 50, y: 842 - 100, size: 20, font, color: rgb(0, 0, 0) });
  const rotated = doc.addPage([400, 600]);
  rotated.setRotation(degrees(90));
  return doc.save();
}

const black: [number, number, number] = [0, 0, 0];

describe("strokePath", () => {
  it("draws shapes and an arrow head", () => {
    expect(strokePath({ kind: "rect", page: 0, x1: 10, y1: 20, x2: 110, y2: 70, color: black, width: 2 })).toBe("M 10 20 L 110 20 L 110 70 L 10 70 Z");
    expect(strokePath({ kind: "line", page: 0, x1: 0, y1: 0, x2: 50, y2: 0, color: black, width: 2 })).toBe("M 0 0 L 50 0");
    expect(strokePath({ kind: "arrow", page: 0, x1: 0, y1: 0, x2: 50, y2: 0, color: black, width: 2 })).toMatch(/^M 0 0 L 50 0 M 42\.\d+ -?3\.\d+ L 50 0 L 42\.\d+ -?3\.\d+$/);
    expect(strokePath({ kind: "ink", page: 0, points: [5, 5], color: black, width: 2 })).toBe("M 5 5 L 5.01 5");
  });
});

describe("applyEdits", () => {
  it("adds text where the reader sees it, also on a rotated page", async () => {
    const items: EditItem[] = [
      { kind: "text", page: 0, x: 100, y: 300, text: "Firmado: Ana Pérez\nSegunda línea", font: "helvetica", size: 18, color: [0.8, 0, 0] },
      { kind: "text", page: 1, x: 40, y: 50, text: "Página girada", font: "times", size: 24, color: black },
    ];
    const out = await applyEdits(await sample(), items);
    expect(pdftotext(out, 1)).toMatch(/Firmado: Ana Pérez\s+Segunda línea/);
    expect(pdftotext(out, 2)).toContain("Página girada");
    // The red text sits where it was placed: 300 pt from the top, 100 pt from the left.
    const page = await pixels(out);
    let red = 0;
    for (let y = 300; y < 322; y++) for (let x = 100; x < 200; x++) if (page.at(x, y)[0]! > 150 && page.at(x, y)[1]! < 80) red++;
    expect(red).toBeGreaterThan(50);
    // On the rotated page (shown 600 × 400) the text reads left to right near the visual top-left.
    const rotated = await pixels(out, 2);
    expect([rotated.width, rotated.height]).toEqual([600, 400]);
    let dark = 0;
    for (let y = 50; y < 76; y++) for (let x = 40; x < 180; x++) if (rotated.at(x, y)[0]! < 100) dark++;
    expect(dark).toBeGreaterThan(50);
  });

  it("highlights, covers with white, and draws shapes and ink", async () => {
    const items: EditItem[] = [
      // Over the first word: yellow multiplied with the black text keeps it black.
      { kind: "highlight", page: 0, x: 45, y: 80, width: 90, height: 30, color: [1, 0.9, 0] },
      // Over "SECRETO 1234".
      { kind: "whiteout", page: 0, x: 220, y: 80, width: 200, height: 30, color: [1, 1, 1] },
      { kind: "rect", page: 0, x1: 100, y1: 400, x2: 300, y2: 500, color: [0, 0, 1], width: 4 },
      { kind: "arrow", page: 0, x1: 100, y1: 600, x2: 300, y2: 600, color: [0, 0.6, 0], width: 4 },
      { kind: "ink", page: 0, points: [100, 700, 150, 720, 200, 700], color: [1, 0, 0], width: 6 },
    ];
    const out = await applyEdits(await sample(), items);
    const page = await pixels(out);
    // Highlighted paper: 40 % yellow over white.
    expect(page.at(48, 85)).toEqual([255, 245, 153]);
    expect(page.at(100, 400)).toEqual([0, 0, 255]); // rectangle edge
    expect(page.at(200, 450)).toEqual([255, 255, 255]); // rectangle inside (not filled)
    expect(page.at(200, 600)).toEqual([0, 153, 0]); // arrow
    expect(page.at(150, 720)).toEqual([255, 0, 0]); // ink
    // The white box hides "SECRETO 1234" on screen...
    for (let y = 82; y < 108; y += 2) for (let x = 222; x < 418; x += 2) expect(page.at(x, y)).toEqual([255, 255, 255]);
    // ...but the text is still in the file: covering is not removing.
    expect(pdftotext(out, 1)).toContain("SECRETO 1234");
  });

  it("places images and draws text the fonts can't encode with the renderer", async () => {
    const png = new Uint8Array(await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toBuffer());
    const jpg = new Uint8Array(await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 0, g: 200, b: 0 } } }).jpeg().toBuffer());
    const calls: string[] = [];
    const render: RenderText = async (text, size) => {
      calls.push(text);
      const width = Math.round(size * text.length);
      return { png: new Uint8Array(await sharp({ create: { width, height: size, channels: 4, background: "#000" } }).png().toBuffer()), width, height: size };
    };
    const out = await applyEdits(
      await sample(),
      [
        { kind: "image", page: 0, x: 300, y: 300, width: 80, height: 40, data: png },
        { kind: "image", page: 0, x: 300, y: 400, width: 80, height: 40, data: jpg },
        { kind: "text", page: 0, x: 50, y: 500, text: "Latin\n中文签名", font: "helvetica", size: 20, color: black },
      ],
      () => render,
    );
    expect(calls).toEqual(["中文签名"]);
    const list = execFileSync("pdfimages", ["-list", write(out)], { encoding: "utf8" });
    expect(list.trim().split("\n").slice(2)).toHaveLength(3);
    const page = await pixels(out);
    expect(page.at(340, 320)).toEqual([0, 0, 255]);
    expect(page.at(60, 534)).toEqual([0, 0, 0]); // the rendered second line, one line height below
    expect(pdftotext(out, 1)).toContain("Latin");
  });

  it("rejects bad input", async () => {
    await expect(applyEdits(await sample(), [])).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(applyEdits(await sample(), [{ kind: "whiteout", page: 5, x: 0, y: 0, width: 1, height: 1, color: black }])).rejects.toMatchObject({ code: "pagesOutOfRange" });
    await expect(applyEdits(new Uint8Array([1, 2, 3]), [{ kind: "whiteout", page: 0, x: 0, y: 0, width: 1, height: 1, color: black }])).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(applyEdits(await sample(), [{ kind: "text", page: 0, x: 0, y: 0, text: "中文", font: "helvetica", size: 12, color: black }])).rejects.toMatchObject({ code: "invalidRequest" });
  });
});

describe("rasterizePages", () => {
  it("replaces a page by its picture: the text below a white box is gone", async () => {
    const edited = await applyEdits(await sample(), [{ kind: "whiteout", page: 0, x: 220, y: 80, width: 200, height: 30, color: [1, 1, 1] }]);
    // What the browser does: a picture of the edited page as seen.
    const picture = await pixels(edited);
    const raw = Buffer.alloc(picture.width * picture.height * 3);
    for (let y = 0; y < picture.height; y++) for (let x = 0; x < picture.width; x++) raw.set(picture.at(x, y), (y * picture.width + x) * 3);
    const jpeg = new Uint8Array(await sharp(raw, { raw: { width: picture.width, height: picture.height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer());
    const rotatedJpeg = new Uint8Array(await sharp({ create: { width: 600, height: 400, channels: 3, background: "#fff" } }).jpeg().toBuffer());
    const out = await rasterizePages(edited, [
      { index: 0, jpeg },
      { index: 1, jpeg: rotatedJpeg },
    ]);
    expect(pdftotext(out, 1).trim()).toBe("");
    const info = pdfinfo(out);
    expect(info).toMatch(/Pages:\s+2/);
    expect(info).toMatch(/Page\s+1 size:\s+595 x 842/);
    // The rotated page becomes an upright page of its visual size.
    expect(info).toMatch(/Page\s+2 size:\s+600 x 400/);
    expect(info).toMatch(/Page\s+2 rot:\s+0/);
    // It still looks the same: "Numero de cuenta" visible, the covered part white.
    const page = await pixels(out);
    let dark = 0;
    for (let y = 80; y < 105; y++) for (let x = 50; x < 200; x++) if (page.at(x, y)[0]! < 100) dark++;
    expect(dark).toBeGreaterThan(100);
    for (let y = 84; y < 106; y += 3) for (let x = 224; x < 416; x += 3) expect(page.at(x, y)[0]).toBeGreaterThan(235);
  });
});
