// Written text → words the AI voice can say. Supertonic reads characters and
// was trained on text where numbers are mostly spelled out, so "2026",
// "28/10/2026", "14:30", "15 %", "US$ 20" or "siglo XXI" come out garbled.
// This runs on each sentence before the reference SDK's normalization (NFKD
// would turn "1.º" into "1.o"), in the sentence's language.

import { cardinal, digitsToWords, MAX_CARDINAL, MINUS, ordinal, year, type CardinalOptions, type NumberLanguage } from "./numbers";

type Lang = NumberLanguage;

// A letter or a digit next to a match means it is part of something else.
const L = "\\p{L}";
const NOT_BEFORE = `(?<![${L}\\d])`;
const NOT_AFTER = `(?![${L}\\d])`;
/** A number as written: digits with thousands groups and/or a decimal part. */
const NUM = "\\d{1,3}(?:[.,\\u202f\\u00a0 ]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?";

const DECIMAL_WORD: Record<Lang, Record<"." | ",", string>> = {
  es: { ",": "coma", ".": "punto" },
  en: { ",": "point", ".": "point" },
  pt: { ",": "vírgula", ".": "ponto" },
  fr: { ",": "virgule", ".": "point" },
};

interface ParsedNumber {
  int: bigint;
  /** Digits after the decimal separator. */
  frac?: string;
  sep?: "." | ",";
  /** Integer part as written, when it must be read digit by digit ("007"). */
  digits?: string;
}

/**
 * Reads separators the way the language writes them: in Spanish, Portuguese
 * and French the comma is the decimal mark and a point followed by three
 * digits groups thousands; in English it is the other way round. When both
 * appear, the last one is the decimal mark. Null when it is not one number
 * ("1.2.3", or "1,2" in English, which is a list).
 */
export function parseNumber(raw: string, lang: Lang): ParsedNumber | null {
  const s = raw.replace(/[   ]/g, " ");
  if (/ /.test(s) && !/^\d{1,3}( \d{3})+([.,]\d+)?$/.test(s)) return null;
  const compact = s.replace(/ /g, "");
  const dots = (compact.match(/\./g) ?? []).length;
  const commas = (compact.match(/,/g) ?? []).length;
  let intPart = compact;
  let frac: string | undefined;
  let sep: "." | "," | undefined;
  const grouped = (body: string, mark: string) => new RegExp(`^\\d{1,3}(\\${mark}\\d{3})+$`).test(body);
  if (dots && commas) {
    const decimal = compact.lastIndexOf(".") > compact.lastIndexOf(",") ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    const at = compact.lastIndexOf(decimal);
    const body = compact.slice(0, at);
    if ((decimal === "." ? commas : dots) && !grouped(body, thousands)) return null;
    if ((decimal === "." ? dots : commas) > 1) return null;
    intPart = body.replaceAll(thousands, "");
    frac = compact.slice(at + 1);
    sep = decimal;
  } else if (dots || commas) {
    const mark = dots ? "." : ",";
    const count = dots || commas;
    const [head, tail] = [compact.slice(0, compact.indexOf(mark)), compact.slice(compact.lastIndexOf(mark) + 1)];
    const thousandsMark = lang === "en" ? "," : ".";
    if (count > 1) {
      if (!grouped(compact, mark)) return null;
      intPart = compact.replaceAll(mark, "");
    } else if (mark === thousandsMark && tail.length === 3 && !head.startsWith("0")) {
      intPart = head + tail;
    } else if (lang === "en" && mark === ",") {
      return null;
    } else {
      intPart = head;
      frac = tail;
      sep = mark;
    }
  }
  if (!/^\d+$/.test(intPart) || (frac !== undefined && !/^\d+$/.test(frac))) return null;
  const parsed: ParsedNumber = { int: BigInt(intPart), frac, sep };
  // "007", "0800" and codes of ten digits or more are read digit by digit (not round amounts like 10000000000).
  if ((intPart.length > 1 && intPart.startsWith("0")) || (intPart.length >= 10 && !/0{6}$/.test(intPart)) || parsed.int > MAX_CARDINAL) parsed.digits = intPart;
  return parsed;
}

/** Decimal digits: "5" → "cinco", "25" → "veinticinco", "05" or "14159" one by one (English always one by one). */
function fracWords(frac: string, lang: Lang): string {
  if (lang !== "en" && frac.length <= 2 && !frac.startsWith("0")) return cardinal(Number(frac), lang);
  return digitsToWords(frac, lang);
}

/** A written number in words; `opts` apply to the integer part. */
export function numberWords(raw: string, lang: Lang, opts: CardinalOptions = {}): string | null {
  const p = parseNumber(raw, lang);
  if (!p) return null;
  const int = p.digits ? digitsToWords(p.digits, lang) : cardinal(p.int, lang, p.frac === undefined ? opts : {});
  if (p.frac === undefined || !p.sep) return int;
  return `${int} ${DECIMAL_WORD[lang][p.sep]} ${fracWords(p.frac, lang)}`;
}

// ---------- Gender of the noun after a number ----------

// Nouns ending in -a that are masculine (Spanish and Portuguese), the frequent ones.
const MASCULINE_A = new Set(["día", "dia", "mapa", "problema", "programa", "sistema", "tema", "idioma", "clima", "planeta", "poema", "esquema", "drama", "pijama", "sofá", "sofa", "cometa", "diploma", "dilema", "lema", "telefonema", "papa"]);

/** True when the word after a number is probably a feminine noun (it changes "un/una", "doscientos/doscientas"). */
export function isFeminineNoun(word: string, lang: Lang): boolean {
  const w = word.toLowerCase();
  if (lang === "es") return (/as?$/.test(w) && !MASCULINE_A.has(w.replace(/s$/, ""))) || /(ción|sión|dad|tad|tud|umbre)(es)?$/.test(w);
  if (lang === "pt") return (/as?$/.test(w) && !MASCULINE_A.has(w.replace(/s$/, ""))) || /(ção|ções|são|sões|dade|dades|gem|gens)$/.test(w);
  if (lang === "fr") return /(tion|sion|té|ure|ette|ance|ence|ière|euse|ade|elle|esse)s?$/.test(w) || ["heure", "heures", "minute", "minutes", "seconde", "secondes", "fois", "personne", "personnes", "page", "pages", "semaine", "semaines", "année", "années", "journée", "journées", "fille", "filles", "femme", "femmes", "ville", "villes", "voiture", "voitures"].includes(w);
  return false;
}

function nounOptions(next: string | undefined, lang: Lang): CardinalOptions {
  if (!next) return {};
  return { feminine: isFeminineNoun(next, lang), apocope: lang === "es" };
}

