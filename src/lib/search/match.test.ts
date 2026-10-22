import { describe, expect, it } from "vitest";
import { normalize, searchEntries, type SearchEntry } from "./match";

const entries: SearchEntry[] = [
  { kind: "tool", href: "/unir-pdf", title: "Unir PDF", description: "Combina varios PDF en uno", keywords: "PDF" },
  { kind: "tool", href: "/comprimir-pdf", title: "Comprimir PDF", description: "Reduce el peso", keywords: "PDF" },
  { kind: "conversion", href: "/jpg-a-pdf", title: "JPG a PDF", keywords: "JPG PDF Imágenes" },
  { kind: "conversion", href: "/heic-a-jpg", title: "HEIC a JPG", keywords: "HEIC JPG iPhone" },
  { kind: "category", href: "/herramientas-de-imagen", title: "Imágenes", keywords: "" },
  { kind: "conversion", href: "/png-to-webp", title: "PNG 转 WEBP", keywords: "图片" },
];

describe("normalize", () => {
  it("drops accents, case and punctuation", () => {
    expect(normalize("  Imágenes—PDF!  ")).toBe("imagenes pdf");
    expect(normalize("Ça déjà")).toBe("ca deja");
    expect(normalize("图片 转换")).toBe("图片 转换");
  });
});

describe("searchEntries", () => {
  const hrefs = (q: string) => searchEntries(entries, q).map((e) => e.href);

  it("finds by title without accents", () => {
    expect(hrefs("imagenes")[0]).toBe("/herramientas-de-imagen");
  });

  it("requires every word", () => {
    expect(hrefs("jpg pdf")).toEqual(["/jpg-a-pdf"]);
    expect(hrefs("pdf zzz")).toEqual([]);
  });

  it("ranks title matches above description or keyword matches", () => {
    expect(hrefs("pdf").slice(0, 2)).toEqual(["/unir-pdf", "/comprimir-pdf"]);
    expect(hrefs("pdf")).toContain("/jpg-a-pdf");
  });

  it("matches keywords and inner words", () => {
    expect(hrefs("iphone")).toEqual(["/heic-a-jpg"]);
    expect(hrefs("prim")).toEqual(["/comprimir-pdf"]);
    expect(hrefs("图片")).toEqual(["/png-to-webp"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(hrefs("  ")).toEqual([]);
    expect(searchEntries(entries, "a", 2)).toHaveLength(2);
  });
});
