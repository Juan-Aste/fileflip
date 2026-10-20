// Browser inventory of the PDF tools (phase 3 audit): runs each tool page
// with the fixtures, downloads the result and checks it with pdf-lib (pages,
// rotation, size) and pdf.js (text of each page, to verify order). The
// server API is blocked: these tools must work entirely in the browser.
//   node scripts/audit/pdf-tools.mjs [--json out.json]
// BASE_URL and CHROME_PATH as in scripts/audit/browser.mjs.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const executablePath =
  process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const argv = process.argv.slice(2);
const out = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : undefined;
const fx = (name) => join("tests/fixtures", name);

/** Page count, rotations, sizes and the "page N of M" label of each page. */
async function inspectPdf(buf) {
  const doc = await PDFDocument.load(buf);
  const pages = doc.getPages();
  const js = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const labels = [];
  for (let i = 1; i <= js.numPages; i++) {
    const text = (await (await js.getPage(i)).getTextContent()).items.map((t) => t.str).join(" ");
    labels.push(text.match(/page (\d+ of \d+)/)?.[1] ?? "?");
  }
  return {
    pages: pages.length,
    rotations: pages.map((p) => p.getRotation().angle),
    sizes: [...new Set(pages.map((p) => p.getSize()).map(({ width, height }) => `${Math.round(width)}×${Math.round(height)}`))],
    labels,
    images: (buf.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length,
  };
}

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const serverCalls = [];
await context.route("**/api/convert/**", (route) => {
  serverCalls.push(route.request().url());
  return route.abort();
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

async function open(slug, files) {
  await page.goto(`${base}/es/${slug}`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files.map(fx));
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 15000 });
}

// Next.js adds an empty role="alert" route announcer outside <main>.
const toolAlert = () => page.locator("main [role=alert]");
const choose = (label) => page.locator("label").filter({ hasText: label }).first().click();

/** Clicks the action and returns the downloaded file, or the alert text. */
async function run(action) {
  const started = Date.now();
  await page.getByRole("button", { name: action, exact: true }).click();
  const link = page.locator("a[download]");
  const alert = toolAlert();
  await Promise.race([link.waitFor({ timeout: 30000 }), alert.first().waitFor({ timeout: 30000 })]);
  const ms = Date.now() - started;
  if (!(await link.count())) return { error: (await alert.first().innerText()).trim(), ms };
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  return { buf: readFileSync(await download.path()), name: download.suggestedFilename(), ms };
}

const cases = [
  {
    tool: "merge-pdf",
    name: "Unir document.pdf (3) + document-1page.pdf (1)",
    async go() {
      await open("unir-pdf", ["document.pdf", "document-1page.pdf"]);
      return run("Unir PDF");
    },
    check: (i) => i.pages === 4 && i.labels.join() === "1 of 3,2 of 3,3 of 3,1 of 1",
  },
  {
    tool: "merge-pdf",
    name: "Unir con el orden cambiado (bajar el primero)",
    async go() {
      await open("unir-pdf", ["document.pdf", "document-1page.pdf"]);
      await page.getByRole("button", { name: "Bajar document.pdf" }).click();
      return run("Unir PDF");
    },
    check: (i) => i.labels.join() === "1 of 1,1 of 3,2 of 3,3 of 3",
  },
  {
    tool: "split-pdf",
    name: "Dividir: cada página en un PDF (ZIP)",
    zip: true,
    async go() {
      await open("dividir-pdf", ["document.pdf"]);
      return run("Dividir PDF");
    },
    check: (parts) => parts.length === 3 && parts.every((p, n) => p.pages === 1 && p.labels[0] === `${n + 1} of 3`),
  },
  {
    tool: "split-pdf",
    name: "Dividir: extraer 1,3 en un solo PDF",
    async go() {
      await open("dividir-pdf", ["document.pdf"]);
      await choose("Extraer páginas en un solo PDF");
      await page.getByRole("textbox", { name: "Páginas" }).fill("1, 3");
      return run("Dividir PDF");
    },
    check: (i) => i.pages === 2 && i.labels.join() === "1 of 3,3 of 3",
  },
  {
    tool: "split-pdf",
    name: "Dividir: rangos 1-2, 3 (ZIP)",
    zip: true,
    async go() {
      await open("dividir-pdf", ["document.pdf"]);
      await choose("Un PDF por cada rango");
      await page.getByRole("textbox", { name: "Páginas" }).fill("1-2, 3");
      return run("Dividir PDF");
    },
    check: (parts) => parts.length === 2 && parts[0].pages === 2 && parts[1].labels.join() === "3 of 3",
  },
  {
    tool: "rotate-pdf",
    name: "Rotar todas 90° a la derecha",
    async go() {
      await open("rotar-pdf", ["document.pdf"]);
      return run("Rotar PDF");
    },
    check: (i) => i.pages === 3 && i.rotations.every((r) => r === 90),
  },
  {
    tool: "rotate-pdf",
    name: "Rotar solo la página 2, 180°",
    async go() {
      await open("rotar-pdf", ["document.pdf"]);
      await choose("180°");
      await choose("Solo algunas");
      await page.getByRole("textbox", { name: "Páginas" }).fill("2");
      return run("Rotar PDF");
    },
    check: (i) => i.rotations.join() === "0,180,0",
  },
  {
    tool: "organize-pdf",
    name: "Ordenar: mover 1 después, girar la 3, eliminar la 2",
    async go() {
      await open("ordenar-pdf", ["document.pdf"]);
      await page.getByRole("button", { name: "Mover página 1 después" }).waitFor({ timeout: 20000 });
      await page.getByRole("button", { name: "Mover página 1 después" }).click();
      await page.getByRole("button", { name: "Girar página 3" }).click();
      // After the move the original page 2 is first: delete it.
      await page.getByRole("button", { name: "Eliminar página 2" }).click();
      return run("Guardar PDF");
    },
    check: (i) => i.pages === 2 && i.labels.join() === "1 of 3,3 of 3" && i.rotations.join() === "0,90",
  },
  {
    tool: "images-to-pdf",
    name: "Imágenes a PDF: JPG + PNG + HEIC (A4 por defecto, horizontal)",
    async go() {
      await open("imagenes-a-pdf", ["image.jpg", "image.png", "photo.heic"]);
      return run("Crear PDF");
    },
    check: (i) => i.pages === 3 && i.images >= 3 && i.sizes.join() === "842×595",
  },
  {
    tool: "images-to-pdf",
    name: "Imágenes a PDF: WEBP + GIF, igual a la imagen, sin margen",
    async go() {
      await open("imagenes-a-pdf", ["image.webp", "image.gif"]);
      await choose("Igual a la imagen");
      await choose("Sin margen");
      return run("Crear PDF");
    },
    check: (i) => i.pages === 2 && i.sizes.join() === "160×120",
  },
  {
    tool: "compress-pdf",
    name: "Comprimir document-images.pdf (recomendado)",
    async go() {
      await open("comprimir-pdf", ["document-images.pdf"]);
      return run("Comprimir PDF");
    },
    check: (i, buf) => i.pages === 2 && i.images >= 1 && buf.length < statSync(fx("document-images.pdf")).size,
  },
  {
    tool: "compress-pdf",
    name: "Comprimir document-images.pdf (fuerte)",
    async go() {
      await open("comprimir-pdf", ["document-images.pdf"]);
      await choose("Fuerte");
      return run("Comprimir PDF");
    },
    check: (i, buf) => i.pages === 2 && buf.length < statSync(fx("document-images.pdf")).size,
  },
  // Corrupt inputs: each must end in a visible error, never a download.
  ...[
    ["merge-pdf", "unir-pdf", ["document.pdf", "corrupt/garbage.pdf"], "Unir PDF"],
    ["merge-pdf", "unir-pdf", ["document.pdf", "corrupt/truncated.pdf"], "Unir PDF"],
    ["split-pdf", "dividir-pdf", ["corrupt/garbage.pdf"], "Dividir PDF"],
    ["rotate-pdf", "rotar-pdf", ["corrupt/truncated.pdf"], "Rotar PDF"],
    ["organize-pdf", "ordenar-pdf", ["corrupt/garbage.pdf"], "Guardar PDF"],
    ["compress-pdf", "comprimir-pdf", ["corrupt/truncated.pdf"], "Comprimir PDF"],
    ["images-to-pdf", "imagenes-a-pdf", ["image.png", "corrupt/truncated.png"], "Crear PDF"],
  ].map(([tool, slug, files, action]) => ({
    tool,
    name: `Corrupto: ${files.join(" + ")}`,
    corrupt: true,
    async go() {
      await open(slug, files);
      await page.waitForTimeout(1500);
      // A broken file may be flagged on load, before any action.
      const alert = toolAlert();
      if (await alert.count()) return { error: (await alert.first().innerText()).trim(), early: true };
      const button = page.getByRole("button", { name: action, exact: true });
      if (await button.isDisabled()) return { error: "botón deshabilitado", early: true };
      return run(action);
    },
  })),
];

const results = [];
for (const c of cases) {
  const before = serverCalls.length;
  let entry = { tool: c.tool, name: c.name };
  try {
    const r = await c.go();
    entry.ms = r.ms;
    if (c.corrupt) {
      entry.status = r.error ? "ok" : "fail";
      entry.detail = r.error ? `error visible: ${r.error}` : `generó ${r.name} (${r.buf.length} bytes)`;
    } else if (r.error) {
      Object.assign(entry, { status: "fail", detail: r.error });
    } else if (c.zip) {
      const parts = [];
      for (const [, data] of Object.entries(unzipSync(new Uint8Array(r.buf))).sort(([a], [b]) => a.localeCompare(b))) {
        parts.push(await inspectPdf(Buffer.from(data)));
      }
      entry.status = c.check(parts) ? "ok" : "fail";
      entry.detail = `ZIP: ${parts.map((p) => `[${p.labels.join(", ")}]`).join(" ")}`;
    } else {
      const info = await inspectPdf(r.buf);
      entry.status = c.check(info, r.buf) ? "ok" : "fail";
      entry.detail = `${info.pages} pág. [${info.labels.join(", ")}] rot ${info.rotations.join("/")} ${info.sizes.join(" ")} ${r.buf.length} bytes`;
    }
  } catch (e) {
    Object.assign(entry, { status: "fail", detail: e.message.split("\n")[0] });
  }
  entry.server = serverCalls.length > before;
  results.push(entry);
  console.log(`${entry.status.padEnd(5)} ${entry.name} — ${entry.detail} ${entry.ms ?? ""}ms${entry.server ? " [pidió servidor]" : ""}`);
}

await browser.close();
if (out) writeFileSync(out, JSON.stringify({ results, pageErrors }, null, 2));
const failed = results.filter((r) => r.status !== "ok" || r.server).length;
console.log(`\n${results.length} casos, ${results.length - failed} ok; errores de página: ${pageErrors.length}`);
process.exitCode = failed ? 1 : 0;
