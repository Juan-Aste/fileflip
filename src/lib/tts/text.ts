// Text for the read-aloud tool: cleanup, language guess and splitting into
// short pieces. Browsers stop long utterances (Chrome cuts online voices after
// ~15 s) and the AI voice works sentence by sentence, so the text is always
// read one sentence (or a slice of a long one) at a time. Offsets point into
// the text the user sees, so the piece being read can be highlighted.

export const ttsLanguages = ["es", "en", "pt", "fr", "zh"] as const;
export type TtsLanguage = (typeof ttsLanguages)[number];

/**
 * Longest text the tool accepts: 50,000 characters, about 8,000 words or
 * 50–60 minutes of speech. Beyond it the page would keep too many sentences
 * and the AI voice would take too long on a phone.
 */
export const TTS_MAX_CHARS = 50_000;

/** Longest piece read at once (characters); longer sentences are cut at a comma or a space. */
export const MAX_PIECE = 220;

export interface Sentence {
  text: string;
  /** Where the piece starts and ends in the source text (end exclusive). */
  start: number;
  end: number;
}

/**
 * Cleans text pasted or extracted from a file: one kind of line break, no
 * byte order mark or non-breaking spaces, no spaces around lines, words cut
 * with a hyphen at the end of a line joined again, at most one blank line.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[­​]/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bullets ("- ", "* ", "• ") at the start of lines: they are layout, not words to read. */
export const stripBullets = (text: string) => text.replace(/^[ \t]*[-*•‣◦][ \t]+/gm, "");

const HAN = /[㐀-䶿一-鿿豈-﫿]/g;
const LETTER = /\p{L}/gu;

// Frequent words that tell the four Latin-script languages apart (shared ones left out:
// "un" is also Spanish and "o" means "or" in Spanish, so neither counts).
const STOPWORDS: Record<Exclude<TtsLanguage, "zh">, readonly string[]> = {
  es: ["el", "los", "las", "y", "es", "del", "por", "una", "con", "pero", "muy", "hay", "también", "cuando", "sin", "yo", "él", "qué", "fue", "son", "su", "sus", "al", "lo", "más", "está", "este", "esta"],
  pt: ["os", "as", "é", "do", "da", "dos", "das", "em", "um", "uma", "não", "com", "mas", "muito", "há", "também", "quando", "sem", "eu", "ele", "foi", "são", "no", "na", "nos", "ao", "pelo", "pela", "você", "mais", "seu", "sua"],
  fr: ["le", "les", "et", "est", "des", "du", "une", "dans", "pour", "pas", "qui", "sur", "avec", "ne", "il", "elle", "nous", "vous", "je", "au", "aux", "mais", "ou", "été", "sont", "cette", "ce", "plus", "ces", "c'est"],
  en: ["the", "and", "is", "of", "to", "in", "that", "it", "was", "for", "on", "are", "with", "be", "this", "have", "from", "by", "not", "you", "he", "she", "they", "at", "which", "were", "or", "an", "will"],
};
const STOPWORD_LANGUAGE = new Map<string, Exclude<TtsLanguage, "zh">[]>();
for (const [language, words] of Object.entries(STOPWORDS) as [Exclude<TtsLanguage, "zh">, readonly string[]][]) {
  for (const word of words) STOPWORD_LANGUAGE.set(word, [...(STOPWORD_LANGUAGE.get(word) ?? []), language]);
}

/**
 * The text's language among the five the site speaks: Chinese when Han
 * characters dominate, otherwise the one whose frequent words appear most.
 * Short or unclear text keeps `fallback` (the page's language).
 */