// ---------- Months ----------

const MONTHS: Record<Lang, string[]> = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};
const MONTH_RE: Record<Lang, string> = {
  es: "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre",
  en: "January|February|March|April|May|June|July|August|September|October|November|December|Jan\\.?|Feb\\.?|Mar\\.?|Apr\\.?|Jun\\.?|Jul\\.?|Aug\\.?|Sept?\\.?|Oct\\.?|Nov\\.?|Dec\\.?",
  pt: "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro",
  fr: "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre",
};
const EN_SHORT_MONTH: Record<string, string> = { jan: "January", feb: "February", mar: "March", apr: "April", jun: "June", jul: "July", aug: "August", sep: "September", sept: "September", oct: "October", nov: "November", dec: "December" };

/** Day of the month: "primero" (Latin American Spanish), "primeiro", "premier", English ordinals. */
function dayWords(day: number, lang: Lang): string {
  if (lang === "en") return ordinal(day, "en");
  if (day === 1) return ordinal(1, lang);
  return cardinal(day, lang);
}

function dateWords(day: number, month: number, yr: number | undefined, lang: Lang): string {
  const m = MONTHS[lang][month - 1]!;
  const y = yr === undefined ? "" : year(yr, lang);
  if (lang === "en") return `${m} ${dayWords(day, lang)}${y ? `, ${y}` : ""}`;
  if (lang === "fr") return `${dayWords(day, lang)} ${m}${y ? ` ${y}` : ""}`;
  return `${dayWords(day, lang)} de ${m}${y ? ` de ${y}` : ""}`;
}

function fullYear(y: string): number {
  if (y.length === 4) return Number(y);
  const n = Number(y);
  return n < 50 ? 2000 + n : 1900 + n;
}

function replaceDates(t: string, lang: Lang): string {
  // ISO: 2026-10-28.
  t = t.replace(new RegExp(`${NOT_BEFORE}(\\d{4})-(\\d{2})-(\\d{2})${NOT_AFTER}`, "gu"), (all, y: string, m: string, d: string) => {
    const [mm, dd] = [Number(m), Number(d)];
    return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 ? dateWords(dd, mm, Number(y), lang) : all;
  });
  // 28/10/2026, 28-10-26, 28.10.2026 (month first in English unless the first number is above 12).
  t = t.replace(new RegExp(`${NOT_BEFORE}(\\d{1,2})([/.-])(\\d{1,2})\\2(\\d{4}|\\d{2})${NOT_AFTER}`, "gu"), (all, a: string, _sep: string, b: string, y: string) => {
    let [d, m] = [Number(a), Number(b)];
    if (lang === "en" && d <= 12) [d, m] = [m, d];
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? dateWords(d, m, fullYear(y), lang) : all;
  });
  // A day written next to a month name: "1 de octubre" → "primero de octubre", "October 28" → "October twenty-eighth".
  if (lang === "en") {
    t = t.replace(new RegExp(`\\b(${MONTH_RE.en})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${NOT_AFTER}`, "gu"), (all, month: string, d: string, y: string | undefined) => {
      const name = EN_SHORT_MONTH[month.replace(".", "").toLowerCase()] ?? month;
      const day = Number(d);
      return day >= 1 && day <= 31 ? `${name} ${ordinal(day, "en")}${y ? `, ${year(Number(y), "en")}` : ""}` : all;
    });
    t = t.replace(new RegExp(`${NOT_BEFORE}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_RE.en})\\b`, "gu"), (all, d: string, month: string) => {
      const day = Number(d);
      const name = EN_SHORT_MONTH[month.replace(".", "").toLowerCase()] ?? month;
      return day >= 1 && day <= 31 ? `the ${ordinal(day, "en")} of ${name}` : all;
    });
  } else {
    const de = lang === "fr" ? "" : "de\\s+";
    const ord = lang === "fr" ? "(?:er)?" : "(?:\\.?º|°)?";
    t = t.replace(new RegExp(`${NOT_BEFORE}(\\d{1,2})${ord}\\s+${de}(${MONTH_RE[lang]})\\b`, "giu"), (all, d: string, month: string) => {
      const day = Number(d);
      return day >= 1 && day <= 31 ? `${dayWords(day, lang)} ${lang === "fr" ? "" : "de "}${month}` : all;
    });
  }
  return t;
}

// ---------- Times ----------

const HOUR_WORD: Record<Lang, [string, string]> = { es: ["hora", "horas"], en: ["hour", "hours"], pt: ["hora", "horas"], fr: ["heure", "heures"] };
const AM_PM: Record<Lang, Record<"am" | "pm", string>> = {
  es: { am: "a eme", pm: "pe eme" },
  en: { am: "a m", pm: "p m" },
  pt: { am: "a eme", pm: "pe eme" },
  fr: { am: "a m", pm: "p m" },
};

function timeWords(h: number, m: number, s: number | undefined, ampm: "am" | "pm" | undefined, lang: Lang, afterArticle: boolean): string {
  const fem = lang !== "en";
  const hour = cardinal(h, lang, { feminine: fem });
  const min = cardinal(m, lang);
  const sec = s === undefined ? "" : ` ${lang === "en" ? "and" : lang === "fr" ? "et" : lang === "pt" ? "e" : "y"} ${cardinal(s, lang, { feminine: lang === "fr" })} ${lang === "es" ? "segundos" : lang === "en" ? "seconds" : lang === "pt" ? "segundos" : "secondes"}`;
  const suffix = ampm ? ` ${AM_PM[lang][ampm]}` : "";
  if (lang === "en") {
    let words: string;
    if (m === 0) words = ampm ? hour : h > 12 || h === 0 ? `${cardinal(h, "en")} hundred` : `${hour} o'clock`;
    else words = `${h === 0 ? "zero" : hour} ${m < 10 ? `oh ${min}` : min}`;
    return words + sec + suffix;
  }
  if (lang === "fr") {
    const hw = h === 1 ? HOUR_WORD.fr[0] : HOUR_WORD.fr[1];
    return `${hour} ${hw}${m ? ` ${cardinal(m, "fr", { feminine: true })}` : ""}${sec}${suffix}`;
  }
  const [one, many] = HOUR_WORD[lang];
  const joiner = lang === "es" ? "y" : "e";
  if (m === 0) return afterArticle && lang === "es" ? hour + sec + suffix : `${hour} ${h === 1 ? one : many}${sec}${suffix}`;
  return `${hour} ${joiner} ${min}${sec}${suffix}`;
}

