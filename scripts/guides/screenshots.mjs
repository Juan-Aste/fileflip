// Real screenshots of our tools for the guides (public/guides/*.webp) and their
// sizes (src/content/guides/images.json), taken against a running `next start`.
// Usage:
//   node scripts/guides/screenshots.mjs [name ...]
// BASE_URL defaults to http://localhost:3000; CHROME_PATH to the Playwright
// Chromium preinstalled in the cloud environment. Without names, every shot is
// taken again. Sample files are generated on the fly (nothing personal).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const executablePath = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const outDir = "public/guides";
const manifestPath = "src/content/guides/images.json";
const fixtures = "tests/fixtures";
const work = mkdtempSync(join(tmpdir(), "guides-"));

/** The tool block (drop zone, options and results), not the whole page. */
const toolBlock = (page) => page.locator("[data-guide-col]").locator(":scope > *").nth(shotIndex);
let shotIndex = 0;

async function pick(page, files) {
  // Mark the block that holds the drop zone before it changes: the child of
  // the page column (the one with the title) that contains the file input.
  await page
    .evaluate(() => {
      let el = document.querySelector('input[type="file"]');
      while (el.parentElement && !el.parentElement.querySelector(":scope > header, :scope > div > header")) el = el.parentElement;
      el.parentElement.setAttribute("data-guide-col", "");
      return [...el.parentElement.children].indexOf(el);
    })
    .then((i) => (shotIndex = i));
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 15_000 });
}

/** Gaussian-like sensor noise around mid gray, the same on every run. */
function seededNoise(width, height) {
  const data = Buffer.alloc(width * height * 3);
  let seed = 20261028;
  const random = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(128 + (random() + random() + random() - 1.5) * 36)));
  return data;
}

/** A 4-page PDF of phone photos of a contract (uneven light, noise), like a real one. */
async function photoContractPdf(browser) {
  const page = await browser.newPage({
    viewport: { width: 756, height: 1008 },
    deviceScaleFactor: 4,
  });
  const clause =
    "Por medio del presente, las partes acuerdan las condiciones del servicio descritas a continuación. El prestador se compromete a entregar los trabajos en los plazos indicados y el cliente a abonar los importes en las fechas pactadas.";
  const doc = await PDFDocument.create();
  for (let n = 1; n <= 4; n++) {
    const paragraphs = Array.from({ length: 7 }, (_, i) => `<p>${i + 1}. ${clause}</p>`).join("");
    await page.setContent(
      `<body style="margin:60px;font:15px/1.6 serif;background:#f4f1ea;color:#222"><h2>Contrato de servicios — página ${n}</h2>${paragraphs}<p style="margin-top:40px">Firma: ____________________</p></body>`,
    );
    const png = await page.screenshot();
    const { width, height } = await sharp(png).metadata();
    const noise = await sharp(seededNoise(width, height), { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer();
    const shade = Buffer.from(
      `<svg width="${width}" height="${height}"><defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    const jpg = await sharp(png)
      .blur(0.8)
      .composite([{ input: noise, blend: "overlay" }, { input: shade }])
      .jpeg({ quality: 92 })
      .toBuffer();
    doc.addPage([595.28, 841.89]).drawImage(await doc.embedJpg(jpg), {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });
  }
  await page.close();
  const file = join(work, "contrato-fotos.pdf");
  writeFileSync(file, await doc.save());
  console.log(`sample: ${file}`);
  return file;
}

// name → steps that leave the page ready for the shot; returns the element to capture.
const shots = {
  "pdf-a-word-convertir": async (page) => {
    await page.goto(`${base}/es/pdf-a-word`, { waitUntil: "networkidle" });
    await pick(page, [join(fixtures, "document.pdf")]);
    return toolBlock(page);
  },
  "pdf-a-word-resultado": async (page) => {
    await page.goto(`${base}/es/pdf-a-word`, { waitUntil: "networkidle" });
    await pick(page, [join(fixtures, "document.pdf")]);
    await page.getByRole("button", { name: "Convertir", exact: true }).click();
    await page.locator("a[download]").first().waitFor({ timeout: 60_000 });
    return toolBlock(page);
  },
  "formatos-convertir": async (page) => {
    await page.goto(`${base}/es/jpg-a-webp`, { waitUntil: "networkidle" });
    await pick(page, [join(fixtures, "photo.jpg"), join(fixtures, "image.jpg")]);
    await page
      .getByText("Opciones", { exact: true })
      .first()
      .click()
      .catch(() => {});
    return toolBlock(page);
  },
  "comprimir-pdf-resultado": async (page, browser) => {
    const file = await photoContractPdf(browser);
    await page.goto(`${base}/es/comprimir-pdf`, { waitUntil: "networkidle" });
    await pick(page, [file]);
    await page.locator("label").filter({ hasText: "Recomendada" }).first().click();
    await page.getByRole("button", { name: "Comprimir PDF", exact: true }).click();
    await page.locator("main a[download]").first().waitFor({ timeout: 120_000 });
    return toolBlock(page);
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(shots);
mkdirSync(outDir, { recursive: true });
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 1000, height: 900 },
  deviceScaleFactor: 1.5,
  colorScheme: "light",
  locale: "es-ES",
});
for (const name of names) {
  if (!shots[name]) throw new Error(`Unknown shot: ${name}`);
  const page = await context.newPage();
  const target = await shots[name](page, browser);
  await page.evaluate(() => document.fonts.ready);
  // Let progress bars and the result animation settle.
  await page.waitForTimeout(600);
  // No ad slots in the screenshots.
  await page.evaluate(() => document.querySelectorAll("aside, [aria-hidden='true']:has(> span.invisible)").forEach((el) => el.remove()));
  const png = await target.screenshot({ animations: "disabled" });
  const webp = await sharp(png).webp({ quality: 82 }).toBuffer();
  const { width, height } = await sharp(webp).metadata();
  writeFileSync(join(outDir, `${name}.webp`), webp);
  // Displayed at CSS size (the page shows them at most 768 px wide).
  manifest[name] = {
    width: Math.round(width / 1.5),
    height: Math.round(height / 1.5),
  };
  console.log(`${name}.webp ${width}×${height} ${Math.round(webp.length / 1024)} KB`);
  await page.close();
}
await browser.close();
writeFileSync(manifestPath, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
