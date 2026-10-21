import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeText } from "@/lib/data/text";
import {
  convertSubtitles,
  detectSubtitleFormat,
  parseSubtitles,
  parseTime,
  syncCues,
  syncSubtitles,
  writeSubtitles,
  type SubtitleFormat,
} from "./subtitle";

const fixture = (name: string) => decodeText(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const invalidData = expect.objectContaining({ code: "invalidData" });

describe("parseTime", () => {
  it("reads SRT, VTT and ASS times", () => {
    expect(parseTime("01:02:03,456")).toBe(3_723_456);
    expect(parseTime("02:03.456")).toBe(123_456);
    expect(parseTime("1:02:03.45")).toBe(3_723_450);
    expect(parseTime("00:00:99,000")).toBeNaN();
    expect(parseTime("nope")).toBeNaN();
  });
});

describe("parseSubtitles", () => {
  it("reads SRT with italics, bold, accents and Chinese, dropping <font>", () => {
    const { format, cues, lostStyling } = parseSubtitles(fixture("subtitles.srt"));
    expect(format).toBe("srt");
    expect(lostStyling).toBe(true);
    expect(cues).toEqual([
      { start: 1000, end: 3500, text: "Hola, ¿cómo estás?\n<i>Ñandú en cursiva</i>" },
      { start: 4000, end: 6250, text: "Texto en rojo\nSecond line" },
      { start: 62_003, end: 65_000, text: "中文字幕 & <b>negrita</b>" },
    ]);
  });

  it("reads WebVTT skipping NOTE and STYLE, with ids, settings, voices and entities", () => {
    const { format, cues, lostStyling } = parseSubtitles(fixture("subtitles.vtt"));
    expect(format).toBe("vtt");
    expect(lostStyling).toBe(true);
    expect(cues).toEqual([
      { start: 1000, end: 3500, text: "Hola & bienvenidos\n<i>segunda línea</i>" },
      { start: 4000, end: 6000, text: "Árvore <3" },
    ]);
  });

  it.each(["subtitles.ass", "subtitles.ssa"])("reads %s: dialogues only, overrides to tags, commas kept", (name) => {
    const { format, cues, lostStyling } = parseSubtitles(fixture(name));
    expect(format).toBe(name.endsWith("ssa") ? "ssa" : "ass");
    expect(lostStyling).toBe(true);
    expect(cues).toEqual([
      { start: 1000, end: 3500, text: "Hola, <i>mundo</i>\nSegunda línea" },
      { start: 4000, end: 6250, text: "Cartel, con comas" },
    ]);
  });

  it("reads Windows-1252 files with CRLF", () => {
    const { cues } = parseSubtitles(fixture("subtitles-latin1.srt"));
    expect(cues.map((c) => c.text)).toEqual(["Canción de cuna", "Açúcar y piñón"]);
  });

  it("rejects files without valid cues", () => {
    expect(() => parseSubtitles(fixture("corrupt/broken.srt"))).toThrow(invalidData);
    expect(() => parseSubtitles("just some text")).toThrow(invalidData);
    expect(() => parseSubtitles("WEBVTT\n\nNOTE only a note\n")).toThrow(invalidData);
    expect(detectSubtitleFormat("{}")).toBeNull();
  });
});

describe("writeSubtitles", () => {
  const cues = [
    { start: 3_723_456, end: 3_725_000, text: "<i>Uno</i> & {dos}\n\n<b>tres</b> --> x" },
    { start: 0, end: 999, text: "first" },
  ];

  it("writes numbered, sorted SRT", () => {
    expect(writeSubtitles(cues, "srt")).toBe(
      "1\n00:00:00,000 --> 00:00:00,999\nfirst\n\n2\n01:02:03,456 --> 01:02:05,000\n<i>Uno</i> & {dos}\n\u00a0\n<b>tres</b> -> x\n",
    );
  });

  it("writes VTT escaping markup but keeping i/b/u", () => {
    const vtt = writeSubtitles(cues, "vtt");
    expect(vtt.startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:00.999\nfirst\n")).toBe(true);
    expect(vtt).toContain("<i>Uno</i> &amp; {dos}");
  });

  it("writes ASS and SSA with override tags and \\N", () => {
    const ass = writeSubtitles(cues, "ass");
    expect(ass).toContain("[V4+ Styles]");
    expect(ass).toContain("Dialogue: 0,1:02:03.46,1:02:05.00,Default,,0,0,0,,{\\i1}Uno{\\i0} & (dos)\\N\\N{\\b1}tres{\\b0} --> x");
    const ssa = writeSubtitles(cues, "ssa");
    expect(ssa).toContain("[V4 Styles]");
    expect(ssa).toContain("Dialogue: Marked=0,0:00:00.00,0:00:01.00,Default,,0,0,0,,first");
  });

  const formats: SubtitleFormat[] = ["srt", "vtt", "ass", "ssa"];
  it.each(formats.flatMap((from) => formats.map((to) => [from, to] as const)))("round-trips %s → %s", (from, to) => {
    const source = parseSubtitles(fixture(`subtitles.${from}`)).cues;
    const back = parseSubtitles(writeSubtitles(source, to));
    expect(back.format).toBe(to);
    // ASS/SSA keep centiseconds only.
    const round = (ms: number) => (to === "ass" || to === "ssa" ? Math.round(ms / 10) * 10 : ms);
    expect(back.cues).toEqual(source.map((c) => ({ ...c, start: round(c.start), end: round(c.end) })));
    expect(back.lostStyling).toBe(false);
  });

  it("reports lost styling only when the format changes", () => {
    expect(convertSubtitles(fixture("subtitles.ass"), "srt").lostStyling).toBe(true);
    expect(convertSubtitles(fixture("subtitles.ass"), "ass").lostStyling).toBe(false);
    expect(convertSubtitles(fixture("subtitles-latin1.srt"), "vtt")).toMatchObject({ cues: 2, lostStyling: false });
  });
});

describe("sync", () => {
  it("shifts, never below zero, dropping cues that end before the start", () => {
    const cues = [
      { start: 500, end: 1500, text: "a" },
      { start: 2000, end: 4000, text: "b" },
      { start: 5000, end: 6000, text: "c" },
    ];
    expect(syncCues(cues, { offsetMs: -2500 })).toEqual({
      cues: [
        { start: 0, end: 1500, text: "b" },
        { start: 2500, end: 3500, text: "c" },
      ],
      dropped: 1,
    });
    expect(syncCues(cues, { offsetMs: 1000 }).cues[0]).toEqual({ start: 1500, end: 2500, text: "a" });
  });

  it("retimes between frame rates", () => {
    const [cue] = syncCues([{ start: 25_000, end: 50_000, text: "x" }], { offsetMs: 0, fps: { from: 23.976, to: 25 } }).cues;
    expect(cue).toEqual({ start: 23_976, end: 47_952, text: "x" });
  });

  it("keeps SRT text, tags and renumbers after dropping", () => {
    const out = syncSubtitles(fixture("subtitles.srt"), { offsetMs: -4000 });
    expect(out).toMatchObject({ format: "srt", cues: 2, dropped: 1 });
    expect(out.text).toBe(
      '1\n00:00:00,000 --> 00:00:02,250\n<font color="#ff0000">Texto en rojo</font>\nSecond line\n\n2\n00:00:58,003 --> 00:01:01,000\n中文字幕 & <b>negrita</b>\n',
    );
  });

  it("keeps VTT settings, ids, NOTE and STYLE blocks", () => {
    const out = syncSubtitles(fixture("subtitles.vtt"), { offsetMs: 1500 });
    expect(out.text).toContain("STYLE\n::cue { color: yellow }");
    expect(out.text).toContain("intro\n00:00:02.500 --> 00:00:05.000 align:start position:10%\n<v Ana>Hola</v> &amp; bienvenidos");
    expect(out.text).toContain("00:00:05.500 --> 00:00:07.500\nÁrvore &lt;3");
  });

  it("keeps ASS styles and overrides, changing only dialogue times", () => {
    const source = fixture("subtitles.ass");
    const out = syncSubtitles(source, { offsetMs: 0, fps: { from: 25, to: 23.976 } });
    expect(out.cues).toBe(2);
    expect(out.text).toContain("Style: Sign,Arial,30");
    expect(out.text).toContain("Comment: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,not shown");
    expect(out.text).toContain("Dialogue: 0,0:00:01.04,0:00:03.65,Default,,0,0,0,,Hola, {\\i1}mundo{\\i0}\\NSegunda línea");
    expect(out.text).toContain("Dialogue: 0,0:00:04.17,0:00:06.52,Sign,,0,0,0,,{\\pos(100,50)\\c&H0000FF&}Cartel, con comas");
    expect(parseSubtitles(out.text).cues).toHaveLength(2);
  });

  it("rejects files without cues", () => {
    expect(() => syncSubtitles(fixture("corrupt/broken.srt"), { offsetMs: 1000 })).toThrow(invalidData);
  });
});