function replaceTimes(t: string, lang: Lang): string {
  const re = new RegExp(`${NOT_BEFORE}([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?(?:\\s?(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|AM|PM|hs|hrs|h|horas)(?![${L}]))?${NOT_AFTER}`, "giu");
  t = t.replace(re, (_all, hh: string, mm: string, ss: string | undefined, tail: string | undefined, offset: number, whole: string) => {
    const lower = tail?.toLowerCase().replace(/[.\s]/g, "");
    const ampm = lower === "am" ? "am" : lower === "pm" ? "pm" : undefined;
    const before = whole.slice(Math.max(0, offset - 5), offset).toLowerCase();
    const afterArticle = /\b(las|la)\s$/.test(before);
    const words = timeWords(Number(hh), Number(mm), ss === undefined ? undefined : Number(ss), ampm, lang, afterArticle);
    // "14:30 hs" → "catorce y treinta horas" would repeat: the hour word is already there when minutes are 0.
    if (tail && !ampm && Number(mm) !== 0 && lang !== "fr") return `${words} ${HOUR_WORD[lang][1]}`;
    // "p.m." at the end of the text also ended the sentence.
    return tail?.endsWith(".") && !whole.slice(offset + _all.length).trim() ? `${words}.` : words;
  });
  if (lang === "fr") {
    // 14h30, 14 h 30, 9h.
    t = t.replace(new RegExp(`${NOT_BEFORE}([01]?\\d|2[0-3])\\s?h\\s?([0-5]\\d)?${NOT_AFTER}`, "gu"), (_all, hh: string, mm: string | undefined) => timeWords(Number(hh), mm ? Number(mm) : 0, undefined, undefined, "fr", false));
  }
  return t;
}

// ---------- Money, percentages, units ----------

interface Currency {
  /** Singular and plural, then the cents. */
  names: Record<Lang, [string, string, string, string]>;
  feminine?: Partial<Record<Lang, boolean>>;
}

const DOLLAR: Currency = {
  names: { es: ["dólar", "dólares", "centavo", "centavos"], en: ["dollar", "dollars", "cent", "cents"], pt: ["dólar", "dólares", "centavo", "centavos"], fr: ["dollar", "dollars", "cent", "cents"] },
};
const PESO: Currency = { names: { ...DOLLAR.names, es: ["peso", "pesos", "centavo", "centavos"] } };
const EURO: Currency = {
  names: { es: ["euro", "euros", "céntimo", "céntimos"], en: ["euro", "euros", "cent", "cents"], pt: ["euro", "euros", "cêntimo", "cêntimos"], fr: ["euro", "euros", "centime", "centimes"] },
};
const REAL: Currency = {
  names: { es: ["real", "reales", "centavo", "centavos"], en: ["real", "reais", "centavo", "centavos"], pt: ["real", "reais", "centavo", "centavos"], fr: ["réal", "reais", "centavo", "centavos"] },
};
const POUND: Currency = {
  names: { es: ["libra", "libras", "penique", "peniques"], en: ["pound", "pounds", "penny", "pence"], pt: ["libra", "libras", "pêni", "pence"], fr: ["livre", "livres", "penny", "pence"] },
  feminine: { es: true, pt: true, fr: true },
};

/** "$" alone: pesos in Spanish (most of Latin America writes pesos with $), dollars elsewhere. */
function currencyFor(symbol: string, lang: Lang): Currency {
  const s = symbol.toUpperCase().replace(/\s/g, "");
  if (s === "€" || s === "EUR") return EURO;
  if (s === "R$" || s === "BRL") return REAL;
  if (s === "£" || s === "GBP") return POUND;
  if (s === "$" && lang === "es") return PESO;
  return DOLLAR;
}

const SCALE_WORD: Record<Lang, string> = {
  es: "mil|millón|millones|billón|billones",
  en: "thousand|million|millions|billion|billions|trillion",
  pt: "mil|milhão|milhões|bilhão|bilhões|trilhão|trilhões",
  fr: "mille|million|millions|milliard|milliards",
};
const AND_CENTS: Record<Lang, string> = { es: "con", en: "and", pt: "e", fr: "et" };
/** Ends with a noun scale ("millones"): Spanish, Portuguese and French put "de" before the currency. */
const NOUN_SCALE: Record<Lang, RegExp> = {
  es: /(millón|millones|billón|billones)$/,
  en: /$^/,
  pt: /(milhão|milhões|bilhão|bilhões|trilhão|trilhões)$/,
  fr: /(million|millions|milliard|milliards|billion|billions)$/,
};

function moneyWords(raw: string, scale: string | undefined, cur: Currency, lang: Lang): string | null {
  const p = parseNumber(raw, lang);
  if (!p) return null;
  const [one, many, cent, cents] = cur.names[lang];
  const feminine = cur.feminine?.[lang] ?? false;
  if (scale) {
    const amount = numberWords(raw, lang, { feminine, apocope: true });
    if (!amount) return null;
    const words = `${amount} ${scale}`;
    return `${words} ${NOUN_SCALE[lang].test(scale) || lang === "fr" ? (lang === "en" ? "" : "de ") : ""}${many}`.replace(/\s+/g, " ");
  }
  if (p.digits) return null;
  const opts: CardinalOptions = { feminine, apocope: true };
  const intWords = cardinal(p.int, lang, opts);
  const unit = p.int === BigInt(1) ? one : many;
  const de = NOUN_SCALE[lang].test(intWords) && lang !== "en" ? "de " : "";
  let words = `${intWords} ${de}${unit}`;
  if (p.frac !== undefined) {
    // Two decimals are cents; other decimals are read as a decimal amount.
    if (p.frac.length !== 2) return `${numberWords(raw, lang)} ${many}`;
    const c = Number(p.frac);
    if (c) words += ` ${AND_CENTS[lang]} ${cardinal(c, lang, { apocope: true })} ${c === 1 ? cent : cents}`;
  }
  return words;
}

function replaceMoney(t: string, lang: Lang): string {
  const prefix = "US\\$|U\\$S|R\\$|\\$|€|£|USD|EUR|BRL|GBP";
  const scale = `(?:\\s+(${SCALE_WORD[lang]})(?![${L}]))?`;
  t = t.replace(new RegExp(`(?<![${L}\\d])(${prefix})\\s?(${NUM})${scale}`, "gu"), (all, sym: string, num: string, sc: string | undefined) => moneyWords(num, sc, currencyFor(sym, lang), lang) ?? all);
  t = t.replace(new RegExp(`${NOT_BEFORE}(${NUM})${scale}\\s?(US\\$|R\\$|\\$|€|£|USD|EUR|BRL|GBP)(?![${L}\\d])`, "gu"), (all, num: string, sc: string | undefined, sym: string) => moneyWords(num, sc, currencyFor(sym, lang), lang) ?? all);
  return t;
}

