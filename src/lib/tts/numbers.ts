// Numbers as words for the AI voice (Supertonic reads digits poorly: it was
// trained on written text). Cardinals, ordinals and years in Spanish,
// English, Portuguese (Brazil) and French. Written for the site instead of
// using a library: n2words 6.3 (MIT) was checked and writes "dieciseis"
// without the accent and reads "3,5" as "tres punto cinco" in Spanish.

export type NumberLanguage = "es" | "en" | "pt" | "fr";

export interface CardinalOptions {
  /** Feminine forms ("una", "doscientas", "duas", "une"). */
  feminine?: boolean;
  /** Before a noun: "un"/"veintiún" in Spanish ("veintiún años"). */
  apocope?: boolean;
}

/** Largest number read as a whole; longer ones are read digit by digit. */
export const MAX_CARDINAL = BigInt(999_999_999_999_999);

// ---------- Spanish ----------

const ES_UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

/** 0–999 in Spanish; `one` is the form of a final "uno" ("uno", "un" or "una"). */
function es999(n: number, one: "uno" | "un" | "una", feminine: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(n === 100 ? "cien" : feminine && h > 1 ? ES_HUNDREDS[h]!.replace(/os$/, "as") : ES_HUNDREDS[h]!);
  if (r || !h) {
    let w: string;
    if (r < 30) w = ES_UNITS[r]!;
    else w = ES_TENS[Math.floor(r / 10)]! + (r % 10 ? ` y ${ES_UNITS[r % 10]}` : "");
    if (r % 10 === 1 && r !== 11) {
      if (one === "un") w = w.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
      else if (one === "una") w = w.replace(/uno$/, "una");
    }
    parts.push(w);
  }
  return parts.join(" ");
}

function esCardinal(n: bigint, { feminine = false, apocope = false }: CardinalOptions): string {
  if (n === BigInt(0)) return "cero";
  const finalOne = feminine ? "una" : apocope ? "un" : "uno";
  // Groups of six digits: units, millions (10^6), billions (10^12).
  const scales: [bigint, string, string][] = [
    [BigInt(1_000_000_000_000), "billón", "billones"],
    [BigInt(1_000_000), "millón", "millones"],
  ];
  const words: string[] = [];
  let rest = n;
  for (const [size, one, many] of scales) {
    const q = rest / size;
    rest %= size;
    if (q === BigInt(0)) continue;
    words.push(q === BigInt(1) ? `un ${one}` : `${esBelowMillion(Number(q), "un", false)} ${many}`);
  }
  if (rest) words.push(esBelowMillion(Number(rest), finalOne, feminine));
  return words.join(" ");
}

function esBelowMillion(n: number, one: "uno" | "un" | "una", feminine: boolean): string {
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const words: string[] = [];
  // "veintiún mil" / "veintiuna mil" (feminine nouns) both exist; the masculine is the most common.
  if (th) words.push(th === 1 ? "mil" : `${es999(th, feminine ? "una" : "un", feminine)} mil`);
  if (r) words.push(es999(r, one, feminine));
  return words.join(" ");
}

// ---------- English ----------

const EN_UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function en99(n: number): string {
  if (n < 20) return EN_UNITS[n]!;
  return EN_TENS[Math.floor(n / 10)]! + (n % 10 ? `-${EN_UNITS[n % 10]}` : "");
}

