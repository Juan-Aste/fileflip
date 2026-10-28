import { describe, expect, it } from "vitest";
import { changeCase, textStats } from "./count";
import { MAX_PASSWORDS, entropyBits, generatePasswords, randomBelow, type PasswordOptions } from "./password";

const base: PasswordOptions = { length: 16, count: 1, upper: true, lower: true, digits: true, symbols: false, avoidAmbiguous: false };

describe("passwords", () => {
  it("rejects random values above the largest multiple to avoid modulo bias", () => {
    const values = [0xffff_ffff, 0xffff_fffe, 7];
    // 2^32 is not a multiple of 10: the top values are drawn again.
    expect(randomBelow(10, () => values.shift()!)).toBe(7);
  });

  it("is close to uniform", () => {
    const counts = new Array(62).fill(0);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (const p of generatePasswords({ ...base, length: 100, count: MAX_PASSWORDS })) for (const c of p) counts[alphabet.indexOf(c)]++;
    const expected = 10_000 / 62;
    for (const n of counts) expect(Math.abs(n - expected)).toBeLessThan(expected * 0.4);
  });

  it("has the length, count and every chosen set", () => {
    const passwords = generatePasswords({ ...base, length: 4, count: 50, symbols: true });
    expect(passwords).toHaveLength(50);
    for (const p of passwords) {
      expect(p).toHaveLength(4);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
    }
    expect(new Set(generatePasswords({ ...base, count: 100 })).size).toBe(100);
  });

  it("avoids ambiguous characters and clamps options", () => {
    for (const p of generatePasswords({ ...base, count: 100, symbols: true, avoidAmbiguous: true })) expect(p).not.toMatch(/[Il1O0o|`'"]/);
    expect(generatePasswords({ ...base, length: 1000 })[0]).toHaveLength(128);
    expect(generatePasswords({ ...base, upper: false, lower: false, digits: false })).toEqual([]);
    expect(generatePasswords({ ...base, length: 4, digits: false, upper: false, lower: true, count: 0 })).toHaveLength(1);
  });

  it("computes entropy", () => {
    expect(entropyBits({ ...base, length: 16 })).toBe(Math.floor(16 * Math.log2(62)));
    expect(entropyBits({ ...base, upper: false, lower: false, digits: true, length: 4 })).toBe(13);
  });
});

describe("text stats", () => {
  it("counts characters as people see them, words, sentences, paragraphs and lines", () => {
    const text = "Hola, ¿cómo estás? Bien 👍🏽.\n\nSegundo párrafo: e-mail y 3,5 kg.\n";
    expect(textStats(text, "es")).toEqual({
      characters: 62,
      charactersNoSpaces: 50,
      // ICU splits "e-mail" in two and keeps "3,5" as one number.
      words: 11,
      sentences: 3,
      paragraphs: 2,
      lines: 4,
      readingMinutes: 1,
    });
    expect(textStats("", "es")).toEqual({ characters: 0, charactersNoSpaces: 0, words: 0, sentences: 0, paragraphs: 0, lines: 0, readingMinutes: 0 });
  });

  it("counts Chinese words without spaces", () => {
    const stats = textStats("我们今天去北京。天气很好！", "zh");
    expect(stats.characters).toBe(13);
    expect(stats.sentences).toBe(2);
    expect(stats.words).toBeGreaterThanOrEqual(5);
    expect(stats.words).toBeLessThan(11);
  });

  it("changes case by language", () => {
    expect(changeCase("ñandú straße", "upper", "es")).toBe("ÑANDÚ STRASSE");
    expect(changeCase("ÁRBOL", "lower", "es")).toBe("árbol");
    expect(changeCase("el ÁRBOL de josé-luis", "title", "es")).toBe("El Árbol De José-Luis");
    expect(changeCase("HOLA. ¿QUÉ TAL? «bien» gracias", "sentence", "es")).toBe("Hola. ¿Qué tal? «Bien» gracias");
  });

  it("title case keeps the small words of each language in lower case", () => {
    const title = (text: string, locale: string) => changeCase(text, "title", locale, { smallWords: true });
    expect(title("el señor de los anillos: la comunidad del anillo", "es")).toBe("El Señor de los Anillos: La Comunidad del Anillo");
    expect(title("THE LORD OF THE RINGS", "en")).toBe("The Lord of the Rings");
    expect(title("what are you looking at", "en")).toBe("What Are You Looking At");
    expect(title("o nome da rosa", "pt-BR")).toBe("O Nome da Rosa");
    expect(title("le petit prince et la rose", "fr")).toBe("Le Petit Prince et la Rose");
    expect(title("ijsland en de zee", "nl")).toBe("IJsland en de Zee");
    // Without the option every word is capitalized (as Word's "Capitalize Each Word").
    expect(changeCase("the lord of the rings", "title", "en")).toBe("The Lord Of The Rings");
  });

  it("follows the casing rules of the language", () => {
    expect(changeCase("istanbul", "upper", "tr")).toBe("İSTANBUL");
    expect(changeCase("istanbul", "upper", "en")).toBe("ISTANBUL");
    expect(changeCase("İZMİR", "lower", "tr")).toBe("izmir");
  });

  it("alternates letters and inverts case, leaving other characters alone", () => {
    expect(changeCase("hola, mundo 2024!", "alternating", "es")).toBe("hOlA, mUnDo 2024!");
    expect(changeCase("Ñandú ABC def", "inverse", "es")).toBe("ñANDÚ abc DEF");
    expect(changeCase("emoji 👍🏽 ok", "alternating", "en")).toBe("eMoJi 👍🏽 Ok");
    expect(changeCase("中文 abc", "inverse", "zh")).toBe("中文 ABC");
  });
});
