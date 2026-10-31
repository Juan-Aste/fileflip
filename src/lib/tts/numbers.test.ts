import { describe, expect, it } from "vitest";
import { cardinal, digitsToWords, ordinal, year } from "./numbers";

describe("cardinal numbers", () => {
  it("Spanish", () => {
    const cases: [number, string][] = [
      [0, "cero"], [1, "uno"], [15, "quince"], [16, "dieciséis"], [21, "veintiuno"], [22, "veintidós"], [23, "veintitrés"], [26, "veintiséis"],
      [30, "treinta"], [31, "treinta y uno"], [99, "noventa y nueve"], [100, "cien"], [101, "ciento uno"], [116, "ciento dieciséis"],
      [200, "doscientos"], [500, "quinientos"], [555, "quinientos cincuenta y cinco"], [700, "setecientos"], [900, "novecientos"],
      [1000, "mil"], [1001, "mil uno"], [2026, "dos mil veintiséis"], [21000, "veintiún mil"], [101000, "ciento un mil"], [100000, "cien mil"],
      [1_000_000, "un millón"], [2_000_000, "dos millones"], [21_000_000, "veintiún millones"], [1_000_000_000, "mil millones"],
      [1_234_567, "un millón doscientos treinta y cuatro mil quinientos sesenta y siete"], [1_000_000_000_000, "un billón"],
    ];
    for (const [n, words] of cases) expect(cardinal(n, "es"), String(n)).toBe(words);
    expect(cardinal(21, "es", { apocope: true })).toBe("veintiún");
    expect(cardinal(1, "es", { apocope: true })).toBe("un");
    expect(cardinal(31, "es", { apocope: true })).toBe("treinta y un");
    expect(cardinal(11, "es", { apocope: true })).toBe("once");
    expect(cardinal(1, "es", { feminine: true })).toBe("una");
    expect(cardinal(21, "es", { feminine: true })).toBe("veintiuna");
    expect(cardinal(200, "es", { feminine: true })).toBe("doscientas");
    expect(cardinal(-5, "es")).toBe("menos cinco");
  });

  it("English", () => {
    const cases: [number, string][] = [
      [0, "zero"], [13, "thirteen"], [21, "twenty-one"], [40, "forty"], [100, "one hundred"], [101, "one hundred one"], [999, "nine hundred ninety-nine"],
      [1000, "one thousand"], [2026, "two thousand twenty-six"], [1_000_000, "one million"], [3_000_000_000, "three billion"],
      [1_234_567, "one million two hundred thirty-four thousand five hundred sixty-seven"],
    ];
    for (const [n, words] of cases) expect(cardinal(n, "en"), String(n)).toBe(words);
  });

  it("Portuguese", () => {
    const cases: [number, string][] = [
      [0, "zero"], [1, "um"], [2, "dois"], [16, "dezesseis"], [19, "dezenove"], [21, "vinte e um"], [100, "cem"], [101, "cento e um"],
      [123, "cento e vinte e três"], [200, "duzentos"], [1000, "mil"], [1001, "mil e um"], [1100, "mil e cem"], [1500, "mil e quinhentos"],
      [1234, "mil duzentos e trinta e quatro"], [2026, "dois mil e vinte e seis"], [2000, "dois mil"], [1_000_000, "um milhão"],
      [2_500_000, "dois milhões e quinhentos mil"], [1_000_000_000, "um bilhão"],
    ];
    for (const [n, words] of cases) expect(cardinal(n, "pt"), String(n)).toBe(words);
    expect(cardinal(2, "pt", { feminine: true })).toBe("duas");
    expect(cardinal(21, "pt", { feminine: true })).toBe("vinte e uma");
    expect(cardinal(200, "pt", { feminine: true })).toBe("duzentas");
    expect(cardinal(2000, "pt", { feminine: true })).toBe("duas mil");
  });

  it("French", () => {
    const cases: [number, string][] = [
      [0, "zéro"], [1, "un"], [16, "seize"], [17, "dix-sept"], [21, "vingt et un"], [22, "vingt-deux"], [61, "soixante et un"], [70, "soixante-dix"],
      [71, "soixante et onze"], [72, "soixante-douze"], [80, "quatre-vingts"], [81, "quatre-vingt-un"], [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"],
      [99, "quatre-vingt-dix-neuf"], [100, "cent"], [200, "deux cents"], [201, "deux cent un"], [280, "deux cent quatre-vingts"], [1000, "mille"],
      [2026, "deux mille vingt-six"], [80_000, "quatre-vingt mille"], [200_000, "deux cent mille"], [1_000_000, "un million"],
      [200_000_000, "deux cents millions"], [2_000_000_000, "deux milliards"],
    ];
    for (const [n, words] of cases) expect(cardinal(n, "fr"), String(n)).toBe(words);
    expect(cardinal(21, "fr", { feminine: true })).toBe("vingt et une");
  });

  it("reads numbers too long for words digit by digit", () => {
    expect(cardinal(BigInt(10) ** BigInt(16), "es")).toBe(digitsToWords("10000000000000000", "es"));
    expect(digitsToWords("0800", "en")).toBe("zero eight zero zero");
  });
});

describe("ordinals", () => {
  it("Spanish", () => {
    expect(ordinal(1, "es")).toBe("primero");
    expect(ordinal(1, "es", { apocope: true })).toBe("primer");
    expect(ordinal(3, "es", { apocope: true })).toBe("tercer");
    expect(ordinal(2, "es", { feminine: true })).toBe("segunda");
    expect(ordinal(10, "es")).toBe("décimo");
    expect(ordinal(21, "es")).toBe("vigésimo primero");
    expect(ordinal(100, "es")).toBe("centésimo");
  });
  it("English", () => {
    const cases: [number, string][] = [[1, "first"], [2, "second"], [3, "third"], [4, "fourth"], [5, "fifth"], [8, "eighth"], [9, "ninth"], [12, "twelfth"], [20, "twentieth"], [21, "twenty-first"], [100, "one hundredth"]];
    for (const [n, words] of cases) expect(ordinal(n, "en")).toBe(words);
  });
  it("Portuguese", () => {
    expect(ordinal(1, "pt")).toBe("primeiro");
    expect(ordinal(1, "pt", { feminine: true })).toBe("primeira");
    expect(ordinal(7, "pt")).toBe("sétimo");
    expect(ordinal(22, "pt")).toBe("vigésimo segundo");
  });
  it("French", () => {
    const cases: [number, string][] = [[1, "premier"], [2, "deuxième"], [4, "quatrième"], [5, "cinquième"], [9, "neuvième"], [11, "onzième"], [21, "vingt et unième"], [80, "quatre-vingtième"], [100, "centième"]];
    for (const [n, words] of cases) expect(ordinal(n, "fr")).toBe(words);
    expect(ordinal(1, "fr", { feminine: true })).toBe("première");
  });
});

describe("years", () => {
  it("English splits them in two", () => {
    expect(year(2026, "en")).toBe("twenty twenty-six");
    expect(year(1984, "en")).toBe("nineteen eighty-four");
    expect(year(1905, "en")).toBe("nineteen oh five");
    expect(year(1900, "en")).toBe("nineteen hundred");
    expect(year(2000, "en")).toBe("two thousand");
    expect(year(2005, "en")).toBe("two thousand five");
    expect(year(2010, "en")).toBe("twenty ten");
  });
  it("the other languages read them as numbers", () => {
    expect(year(2026, "es")).toBe("dos mil veintiséis");
    expect(year(2026, "pt")).toBe("dois mil e vinte e seis");
    expect(year(2026, "fr")).toBe("deux mille vingt-six");
    expect(year(1984, "es")).toBe("mil novecientos ochenta y cuatro");
  });
});
