// Objective audio comparison of other Supertonic ONNX files (task 11.3) against
// the originals: same text, voice and seed in both, so a faithful version gives
// nearly the same waveform. Per sentence: duration difference, log-spectral
// distance (dB, 1024-point STFT) and the time each version takes to speak.
//   SUPERTONIC_DIR=… node scripts/tts/compare.mjs <dir with other onnx/*.onnx> [--voices=F5,M2]
import { join } from "node:path";
import { createJiti } from "jiti";
import { loadSupertonic, root } from "./engine.mjs";

const SENTENCES = {
  es: ["El 28 de octubre de 2026 llegaron 3,5 toneladas al puerto.", "La reunión empieza a las 14:30 en la sala principal.", "Compré dos libros por $1.250 y una revista."],
  en: ["On October 28, 2026, the ship brought 3.5 tons to the port.", "The meeting starts at 2:30 PM in the main room.", "I bought two books for $12.50 and a magazine."],
  pt: ["Em 28 de outubro de 2026 chegaram 3,5 toneladas ao porto.", "A reunião começa às 14:30 na sala principal.", "Comprei dois livros por R$ 25,90 e uma revista."],
  fr: ["Le 28 octobre 2026, 3,5 tonnes sont arrivées au port.", "La réunion commence à 14 h 30 dans la grande salle.", "J'ai acheté deux livres pour 12,50 € et un magazine."],
};
const { RECOMMENDED_VOICE } = await createJiti(import.meta.url).import(join(root, "src/lib/tts/recommended.ts"));

const other = process.argv[2];
if (!other) throw new Error("usage: node scripts/tts/compare.mjs <onnx dir>");
const voicesArg = process.argv.find((a) => a.startsWith("--voices="))?.split("=")[1]?.split(",");

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const a = i + k, b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

/** Log power spectrogram frames (dB). */
function spectrogram(pcm, n = 1024, hop = 256) {
  const frames = [];
  for (let at = 0; at + n <= pcm.length; at += hop) {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = pcm[at + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
    fft(re, im);
    const f = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) f[k] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-10);
    frames.push(f);
  }
  return frames;
}

/** Mean log-spectral distance in dB over the common frames. */
function lsd(a, b) {
  const A = spectrogram(a), B = spectrogram(b);
  const m = Math.min(A.length, B.length);
  let sum = 0;
  for (let t = 0; t < m; t++) {
    let s = 0;
    for (let k = 0; k < A[t].length; k++) s += (A[t][k] - B[t][k]) ** 2;
    sum += Math.sqrt(s / A[t].length);
  }
  return sum / m;
}

const base = await loadSupertonic();
const alt = await loadSupertonic(process.env.SUPERTONIC_DIR, other);
// Reference: two different seeds of the original, to know how far "another
// take of the same voice" is (a distance near it means no audible change).
const rows = [];
for (const lang of Object.keys(SENTENCES)) {
  for (const voice of voicesArg ?? [RECOMMENDED_VOICE[lang]]) {
    for (const text of SENTENCES[lang]) {
      let t = performance.now();
      const a = await base.speak(text, { lang, voice });
      const ta = performance.now() - t;
      t = performance.now();
      const b = await alt.speak(text, { lang, voice });
      const tb = performance.now() - t;
      const seed2 = await base.speak(text, { lang, voice, seed: 2 });
      const row = {
        lang, voice,
        durDiff: Math.abs(a.length - b.length) / a.length,
        lsd: lsd(a, b),
        lsdSeed: lsd(a, seed2),
        speed: tb / ta,
      };
      rows.push(row);
      console.error(lang, voice, JSON.stringify(row));
    }
  }
}
const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
console.log(JSON.stringify({ onnx: other, sentences: rows.length, durDiff: avg("durDiff"), lsd: avg("lsd"), lsdOtherSeed: avg("lsdSeed"), timeRatio: avg("speed") }));
