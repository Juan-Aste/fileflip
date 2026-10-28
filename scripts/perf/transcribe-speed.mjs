// Speed of "Audio to text" in a real browser: Chromium on this machine (PC)
// and an estimated mid-range phone (the tab's processes get 25 ms of every
// 100 ms with SIGSTOP/SIGCONT: DevTools CPU throttling does not slow Web
// Workers, see docs/tts-voz-ia.md). Needs `next start` on BASE_URL and the
// model files in WHISPER_DIR (tiny/ and base/).
// Run: WHISPER_DIR=… node scripts/perf/transcribe-speed.mjs <audio file> [tiny|base] [pc|phone]
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";

const [file, model = "tiny", device = "pc"] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const dir = process.env.WHISPER_DIR;
if (!file || !dir) throw new Error("usage: WHISPER_DIR=… node scripts/perf/transcribe-speed.mjs <audio> [tiny|base] [pc|phone]");
const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const context = await browser.newContext(device === "phone" ? devices["Pixel 7"] : { viewport: { width: 1280, height: 900 } });
await context.route("https://huggingface.co/onnx-community/**", (route) => {
  const [repo, , , ...rest] = route.request().url().slice("https://huggingface.co/onnx-community/".length).split("/");
  const local = join(dir, repo.replace("whisper-", ""), ...rest);
  return existsSync(local) ? route.fulfill({ path: local, headers: { "access-control-allow-origin": "*" } }) : route.abort();
});
const page = await context.newPage();
await page.goto(`${base}/es/transcribir-audio-a-texto`, { waitUntil: "networkidle" });
await page.locator('input[type="file"]').first().setInputFiles(file);
await page.getByText(/duración \d/).waitFor();
await page.getByText(model === "base" ? /^Preciso/ : /^Rápido/).click();
await page.getByLabel("Idioma del audio").selectOption("es");

// Phone: every renderer process of the browser (the page and its workers) runs 25 ms of every 100 ms.
let throttling = false;
if (device === "phone") {
  const pids = execFileSync("pgrep", ["-f", "--", "--type=renderer"], { encoding: "utf8" }).trim().split("\n").map(Number);
  const signal = (name) => pids.forEach((pid) => { try { process.kill(pid, name); } catch {} });
  throttling = true;
  void (async () => {
    while (throttling) {
      signal("SIGCONT");
      await new Promise((r) => setTimeout(r, 25));
      signal("SIGSTOP");
      await new Promise((r) => setTimeout(r, 75));
    }
    signal("SIGCONT");
  })();
}

const marks = {};
const started = Date.now();
await page.getByRole("button", { name: "Transcribir", exact: true }).click();
const phase = async (label) => {
  await page.getByRole("progressbar", { name: label }).waitFor({ timeout: 3_600_000 });
  marks[label.source ?? label] = (Date.now() - started) / 1000;
};
await phase(/Descargando|Cargando el modelo/);
await phase(/Transcribiendo/);
await page.getByRole("textbox", { name: "Transcripción" }).waitFor({ timeout: 3_600_000 });
const total = (Date.now() - started) / 1000;
throttling = false;
await new Promise((r) => setTimeout(r, 200));
const memory = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
const text = await page.getByRole("textbox", { name: "Transcripción" }).inputValue();
const transcribing = total - marks.Transcribiendo;
console.log(JSON.stringify({
  model, device, audioSeconds: Math.round(seconds),
  readAudio: marks["Descargando|Cargando el modelo"], loadModel: +(marks.Transcribiendo - marks["Descargando|Cargando el modelo"]).toFixed(1),
  transcribing: +transcribing.toFixed(1), total: +total.toFixed(1),
  audioMinutesPerMinute: +(seconds / transcribing).toFixed(2), jsHeapMB: memory && Math.round(memory / 1e6), words: text.split(/\s+/).length,
}));
await browser.close();
