import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfig, parseIndexer, parseVoiceStyle, synthesize, type SupertonicLanguage, type SupertonicSessions } from "./supertonic";

// The real model (~398 MB): runs only with SUPERTONIC_DIR pointing at a copy
// of the pinned files (onnx/*, voice_styles/F1.json). The CI covers the
// browser worker in tests/e2e (phase 8.5a).
const dir = process.env.SUPERTONIC_DIR;

describe.skipIf(!dir)("Supertonic 3 with the real model", () => {
  const load = async () => {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    const json = async (p: string) => JSON.parse(await readFile(join(dir!, p), "utf8")) as unknown;
    const session = async (name: string) => ort.InferenceSession.create(new Uint8Array(await readFile(join(dir!, "onnx", `${name}.onnx`))));
    const sessions: SupertonicSessions = {
      durationPredictor: await session("duration_predictor"),
      textEncoder: await session("text_encoder"),
      vectorEstimator: await session("vector_estimator"),
      vocoder: await session("vocoder"),
    };
    return { ort, sessions, cfg: parseConfig(await json("onnx/tts.json")), indexer: parseIndexer(await json("onnx/unicode_indexer.json")), voice: parseVoiceStyle(await json("voice_styles/F1.json")) };
  };

  const texts: Record<SupertonicLanguage, string> = {
    es: "Hola, esta es una prueba de la voz.",
    en: "Hello, this is a test of the voice.",
    pt: "Olá, este é um teste da voz.",
    fr: "Bonjour, ceci est un test de la voix.",
  };

  it("speaks a short sentence in each language", async () => {
    const m = await load();
    for (const [lang, text] of Object.entries(texts) as [SupertonicLanguage, string][]) {
      const started = performance.now();
      const pcm = await synthesize(m.ort, m.sessions, m.cfg, m.indexer, text, { lang, voice: m.voice });
      const seconds = pcm.length / m.cfg.sampleRate;
      let energy = 0;
      for (const v of pcm) energy += v * v;
      const rms = Math.sqrt(energy / pcm.length);
      console.log(lang, `${seconds.toFixed(2)} s of audio in ${((performance.now() - started) / 1000).toFixed(2)} s, rms ${rms.toFixed(3)}`);
      expect(seconds).toBeGreaterThan(1);
      expect(seconds).toBeLessThan(6);
      expect(rms).toBeGreaterThan(0.01);
      expect(pcm.every((v) => Number.isFinite(v))).toBe(true);
    }
  }, 300_000);
});
