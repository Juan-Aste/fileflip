// Text statistics and case changes that respect the language: Intl.Segmenter
// finds user-perceived characters (emoji, accents), words (also in Chinese,
// which has no spaces) and sentences.

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** At 200 words per minute, rounded up (0 for empty text). */
  readingMinutes: number;
}

const segmenter = (locale: string, granularity: "grapheme" | "word" | "sentence") => new Intl.Segmenter(locale, { granularity });

export function textStats(text: string, locale: string): TextStats {
  let characters = 0;
  let charactersNoSpaces = 0;
  for (const { segment } of segmenter(locale, "grapheme").segment(text)) {
    characters++;
    if (!/^\s+$/u.test(segment)) charactersNoSpaces++;
  }
  let words = 0;
  for (const s of segmenter(locale, "word").segment(text)) if (s.isWordLike) words++;
  let sentences = 0;
  for (const { segment } of segmenter(locale, "sentence").segment(text)) if (/[\p{L}\p{N}]/u.test(segment)) sentences++;
  const trimmed = text.trim();
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs: trimmed ? trimmed.split(/\r?\n\s*\r?\n/).filter((p) => p.trim()).length : 0,
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    readingMinutes: Math.ceil(words / 200),
  };
}

export type CaseMode = "upper" | "lower" | "title" | "sentence" | "alternating" | "inverse";

export interface CaseOptions {
  /**
   * Title case: keep articles, short prepositions and conjunctions in lower
   * case (except the first and last word, and the word after a colon), as
   * style guides do in English and many publishers do in other languages.
   */
  smallWords?: boolean;
}

// Words that stay in lower case in title case, per language (its base subtag).
const SMALL_WORDS: Record<string, ReadonlySet<string>> = {
  en: new Set("a an the and but or nor for so yet as at by in of off on per to up via vs from into onto over with than".split(" ")),
  es: new Set("el la los las lo un una unos unas y e ni o u pero sino que de del a al en con por para sin sobre entre hasta desde según tras ante bajo".split(" ")),
  pt: new Set("o a os as um uma uns umas e ou nem mas de do da dos das em no na nos nas por pelo pela pelos pelas para com sem sob sobre entre ao aos à às".split(" ")),
  fr: new Set("le la les l un une des et ou ni mais de du d à au aux en dans par pour sur sous avec sans entre chez vers".split(" ")),
  it: new Set("il lo la i gli le l un uno una e ed o od ma né di del dello della dei degli delle a ad al allo alla ai agli alle da dal dalla in nel nella con su per tra fra".split(" ")),
  de: new Set("der die das den dem des ein eine einen einem einer und oder aber von vom zu zum zur in im an am auf aus bei mit nach für über unter durch".split(" ")),
  nl: new Set("de het een en of maar van in op aan te met voor door bij naar om uit over tot".split(" ")),
};

const capitalize = (word: string, locale: string) => {
  // Dutch capitalizes the digraph ij as a whole: IJsland.
  if (locale.toLowerCase().startsWith("nl") && /^ij/.test(word)) return "IJ" + word.slice(2);
  const first = segmenter(locale, "grapheme").segment(word)[Symbol.iterator]().next().value?.segment ?? "";
  return first.toLocaleUpperCase(locale) + word.slice(first.length);
};

function titleCase(text: string, locale: string, smallWords: boolean): string {
  const lower = text.toLocaleLowerCase(locale);
  const small = smallWords ? SMALL_WORDS[locale.split("-")[0]!.toLowerCase()] : undefined;
  const segments = [...segmenter(locale, "word").segment(lower)];
  const words = segments.flatMap((s, i) => (s.isWordLike ? [i] : []));
  const lastWord = words[words.length - 1];
  let out = "";
  // A word starts a phrase when nothing but spaces and quotes stands between it and the start, a colon or a sentence end.
  let phraseStart = true;
  for (const [i, s] of segments.entries()) {
    if (!s.isWordLike) {
      out += s.segment;
      if (/[:.!?¿¡\n—–]/u.test(s.segment)) phraseStart = true;
      continue;
    }
    // Hyphenated parts and apostrophes (l'école) are separate words: only check the small-word list for whole words.
    const keep = small?.has(s.segment) && !phraseStart && i !== lastWord;
    out += keep ? s.segment : capitalize(s.segment, locale);
    phraseStart = false;
  }
  return out;
}

export function changeCase(text: string, mode: CaseMode, locale: string, options: CaseOptions = {}): string {
  if (mode === "upper") return text.toLocaleUpperCase(locale);
  if (mode === "lower") return text.toLocaleLowerCase(locale);
  if (mode === "title") return titleCase(text, locale, options.smallWords ?? false);
  if (mode === "alternating" || mode === "inverse") {
    let out = "";
    let letter = 0;
    for (const { segment } of segmenter(locale, "grapheme").segment(text)) {
      const lower = segment.toLocaleLowerCase(locale);
      const upper = segment.toLocaleUpperCase(locale);
      if (lower === upper) {
        out += segment;
        continue;
      }
      if (mode === "alternating") out += letter++ % 2 === 0 ? lower : upper;
      else out += segment === lower ? upper : lower;
    }
    return out;
  }
  // Sentence breaks are found on the original text: ICU does not break before a lower-case letter.
  let out = "";
  for (const { segment: original } of segmenter(locale, "sentence").segment(text)) {
    const segment = original.toLocaleLowerCase(locale);
    // The first letter of each sentence, after any leading spaces, quotes or brackets.
    const match = /\p{L}/u.exec(segment);
    out += match ? segment.slice(0, match.index) + capitalize(segment.slice(match.index), locale) : segment;
  }
  return out;
}