function en999(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${EN_UNITS[h]} hundred` : "", r || !h ? en99(r) : ""].filter(Boolean).join(" ");
}

function enCardinal(n: bigint): string {
  if (n === BigInt(0)) return "zero";
  const scales = ["", "thousand", "million", "billion", "trillion"];
  const words: string[] = [];
  for (let i = scales.length - 1; i >= 0; i--) {
    const size = BigInt(1000) ** BigInt(i);
    const q = Number((n / size) % BigInt(1000));
    if (q) words.push(scales[i] ? `${en999(q)} ${scales[i]}` : en999(q));
  }
  return words.join(" ");
}

// ---------- Portuguese (Brazil) ----------

const PT_UNITS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const PT_TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const PT_HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ptUnit(n: number, feminine: boolean): string {
  if (feminine && n === 1) return "uma";
  if (feminine && n === 2) return "duas";
  return PT_UNITS[n]!;
}

function pt999(n: number, feminine: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(n === 100 ? "cem" : feminine && h > 1 ? PT_HUNDREDS[h]!.replace(/os$/, "as") : PT_HUNDREDS[h]!);
  if (r || !h) {
    if (r < 20) parts.push(ptUnit(r, feminine));
    else parts.push(PT_TENS[Math.floor(r / 10)]! + (r % 10 ? ` e ${ptUnit(r % 10, feminine)}` : ""));
  }
  return parts.join(" e ");
}

function ptCardinal(n: bigint, { feminine = false }: CardinalOptions): string {
  if (n === BigInt(0)) return "zero";
  const scales: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"], ["trilhão", "trilhões"]];
  const groups: { value: number; words: string }[] = [];
  for (let i = scales.length - 1; i >= 0; i--) {
    const q = Number((n / BigInt(1000) ** BigInt(i)) % BigInt(1000));
    if (!q) continue;
    // Thousands and units agree with a feminine noun ("duas mil pessoas"); millions are masculine nouns.
    const fem = feminine && i <= 1;
    let words: string;
    if (i === 0) words = pt999(q, fem);
    else if (i === 1) words = q === 1 ? "mil" : `${pt999(q, fem)} mil`;
    else words = `${pt999(q, false)} ${q === 1 ? scales[i]![0] : scales[i]![1]}`;
    groups.push({ value: q, words });
  }
  // "e" before the last group when it is below 100 or a whole hundred ("mil e quinhentos", "dois milhões e quinhentos mil").
  const last = groups[groups.length - 1]!;
  if (groups.length > 1 && (last.value < 100 || last.value % 100 === 0)) {
    return `${groups.slice(0, -1).map((g) => g.words).join(" ")} e ${last.words}`;
  }
  return groups.map((g) => g.words).join(" ");
}

// ---------- French ----------

const FR_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const FR_TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function fr99(n: number, feminine: boolean, final: boolean): string {
  const unit = (u: number) => (u === 1 && feminine ? "une" : FR_UNITS[u]!);
  if (n <= 16) return unit(n);
  if (n < 20) return `dix-${FR_UNITS[n - 10]}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t < 7) return FR_TENS[t]! + (u === 1 ? ` et ${unit(1)}` : u ? `-${FR_UNITS[u]}` : "");
  if (t === 7) return n === 71 ? "soixante et onze" : `soixante-${fr99(n - 60, feminine, final)}`;
  // 80–99: "quatre-vingts" takes an s only at the end of the number.
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${fr99(n - 80, feminine, final)}`;
}

/** 0–999; `final` is false before "mille" (cent and vingt lose their plural s). */
function fr999(n: number, feminine: boolean, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(h === 1 ? "cent" : `${FR_UNITS[h]} cent${!r && final ? "s" : ""}`);
  if (r || !h) parts.push(fr99(r, feminine, final));
  return parts.join(" ");
}

function frCardinal(n: bigint, { feminine = false }: CardinalOptions): string {
  if (n === BigInt(0)) return "zéro";
  const scales: [string, string][] = [["", ""], ["mille", "mille"], ["million", "millions"], ["milliard", "milliards"], ["billion", "billions"]];
  const words: string[] = [];
  for (let i = scales.length - 1; i >= 0; i--) {
    const q = Number((n / BigInt(1000) ** BigInt(i)) % BigInt(1000));
    if (!q) continue;
    if (i === 0) words.push(fr999(q, feminine, true));
    else if (i === 1) words.push(q === 1 ? "mille" : `${fr999(q, false, false)} mille`);
    // million and milliard are nouns: "deux cents millions" keeps the s.
    else words.push(`${fr999(q, false, true)} ${q === 1 ? scales[i]![0] : scales[i]![1]}`);
  }
  return words.join(" ");
}

/** The number in words, or its digits one by one when it is too long. */
export function cardinal(value: number | bigint, lang: NumberLanguage, options: CardinalOptions = {}): string {
  let n = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  const negative = n < BigInt(0);
  if (negative) n = -n;
  const words = n > MAX_CARDINAL ? digitsToWords(n.toString(), lang) : lang === "es" ? esCardinal(n, options) : lang === "en" ? enCardinal(n) : lang === "pt" ? ptCardinal(n, options) : frCardinal(n, options);
  return negative ? `${MINUS[lang]} ${words}` : words;
}

export const MINUS: Record<NumberLanguage, string> = { es: "menos", en: "minus", pt: "menos", fr: "moins" };

/** "0800" → "cero ocho cero cero". */
export function digitsToWords(digits: string, lang: NumberLanguage): string {
  return [...digits].filter((c) => c >= "0" && c <= "9").map((c) => cardinal(Number(c), lang)).join(" ");
}

// ---------- Ordinals ----------

const ES_ORD_UNITS = ["", "primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno"];
const ES_ORD_TENS = ["", "décimo", "vigésimo", "trigésimo", "cuadragésimo", "quincuagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo"];
const ES_ORD_HUNDREDS = ["", "centésimo", "ducentésimo", "tricentésimo", "cuadringentésimo", "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo", "noningentésimo"];

const PT_ORD_UNITS = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono"];
const PT_ORD_TENS = ["", "décimo", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo"];
const PT_ORD_HUNDREDS = ["", "centésimo", "ducentésimo", "trecentésimo", "quadringentésimo", "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo", "noningentésimo"];

/** Latin-style ordinals (Spanish, Portuguese), 1–999; larger ones fall back to the cardinal. */
function latinOrdinal(n: number, units: string[], tens: string[], hundreds: string[], feminine: boolean, lang: "es" | "pt"): string {
  if (n < 1 || n > 999) return cardinal(n, lang, { feminine });
  const parts = [hundreds[Math.floor(n / 100)]!, tens[Math.floor((n % 100) / 10)]!, units[n % 10]!].filter(Boolean);
  // Written as one word from 11 to 29 in Spanish ("decimotercero", "vigesimoprimero" are also valid, kept separate here).
  const words = parts.join(" ");
  return feminine ? words.replace(/o\b/g, "a") : words;
}

const EN_ORD_IRREGULAR: Record<string, string> = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };

function enOrdinal(n: number): string {
  const words = enCardinal(BigInt(n));
  return words.replace(/([a-z]+)$/, (last) => EN_ORD_IRREGULAR[last] ?? (last.endsWith("y") ? `${last.slice(0, -1)}ieth` : `${last}th`));
}

function frOrdinal(n: number, feminine: boolean): string {
  if (n === 1) return feminine ? "première" : "premier";
  const words = frCardinal(BigInt(n), {});
  return words.replace(/([a-zéè]+)$/, (last) => {
    if (last === "un") return "unième";
    if (last === "cinq") return "cinquième";
    if (last === "neuf") return "neuvième";
    if (last === "vingts" || last === "cents" || last === "millions" || last === "milliards") return `${last.slice(0, -1)}ième`;
    return `${last.replace(/e$/, "")}ième`;
  });
}

/**
 * Ordinal in words. Spanish `apocope` gives "primer"/"tercer" (before a
 * masculine noun: "el primer piso").
 */
export function ordinal(n: number, lang: NumberLanguage, { feminine = false, apocope = false }: CardinalOptions = {}): string {
  if (lang === "en") return enOrdinal(n);
  if (lang === "fr") return frOrdinal(n, feminine);
  if (lang === "pt") return latinOrdinal(n, PT_ORD_UNITS, PT_ORD_TENS, PT_ORD_HUNDREDS, feminine, "pt");
  const words = latinOrdinal(n, ES_ORD_UNITS, ES_ORD_TENS, ES_ORD_HUNDREDS, feminine, "es");
  return apocope && !feminine ? words.replace(/(primer|tercer)o$/, "$1") : words;
}

// ---------- Years ----------

/**
 * A year as people say it. Spanish, Portuguese and French read it as a
 * number; English splits it in two ("nineteen eighty-four", "twenty
 * twenty-six") except 2000–2009 ("two thousand five").
 */
export function year(n: number, lang: NumberLanguage): string {
  if (lang !== "en" || n < 1000 || n > 2099 || (n >= 2000 && n < 2010) || n % 1000 === 0) return cardinal(n, lang);
  const hi = Math.floor(n / 100);
  const lo = n % 100;
  if (lo === 0) return `${en99(hi)} hundred`;
  return `${en99(hi)} ${lo < 10 ? `oh ${EN_UNITS[lo]}` : en99(lo)}`;
}