const PERCENT: Record<Lang, string> = { es: "por ciento", en: "percent", pt: "por cento", fr: "pour cent" };

function replacePercent(t: string, lang: Lang): string {
  return t.replace(new RegExp(`${NOT_BEFORE}(-?)(${NUM})\\s?%`, "gu"), (all, minus: string, num: string) => {
    const words = numberWords(num, lang);
    return words ? `${minus ? `${MINUS[lang]} ` : ""}${words} ${PERCENT[lang]}` : all;
  });
}

/** Units written after a number: singular, plural, feminine noun. */
type UnitNames = [string, string, boolean?];
const UNITS: [string, Record<Lang, UnitNames>][] = [
  ["°C", { es: ["grado Celsius", "grados Celsius"], en: ["degree Celsius", "degrees Celsius"], pt: ["grau Celsius", "graus Celsius"], fr: ["degré Celsius", "degrés Celsius"] }],
  ["°F", { es: ["grado Fahrenheit", "grados Fahrenheit"], en: ["degree Fahrenheit", "degrees Fahrenheit"], pt: ["grau Fahrenheit", "graus Fahrenheit"], fr: ["degré Fahrenheit", "degrés Fahrenheit"] }],
  ["°", { es: ["grado", "grados"], en: ["degree", "degrees"], pt: ["grau", "graus"], fr: ["degré", "degrés"] }],
  ["km/h", { es: ["kilómetro por hora", "kilómetros por hora"], en: ["kilometer per hour", "kilometers per hour"], pt: ["quilômetro por hora", "quilômetros por hora"], fr: ["kilomètre par heure", "kilomètres par heure"] }],
  ["km²", { es: ["kilómetro cuadrado", "kilómetros cuadrados"], en: ["square kilometer", "square kilometers"], pt: ["quilômetro quadrado", "quilômetros quadrados"], fr: ["kilomètre carré", "kilomètres carrés"] }],
  ["m²", { es: ["metro cuadrado", "metros cuadrados"], en: ["square meter", "square meters"], pt: ["metro quadrado", "metros quadrados"], fr: ["mètre carré", "mètres carrés"] }],
  ["m³", { es: ["metro cúbico", "metros cúbicos"], en: ["cubic meter", "cubic meters"], pt: ["metro cúbico", "metros cúbicos"], fr: ["mètre cube", "mètres cubes"] }],
  ["km", { es: ["kilómetro", "kilómetros"], en: ["kilometer", "kilometers"], pt: ["quilômetro", "quilômetros"], fr: ["kilomètre", "kilomètres"] }],
  ["cm", { es: ["centímetro", "centímetros"], en: ["centimeter", "centimeters"], pt: ["centímetro", "centímetros"], fr: ["centimètre", "centimètres"] }],
  ["mm", { es: ["milímetro", "milímetros"], en: ["millimeter", "millimeters"], pt: ["milímetro", "milímetros"], fr: ["millimètre", "millimètres"] }],
  ["m", { es: ["metro", "metros"], en: ["meter", "meters"], pt: ["metro", "metros"], fr: ["mètre", "mètres"] }],
  ["kg", { es: ["kilo", "kilos"], en: ["kilogram", "kilograms"], pt: ["quilo", "quilos"], fr: ["kilo", "kilos"] }],
  ["mg", { es: ["miligramo", "miligramos"], en: ["milligram", "milligrams"], pt: ["miligrama", "miligramas"], fr: ["milligramme", "milligrammes"] }],
  ["g", { es: ["gramo", "gramos"], en: ["gram", "grams"], pt: ["grama", "gramas"], fr: ["gramme", "grammes"] }],
  ["ml", { es: ["mililitro", "mililitros"], en: ["milliliter", "milliliters"], pt: ["mililitro", "mililitros"], fr: ["millilitre", "millilitres"] }],
  ["mL", { es: ["mililitro", "mililitros"], en: ["milliliter", "milliliters"], pt: ["mililitro", "mililitros"], fr: ["millilitre", "millilitres"] }],
  ["l", { es: ["litro", "litros"], en: ["liter", "liters"], pt: ["litro", "litros"], fr: ["litre", "litres"] }],
  ["L", { es: ["litro", "litros"], en: ["liter", "liters"], pt: ["litro", "litros"], fr: ["litre", "litres"] }],
  ["KB", { es: ["kilobyte", "kilobytes"], en: ["kilobyte", "kilobytes"], pt: ["kilobyte", "kilobytes"], fr: ["kilooctet", "kilooctets"] }],
  ["kB", { es: ["kilobyte", "kilobytes"], en: ["kilobyte", "kilobytes"], pt: ["kilobyte", "kilobytes"], fr: ["kilooctet", "kilooctets"] }],
  ["MB", { es: ["megabyte", "megabytes"], en: ["megabyte", "megabytes"], pt: ["megabyte", "megabytes"], fr: ["mégaoctet", "mégaoctets"] }],
  ["GB", { es: ["gigabyte", "gigabytes"], en: ["gigabyte", "gigabytes"], pt: ["gigabyte", "gigabytes"], fr: ["gigaoctet", "gigaoctets"] }],
  ["TB", { es: ["terabyte", "terabytes"], en: ["terabyte", "terabytes"], pt: ["terabyte", "terabytes"], fr: ["téraoctet", "téraoctets"] }],
  ["Ko", { es: ["kilobyte", "kilobytes"], en: ["kilobyte", "kilobytes"], pt: ["kilobyte", "kilobytes"], fr: ["kilooctet", "kilooctets"] }],
  ["Mo", { es: ["megabyte", "megabytes"], en: ["megabyte", "megabytes"], pt: ["megabyte", "megabytes"], fr: ["mégaoctet", "mégaoctets"] }],
  ["Go", { es: ["gigabyte", "gigabytes"], en: ["gigabyte", "gigabytes"], pt: ["gigabyte", "gigabytes"], fr: ["gigaoctet", "gigaoctets"] }],
  ["Mbps", { es: ["megabit por segundo", "megabits por segundo"], en: ["megabit per second", "megabits per second"], pt: ["megabit por segundo", "megabits por segundo"], fr: ["mégabit par seconde", "mégabits par seconde"] }],
  ["GHz", { es: ["gigahercio", "gigahercios"], en: ["gigahertz", "gigahertz"], pt: ["giga-hertz", "giga-hertz"], fr: ["gigahertz", "gigahertz"] }],
  ["MHz", { es: ["megahercio", "megahercios"], en: ["megahertz", "megahertz"], pt: ["mega-hertz", "mega-hertz"], fr: ["mégahertz", "mégahertz"] }],
  ["kWh", { es: ["kilovatio hora", "kilovatios hora"], en: ["kilowatt hour", "kilowatt hours"], pt: ["quilowatt-hora", "quilowatts-hora"], fr: ["kilowattheure", "kilowattheures"] }],
  ["min", { es: ["minuto", "minutos"], en: ["minute", "minutes"], pt: ["minuto", "minutos"], fr: ["minute", "minutes", true] }],
  ["h", { es: ["hora", "horas", true], en: ["hour", "hours"], pt: ["hora", "horas", true], fr: ["heure", "heures", true] }],
  ["hs", { es: ["hora", "horas", true], en: ["hour", "hours"], pt: ["hora", "horas", true], fr: ["heure", "heures", true] }],
];
const UNIT_RE = UNITS.map(([u]) => u.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|");

function replaceUnits(t: string, lang: Lang): string {
  // A degree sign right after a small number is an ordinal in Spanish ("1° de mayo", "2° lugar"), not degrees.
  const re = new RegExp(`${NOT_BEFORE}(-?)(${NUM})\\s?(${UNIT_RE})(?![${L}\\d²³/])`, "gu");
  return t.replace(re, (all, minus: string, num: string, unit: string, offset: number, whole: string) => {
    const names = UNITS.find(([u]) => u === unit)![1][lang];
    if (unit === "°" && lang !== "en" && /^\d{1,2}$/.test(num) && Number(num) <= 10 && /^\s+\p{Ll}/u.test(whole.slice(offset + all.length))) return all;
    const words = numberWords(num, lang, { feminine: names[2] ?? false, apocope: lang === "es" });
    if (!words) return all;
    const singular = parseNumber(num, lang)?.int === BigInt(1) && !/[.,]/.test(num);
    return `${minus ? `${MINUS[lang]} ` : ""}${words} ${singular ? names[0] : names[1]}`;
  });
}

// ---------- Ordinals, "Nº", Roman numerals ----------

function replaceOrdinals(t: string, lang: Lang): string {
  if (lang === "en") {
    return t.replace(new RegExp(`${NOT_BEFORE}(\\d+)(st|nd|rd|th)(?![${L}\\d])`, "giu"), (_all, n: string) => ordinal(Number(n), "en"));
  }
  if (lang === "fr") {
    return t.replace(new RegExp(`${NOT_BEFORE}(\\d+)\\s?(er|re|ère|ers|res|e|ème|eme|es|èmes|nd|nde|nds|ndes)(?![${L}\\d])`, "gu"), (_all, n: string, suffix: string) => {
      const value = Number(n);
      if (suffix.startsWith("nd")) return suffix.includes("e") ? "seconde" : "second";
      return ordinal(value, "fr", { feminine: suffix === "re" || suffix === "ère" || suffix === "res" });
    });
  }
  // Spanish and Portuguese: 1.º, 1º, 1.ª, 1ª, and in Spanish 1.er, 1er, 1ro, 2do, 3ra, 4to, 7mo, 8vo, 9no.
  // "1°" before a word is also an ordinal when the number is small ("quedó 1° en la carrera"); "25°" is degrees.
  const degree = "°(?=\\s+\\p{Ll})";
  const suffixes = lang === "es" ? `\\.?\\s?[ºª]|${degree}|\\.?(?:er|ra|ro|da|do|ta|to|va|vo|ma|mo|na|no)(?![${L}])` : `\\.?\\s?[ºª]|${degree}`;
  return t.replace(new RegExp(`${NOT_BEFORE}(\\d+)(${suffixes})`, "gu"), (all, n: string, suffix: string) => {
    const s = suffix.replace(/[.\s]/g, "");
    if (s === "°" && Number(n) > 10) return all;
    const feminine = s === "ª" || /a$/.test(s);
    return ordinal(Number(n), lang, { feminine, apocope: s === "er" });
  });
}

function replaceNumberSign(t: string, lang: Lang): string {
  const word = { es: "número", pt: "número", fr: "numéro", en: "number" }[lang];
  t = t.replace(/(?<![\p{L}])[Nn]\.?\s?[º°o]\.?\s?(?=\d)/gu, `${word} `);
  t = t.replace(/(?<![\p{L}])[Nn]ros?\.\s?(?=\d)/gu, lang === "es" ? "números " : `${word} `);
  if (lang === "en") t = t.replace(/(?<![\p{L}])No\.\s?(?=\d)/gu, "number ");
  return t;
}

const ARTICLES = new Set(["the", "a", "an", "el", "la", "los", "las", "lo", "un", "una", "le", "les", "une", "des", "du", "de", "o", "os", "as", "um", "uma", "en", "in", "of", "y", "et", "and", "e"]);

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Value of a well-formed Roman numeral (I–MMMCMXCIX), else 0. */
export function romanValue(roman: string): number {
  if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(roman) || !roman) return 0;
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const v = ROMAN_VALUES[roman[i]!]!;
    const next = ROMAN_VALUES[roman[i + 1] ?? ""] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

const ROMAN = "[IVXLCDM]+";
const ROMAN_TRIGGERS: Record<Lang, string> = {
  es: "siglo|siglos|capítulo|capítulos|tomo|tomos|volumen|vol\\.|parte|acto|libro|fase|título|canto|lección|unidad",
  en: "century|centuries|chapter|chapters|part|volume|vol\\.|book|act|phase|world war|unit|lesson|title|season",
  pt: "século|séculos|capítulo|capítulos|tomo|volume|vol\\.|parte|ato|livro|fase|título|canto|lição|unidade",
  fr: "siècle|siècles|chapitre|chapitres|tome|volume|vol\\.|partie|acte|livre|phase|titre|leçon|unité",
};
const ROMAN_JOIN: Record<Lang, string> = { es: ",|y|e|o|al|a|-|–", en: ",|and|or|to|-|–", pt: ",|e|ou|a|ao|-|–", fr: ",|et|ou|à|au|-|–" };

/** Names of kings and popes: ordinals up to ten in Spanish and Portuguese, cardinals after; French cardinals except "Ier"; English "the Eighth". */
function regnalWords(value: number, lang: Lang): string {
  if (lang === "en") return `the ${ordinal(value, "en").replace(/^./, (c) => c.toUpperCase())}`;
  if (lang === "fr") return value === 1 ? "premier" : cardinal(value, "fr");
  return value <= 10 ? ordinal(value, lang) : cardinal(value, lang);
}

function replaceRomans(t: string, lang: Lang): string {
  // After a word that announces them: "siglo XXI", "capítulos IV y V", "World War II".
  const join = `\\s*(?:${ROMAN_JOIN[lang]})\\s*`;
  t = t.replace(new RegExp(`(?<![${L}])(${ROMAN_TRIGGERS[lang]})\\s+(${ROMAN}(?:${join}${ROMAN})*)(?![${L}\\d])`, "giu"), (all, trigger: string, list: string) => {
    let ok = true;
    const words = list.replace(new RegExp(`${ROMAN}`, "g"), (r) => {
      const v = romanValue(r);
      if (!v) ok = false;
      return lang === "en" && /centur/i.test(trigger) ? ordinal(v, "en") : cardinal(v, lang);
    });
    return ok ? `${trigger} ${words}` : all;
  });
  // French centuries and ordinals: "XXIe siècle", "Ier".
  if (lang === "fr") {
    // Only clear cases ("Ier", "XXIe", "Ve siècle"): a lone L, C, D or M with "e" is a word ("Le").
    t = t.replace(new RegExp(`(?<![${L}])(I(?=er|re)|[IVX]{2,}(?=e|ème)|[VX](?=(?:e|ème)\\s+siècle))(er|re|e|ème)(?![${L}\\d])`, "gu"), (all, r: string, suffix: string) => {
      const v = romanValue(r);
      return v ? ordinal(v, "fr", { feminine: suffix === "re" }) : all;
    });
  }
  if (lang === "en") t = t.replace(new RegExp(`(?<![${L}])(${ROMAN})(?=\\s+centur)`, "gu"), (all, r: string) => (romanValue(r) ? ordinal(romanValue(r), "en") : all));
  // After a capitalized name: "Felipe II", "Juan Pablo II", "Louis XIV" (not a lone I or X: pronoun, letter; not after an article).
  t = t.replace(new RegExp(`(?<=(\\p{Lu}\\p{Ll}+)\\s)(I{2,3}|IV|VI{0,3}|IX|XI{1,3}|XI?V|XVI{0,3}|XI?X|XXI{0,3}|XXI?V|XXVI{0,3}|XXI?X|XXX)(?![${L}\\d])`, "gu"), (all, prev: string, r: string) => {
    const v = romanValue(r);
    return v && !ARTICLES.has(prev.toLowerCase()) ? regnalWords(v, lang) : all;
  });
  return t;
}

// ---------- Phones, ranges, plain numbers ----------

const PLUS: Record<Lang, string> = { es: "más", en: "plus", pt: "mais", fr: "plus" };
const RANGE_TO: Record<Lang, string> = { es: "a", en: "to", pt: "a", fr: "à" };

function isYear(s: string) {
  return /^\d{4}$/.test(s) && Number(s) >= 1000 && Number(s) <= 2099;
}

function replacePhones(t: string, lang: Lang): string {
  const re = new RegExp(`${NOT_BEFORE}(\\+\\s?\\d{1,3}[\\s.-]?)?(\\(\\d{1,4}\\)\\s?)?\\d{2,5}(?:[\\s.-]\\d{2,5}){1,4}${NOT_AFTER}`, "gu");
  return t.replace(re, (all: string, plus: string | undefined, paren: string | undefined) => {
    const groups = all.match(/\d+/g) ?? [];
    const total = groups.join("").length;
    if (!plus && !paren) {
      if (total < 7) return all;
      // A grouped number ("1.234.567", "1 234 567") or a range of years is not a phone.
      if (parseNumber(all, lang) && !/-/.test(all)) return all;
      if (groups.length === 2 && /^\d+-\d+$/.test(all) && isYear(groups[0]!) && isYear(groups[1]!)) return all;
      if (!/[-\s.]/.test(all)) return all;
      // Thousands written with spaces only (French): leave to the number reader.
      if (/^\d{1,3}( \d{3})+$/.test(all) && lang === "fr") return all;
    }
    const spoken = groups.map((g) => digitsToWords(g, lang));
    return `${plus ? `${PLUS[lang]} ` : ""}${spoken.join(", ")}`;
  });
}

function replaceRanges(t: string, lang: Lang): string {
  const re = new RegExp(`${NOT_BEFORE}(${NUM})\\s?[-–—]\\s?(${NUM})${NOT_AFTER}`, "gu");
  return t.replace(re, (all, a: string, b: string, offset: number, whole: string) => {
    const read = (n: string) => (lang === "en" && isYear(n) ? year(Number(n), "en") : numberWords(n, lang));
    const [wa, wb] = [read(a), read(b)];
    if (!wa || !wb) return all;
    const next = whole.slice(offset + all.length).match(/^\s+([\p{L}]+)/u)?.[1];
    const opts = nounOptions(next, lang);
    const wb2 = lang !== "en" && !/[.,]/.test(b) && opts.feminine ? numberWords(b, lang, opts) ?? wb : wb;
    return `${wa} ${RANGE_TO[lang]} ${wb2}`;
  });
}

// English years without a separator: "in 1984", "since 2020", "1990 and 2000".
const EN_YEAR_BEFORE = /\b(in|since|by|from|until|till|of|year|during|before|after|around|circa|c\.|early|late|mid|spring|summer|autumn|fall|winter|between|and|to|the|January|February|March|April|May|June|July|August|September|October|November|December)\s+$/i;

const FRACTIONS: Record<Lang, [string, string][]> = {
  es: [["medio", "medios"], ["tercio", "tercios"], ["cuarto", "cuartos"], ["quinto", "quintos"], ["sexto", "sextos"], ["séptimo", "séptimos"], ["octavo", "octavos"], ["noveno", "novenos"], ["décimo", "décimos"]],
  en: [["half", "halves"], ["third", "thirds"], ["quarter", "quarters"], ["fifth", "fifths"], ["sixth", "sixths"], ["seventh", "sevenths"], ["eighth", "eighths"], ["ninth", "ninths"], ["tenth", "tenths"]],
  pt: [["meio", "meios"], ["terço", "terços"], ["quarto", "quartos"], ["quinto", "quintos"], ["sexto", "sextos"], ["sétimo", "sétimos"], ["oitavo", "oitavos"], ["nono", "nonos"], ["décimo", "décimos"]],
  fr: [["demi", "demis"], ["tiers", "tiers"], ["quart", "quarts"], ["cinquième", "cinquièmes"], ["sixième", "sixièmes"], ["septième", "septièmes"], ["huitième", "huitièmes"], ["neuvième", "neuvièmes"], ["dixième", "dixièmes"]],
};

/** Simple fractions: "1/2" → "un medio", "3/4" → "tres cuartos" (denominators 2 to 10). */
function replaceFractions(t: string, lang: Lang): string {
  return t.replace(new RegExp(`${NOT_BEFORE}(\\d)/(\\d{1,2})${NOT_AFTER}`, "gu"), (all, a: string, b: string) => {
    const [num, den] = [Number(a), Number(b)];
    if (den < 2 || den > 10 || num < 1 || num >= den) return all;
    const [one, many] = FRACTIONS[lang][den - 2]!;
    return `${cardinal(num, lang, { apocope: lang === "es" })} ${num === 1 ? one : many}`;
  });
}

function replacePlainNumbers(t: string, lang: Lang): string {
  t = t.replace(/(\d)\s*\+\s*(?=\d)/g, `$1 ${PLUS[lang]} `);
  // Versions and section numbers: "1.2.3" → "uno punto dos punto tres".
  t = t.replace(new RegExp(`${NOT_BEFORE}\\d+(?:\\.\\d+){2,}${NOT_AFTER}`, "gu"), (all) => parseNumber(all, lang) ? all : all.split(".").map((n) => cardinal(BigInt(n), lang)).join(` ${DECIMAL_WORD[lang]["."]} `));
  const re = new RegExp(`(?<![${L}\\d.,])(-?)(${NUM})(?![\\d])`, "gu");
  return t.replace(re, (all, minus: string, num: string, offset: number, whole: string) => {
    const before = whole.slice(0, offset);
    const after = whole.slice(offset + all.length);
    // A hyphen glued to the previous word is not a minus sign ("COVID-19").
    const negative = minus && (offset === 0 || /[\s(]$/.test(before));
    const next = after.match(/^\s+([\p{L}]+)/u)?.[1];
    let words: string | null;
    if (lang === "en" && isYear(num) && (EN_YEAR_BEFORE.test(before) || !next || /^(and|to|or)$/i.test(next))) words = year(Number(num), "en");
    else words = numberWords(num, lang, nounOptions(next, lang));
    // Not one number ("1,2" in English): each run of digits on its own.
    if (!words) words = num.replace(/\d+/g, (d) => ` ${parseNumber(d, lang)?.digits ? digitsToWords(d, lang) : cardinal(BigInt(d), lang)} `).replace(/ {2,}/g, " ");
    return `${minus ? (negative ? `${MINUS[lang]} ` : `${minus} `) : ""}${words}`;
  });
}

// ---------- Abbreviations and acronyms ----------

/** [abbreviation as written, words]; the first letter also matches in uppercase ("Pág." at the start of a sentence). */
const ABBREVIATIONS: Record<Lang, [string, string][]> = {
  es: [
    ["EE. UU.", "Estados Unidos"], ["EE.UU.", "Estados Unidos"], ["EEUU", "Estados Unidos"], ["p. ej.", "por ejemplo"], ["a. C.", "antes de Cristo"], ["d. C.", "después de Cristo"],
    ["Sr.", "señor"], ["Sra.", "señora"], ["Srta.", "señorita"], ["Sres.", "señores"], ["Dr.", "doctor"], ["Dra.", "doctora"], ["Lic.", "licenciado"],
    ["Ing.", "ingeniero"], ["Prof.", "profesor"], ["Profa.", "profesora"], ["Arq.", "arquitecto"], ["Ud.", "usted"], ["Uds.", "ustedes"], ["Vd.", "usted"], ["Vds.", "ustedes"],
    ["etc.", "etcétera"], ["págs.", "páginas"], ["pág.", "página"], ["núm.", "número"], ["art.", "artículo"], ["cap.", "capítulo"], ["aprox.", "aproximadamente"],
    ["Avda.", "avenida"], ["Av.", "avenida"], ["tel.", "teléfono"], ["máx.", "máximo"], ["mín.", "mínimo"], ["dpto.", "departamento"], ["depto.", "departamento"], ["vs.", "versus"],
  ],
  en: [
    ["e.g.", "for example"], ["i.e.", "that is"], ["Mr.", "Mister"], ["Mrs.", "Missus"], ["Ms.", "Miz"], ["Dr.", "Doctor"], ["Prof.", "Professor"], ["Jr.", "Junior"], ["Sr.", "Senior"],
    ["etc.", "et cetera"], ["vs.", "versus"], ["approx.", "approximately"], ["Inc.", "Incorporated"], ["Ltd.", "Limited"], ["Dept.", "Department"], ["Fig.", "Figure"], ["U.S.", "U S"],
  ],
  pt: [
    ["p. ex.", "por exemplo"], ["a.C.", "antes de Cristo"], ["d.C.", "depois de Cristo"], ["V. Exa.", "Vossa Excelência"], ["Sr.", "senhor"], ["Sra.", "senhora"], ["Srta.", "senhorita"],
    ["Dr.", "doutor"], ["Dra.", "doutora"], ["Prof.", "professor"], ["Profa.", "professora"], ["etc.", "etcétera"], ["págs.", "páginas"], ["pág.", "página"], ["Av.", "avenida"],
    ["tel.", "telefone"], ["aprox.", "aproximadamente"], ["máx.", "máximo"], ["mín.", "mínimo"], ["vs.", "versus"],
  ],
  fr: [
    ["c.-à-d.", "c'est-à-dire"], ["p. ex.", "par exemple"], ["av. J.-C.", "avant Jésus-Christ"], ["apr. J.-C.", "après Jésus-Christ"], ["MM.", "Messieurs"], ["Mmes", "Mesdames"],
    ["Mme", "Madame"], ["Mlle", "Mademoiselle"], ["Dr", "Docteur"], ["Pr", "Professeur"], ["etc.", "et cetera"], ["cf.", "confer"], ["env.", "environ"], ["Ste", "Sainte"], ["St", "Saint"],
  ],
};

// Abbreviations that are also a page or a word: only before a number ("p. 5", "pp. 10-12").
const PAGE: Record<Lang, [string, string, string]> = { es: ["p.", "página", "páginas"], en: ["p.", "page", "pages"], pt: ["p.", "página", "páginas"], fr: ["p.", "page", "pages"] };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

export function expandAbbreviations(text: string, lang: Lang): string {
  let t = text;
  for (const [abbr, words] of ABBREVIATIONS[lang]) {
    const first = abbr[0]!;
    const head = first.toLowerCase() !== first.toUpperCase() ? `[${first.toLowerCase()}${first.toUpperCase()}]` : escapeRe(first);
    // French titles are written without a period: "Mme Dupont", "Dr Martin" (a capitalized name follows).
    const tail = lang === "fr" && !abbr.endsWith(".") && /^[A-Z]/.test(abbr) ? "(?=\\s+\\p{Lu})" : abbr.endsWith(".") ? "" : `(?![${L}])`;
    const re = new RegExp(`(?<![${L}.])${head}${escapeRe(abbr.slice(1)).replace(/ /g, "\\s?")}${tail}`, "gu");
    t = t.replace(re, (m) => (/^\p{Lu}/u.test(m) && /^\p{Ll}/u.test(words) && /^\p{Ll}/u.test(abbr) ? words[0]!.toUpperCase() + words.slice(1) : words));
  }
  // "M. Dupont" (French): only before a capitalized name.
  if (lang === "fr") t = t.replace(/(?<![\p{L}.])M\.\s(?=\p{Lu}\p{Ll})/gu, "Monsieur ");
  const [, one, many] = PAGE[lang];
  t = t.replace(/(?<![\p{L}.])pp\.\s?(?=\d)/gu, `${many} `).replace(/(?<![\p{L}.])p\.\s?(?=\d)/gu, `${one} `);
  return t;
}

const LETTER_NAMES: Record<Lang, Record<string, string>> = {
  es: { A: "a", B: "be", C: "ce", D: "de", E: "e", F: "efe", G: "ge", H: "hache", I: "i", J: "jota", K: "ka", L: "ele", M: "eme", N: "ene", Ñ: "eñe", O: "o", P: "pe", Q: "cu", R: "erre", S: "ese", T: "te", U: "u", V: "ve", W: "doble ve", X: "equis", Y: "i griega", Z: "zeta" },
  // English letters spaced out: the model reads a capital letter on its own by its name.
  en: Object.fromEntries([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((c) => [c, c])),
  pt: { A: "a", B: "bê", C: "cê", D: "dê", E: "é", F: "efe", G: "gê", H: "agá", I: "i", J: "jota", K: "cá", L: "ele", M: "eme", N: "ene", O: "ó", P: "pê", Q: "quê", R: "erre", S: "esse", T: "tê", U: "u", V: "vê", W: "dáblio", X: "xis", Y: "ípsilon", Z: "zê" },
  fr: { A: "a", B: "bé", C: "cé", D: "dé", E: "e", F: "effe", G: "gé", H: "ache", I: "i", J: "ji", K: "ka", L: "elle", M: "emme", N: "enne", O: "o", P: "pé", Q: "ku", R: "erre", S: "esse", T: "té", U: "u", V: "vé", W: "double vé", X: "ixe", Y: "i grec", Z: "zède" },
};

// Short words that are written in capitals for emphasis ("NO quiero"), not acronyms.
const CAPS_WORDS: Record<Lang, Set<string>> = {
  es: new Set(["NO", "SI", "SÍ", "YA", "YO", "EL", "LA", "LO", "UN", "DE", "EN", "ES", "MI", "TU", "SU", "SE", "TE", "ME", "LE", "OK", "OH", "AY", "VA", "HA", "HE", "IR", "AL", "NI", "O", "Y", "A", "E", "U"]),
  en: new Set(["NO", "IT", "IS", "TO", "OF", "IN", "ON", "AT", "BE", "DO", "GO", "SO", "UP", "MY", "WE", "HE", "ME", "OR", "AN", "AS", "IF", "OK", "OH", "BY", "US", "A", "I"]),
  pt: new Set(["NO", "NA", "DE", "DO", "DA", "EM", "UM", "OU", "SE", "JÁ", "EU", "ME", "TE", "LÁ", "AÍ", "OK", "OI", "AO", "OS", "AS", "O", "A", "E"]),
  fr: new Set(["LE", "LA", "DE", "UN", "EN", "ET", "OU", "IL", "ON", "NE", "SE", "CE", "MA", "TA", "SA", "DU", "AU", "OK", "OH", "JE", "TU", "A", "Y", "À"]),
};

// Syllables a word can be read with: then "NASA", "OTAN", "UNESCO" are said as words; "PDF", "DNI", "USB" are spelled.
const SYLLABLE = "(?:[BCDFGKPT][RL]|CH|LL|QU|[BCDFGHJKLMNPQRSTVWXYZÑ])?[AEIOUY]{1,2}(?:[NRL]S|[BCDGLMNPRSTXZ])?";
const PRONOUNCEABLE = new RegExp(`^(?:${SYLLABLE})+$`);

/**
 * Acronyms in capitals that cannot be read as a word are spelled with the
 * letters' names; other words in capitals are lowercased: the model
 * mispronounces them ("FECHA" comes out as "feca", "fecha" does not; measured
 * with Whisper in docs/tts-voz-ia.md).
 */
export function spellAcronyms(text: string, lang: Lang): string {
  const words = text.match(/\p{L}+/gu) ?? [];
  const caps = words.filter((w) => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase());
  // A sentence written all in capitals is shouting, not acronyms.
  if (words.length >= 3 && caps.length / words.length > 0.75) return text.toLowerCase();
  return text.replace(/(?<![\p{L}\d.])\p{Lu}{2,}(?![\p{L}\d]|\.\p{L})/gu, (w) => {
    if (w.length <= 6 && /^[A-ZÑ]+$/.test(w) && !CAPS_WORDS[lang].has(w) && !(w.length > 2 && PRONOUNCEABLE.test(w))) return [...w].map((c) => LETTER_NAMES[lang][c] ?? c).join(" ");
    return w.toLowerCase();
  });
}

/** Numbers, dates, times, money, percentages, units, ordinals and Roman numerals in words. */
export function normalizeNumbers(text: string, lang: Lang): string {
  let t = text;
  t = replaceDates(t, lang);
  t = replaceTimes(t, lang);
  t = replacePhones(t, lang);
  t = replaceMoney(t, lang);
  t = replacePercent(t, lang);
  t = replaceNumberSign(t, lang);
  t = replaceOrdinals(t, lang);
  t = replaceUnits(t, lang);
  t = replaceRomans(t, lang);
  t = replaceRanges(t, lang);
  t = replaceFractions(t, lang);
  t = replacePlainNumbers(t, lang);
  // Whatever is left (digits glued to other digits or separators) is still better said than spelled.
  // Padded with spaces ("MP3" → "MP tres"); preprocessText removes the space before punctuation.
  return t.replace(/\d+/g, (d) => ` ${(d.length > 1 && d.startsWith("0")) || d.length >= 10 ? digitsToWords(d, lang) : cardinal(BigInt(d), lang)} `).replace(/ {2,}/g, " ");
}
