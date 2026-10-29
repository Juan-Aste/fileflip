// Voice samples for the read-aloud tool: SAMPLE_TEXT (src/lib/tts/samples.ts)
// read by each AI voice in each language with the real model and the site's
// settings (5 steps, speed 1.05, seed 1), encoded as MP3 (32 kbps, 24 kHz
// mono: plays everywhere, including old iPhones that lack Ogg Opus) into
// public/tts-samples/<lang>-<voice>.mp3, and their sizes and SHA-256 into
// src/lib/tts/samples.json. Run once per model or text change (docs/tts-voz-ia.md):
//   SUPERTONIC_DIR=<pinned model files> node scripts/tts/samples.mjs   (needs ffmpeg)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";
import { loadSupertonic, root } from "./engine.mjs";

const jiti = createJiti(import.meta.url);
const { SAMPLE_TEXT } = await jiti.import(join(root, "src/lib/tts/samples.ts"));
const { supertonicVoices, aiVoiceLanguages } = await jiti.import(join(root, "src/lib/tts/model.ts"));
const MAX_BYTES = 40 * 1024;

const tts = await loadSupertonic();
const outDir = join(root, "public/tts-samples");
mkdirSync(outDir, { recursive: true });
const list = [];
for (const lang of aiVoiceLanguages) {
  // One sentence per piece, as the tool reads it.
  const pieces = SAMPLE_TEXT[lang].match(/[^.!?]+[.!?]/g).map((s) => s.trim());
  for (const voice of supertonicVoices) {
    const parts = [];
    for (const text of pieces) parts.push(await tts.speak(text, { lang, voice }));
    const gap = new Float32Array(Math.round(tts.sampleRate * 0.25));
    const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0) + gap.length * (parts.length - 1));
    let at = 0;
    parts.forEach((p, i) => {
      pcm.set(p, at);
      at += p.length + (i < parts.length - 1 ? gap.length : 0);
    });
    const name = `${lang}-${voice}.mp3`;
    const file = join(outDir, name);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(tts.sampleRate), "-ac", "1", "-i", "-", "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "32k", "-map_metadata", "-1", "-id3v2_version", "0", "-write_id3v1", "0", file], { input: Buffer.from(pcm.buffer) });
    const data = readFileSync(file);
    if (data.length > MAX_BYTES) throw new Error(`${name} is ${data.length} bytes (max ${MAX_BYTES})`);
    const seconds = Math.round((pcm.length / tts.sampleRate) * 10) / 10;
    list.push({ lang, voice, path: `/tts-samples/${name}`, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), seconds });
    console.log(name, data.length, "bytes", seconds, "s");
  }
}
writeFileSync(join(root, "src/lib/tts/samples.json"), `${JSON.stringify(list, null, 2)}\n`);
