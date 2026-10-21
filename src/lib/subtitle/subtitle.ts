import { ConversionError } from "@/lib/convert-error";
import { stripBom } from "@/lib/data/text";

// Subtitles: SRT, WebVTT, ASS (v4+) and SSA (v4), parsed into a common list
// of cues and written back in any of the four. Only italic, bold and
// underline survive between formats; colors, fonts, positions and other
// styling are dropped (and reported, so the page can say so).

export type SubtitleFormat = "srt" | "vtt" | "ass" | "ssa";
export const subtitleFormats: readonly SubtitleFormat[] = ["srt", "vtt", "ass", "ssa"];

export interface Cue {
  /** Milliseconds from the start of the video. */
  start: number;
  end: number;
  /** Lines separated by "\n", with only <i>, <b> and <u> tags (no entities). */
  text: string;
}

export interface Subtitles {
  format: SubtitleFormat;
  cues: Cue[];
  /** Styling found in the input that the common model can't keep. */
  lostStyling: boolean;
}

/** A pathological file must not make the tab run out of memory. */
export const MAX_CUES = 100_000;

const invalidData = () => new ConversionError("invalidData");

export function detectSubtitleFormat(text: string): SubtitleFormat | null {
  const head = stripBom(text).trimStart();
  if (/^WEBVTT(?:[ \t]|\r?\n|$)/.test(head)) return "vtt";
  if (/^\[Script Info\]/i.test(head)) return /^\[V4\+ Styles\]/im.test(head) || !/^\[V4 Styles\]/im.test(head) ? "ass" : "ssa";
  if (/\d+:\d{2}:\d{2}[,.]\d{1,3}[ \t]*-->/.test(head)) return "srt";
  return null;
}

export function parseSubtitles(input: string): Subtitles {
  const text = stripBom(input).replace(/\r\n?/g, "\n");
  const format = detectSubtitleFormat(text);
  if (!format) throw invalidData();
  const result = format === "vtt" ? parseVtt(text) : format === "srt" ? parseSrt(text) : parseAss(text);
  if (result.cues.length === 0) throw invalidData();
  return { format, ...result };
}

// --- Times

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function splitTime(ms: number) {
  const t = Math.max(0, Math.round(ms));
  return { h: Math.floor(t / 3_600_000), m: Math.floor(t / 60_000) % 60, s: Math.floor(t / 1000) % 60, ms: t % 1000 };
}

const srtTime = (ms: number, sep = ",") => {
  const { h, m, s, ms: f } = splitTime(ms);
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(f, 3)}`;
};

/** ASS/SSA use centiseconds and a single-digit hour. */
const assTime = (ms: number) => {
  const cs = Math.round(Math.max(0, ms) / 10);
  const h = Math.floor(cs / 360_000);
  return `${h}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
};

/** "01:02:03,456", "02:03.456" (VTT) or "1:02:03.45" (ASS) → ms; NaN when it isn't a time. */
export function parseTime(value: string): number {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?$/.exec(value.trim());
  if (!match) return NaN;
  const [, h = "0", m, s, frac = "0"] = match;
  if (Number(m) > 59 || Number(s) > 59) return NaN;
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(frac.padEnd(3, "0"));
}

// --- SRT and WebVTT

const TIMING = /^\s*(\S+)\s+-->\s+(\S+)(.*)$/;
const keptTags = /^<\/?[ibu]>$/i;

/** Keeps <i>/<b>/<u>, drops other tags (<font>, <c.x>, <v Name>, <00:01.000>) and decodes entities. */
function cleanHtmlText(text: string): { text: string; lost: boolean } {
  let lost = false;
  const cleaned = text.replace(/<[^>\n]*>/g, (tag) => {
    if (keptTags.test(tag)) return tag.toLowerCase();
    lost = true;
    return "";
  });
  return { text: decodeEntities(cleaned), lost };
}

