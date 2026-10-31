import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyTimestampRules,
  logMelSpectrogram,
  parseTokenizer,
  repetitionAt,
  SAMPLE_RATE,
  segmentsOf,
  transcribe,
  whisperMelFilters,
  type GenerationConfig,
} from "./whisper";

// A tiny vocabulary: text tokens 0–9, eot 10, notimestamps 11, timestamps 12+.
const cfg: GenerationConfig = {
  decoderStart: 100,
  eot: 10,
  transcribe: 101,
  noTimestamps: 11,
  timestampBegin: 12,
  suppress: [3],
  beginSuppress: [4],
  maxInitialTimestamp: 2,
  languages: { "<|es|>": 102, "<|en|>": 103 },
};
const VOCAB = 30;
const flat = () => new Float32Array(VOCAB);
const allowed = (logits: Float32Array) => [...logits].flatMap((v, i) => (v === -Infinity ? [] : [i]));

describe("logMelSpectrogram", () => {
  it("has Whisper's 80 Slaney mel filters over 201 bins", () => {
    const filters = whisperMelFilters();
    expect(filters.length).toBe(80 * 201);
    // Every band has some weight, and none reaches above 8 kHz (bin 200).
    for (let m = 0; m < 80; m++) expect(filters.slice(m * 201, m * 201 + 201).some((w) => w > 0)).toBe(true);
  });

  it("gives Whisper's floor for silence and a peak at the band of a tone", () => {
    const silence = logMelSpectrogram(new Float32Array(SAMPLE_RATE));
    expect(silence.length).toBe(80 * 3000);
    expect(new Set(silence)).toEqual(new Set([-1.5]));

    const tone = Float32Array.from({ length: SAMPLE_RATE * 2 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE));
    const mel = logMelSpectrogram(tone);
    const frame = 100;
    let best = 0;
    for (let m = 1; m < 80; m++) if (mel[m * 3000 + frame]! > mel[best * 3000 + frame]!) best = m;
    // 440 Hz is 6.6 mel; the 80 bands split 0–45.2 mel (8 kHz) in steps of 0.56: band 11.
    expect(best).toBe(11);
    // After the tone ends the frames drop to the floor (max − 8 → value − 2 below the peak).
    expect(mel[best * 3000 + 2900]).toBeCloseTo(mel.reduce((a, b) => Math.max(a, b)) - 2, 5);
  });
});

describe("parseTokenizer", () => {
  const tokenizer = parseTokenizer({
    model: { vocab: { Hola: 0, "Ġmundo": 1, "Ġespa": 2, "Ã±": 3, ol: 4, "Ġä½ł": 5, "å¥½": 6 } },
    added_tokens: [{ id: 7, content: "<|endoftext|>", special: true }],
  });

  it("decodes byte-level BPE, accents and Chinese included, without special tokens", () => {
    expect(tokenizer.decode([0, 1, 7])).toBe("Hola mundo");
    expect(tokenizer.decode([2, 3, 4])).toBe(" español");
    expect(tokenizer.decode([5, 6])).toBe(" 你好");
    expect(tokenizer.idOf("<|endoftext|>")).toBe(7);
  });
});

