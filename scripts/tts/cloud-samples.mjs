// Samples and measurement of the cloud voices (task 13.3d), run once by the
// owner with the real key (docs/tts-nube.md). Uses ~10,000 characters of the
// free monthly quota (4 million for WaveNet).
//
//   GOOGLE_TTS_API_KEY=… node scripts/tts/cloud-samples.mjs
//     writes public/tts-samples/cloud/<voice>.mp3 (two sentences per voice)
//     and src/lib/tts/cloud-samples.json (which voices have a sample).
//   GOOGLE_TTS_API_KEY=… WHISPER_DIR=… node scripts/tts/cloud-samples.mjs --wer
//     also reads 10 sentences per voice, transcribes them with the site's
//     Whisper `base` (method of phase 11, scripts/tts/wer.mjs) and writes
//     docs/tts-wer/cloud.json plus a Markdown table; the voice with the lowest
//     WER (characters for Chinese) is saved as "recommended" and the reader
//     lists it first.
//
// The key is read from the environment only and never printed or written.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = join(import.meta.dirname, "../..");
const jiti = createJiti(import.meta.url);
const { cloudVoices } = await jiti.import(join(root, "src/lib/tts/cloud-voices.ts"));
const key = process.env.GOOGLE_TTS_API_KEY?.trim();
if (!key) {
  console.error("Set GOOGLE_TTS_API_KEY (the same key as in Railway). See docs/tts-nube.md.");
  process.exit(1);
}
const measure = process.argv.includes("--wer");
const endpoint = process.env.GOOGLE_TTS_ENDPOINT || "https://texttospeech.googleapis.com/v1/text:synthesize";

// The same sentences as the AI voice measurement (scripts/tts/wer.mjs), plus Chinese.
const SENTENCES = {
  es: [
    "La biblioteca abre todos los días a las nueve de la mañana.",
    "Mi abuela prepara un guiso de lentejas los domingos.",
    "El tren a Córdoba sale del andén cuatro.",
    "Necesito comprar pan, leche y un kilo de tomates.",
    "La fecha de entrega del trabajo es el quince de marzo.",
    "Los chicos jugaron al fútbol hasta que se hizo de noche.",
    "Guardá el archivo antes de cerrar la computadora.",
    "El médico me recomendó caminar media hora por día.",
    "En dos mil veintiséis el pasaje cuesta trescientos cincuenta pesos.",
    "Cuando llueve, la ciudad se llena de paraguas de colores.",
  ],
  en: [
    "The library opens every day at nine in the morning.",
    "My grandmother makes vegetable soup on Sundays.",
    "The train to Boston leaves from platform four.",
    "I need to buy bread, milk and a pound of tomatoes.",
    "The report is due on March fifteenth.",
    "The kids played soccer until it got dark.",
    "Save the file before you close the laptop.",
    "The doctor told me to walk for half an hour a day.",
    "In twenty twenty-six the ticket costs thirty-five dollars.",
    "When it rains, the city fills with colorful umbrellas.",
  ],
  pt: [
    "A biblioteca abre todos os dias às nove da manhã.",
    "Minha avó faz sopa de legumes aos domingos.",
    "O trem para Campinas sai da plataforma quatro.",
    "Preciso comprar pão, leite e um quilo de tomates.",
    "A data de entrega do trabalho é quinze de março.",
    "As crianças jogaram futebol até escurecer.",
    "Salve o arquivo antes de fechar o computador.",
    "O médico me recomendou caminhar meia hora por dia.",
    "Em dois mil e vinte e seis a passagem custa trinta e cinco reais.",
    "Quando chove, a cidade se enche de guarda-chuvas coloridos.",
  ],
  fr: [
    "La bibliothèque ouvre tous les jours à neuf heures du matin.",
    "Ma grand-mère prépare une soupe de légumes le dimanche.",
    "Le train pour Lyon part du quai numéro quatre.",
    "Je dois acheter du pain, du lait et un kilo de tomates.",
    "Le rapport doit être rendu le quinze mars.",
    "Les enfants ont joué au football jusqu'à la nuit.",
    "Enregistrez le fichier avant de fermer l'ordinateur.",
    "Le médecin m'a conseillé de marcher une demi-heure par jour.",
    "En deux mille vingt-six, le billet coûte trente-cinq euros.",
    "Quand il pleut, la ville se remplit de parapluies colorés.",
  ],
  zh: [
    "图书馆每天早上九点开门。",
    "我奶奶每个星期天都做蔬菜汤。",
    "去上海的火车从四号站台出发。",
    "我需要买面包、牛奶和一公斤西红柿。",
    "报告的截止日期是三月十五日。",
    "孩子们一直踢足球到天黑。",
    "关电脑之前请先保存文件。",
    "医生建议我每天散步半个小时。",
    "下雨的时候，城市里到处都是彩色的雨伞。",
    "这家咖啡店的蛋糕非常好吃。",
  ],
};