export function detectLanguage(text: string, fallback: TtsLanguage): TtsLanguage {
  const sample = text.slice(0, 5000);
  const han = sample.match(HAN)?.length ?? 0;
  const letters = sample.match(LETTER)?.length ?? 0;
  if (letters > 0 && han / letters > 0.3) return "zh";
  const score: Record<string, number> = { es: 0, pt: 0, fr: 0, en: 0 };
  for (const word of sample.toLowerCase().match(/[\p{L}']+/gu) ?? []) {
    for (const language of STOPWORD_LANGUAGE.get(word) ?? []) score[language]! += 1;
  }
  // Letters only some of the languages use.
  score.es! += 2 * (sample.match(/[ñ¿¡]/gi)?.length ?? 0);
  score.pt! += 2 * (sample.match(/[ãõ]/gi)?.length ?? 0);
  score.fr! += 2 * (sample.match(/[èêëîïûùœ]/gi)?.length ?? 0);
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || best[1] < 2 || best[1] === second?.[1]) return fallback;
  return best[0] as TtsLanguage;
}

// Abbreviations followed by a period that don't end a sentence (lowercase, without the period).
const ABBREVIATIONS = new Set([
  // es
  "sr", "sra", "srta", "sres", "dr", "dra", "ud", "uds", "vd", "lic", "ing", "arq", "prof", "pág", "págs", "núm", "art", "cap", "aprox", "av", "avda", "tel", "ej", "admón", "cía", "dto", "esq",
  // en
  "mr", "mrs", "ms", "st", "jr", "vs", "fig", "approx", "dept", "inc", "ltd", "co", "mt", "e.g", "i.e", "p", "pp",
  // pt
  "sra", "dra", "exmo", "exma", "pág", "nº", "obs",
  // fr
  "mme", "mlle", "mm", "pr", "env", "p.ex", "cf", "vol", "chap",
]);

const CJK_END = "。！？；";
const LATIN_END = ".!?…";
const CLOSERS = "\"'”’»)]」』）】";
const SOFT_BREAK = ",;:—–，、；：";

const isSpace = (c: string | undefined) => c === " " || c === "\t" || c === "\n";
const isLower = (c: string | undefined) => c !== undefined && /\p{Ll}/u.test(c);

/** True when the period at `i` follows an abbreviation, an initial ("J.") or a list number at the start of a line. */
function periodIsNotAnEnd(text: string, i: number): boolean {
  let s = i;
  while (s > 0 && /[\p{L}\p{N}.º]/u.test(text[s - 1]!)) s--;
  const word = text.slice(s, i).toLowerCase();
  if (!word) return false;
  if (ABBREVIATIONS.has(word)) return true;
  if (/^\p{L}$/u.test(word)) return true;
  const lineStart = s === 0 || text[s - 1] === "\n";
  return lineStart && /^\d{1,3}$/.test(word);
}

/** End positions (exclusive) of each sentence or block of `text`. */
function sentenceEnds(text: string): number[] {
  const ends: number[] = [];
  const n = text.length;
  let lineStart = 0;
  for (let i = 0; i < n; i++) {
    const c = text[i]!;
    if (CJK_END.includes(c)) {
      let j = i + 1;
      while (j < n && (CJK_END.includes(text[j]!) || CLOSERS.includes(text[j]!))) j++;
      ends.push(j);
      i = j - 1;
    } else if (LATIN_END.includes(c)) {
      let j = i + 1;
      while (j < n && (LATIN_END.includes(text[j]!) || CLOSERS.includes(text[j]!))) j++;
      if (j >= n) {
        ends.push(n);
        break;
      }
      if (!isSpace(text[j])) {
        i = j - 1;
        continue;
      }
      let k = j;
      while (k < n && isSpace(text[k])) k++;
      const single = c === "." && j === i + 1;
      if (!isLower(text[k]) && !(single && periodIsNotAnEnd(text, i))) ends.push(j);
      i = j - 1;
    } else if (c === "\n") {
      const line = text.slice(lineStart, i).trim();
      const next = text[i + 1];
      // A blank line always ends the block. A single line break ends it after a
      // short line without final punctuation (a heading, a list item) unless the
      // next line goes on in lowercase (a line wrapped in a PDF).
      if (next === "\n" || (line && !/[.!?…,;:。！？；，、：]$/.test(line) && line.length <= 60 && !isLower(next))) ends.push(i);
      lineStart = i + 1;
    }
  }
  ends.push(n);
  return ends;
}

/** Cuts a piece longer than `max` after a comma (or similar), else at a space, else anywhere (Chinese). */
function slice(text: string, start: number, end: number, max: number, out: Sentence[]) {
  while (end - start > max) {
    const window = text.slice(start, start + max);
    let cut = -1;
    for (let i = window.length - 1; i >= max / 2; i--) {
      if (SOFT_BREAK.includes(window[i]!)) {
        cut = i + 1;
        break;
      }
    }
    if (cut < 0) {
      const space = window.lastIndexOf(" ");
      cut = space >= max / 2 ? space + 1 : max;
    }
    push(text, start, start + cut, out);
    start += cut;
  }
  push(text, start, end, out);
}

/** Adds the trimmed piece when it has something to say (a letter or a digit). */
function push(text: string, start: number, end: number, out: Sentence[]) {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  const piece = text.slice(start, end);
  if (/[\p{L}\p{N}]/u.test(piece)) out.push({ text: piece, start, end });
}

/** The text as sentences (long ones cut to `max` characters), with their offsets in `text`. */
export function splitSentences(text: string, max = MAX_PIECE): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  for (const end of sentenceEnds(text)) {
    if (end <= start) continue;
    slice(text, start, end, max, out);
    start = end;
  }
  return out;
}

/** Index of the sentence that contains `offset` (or the next one after it). */
export function sentenceAt(sentences: readonly Sentence[], offset: number): number {
  const index = sentences.findIndex((s) => offset < s.end);
  return index < 0 ? Math.max(0, sentences.length - 1) : index;
}
