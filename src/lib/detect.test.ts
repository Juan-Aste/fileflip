import { describe, expect, it } from "vitest";
import { detectFileFormat, detectFormat } from "./detect";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );
const text = (s: string) => new TextEncoder().encode(s);
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ftyp = (major: string, ...compatible: string[]) =>
  bytes(u32(16 + compatible.length * 4), "ftyp", major, [0, 0, 0, 0], ...compatible);
// Minimal ZIP local file header for one entry name (+ optional stored data).
const zipEntry = (name: string, data = "") =>
  bytes([0x50, 0x4b, 0x03, 0x04], new Array(22).fill(0), [name.length, 0, 0, 0], name, data);

describe("detectFormat", () => {
  it.each([
    ["jpg", bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF")],
    ["png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], "IHDR")],
    ["gif", bytes("GIF89a", [1, 0, 1, 0])],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")],
    ["bmp", bytes("BM", new Array(12).fill(0), [40, 0, 0, 0])],
    ["tiff", bytes([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0])],
    ["tiff", bytes([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8])],
    ["ico", bytes([0, 0, 1, 0, 1, 0, 16, 16])],
    ["avif", ftyp("avif", "mif1", "miaf")],
    ["avif", ftyp("mif1", "avif")],
    ["heic", ftyp("heic", "mif1", "heic")],
    ["heic", ftyp("mif1", "heic")],
    ["pdf", text("%PDF-1.7\n%âãÏÓ")],
    ["pdf", text("garbage\n%PDF-1.4\n")],
    ["rtf", text("{\\rtf1\\ansi hello}")],
    ["svg", text('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ["svg", text('  <svg width="10" height="10"></svg>')],
  ] as const)("detects %s", (expected, data) => {
    expect(detectFormat(data, "whatever.bin")).toBe(expected);
  });

  it("ignores a misleading extension", () => {
    const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectFormat(png, "photo.jpg")).toBe("png");
  });

  it("tells Office Open XML documents apart by their parts", () => {
    const ct = zipEntry("[Content_Types].xml");
    expect(detectFormat(new Uint8Array([...ct, ...zipEntry("word/document.xml")]), "a.zip")).toBe("docx");
    expect(detectFormat(new Uint8Array([...ct, ...zipEntry("xl/workbook.xml")]), "a")).toBe("xlsx");
    expect(detectFormat(new Uint8Array([...ct, ...zipEntry("ppt/presentation.xml")]), "a")).toBe("pptx");
  });

  it("uses the extension when OOXML parts are beyond the sniffed bytes", () => {
    expect(detectFormat(zipEntry("[Content_Types].xml"), "report.xlsx")).toBe("xlsx");
    expect(detectFormat(zipEntry("[Content_Types].xml"), "archive.zip")).toBeNull();
  });

  it("detects OpenDocument files by their mimetype entry", () => {
    expect(detectFormat(zipEntry("mimetype", "application/vnd.oasis.opendocument.text"))).toBe("odt");
    expect(detectFormat(zipEntry("mimetype", "application/vnd.oasis.opendocument.spreadsheet"))).toBe("ods");
    expect(detectFormat(zipEntry("mimetype", "application/vnd.oasis.opendocument.presentation"))).toBe("odp");
  });

  it("uses the extension for legacy OLE2 Office files", () => {
    const ole = bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectFormat(ole, "a.doc")).toBe("doc");
    expect(detectFormat(ole, "a.xls")).toBe("xls");
    expect(detectFormat(ole, "a.ppt")).toBe("ppt");
    expect(detectFormat(ole, "unknown")).toBe("doc");
  });

  it("detects plain text and CSV", () => {
    expect(detectFormat(text("name,age\nAna,30\n"), "people.csv")).toBe("csv");
    expect(detectFormat(text("Hola, ¿qué tal?"), "notes.txt")).toBe("txt");
    expect(detectFormat(text("BMW, Audi\n"), "cars.txt")).toBe("txt");
    expect(detectFormat(new Uint8Array([0x41, 0xe9, 0x0a]), "latin1.csv")).toBe("csv");
  });

  it("rejects binary junk and empty files", () => {
    expect(detectFormat(new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0, 1, 2]), "app.exe")).toBeNull();
    expect(detectFormat(new Uint8Array(), "empty.txt")).toBeNull();
  });
});

describe("detectFileFormat", () => {
  it("reads the head of a File", async () => {
    const file = new File([bytes("GIF87a", [1, 0, 1, 0])], "x.png");
    expect(await detectFileFormat(file)).toBe("gif");
  });
});
