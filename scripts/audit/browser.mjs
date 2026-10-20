// Browser inventory (phase 3 audit): uploads every fixture to the converter
// on the home page, converts it to each output offered, downloads the result
// and validates it with independent readers (sharp, BMP/ICO headers, pdf-lib,
// fflate). Requests to the server API are blocked, so only the in-browser
// engines are measured. Needs a running `next start`.
//   node scripts/audit/browser.mjs [--json out.json] [--only jpg,png]
// BASE_URL defaults to http://localhost:3000; CHROME_PATH as in screenshots.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const executablePath =
  process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const only = opt("--only")?.split(",");
const fixtures = "tests/fixtures";

const imageOutputs = ["jpg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"];
const recompressible = ["jpg", "png", "webp", "avif"];
const inputs = [
  { file: "image.jpg", from: "jpg", size: [160, 120] },
  { file: "image.png", from: "png", size: [160, 120] },
  { file: "image.webp", from: "webp", size: [160, 120] },
  { file: "image.avif", from: "avif", size: [160, 120] },
  { file: "image.gif", from: "gif", size: [160, 120] },
  { file: "image.bmp", from: "bmp", size: [160, 120] },
  { file: "image.tiff", from: "tiff", size: [160, 120] },
  { file: "image.ico", from: "ico", size: [64, 64] },
  { file: "photo.heic", from: "heic", size: [120, 80] },
  { file: "image.svg", from: "svg", size: [160, 120] },
  { file: "document.pdf", from: "pdf", outputs: ["jpg", "png"], pages: 3 },
].filter((i) => !only || only.includes(i.from));
const corrupt = [
  "truncated.jpg",
  "truncated.png",
  "garbage.png",
  "text-as.jpg",
  "empty.png",
  "truncated.pdf",
  "garbage.pdf",
].map((f) => join(fixtures, "corrupt", f));

/** Format and dimensions of an image file, read without the app's code. */
async function inspectImage(buf) {
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return { format: "bmp", width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) };
  }
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const count = buf.readUInt16LE(4);
    let best = { width: 0, height: 0 };
    for (let i = 0; i < count; i++) {
      const e = 6 + i * 16;
      const width = buf[e] || 256;
      const height = buf[e + 1] || 256;
      const offset = buf.readUInt32LE(e + 12);
      const length = buf.readUInt32LE(e + 8);
      // Each entry must decode (PNG or BMP DIB); check the PNG ones with sharp.
      const data = buf.subarray(offset, offset + length);
      if (data[0] === 0x89) await sharp(data).metadata();
      if (width > best.width) best = { width, height };
    }
    return { format: "ico", entries: count, ...best };
  }
  if (buf.subarray(0, 4).toString() === "%PDF") {
    const doc = await PDFDocument.load(buf);
    const [page] = doc.getPages();
    const { width, height } = page.getSize();
    return { format: "pdf", pages: doc.getPageCount(), width: Math.round(width), height: Math.round(height) };
  }
  const meta = await sharp(buf, { animated: true }).metadata();
  // Make sure the pixels decode, not just the header.
  await sharp(buf).raw().toBuffer();
  const format = { jpeg: "jpg", heif: meta.compression === "av1" ? "avif" : "heic" }[meta.format] ?? meta.format;
  return { format, width: meta.width, height: meta.pageHeight ?? meta.height };
}

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const serverCalls = [];
await context.route("**/api/convert/**", (route) => {
  serverCalls.push(route.request().url());
  return route.abort();
});
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));

async function freshPage() {
  await page.goto(`${base}/es`, { waitUntil: "networkidle" });
}

/** Adds a file and waits until its format is detected (or rejected). */
async function addFile(path) {
  await page.locator('input[type="file"]').first().setInputFiles(path);
  // One file per page; its name changes to the output name when done.
  const row = page.locator("section li").first();
  await row.waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 15000 });
  return row;
}

