import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiVoiceLanguages, supertonicVoices } from "./model";
import { RECOMMENDED_VOICE, SAMPLE_TEXT, sampleFor, samplePath, voiceSamples } from "./samples";

describe("AI voice samples", () => {
  it("has one MP3 per voice and language, up to 40 KB and 5–9 s, matching its SHA-256", () => {
    expect(voiceSamples).toHaveLength(aiVoiceLanguages.length * supertonicVoices.length);
    for (const lang of aiVoiceLanguages) {
      for (const voice of supertonicVoices) {
        const s = sampleFor(lang, voice)!;
        expect(s.path).toBe(samplePath(lang, voice));
        const data = readFileSync(join(__dirname, "../../../public", s.path));
        expect(data.length).toBe(s.bytes);
        expect(data.length).toBeLessThanOrEqual(40 * 1024);
        expect(createHash("sha256").update(data).digest("hex")).toBe(s.sha256);
        // MPEG audio frame sync (no ID3 tag).
        expect(data[0]).toBe(0xff);
        expect(data[1]! & 0xe0).toBe(0xe0);
        expect(s.seconds).toBeGreaterThanOrEqual(5);
        expect(s.seconds).toBeLessThanOrEqual(9);
      }
    }
  });

  it("says a number and a date in every language", () => {
    for (const lang of aiVoiceLanguages) {
      expect(SAMPLE_TEXT[lang]).toMatch(/2026/);
      expect(SAMPLE_TEXT[lang]).toMatch(/\b3\b/);
    }
  });
});

describe("recommended voice", () => {
  it("is the one the WER measurement chose (docs/tts-wer.md)", () => {
    const measured = JSON.parse(readFileSync(join(__dirname, "../../../docs/tts-wer/fp32.json"), "utf8")) as { recommended: Record<string, string> };
    expect(RECOMMENDED_VOICE).toEqual(measured.recommended);
  });
});
