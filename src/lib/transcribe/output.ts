// What the transcription tool offers: the text with one segment per line (the
// user can correct it), and SRT/VTT subtitles from the segments' times. A
// corrected line replaces its segment's words as long as the lines still
// match the segments one to one.
import { writeSubtitles, type Cue } from "@/lib/subtitle/subtitle";
import type { Segment } from "./whisper";

/** Subtitle lines of at most this many characters, two per cue (common subtitling guidelines). */
const LINE_CHARS = 42;

/** The editable text: one segment per line. */
export const transcriptText = (segments: readonly Segment[]) => segments.map((s) => s.text).join("\n");

/** Segments with the user's corrections, or null when lines were added or removed. */
export function correctedSegments(segments: readonly Segment[], text: string): Segment[] | null {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  if (lines.length !== segments.length) return null;
  return segments.map((s, i) => ({ ...s, text: lines[i]!.trim() }));
}

/** Words wrapped into lines of at most `max` characters (a longer word gets its own line). */
export function wrapWords(text: string, max = LINE_CHARS): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  // Chinese and Japanese have no spaces: cut by characters.
  return lines.flatMap((l) => (l.length > max * 1.5 && !l.includes(" ") ? (l.match(new RegExp(`.{1,${max}}`, "gu")) ?? [l]) : [l]));
}

/** Cues of at most two lines: a longer segment is split, its time shared by length. */
export function segmentsToCues(segments: readonly Segment[]): Cue[] {
  const cues: Cue[] = [];
  for (const s of segments) {
    // Subtitle tags are the only markup the writer keeps: angle brackets in speech are not tags.
    const lines = wrapWords(s.text.replace(/</g, "‹").replace(/>/g, "›"));
    if (lines.length === 0) continue;
    const groups: string[][] = [];
    for (let i = 0; i < lines.length; i += 2) groups.push(lines.slice(i, i + 2));
    const total = groups.reduce((sum, g) => sum + g.join(" ").length, 0);
    let at = s.start * 1000;
    const span = Math.max(0, s.end - s.start) * 1000;
    for (const g of groups) {
      const end = groups.length === 1 ? s.end * 1000 : at + (span * g.join(" ").length) / total;
      cues.push({ start: Math.round(at), end: Math.max(Math.round(end), Math.round(at) + 1), text: g.join("\n") });
      at = end;
    }
  }
  return cues;
}

export type TranscriptFormat = "txt" | "srt" | "vtt";

/** The file contents for a format (TXT is the text as edited). */
export function transcriptFile(segments: readonly Segment[], text: string, format: TranscriptFormat): string {
  if (format === "txt") return `${text.replace(/\r\n?/g, "\n").trimEnd()}\n`;
  return writeSubtitles(segmentsToCues(correctedSegments(segments, text) ?? segments), format);
}

export const transcriptMime: Record<TranscriptFormat, string> = { txt: "text/plain;charset=utf-8", srt: "application/x-subrip;charset=utf-8", vtt: "text/vtt;charset=utf-8" };

/** "interview.mp3" → "interview.srt". */
export const transcriptName = (name: string, format: TranscriptFormat) => `${name.replace(/\.[^.]+$/, "") || "transcript"}.${format}`;