async function synthesize(text, voice) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Goog-Api-Key": key },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.id },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1, sampleRateHertz: 24000 },
    }),
  });
  if (!response.ok) throw new Error(`Google answered HTTP ${response.status} for ${voice.id}: ${(await response.text()).slice(0, 300)}`);
  return Buffer.from((await response.json()).audioContent, "base64");
}

const outDir = join(root, "public/tts-samples/cloud");
mkdirSync(outDir, { recursive: true });
const withSample = [];
let chars = 0;
for (const [lang, voices] of Object.entries(cloudVoices)) {
  for (const voice of voices) {
    const text = SENTENCES[lang].slice(0, 2).join(" ");
    chars += text.length;
    writeFileSync(join(outDir, `${voice.id}.mp3`), await synthesize(text, voice));
    withSample.push(voice.id);
    console.log(`sample ${voice.id}`);
  }
}

const recommended = {};
if (measure) {
  const { loadWhisper, wer } = await import("./engine.mjs");
  const whisper = await loadWhisper("base");
  const results = [];
  for (const [lang, voices] of Object.entries(cloudVoices)) {
    for (const voice of voices) {
      let errors = 0;
      let total = 0;
      for (const sentence of SENTENCES[lang]) {
        chars += sentence.length;
        const mp3 = await synthesize(sentence, voice);
        const raw = execFileSync("ffmpeg", ["-v", "error", "-i", "-", "-ar", "16000", "-ac", "1", "-f", "f32le", "-"], { input: mp3, maxBuffer: 1 << 28 });
        const heard = await whisper.transcribe(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), lang);
        // Chinese has no spaces: compare characters.
        const r = lang === "zh" ? wer([...sentence.replace(/[，。、]/g, "")].join(" "), [...heard.replace(/[，。、,.\s]/g, "")].join(" ")) : wer(sentence, heard);
        errors += r.errors;
        total += r.words;
      }
      results.push({ lang, voice: voice.id, wer: total ? errors / total : 0 });
      console.log(`WER ${voice.id}: ${((errors / total) * 100).toFixed(1)} %`);
    }
  }
  for (const lang of Object.keys(cloudVoices)) {
    const best = results.filter((r) => r.lang === lang).sort((a, b) => a.wer - b.wer)[0];
    if (best) recommended[lang] = best.voice;
  }
  mkdirSync(join(root, "docs/tts-wer"), { recursive: true });
  writeFileSync(join(root, "docs/tts-wer/cloud.json"), JSON.stringify({ date: new Date().toISOString().slice(0, 10), results, recommended }, null, 2) + "\n");
  console.log("\n| Idioma | Voz | WER |\n|---|---|---|");
  for (const r of results) console.log(`| ${r.lang} | ${r.voice}${recommended[r.lang] === r.voice ? " (recomendada)" : ""} | ${(r.wer * 100).toFixed(1)} % |`);
}

writeFileSync(join(root, "src/lib/tts/cloud-samples.json"), JSON.stringify({ voices: withSample, recommended }, null, 2) + "\n");
console.log(`\n${withSample.length} samples; about ${chars.toLocaleString("es")} characters used. Commit public/tts-samples/cloud/, src/lib/tts/cloud-samples.json${measure ? " and docs/tts-wer/cloud.json" : ""}.`);
