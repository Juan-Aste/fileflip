import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSubtitles } from "@/lib/subtitle/subtitle";
import { correctedSegments, segmentsToCues, transcriptFile, transcriptName, transcriptText, wrapWords } from "./output";

const segments = [
  { start: 0, end: 2.5, text: "Hola, esto es una prueba." },
  { start: 2.5, end: 9, text: "La transcripción se hace en el navegador y el audio no sale del dispositivo de la persona." },
  { start: 9.2, end: 11, text: "a < b > c" },
];

/** ffmpeg (independent of our parser) reads the subtitles and writes them back as SRT. */
function ffmpegSrt(content: string, ext: "srt" | "vtt") {
  const dir = mkdtempSync(join(tmpdir(), "transcript-"));
  writeFileSync(join(dir, `in.${ext}`), content);
  return execFileSync("ffmpeg", ["-v", "error", "-i", join(dir, `in.${ext}`), "-f", "srt", "-"], { encoding: "utf8" });
}

describe("transcript output", () => {
  it("one segment per line, corrections kept while lines match", () => {
    const text = transcriptText(segments);
    expect(text.split("\n")).toHaveLength(3);
    const fixed = correctedSegments(segments, text.replace("prueba", "demo") + "\n");
    expect(fixed![0]).toEqual({ start: 0, end: 2.5, text: "Hola, esto es una demo." });
    expect(correctedSegments(segments, `${text}\nextra`)).toBeNull();
  });

  it("wraps at 42 characters and cuts text without spaces", () => {
    for (const line of wrapWords(segments[1]!.text)) expect(line.length).toBeLessThanOrEqual(42);
    const zh = wrapWords("这是一个很长的中文句子".repeat(8));
    expect(zh.length).toBeGreaterThan(1);
    for (const line of zh) expect(line.length).toBeLessThanOrEqual(42);
  });

  it("splits long segments into cues of two lines, sharing the time in order", () => {
    const cues = segmentsToCues([{ start: 10, end: 20, text: "palabra ".repeat(40).trim() }]);
    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0]!.start).toBe(10_000);
    expect(cues.at(-1)!.end).toBe(20_000);
    for (const cue of cues) expect(cue.text.split("\n").length).toBeLessThanOrEqual(2);
    for (let i = 1; i < cues.length; i++) expect(cues[i]!.start).toBeGreaterThanOrEqual(cues[i - 1]!.end - 1);
  });

  it("writes SRT and VTT that ffmpeg reads with the same times and words", () => {
    const text = transcriptText(segments);
    const srt = transcriptFile(segments, text, "srt");
    const vtt = transcriptFile(segments, text, "vtt");
    expect(srt.startsWith("1\n00:00:00,000 --> 00:00:02,500\nHola, esto es una prueba.\n")).toBe(true);
    expect(vtt.startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:02.500\n")).toBe(true);
    for (const [content, ext] of [[srt, "srt"], [vtt, "vtt"]] as const) {
      const read = ffmpegSrt(content, ext);
      expect(read).toContain("00:00:00,000 --> 00:00:02,500");
      expect(read).toContain("00:00:09,200 --> 00:00:11,000");
      expect(read).toContain("navegador");
      expect(parseSubtitles(content).cues.length).toBe(segmentsToCues(segments).length);
    }
  });

  it("TXT is the edited text; names follow the input", () => {
    expect(transcriptFile(segments, "uno\r\ndos\n\n", "txt")).toBe("uno\ndos\n");
    expect(transcriptName("entrevista.final.mp3", "srt")).toBe("entrevista.final.srt");
    expect(transcriptName(".mp3", "txt")).toBe("transcript.txt");
  });
});