function decodeEntities(text: string) {
  return text.replace(/&(amp|lt|gt|nbsp|quot|apos|lrm|rlm|#\d+|#x[\da-f]+);/gi, (entity, name: string) => {
    const lower = name.toLowerCase();
    if (lower.startsWith("#x")) return safeChar(parseInt(lower.slice(2), 16), entity);
    if (lower.startsWith("#")) return safeChar(parseInt(lower.slice(1), 10), entity);
    return { amp: "&", lt: "<", gt: ">", nbsp: " ", quot: '"', apos: "'", lrm: "‎", rlm: "‏" }[lower] ?? entity;
  });
}

const safeChar = (code: number, fallback: string) => (code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : fallback);

function pushCue(cues: Cue[], cue: Cue) {
  if (cues.length >= MAX_CUES) throw invalidData();
  cues.push(cue);
}

/** Blocks separated by blank lines; a block's timing line may follow an id line. */
function parseBlocks(text: string, vtt: boolean) {
  const cues: Cue[] = [];
  let lost = false;
  for (const block of text.split(/\n[ \t]*\n/)) {
    const lines = block.split("\n");
    while (lines.length && lines[0]!.trim() === "") lines.shift();
    if (lines.length === 0) continue;
    if (vtt && /^(WEBVTT|NOTE|STYLE|REGION)(?:[ \t]|$)/.test(lines[0]!)) {
      if (/^(STYLE|REGION)/.test(lines[0]!)) lost = true;
      continue;
    }
    const timingIndex = TIMING.test(lines[0]!) ? 0 : lines.length > 1 && TIMING.test(lines[1]!) ? 1 : -1;
    if (timingIndex < 0) continue;
    const [, from, to, settings] = TIMING.exec(lines[timingIndex]!)!;
    const start = parseTime(from!);
    const end = parseTime(to!);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (vtt && settings!.trim()) lost = true;
    const body = cleanHtmlText(lines.slice(timingIndex + 1).join("\n").trimEnd());
    lost ||= body.lost;
    pushCue(cues, { start, end: Math.max(start, end), text: body.text });
  }
  return { cues, lostStyling: lost };
}

const parseSrt = (text: string) => parseBlocks(text, false);
const parseVtt = (text: string) => parseBlocks(text, true);

/** Text for SRT/VTT: escapes what would be read as markup, keeps the three tags. */
function htmlText(text: string, vtt: boolean) {
  const escaped = vtt
    ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;(\/?[ibu])&gt;/g, "<$1>")
    : text;
  // A blank line would end the cue: keep the line but make it non-empty.
  return escaped.split("\n").map((line) => (line.trim() === "" ? " " : line)).join("\n").replace(/-->/g, "->");
}

