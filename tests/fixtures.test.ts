import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectFormat } from "@/lib/detect";

// Sanity checks for the generated fixtures (scripts/fixtures/generate.mjs), so
// the audit and tool tests can rely on them.
const dir = join(__dirname, "fixtures");
const read = (name: string) => new Uint8Array(readFileSync(join(dir, name)));

const expected: Record<string, string> = {
  "image.png": "png",
  "image.jpg": "jpg",
  "image.webp": "webp",
  "image.avif": "avif",
  "image.gif": "gif",
  "image.tiff": "tiff",
  "image.bmp": "bmp",
  "image.ico": "ico",
  "image.svg": "svg",
  "photo.heic": "heic",
  "document.pdf": "pdf",
  "document-1page.pdf": "pdf",
  "document-images.pdf": "pdf",
  "text.txt": "txt",
  "table.csv": "csv",
  "document.odt": "odt",
  "document.docx": "docx",
  "document.doc": "doc",
  "document.rtf": "rtf",
  "spreadsheet.ods": "ods",
  "spreadsheet.xlsx": "xlsx",
  "spreadsheet.xls": "xls",
  "slides.odp": "odp",
  "slides.pptx": "pptx",
};

describe("fixtures", () => {
  it.each(Object.entries(expected))("%s is detected as %s", (name, format) => {
    expect(detectFormat(read(name), name)).toBe(format);
  });

  it("are small (< 200 KB each)", () => {
    for (const name of readdirSync(dir)) {
      const stat = statSync(join(dir, name));
      if (stat.isFile()) expect(stat.size, name).toBeLessThan(200 * 1024);
    }
  });

  it.each(["image.png", "image.jpg", "image.webp", "image.avif", "image.gif", "image.tiff"])("%s is 160×120", async (name) => {
    const meta = await sharp(read(name)).metadata();
    expect([meta.width, meta.height]).toEqual([160, 120]);
  });

  it("PDFs have the expected page counts", async () => {
    for (const [name, pages] of [["document.pdf", 3], ["document-1page.pdf", 1], ["document-images.pdf", 2]] as const) {
      expect((await PDFDocument.load(read(name))).getPageCount(), name).toBe(pages);
    }
  });

  it("corrupt files are rejected or fail to decode", async () => {
    const c = (name: string) => read(join("corrupt", name));
    expect(detectFormat(c("empty.png"), "empty.png")).toBeNull();
    expect(detectFormat(c("random-as.docx"), "random-as.docx")).toBeNull();
    expect(detectFormat(c("text-as.jpg"), "text-as.jpg")).toBe("txt");
    await expect(sharp(c("garbage.png")).toBuffer()).rejects.toThrow();
    await expect(sharp(c("truncated.png")).toBuffer()).rejects.toThrow();
    // pdf-lib parses leniently: broken PDFs fail when their pages are read.
    const pages = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages();
    await expect(pages(c("garbage.pdf"))).rejects.toThrow();
    await expect(pages(c("truncated.pdf"))).rejects.toThrow();
  });
});
