// Natural-sounding speech for the transcription tests (tests/fixtures/speech-ai-*):
// our own AI voice (Supertonic 3, src/lib/tts/supertonic.ts) reading our own
// texts, then Opus at 24 kbps, 16 kHz mono, and the English one also as a WebM
// video. espeak-ng's robotic voice (speech.sh) is too fragile for the small
// Whisper model: a tiny change in decoding can make it skip a sentence.
// Run: SUPERTONIC_DIR=<copy of the pinned model files> node scripts/fixtures/speech-ai.mjs   (needs ffmpeg)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const dir = process.env.SUPERTONIC_DIR;
if (!dir) throw new Error("SUPERTONIC_DIR is not set");
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "tests/fixtures");
const jiti = createJiti(import.meta.url);
const { parseConfig, parseIndexer, parseVoiceStyle, synthesize } = await jiti.import(join(root, "src/lib/tts/supertonic.ts"));
const ort = await import("onnxruntime-web");
ort.env.wasm.numThreads = 1;

const json = (p) => JSON.parse(readFileSync(join(dir, p), "utf8"));
const session = (name) => ort.InferenceSession.create(new Uint8Array(readFileSync(join(dir, "onnx", `${name}.onnx`))));
const sessions = {
  durationPredictor: await session("duration_predictor"),
  textEncoder: await session("text_encoder"),
  vectorEstimator: await session("vector_estimator"),
  vocoder: await session("vocoder"),
};
const cfg = parseConfig(json("onnx/tts.json"));
const indexer = parseIndexer(json("onnx/unicode_indexer.json"));

const recordings = {
  en: {
    voice: "F1",
    sentences: ["Hello, this is a short transcription test.", "The quick brown fox jumps over the lazy dog."],
  },
  es: {
    voice: "M1",
    sentences: [
      "Hola, esta es una prueba de transcripción de Fileflect.",
      "El audio se convierte en texto dentro del navegador, sin subir nada a ningún servidor.",
      "Primero se descarga el modelo de reconocimiento de voz, y después queda guardado para la próxima vez.",
      "La grabación dura un poco más de treinta segundos, para que el texto se procese en dos partes.",
      "El resultado se puede corregir, copiar y descargar como subtítulos con sus tiempos.",
      "Gracias por escuchar esta grabación de prueba.",
    ],
  },
};

const tmp = mkdtempSync(join(tmpdir(), "speech-ai-"));
for (const [lang, { voice, sentences }] of Object.entries(recordings)) {
  const style = parseVoiceStyle(json(`voice_styles/${voice}.json`));
  const parts = [];
  for (const text of sentences) {
    parts.push(await synthesize(ort, sessions, cfg, indexer, text, { lang, voice: style }));
    parts.push(new Float32Array(Math.round(cfg.sampleRate * 0.35)));
  }
  const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    pcm.set(p, at);
    at += p.length;
  }
  const raw = join(tmp, `${lang}.f32`);
  writeFileSync(raw, Buffer.from(pcm.buffer));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(cfg.sampleRate), "-ac", "1", "-i", raw, "-ac", "1", "-ar", "16000", "-c:a", "libopus", "-b:a", "24k", join(out, `speech-ai-${lang}.ogg`)]);
  console.log(lang, (pcm.length / cfg.sampleRate).toFixed(1), "s");
}
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x336699:s=96x64:r=10", "-i", join(out, "speech-ai-en.ogg"), "-shortest", "-c:v", "libvpx", "-b:v", "50k", "-c:a", "copy", join(out, "speech-ai-en.webm")]);
