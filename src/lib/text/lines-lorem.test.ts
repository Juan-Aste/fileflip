import { describe, expect, it } from "vitest";
import { cleanLines, type LineOptions } from "./lines";
import { LOREM_LIMITS, LOREM_START, generateLorem, loremToText } from "./lorem";

const base: LineOptions = { removeDuplicates: true, ignoreCase: false, trim: false, removeEmpty: false, sort: "none", locale: "es" };

describe("line cleanup", () => {
  it("removes duplicates keeping the first one, in order", () => {
    const r = cleanLines("pera\nmanzana\npera\nuva\nmanzana\n", base);
    expect(r).toEqual({ text: "pera\nmanzana\nuva\n", before: 5, after: 3, duplicates: 2, empty: 0 });
  });

  it("ignores case and spaces when asked, and removes empty lines", () => {
    const text = "  Ana \r\nana\r\n\r\nLUIS\r\n   \r\nluis  \r\nAna";
    expect(cleanLines(text, { ...base, ignoreCase: true, trim: true, removeEmpty: true })).toEqual({
      text: "Ana\r\nLUIS",
      before: 7,
      after: 2,
      duplicates: 3,
      empty: 2,
    });
    // Without trimming, "  Ana " and "Ana" are different lines.
    expect(cleanLines(text, { ...base, ignoreCase: true }).after).toBe(6);
  });

  it("sorts with the language's collation and numbers in order", () => {
    const text = "ñandú\nzorro\nárbol\nnube\nitem 10\nitem 2\nÁrbol";
    expect(cleanLines(text, { ...base, removeDuplicates: false, sort: "asc" }).text).toBe("árbol\nÁrbol\nitem 2\nitem 10\nnube\nñandú\nzorro");
    expect(cleanLines(text, { ...base, removeDuplicates: false, sort: "desc" }).text.split("\n")[0]).toBe("zorro");
    expect(cleanLines("b\na\n", { ...base, sort: "asc" }).text).toBe("a\nb\n");
  });

  it("handles an empty text and a single line", () => {
    expect(cleanLines("", base)).toEqual({ text: "", before: 0, after: 0, duplicates: 0, empty: 0 });
    expect(cleanLines("hola", base).text).toBe("hola");
  });
});

/** A small seeded generator (mulberry32) for repeatable text. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const sentences = (text: string) => text.split(/(?<=\.)\s+/).filter(Boolean);

describe("lorem ipsum", () => {
  it("makes the requested number of paragraphs, starting with Lorem ipsum", () => {
    const paragraphs = generateLorem({ unit: "paragraphs", count: 5, startWithLorem: true, random: seeded(1) });
    expect(paragraphs).toHaveLength(5);
    expect(paragraphs[0]!.startsWith(`${LOREM_START} `)).toBe(true);
    for (const p of paragraphs) {
      expect(sentences(p).length).toBeGreaterThanOrEqual(4);
      expect(sentences(p).length).toBeLessThanOrEqual(7);
      for (const s of sentences(p)) expect(s).toMatch(/^[A-Z][a-z]+(,? [a-z]+)+\.$/);
    }
    expect(generateLorem({ unit: "paragraphs", count: 2, startWithLorem: false, random: seeded(2) })[0]!.startsWith("Lorem ipsum dolor")).toBe(false);
  });

  it("makes exact sentence and word counts", () => {
    expect(sentences(generateLorem({ unit: "sentences", count: 12, startWithLorem: false, random: seeded(3) })[0]!)).toHaveLength(12);
    const w = generateLorem({ unit: "words", count: 50, startWithLorem: true, random: seeded(4) })[0]!;
    expect(words(w)).toBe(50);
    expect(w.startsWith("Lorem ipsum dolor sit amet, consectetur")).toBe(true);
    expect(generateLorem({ unit: "words", count: 3, startWithLorem: true })[0]).toBe("Lorem ipsum dolor.");
  });

  it("caps the amount and writes text or HTML", () => {
    expect(generateLorem({ unit: "paragraphs", count: 10_000, startWithLorem: false })).toHaveLength(LOREM_LIMITS.paragraphs);
    expect(generateLorem({ unit: "words", count: 0, startWithLorem: true })[0]).toBe("Lorem.");
    expect(loremToText(["Uno.", "Dos."], false)).toBe("Uno.\n\nDos.\n");
    expect(loremToText(["Uno.", "Dos."], true)).toBe("<p>Uno.</p>\n<p>Dos.</p>\n");
  });
});
