// Which AI voice is understood best in each language: every voice reads the
// same ~10 sentences per language (site settings: 5 steps, speed 1.05, seed 1),
// the site's Whisper `base` transcribes them, and the word error rate (WER)
// against the text is computed. Numbers are spelled out on both sides with
// the site's normalization (Whisper writes digits). The recommended voice has
// the lowest WER; ties go to the duration closest to the language's median.
//   SUPERTONIC_DIR=… WHISPER_DIR=… node scripts/tts/wer.mjs [--onnx=<dir of other ONNX files>] [--out=<name>] [--voices=F1,M1] [--langs=es,en]
// Writes docs/tts-wer/<name>.json (default name "fp32") and prints a Markdown table.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";
import { loadSupertonic, loadWhisper, resample16k, root, wer } from "./engine.mjs";

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const jiti = createJiti(import.meta.url);
const { normalizeNumbers } = await jiti.import(join(root, "src/lib/tts/normalize.ts"));
const { supertonicVoices, aiVoiceLanguages } = await jiti.import(join(root, "src/lib/tts/model.ts"));

export const SENTENCES = {
  es: [
    "La biblioteca abre todos los días a las nueve de la mañana.",
    "Mi abuela prepara un guiso de lentejas los domingos.",
    "El tren a Córdoba sale del andén cuatro.",
    "Necesito comprar pan, leche y un kilo de tomates.",
    "La fecha de entrega del trabajo es el 15 de marzo.",
    "Los chicos jugaron al fútbol hasta que se hizo de noche.",
    "Guardá el archivo antes de cerrar la computadora.",
    "El médico me recomendó caminar media hora por día.",
    "En 2026 el pasaje cuesta 350 pesos.",
    "Cuando llueve, la ciudad se llena de paraguas de colores.",
  ],
  en: [
    "The library opens every day at nine in the morning.",
    "My grandmother makes vegetable soup on Sundays.",
    "The train to Boston leaves from platform four.",
    "I need to buy bread, milk and a pound of tomatoes.",
    "The report is due on March 15.",
    "The kids played soccer until it got dark.",
    "Save the file before you close the laptop.",
    "The doctor told me to walk for half an hour a day.",
    "In 2026 the ticket costs 35 dollars.",
    "When it rains, the city fills with colorful umbrellas.",
  ],
  pt: [
    "A biblioteca abre todos os dias às nove da manhã.",
    "Minha avó faz sopa de legumes aos domingos.",
    "O trem para Campinas sai da plataforma quatro.",
    "Preciso comprar pão, leite e um quilo de tomates.",
    "A data de entrega do trabalho é 15 de março.",
    "As crianças jogaram futebol até escurecer.",
    "Salve o arquivo antes de fechar o computador.",
    "O médico me recomendou caminhar meia hora por dia.",
    "Em 2026 a passagem custa 35 reais.",
    "Quando chove, a cidade se enche de guarda-chuvas coloridos.",
  ],
  fr: [
    "La bibliothèque ouvre tous les jours à neuf heures du matin.",
    "Ma grand-mère prépare une soupe de légumes le dimanche.",
    "Le train pour Lyon part du quai numéro quatre.",
    "Je dois acheter du pain, du lait et un kilo de tomates.",
    "Le rapport doit être rendu le 15 mars.",
    "Les enfants ont joué au football jusqu'à la nuit.",
    "Enregistrez le fichier avant de fermer l'ordinateur.",
    "Le médecin m'a conseillé de marcher une demi-heure par jour.",
    "En 2026, le billet coûte 35 euros.",
    "Quand il pleut, la ville se remplit de parapluies colorés.",
  ],
};

const name = arg("out") ?? "fp32";
const voices = arg("voices")?.split(",") ?? supertonicVoices;
const langs = arg("langs")?.split(",") ?? aiVoiceLanguages;
const tts = await loadSupertonic(process.env.SUPERTONIC_DIR, arg("onnx"));
const asr = await loadWhisper("base");

const results = [];
for (const lang of langs) {
  for (const voice of voices) {
    let errors = 0;
    let total = 0;
    let seconds = 0;
    const misses = [];
    for (const text of SENTENCES[lang]) {
      const pcm = await tts.speak(text, { lang, voice });
      seconds += pcm.length / tts.sampleRate;
      const heard = await asr.transcribe(resample16k(pcm, tts.sampleRate), lang);
      const r = wer(normalizeNumbers(text, lang), normalizeNumbers(heard, lang));
      errors += r.errors;
      total += r.words;
      if (r.errors) misses.push({ text, heard });
    }
    results.push({ lang, voice, wer: errors / total, errors, words: total, seconds: Math.round(seconds * 10) / 10, misses });
    console.error(lang, voice, (errors / total).toFixed(3), seconds.toFixed(1));
  }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const recommended = {};
for (const lang of langs) {
  const rows = results.filter((r) => r.lang === lang);
  const mid = median(rows.map((r) => r.seconds));
  rows.sort((a, b) => a.wer - b.wer || Math.abs(a.seconds - mid) - Math.abs(b.seconds - mid));
  recommended[lang] = rows[0].voice;
}

mkdirSync(join(root, "docs/tts-wer"), { recursive: true });
writeFileSync(join(root, "docs/tts-wer", `${name}.json`), `${JSON.stringify({ model: name, date: new Date().toISOString().slice(0, 10), recommended, results }, null, 2)}\n`);
console.log(`| Voz | ${langs.join(" | ")} |\n|---|${langs.map(() => "---:").join("|")}|`);
for (const voice of voices) {
  console.log(`| ${voice} | ${langs.map((lang) => { const r = results.find((x) => x.lang === lang && x.voice === voice); return `${(r.wer * 100).toFixed(1)} % (${r.seconds} s)${recommended[lang] === voice ? " **★**" : ""}`; }).join(" | ")} |`);
}