async function convertTo(row, to) {
  const radio = page.locator(`input[name="target"][value="${to}"]`);
  // The output picker renders a moment after detection.
  await page.locator('input[name="target"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  if ((await radio.count()) === 0) return { offered: false };
  await radio.check({ force: true });
  const before = serverCalls.length;
  const started = Date.now();
  await page.getByRole("button", { name: "Convertir", exact: true }).click();
  const link = row.locator("a[download]");
  const error = row.locator(".text-danger");
  await Promise.race([link.waitFor({ timeout: 60000 }), error.waitFor({ timeout: 60000 })]);
  const ms = Date.now() - started;
  const fallback = serverCalls.length > before;
  if (await error.count()) return { offered: true, error: (await error.innerText()).trim(), ms, fallback };
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  const buf = readFileSync(await download.path());
  return { offered: true, buf, name: download.suggestedFilename(), ms, fallback };
}

const results = [];
for (const input of inputs) {
  const path = join(fixtures, input.file);
  // Same-format re-encoding is only offered where it compresses.
  const outputs = (input.outputs ?? imageOutputs).filter((to) => to !== input.from || recompressible.includes(to));
  for (const to of outputs) {
    await freshPage();
    const row = await addFile(path);
    const r = await convertTo(row, to);
    const entry = { from: input.from, to, file: input.file, ms: r.ms, fallback: r.fallback };
    if (!r.offered) entry.status = "not-offered";
    else if (r.error) Object.assign(entry, { status: "fail", detail: r.error });
    else {
      try {
        if (input.from === "pdf") {
          const files = Object.entries(unzipSync(new Uint8Array(r.buf)));
          const infos = await Promise.all(files.map(([, d]) => inspectImage(Buffer.from(d))));
          const ok = files.length === input.pages && infos.every((i) => i.format === to);
          Object.assign(entry, {
            status: ok ? "ok" : "fail",
            detail: `ZIP con ${files.length} imágenes ${[...new Set(infos.map((i) => `${i.format} ${i.width}×${i.height}`))].join(", ")}`,
          });
        } else {
          const info = await inspectImage(r.buf);
          const [w, h] = input.size;
          // ICO is a square multi-size icon by design (fit inside, padded).
          const sameSize =
            to === "pdf" ? info.pages === 1 : to === "ico" ? info.width === info.height : info.width === w && info.height === h;
          const formatOk = info.format === to;
          entry.status = formatOk ? (sameSize ? "ok" : "partial") : "fail";
          entry.detail =
            to === "pdf"
              ? `${info.pages} página(s) ${info.width}×${info.height} pt`
              : `${info.format} ${info.width}×${info.height}${info.entries ? ` (${info.entries} tamaños)` : ""}`;
        }
      } catch (e) {
        Object.assign(entry, { status: "fail", detail: `salida ilegible: ${e.message}` });
      }
      entry.bytes = r.buf.length;
    }
    results.push(entry);
    console.log(`${entry.status.padEnd(11)} ${input.from} → ${to}  ${entry.detail ?? ""} ${entry.ms ?? ""}ms${entry.fallback ? " [pidió servidor]" : ""}`);
  }
}

const errors = [];
if (!only) {
  for (const path of corrupt) {
    await freshPage();
    const row = await addFile(path);
    await page.locator('input[name="target"]').first().waitFor({ state: "attached", timeout: 3000 }).catch(() => {});
    const unsupported = (await row.innerText()).includes("no compatible") || (await page.locator('input[name="target"]').count()) === 0;
    let entry;
    if (unsupported) entry = { file: basename(path), status: "rejected", detail: (await row.locator(".text-danger").allInnerTexts()).join(" ").trim() };
    else {
      const to = (await page.locator('input[name="target"]').first().getAttribute("value"));
      const r = await convertTo(row, to);
      entry = r.error
        ? { file: basename(path), to, status: "error-shown", detail: r.error, fallback: r.fallback }
        : { file: basename(path), to, status: "produced-output", detail: `${r.buf.length} bytes` };
    }
    errors.push(entry);
    console.log(`${entry.status.padEnd(15)} ${entry.file} ${entry.to ?? ""} ${entry.detail}${entry.fallback ? " [pidió servidor]" : ""}`);
  }
}

await browser.close();
const out = opt("--json");
if (out) writeFileSync(out, JSON.stringify({ results, errors, pageErrors: consoleErrors }, null, 2));
const bad = results.filter((r) => r.status !== "ok").length + errors.filter((e) => e.status === "produced-output").length;
console.log(`\n${results.length} conversiones, ${results.filter((r) => r.status === "ok").length} ok; ${errors.length} corruptos; errores de página: ${consoleErrors.length}`);
process.exitCode = bad ? 1 : 0;
