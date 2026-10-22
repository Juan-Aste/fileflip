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

export type CaseMode = "upper" | "lower" | "title" | "sentence";

const capitalize = (word: string, locale: string) => {
  const first = segmenter(locale, "grapheme").segment(word)[Symbol.iterator]().next().value?.segment ?? "";
  return first.toLocaleUpperCase(locale) + word.slice(first.length);
};

export function changeCase(text: string, mode: CaseMode, locale: string): string {
  if (mode === "upper") return text.toLocaleUpperCase(locale);
  if (mode === "lower") return text.toLocaleLowerCase(locale);
  const lower = text.toLocaleLowerCase(locale);
  if (mode === "title") {
    let out = "";
    for (const s of segmenter(locale, "word").segment(lower)) out += s.isWordLike ? capitalize(s.segment, locale) : s.segment;
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