describe("applyTimestampRules", () => {
  it("starts with a timestamp within the first second and never with suppressed tokens", () => {
    const logits = flat();
    applyTimestampRules(logits, [], cfg);
    expect(allowed(logits)).toEqual([12, 13, 14]);
  });

  it("after a lone timestamp: text or a later timestamp; after a pair: text only", () => {
    const open = flat();
    // (End of text made likely, so the "timestamps are likelier" rule doesn't decide.)
    open[10] = 10;
    applyTimestampRules(open, [5, 12], cfg);
    expect(allowed(open)).toEqual([10, ...Array.from({ length: VOCAB - 12 }, (_, i) => 12 + i)]);
    const closed = flat();
    applyTimestampRules(closed, [12, 5, 15, 15], cfg);
    expect(allowed(closed)).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("timestamps don't go back", () => {
    const logits = flat();
    applyTimestampRules(logits, [12, 5, 18, 18, 6], cfg);
    expect(allowed(logits).filter((i) => i >= 12)[0]).toBe(19);
  });

  it("picks a timestamp when timestamps together are likelier than any word", () => {
    const logits = flat();
    logits[5] = 2;
    for (let i = 12; i < VOCAB; i++) logits[i] = 0.5;
    applyTimestampRules(logits, [12, 4], cfg);
    expect(allowed(logits).every((i) => i >= 12)).toBe(true);
  });
});

describe("repetitionAt", () => {
  it("finds a loop of the same tokens repeated 4 times at the end", () => {
    expect(repetitionAt([1, 2, 3, 3, 3, 3])).toBe(1);
    expect(repetitionAt([9, 1, 2, 1, 2, 1, 2, 1, 2])).toBe(2);
    expect(repetitionAt([1, 2, 3, 3, 3])).toBe(0);
    expect(repetitionAt([1, 2, 3, 4, 5, 6, 7, 8])).toBe(0);
  });
});

describe("segmentsOf", () => {
  const tokenizer = { decode: (ids: readonly number[]) => ids.map((i) => ` w${i}`).join(""), idOf: () => undefined };

  it("turns timestamp pairs into segments, with what a cut window left open", () => {
    // <0.00> w1 w2 <1.00> <1.00> w3 <2.00> <2.50> w4 (cut)
    const found = segmentsOf([12, 1, 2, 62, 62, 3, 112, 137, 4], cfg, tokenizer, 30);
    expect(found.segments).toEqual([
      { start: 30, end: 31, text: "w1 w2" },
      { start: 31, end: 32, text: "w3" },
    ]);
    expect(found.lastEnd).toBe(2);
    expect(found.unfinished).toBe(2.5);
  });
});

// The real models (~43 and ~79 MB): with WHISPER_DIR pointing at a folder with
// tiny/ and base/ copies of the pinned files (onnx/*, generation_config.json,
// tokenizer.json). The audio fixtures were made with espeak-ng (tests/fixtures/README.md).
const dir = process.env.WHISPER_DIR;

describe.skipIf(!dir)("Whisper with the real models", () => {
  const load = async (size: "tiny" | "base") => {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    const root = join(dir!, size);
    const session = async (name: string) => ort.InferenceSession.create(new Uint8Array(await readFile(join(root, "onnx", `${name}.onnx`))));
    const { parseGenerationConfig } = await import("./whisper");
    return {
      ort,
      sessions: { encoder: await session("encoder_model_quantized"), decoder: await session("decoder_model_merged_quantized") },
      cfg: parseGenerationConfig(JSON.parse(await readFile(join(root, "generation_config.json"), "utf8"))),
      tokenizer: parseTokenizer(JSON.parse(await readFile(join(root, "tokenizer.json"), "utf8"))),
    };
  };
  const pcm = (name: string) => {
    const raw = execFileSync("ffmpeg", ["-v", "error", "-i", join(__dirname, "../../../tests/fixtures", name), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
    return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  };

  it("tiny: English, language detected, with times", async () => {
    const m = await load("tiny");
    const { segments, language } = await transcribe(m.ort, m.sessions, m.cfg, m.tokenizer, pcm("speech-en.ogg"));
    expect(language).toBe("en");
    const text = segments.map((s) => s.text).join(" ").toLowerCase();
    expect(text).toContain("quick");
    expect(text).toContain("fox");
    expect(segments[0]!.start).toBe(0);
    expect(segments.at(-1)!.end).toBeLessThanOrEqual(6.2);
  }, 120_000);

  it("base: 34 s of Spanish in two windows, in order", async () => {
    const m = await load("base");
    const audio = pcm("speech-es.ogg");
    const progress: number[] = [];
    const { segments } = await transcribe(m.ort, m.sessions, m.cfg, m.tokenizer, audio, { language: "es", onProgress: (done, total) => progress.push(done / total) });
    const text = segments.map((s) => s.text).join(" ").toLowerCase();
    for (const word of ["prueba", "transcripción", "kiwi", "saxofón", "números", "cuatro", "segundos"]) expect(text).toContain(word);
    for (let i = 1; i < segments.length; i++) expect(segments[i]!.start).toBeGreaterThanOrEqual(segments[i - 1]!.end - 0.01);
    expect(segments.at(-1)!.end).toBeGreaterThan(30);
    expect(progress.at(-1)).toBe(1);
  }, 300_000);

  it("tiny: our AI voice in Spanish (36 s), language detected, every sentence", async () => {
    const m = await load("tiny");
    const { segments, language } = await transcribe(m.ort, m.sessions, m.cfg, m.tokenizer, pcm("speech-ai-es.ogg"));
    expect(language).toBe("es");
    const text = segments.map((s) => s.text).join(" ").toLowerCase();
    for (const words of ["dentro del navegador", "reconocimiento de voz", "dos partes", "subtítulos con sus tiempos", "gracias por escuchar"]) expect(text).toContain(words);
    expect(segments.at(-1)!.end).toBeGreaterThan(32);
  }, 300_000);
});