function writeSrt(cues: Cue[]) {
  return cues.map((cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${htmlText(cue.text, false)}\n`).join("\n");
}

function writeVtt(cues: Cue[]) {
  return `WEBVTT\n\n${cues.map((cue) => `${srtTime(cue.start, ".")} --> ${srtTime(cue.end, ".")}\n${htmlText(cue.text, true)}\n`).join("\n")}`;
}

// --- ASS and SSA

const ASS_TAG = { i: "\\i", b: "\\b", u: "\\u" } as const;

/** Override blocks {\i1}...{\i0} → <i>...</i>; \N line breaks; other overrides are dropped. */
function assToHtml(raw: string): { text: string; lost: boolean } {
  let lost = false;
  const open = { i: false, b: false, u: false };
  let out = raw.replace(/\{([^}]*)\}/g, (_, block: string) => {
    let html = "";
    for (const override of block.split("\\").slice(1)) {
      const match = /^([ibu])(\d*)$/.exec(override.trim());
      if (match) {
        const tag = match[1] as keyof typeof open;
        const on = match[2] !== "0";
        if (on !== open[tag]) html += on ? `<${tag}>` : `</${tag}>`;
        open[tag] = on;
      } else if (override.trim() === "r") {
        for (const tag of ["u", "b", "i"] as const) if (open[tag]) html += `</${tag}>`;
        Object.assign(open, { i: false, b: false, u: false });
      } else if (override.trim()) {
        lost = true;
      }
    }
    // Text in braces without a backslash is a comment.
    if (!block.includes("\\") && block.trim()) lost = true;
    return html;
  });
  for (const tag of ["u", "b", "i"] as const) if (open[tag]) out += `</${tag}>`;
  out = out.replace(/\\N/g, "\n").replace(/\\n/g, "\n").replace(/\\h/g, " ");
  return { text: out, lost };
}

function htmlToAss(text: string) {
  return text
    .replace(/[{}]/g, (c) => (c === "{" ? "(" : ")"))
    .replace(/<(\/?)([ibu])>/g, (_, close: string, tag: keyof typeof ASS_TAG) => `{${ASS_TAG[tag]}${close ? 0 : 1}}`)
    .replace(/\n/g, "\\N");
}

function parseAss(text: string) {
  const cues: Cue[] = [];
  let lost = false;
  let section = "";
  let fields: string[] | null = null;
  const styles = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const header = /^\[(.+)\]$/.exec(trimmed);
    if (header) {
      section = header[1]!.toLowerCase();
      fields = null;
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon < 0) continue;
    const key = trimmed.slice(0, colon).toLowerCase();
    const value = trimmed.slice(colon + 1).trimStart();
    if (section.includes("styles") && key === "style") styles.add(value.split(",")[0]!.trim());
    if (section !== "events") continue;
    if (key === "format") {
      fields = value.split(",").map((f) => f.trim().toLowerCase());
    } else if (key === "dialogue" && fields) {
      // Text is the last field and may contain commas.
      const parts = value.split(",");
      const row = [...parts.slice(0, fields.length - 1), parts.slice(fields.length - 1).join(",")];
      const get = (name: string) => row[fields!.indexOf(name)] ?? "";
      const start = parseTime(get("start"));
      const end = parseTime(get("end"));
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      const body = assToHtml(get("text"));
      lost ||= body.lost;
      pushCue(cues, { start, end: Math.max(start, end), text: body.text });
    }
  }
  // Styles beyond the default one (fonts, colors, positions) don't survive.
  if ([...styles].some((s) => s.toLowerCase() !== "default")) lost = true;
  cues.sort((a, b) => a.start - b.start);
  return { cues, lostStyling: lost };
}

const ASS_HEADER = (ssa: boolean) =>
  [
    "[Script Info]",
    "; Script generated by Fileflect",
    `ScriptType: ${ssa ? "v4.00" : "v4.00+"}`,
    "PlayResX: 384",
    "PlayResY: 288",
    "",
    ssa ? "[V4 Styles]" : "[V4+ Styles]",
    ssa
      ? "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding"
      : "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ssa
      ? "Style: Default,Arial,20,16777215,65535,65535,0,0,0,1,2,2,2,10,10,10,0,1"
      : "Style: Default,Arial,20,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
    "",
    "[Events]",
    `Format: ${ssa ? "Marked" : "Layer"}, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,
  ].join("\n");

function writeAss(cues: Cue[], ssa: boolean) {
  const lead = ssa ? "Marked=0" : "0";
  const events = cues.map((cue) => `Dialogue: ${lead},${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${htmlToAss(cue.text)}`);
  return `${ASS_HEADER(ssa)}\n${events.join("\n")}\n`;
}

export function writeSubtitles(cues: Cue[], format: SubtitleFormat): string {
  const sorted = [...cues].sort((a, b) => a.start - b.start);
  if (format === "srt") return writeSrt(sorted);
  if (format === "vtt") return writeVtt(sorted);
  return writeAss(sorted, format === "ssa");
}

// --- Timing changes

export interface SyncOptions {
  /** Added to every time, in ms (negative = earlier). */
  offsetMs: number;
  /** Retime from one frame rate to another (e.g. 23.976 → 25). */
  fps?: { from: number; to: number };
}

/**
 * Shifts and/or rescales every cue. Times never go below zero: cues that end
 * before the start are dropped, and ones that straddle it start at 0.
 */
export function syncCues(cues: Cue[], { offsetMs, fps }: SyncOptions): { cues: Cue[]; dropped: number } {
  const factor = fps && fps.from > 0 && fps.to > 0 ? fps.from / fps.to : 1;
  const out: Cue[] = [];
  for (const cue of cues) {
    const start = Math.round(cue.start * factor + offsetMs);
    const end = Math.round(cue.end * factor + offsetMs);
    if (end <= 0) continue;
    out.push({ ...cue, start: Math.max(0, start), end });
  }
  return { cues: out, dropped: cues.length - out.length };
}

export interface SubtitleResult {
  text: string;
  cues: number;
  lostStyling: boolean;
  dropped: number;
}

export function convertSubtitles(input: string, to: SubtitleFormat): SubtitleResult {
  const parsed = parseSubtitles(input);
  return { text: writeSubtitles(parsed.cues, to), cues: parsed.cues.length, lostStyling: parsed.lostStyling && to !== parsed.format, dropped: 0 };
}

/**
 * Retimes a file in place, keeping its format and everything else in it
 * (styles, positions, VTT settings, ids): only the times change.
 */
export function syncSubtitles(input: string, options: SyncOptions): SubtitleResult & { format: SubtitleFormat } {
  const text = stripBom(input).replace(/\r\n?/g, "\n");
  const format = detectSubtitleFormat(text);
  if (!format) throw invalidData();
  const retime = (start: number, end: number) => {
    const [cue] = syncCues([{ start, end, text: "" }], options).cues;
    return cue;
  };
  let cues = 0;
  let dropped = 0;
  let out: string;
  if (format === "srt" || format === "vtt") {
    const blocks: string[] = [];
    for (const block of text.split(/\n[ \t]*\n/)) {
      const lines = block.split("\n");
      const index = lines.findIndex((line) => TIMING.test(line));
      const timing = index >= 0 && index <= 2 ? TIMING.exec(lines[index]!) : null;
      const start = timing ? parseTime(timing[1]!) : NaN;
      const end = timing ? parseTime(timing[2]!) : NaN;
      if (!timing || Number.isNaN(start) || Number.isNaN(end)) {
        blocks.push(block);
        continue;
      }
      const cue = retime(start, end);
      if (!cue) {
        dropped++;
        continue;
      }
      if (++cues > MAX_CUES) throw invalidData();
      const sep = format === "srt" ? "," : ".";
      lines[index] = `${srtTime(cue.start, sep)} --> ${srtTime(cue.end, sep)}${timing[3]}`;
      // SRT numbers its cues: renumber after dropping some.
      if (format === "srt" && index > 0 && /^\s*\d+\s*$/.test(lines[index - 1]!)) lines[index - 1] = String(cues);
      blocks.push(lines.join("\n"));
    }
    out = blocks.join("\n\n");
  } else {
    let section = "";
    let fields: string[] | null = null;
    const lines: string[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      const header = /^\[(.+)\]$/.exec(trimmed);
      if (header) section = header[1]!.toLowerCase();
      const match = /^(dialogue|format)\s*:\s*(.*)$/i.exec(trimmed);
      if (section === "events" && match?.[1]!.toLowerCase() === "format") fields = match[2]!.split(",").map((f) => f.trim().toLowerCase());
      if (section !== "events" || match?.[1]!.toLowerCase() !== "dialogue" || !fields) {
        lines.push(line);
        continue;
      }
      const parts = match[2]!.split(",");
      const s = fields.indexOf("start");
      const e = fields.indexOf("end");
      const start = parseTime(parts[s] ?? "");
      const end = parseTime(parts[e] ?? "");
      if (s < 0 || e < 0 || Number.isNaN(start) || Number.isNaN(end)) {
        lines.push(line);
        continue;
      }
      const cue = retime(start, end);
      if (!cue) {
        dropped++;
        continue;
      }
      if (++cues > MAX_CUES) throw invalidData();
      parts[s] = assTime(cue.start);
      parts[e] = assTime(cue.end);
      lines.push(`Dialogue: ${parts.join(",")}`);
    }
    out = lines.join("\n");
  }
  if (cues === 0 && dropped === 0) throw invalidData();
  return { text: out, format, cues, lostStyling: false, dropped };
}
