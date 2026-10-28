// Text comparison with jsdiff: lines that changed, and inside a changed line
// the words that changed. Words are found with Intl.Segmenter, so Chinese
// (no spaces) is compared word by word too.

import { createTwoFilesPatch, diffArrays, diffWords as jsDiffWords, diffWordsWithSpace, type ChangeObject } from "diff";

export type DiffMode = "line" | "word";

export interface DiffOptions {
  mode: DiffMode;
  ignoreCase?: boolean;
  /** Spaces at the ends of a line and runs of spaces inside it don't count. */
  ignoreWhitespace?: boolean;
  locale: string;
}

/** A piece of text and whether it was removed from the first text or added in the second. */
export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffLine {
  kind: "same" | "removed" | "added";
  /** Line numbers in the first and second text (1-based). */
  left?: number;
  right?: number;
  /** The words of a changed line, with the ones that changed marked. */
  parts: DiffPart[];
}

export interface DiffStats {
  added: number;
  removed: number;
  /** Lines changed in place (a removed line paired with an added one). */
  changed: number;
  identical: boolean;
}

/** Beyond this many line edits the comparison stops: the texts have little in common. */
const MAX_EDITS = 20_000;

export class TooDifferentError extends Error {
  constructor() {
    super("the texts are too different to compare");
  }
}

const splitLines = (text: string) => {
  if (text === "") return [];
  const lines = text.split(/\r\n|\r|\n/);
  // A final newline doesn't start one more line.
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
};

const lineKey = (line: string, options: DiffOptions) => {
  let key = options.ignoreWhitespace ? line.trim().replace(/\s+/g, " ") : line;
  if (options.ignoreCase) key = key.toLocaleLowerCase(options.locale);
  return key;
};

const segmenter = (locale: string) => new Intl.Segmenter(locale, { granularity: "word" });

/** Changed words; with `spaces` false a change of spacing or line breaks alone doesn't count. */
function wordParts(a: string, b: string, options: DiffOptions, spaces: boolean): DiffPart[] {
  const diff = spaces ? diffWordsWithSpace : jsDiffWords;
  return diff(a, b, { ignoreCase: options.ignoreCase, intlSegmenter: segmenter(options.locale) }).map(toPart);
}

const toPart = (c: ChangeObject<string>): DiffPart => ({ value: c.value, ...(c.added && { added: true }), ...(c.removed && { removed: true }) });

/** Line by line; a block of removed lines followed by added ones is paired line by line and compared word by word. */
export function diffLines(a: string, b: string, options: DiffOptions): DiffLine[] {
  const left = splitLines(a);
  const right = splitLines(b);
  const changes = diffArrays(left, right, {
    comparator: (x, y) => lineKey(x, options) === lineKey(y, options),
    maxEditLength: MAX_EDITS,
  });
  if (!changes) throw new TooDifferentError();
  const out: DiffLine[] = [];
  let l = 0;
  let r = 0;
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    if (!change.added && !change.removed) {
      for (let k = 0; k < change.count; k++) out.push({ kind: "same", left: ++l, right: ++r, parts: [{ value: right[r - 1]! }] });
      continue;
    }
    const removed = change.removed ? change.value : [];
    let added = change.added ? change.value : [];
    if (change.removed && changes[i + 1]?.added) added = changes[++i]!.value;
    const pairs = Math.min(removed.length, added.length);
    const removedLines: DiffLine[] = [];
    const addedLines: DiffLine[] = [];
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      if (k < pairs) {
        const parts = wordParts(removed[k]!, added[k]!, options, !options.ignoreWhitespace);
        removedLines.push({ kind: "removed", left: ++l, parts: parts.filter((p) => !p.added) });
        addedLines.push({ kind: "added", right: ++r, parts: parts.filter((p) => !p.removed) });
      } else if (k < removed.length) removedLines.push({ kind: "removed", left: ++l, parts: [{ value: removed[k]! }] });
      else addedLines.push({ kind: "added", right: ++r, parts: [{ value: added[k]! }] });
    }
    out.push(...removedLines, ...addedLines);
  }
  return out;
}

/** The second text as a whole, with the words removed from the first and added in the second; line breaks and spacing don't count. */
export function diffWords(a: string, b: string, options: DiffOptions): DiffPart[] {
  return wordParts(a, b, options, false);
}

export function diffStats(lines: DiffLine[]): DiffStats {
  const removed = lines.filter((l) => l.kind === "removed");
  const added = lines.filter((l) => l.kind === "added");
  // A removed line counts as changed when it has unchanged words next to the changed ones.
  const changed = removed.filter((l) => l.parts.some((p) => !p.removed && p.value.trim() !== "")).length;
  return { added: added.length - changed, removed: removed.length - changed, changed, identical: removed.length === 0 && added.length === 0 };
}

/** Counts words added and removed (spaces and punctuation don't count). */
export function wordStats(parts: DiffPart[], locale: string): { added: number; removed: number } {
  const count = (text: string) => [...segmenter(locale).segment(text)].filter((s) => s.isWordLike).length;
  return {
    added: parts.filter((p) => p.added).reduce((n, p) => n + count(p.value), 0),
    removed: parts.filter((p) => p.removed).reduce((n, p) => n + count(p.value), 0),
  };
}

/** A unified diff (.diff / .patch), the format git and most review tools read. It records every change, so patch(1) can apply it. */
export function unifiedPatch(a: string, b: string, names: [string, string] = ["original.txt", "new.txt"]): string {
  return createTwoFilesPatch(names[0], names[1], a, b, undefined, undefined, { context: 3 });
}
