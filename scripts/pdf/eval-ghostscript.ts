// Evaluation for task 12.5: does Ghostscript (pdfwrite) compress PDFs meaningfully
// more than our own image re-encoding, without losing selectable text?
// Usage: npx vite-node scripts/pdf/eval-ghostscript.ts
// Needs the `gs` binary (same pdfwrite engine the WASM builds compile) and
// poppler-utils (pdftotext, pdftoppm). Results are copied to docs/pdf-ghostscript-eval.md.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { compressPdf, type CompressionLevel, type Recompressor } from "../../src/lib/pdf/compress";

const dir = mkdtempSync(join(tmpdir(), "gs-eval-"));
const LOREM =
  "El informe trimestral muestra que las ventas crecieron en todas las regiones gracias a la nueva linea de productos y a la mejora en la logistica de distribucion. ";

// Deterministic pseudo-random so runs are comparable.
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

async function photo(w: number, h: number) {
  // Smooth "scene" (gradient + blurred blobs) plus sensor-like noise: compresses like a camera photo.
  const blobs = Array.from({ length: 30 }, () => {
    const c = `rgb(${Math.floor(rand() * 255)},${Math.floor(rand() * 255)},${Math.floor(rand() * 255)})`;
    return `<circle cx="${rand() * w}" cy="${rand() * h}" r="${(0.05 + rand() * 0.25) * w}" fill="${c}" opacity="0.6"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a7fb5"/><stop offset="1" stop-color="#e8c07a"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="${w / 80}"/></filter></defs><rect width="100%" height="100%" fill="url(#g)"/><g filter="url(#b)">${blobs}</g></svg>`;
  const base = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  for (let i = 0; i < base.length; i++) base[i] = Math.max(0, Math.min(255, base[i] + (rand() - 0.5) * 24));
  return sharp(base, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

async function scan(page: number) {
  // A4 at 300 dpi, grayscale, printed text with paper noise: like a scanner capture.
  const w = 2480;
  const h = 3508;
  const lines = Array.from(
    { length: 60 },
    (_, i) =>
      `<text x="200" y="${300 + i * 52}" font-family="DejaVu Serif" font-size="34">${LOREM.slice((i * 7) % 40, ((i * 7) % 40) + 95)}</text>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f4f1ea"/><text x="200" y="200" font-family="DejaVu Serif" font-size="60">Pagina ${page}</text>${lines}</svg>`;
  const base = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
  for (let i = 0; i < base.length; i++) base[i] = Math.max(0, Math.min(255, base[i] + (rand() - 0.5) * 30));
  return sharp(base, { raw: { width: w, height: h, channels: 1 } }).jpeg({ quality: 85 }).toBuffer();
}

type Kind = "scanned" | "photos" | "mixed" | "text";

async function build(kind: Kind) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = kind === "text" ? 12 : 4;
  for (let p = 1; p <= pages; p++) {
    const page = doc.addPage([595, 842]);
    if (kind === "scanned") {
      page.drawImage(await doc.embedJpg(await scan(p)), { x: 0, y: 0, width: 595, height: 842 });
      // Invisible OCR-like text layer, as our OCR tool produces.
      page.drawText(`Pagina ${p} texto reconocido seleccionable`, { x: 48, y: 790, size: 12, font, opacity: 0 });
    } else if (kind === "photos") {
      page.drawImage(await doc.embedJpg(await photo(4000, 3000)), { x: 30, y: 300, width: 535, height: 401 });
      page.drawText(`Foto ${p}: vista del deposito central`, { x: 30, y: 270, size: 14, font });
    } else {
      page.drawText(`Seccion ${p}`, { x: 50, y: 790, size: 20, font, color: rgb(0.1, 0.2, 0.5) });
      const words = LOREM.repeat(30).split(" ");
      for (let l = 0; l < (kind === "mixed" ? 18 : 55); l++) {
        page.drawText(words.slice(l * 12, l * 12 + 12).join(" "), { x: 50, y: 760 - l * 13, size: 10, font });
      }
      if (kind === "mixed") {
        page.drawImage(await doc.embedJpg(await photo(2000, 1500)), { x: 50, y: 230, width: 240, height: 180 });
        const png = await doc.embedPng(await sharp(await photo(1200, 900)).png().toBuffer());
        page.drawImage(png, { x: 305, y: 230, width: 240, height: 180 });
      }
    }
  }
  return doc.save();
}

// Node stand-in for browserRecompress: same encoder family (sharp ships mozjpeg).
const recompress: Recompressor = async (image, { maxSide, quality }) => {
  const input =
    image.kind === "jpeg"
      ? sharp(image.bytes)
      : sharp(image.data, { raw: { width: image.width, height: image.height, channels: image.gray ? 1 : 3 } });
  const { data, info } = await input
    .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height };
};

const text = (file: string) => execFileSync("pdftotext", [file, "-"]).toString().replace(/\s+/g, " ").trim();

async function psnr(a: string, b: string) {
  const render = async (f: string) => {
    execFileSync("pdftoppm", ["-r", "100", "-f", "1", "-l", "1", "-png", "-singlefile", f, f]);
    return sharp(`${f}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  };
  const [x, y] = [await render(a), await render(b)];
  if (x.data.length !== y.data.length) return NaN;
  let mse = 0;
  for (let i = 0; i < x.data.length; i++) mse += (x.data[i] - y.data[i]) ** 2;
  mse /= x.data.length;
  return mse === 0 ? Infinity : 10 * Math.log10(255 ** 2 / mse);
}

function ghostscript(inFile: string, args: string[]) {
  const out = `${inFile}.gs.pdf`;
  const t = performance.now();
  execFileSync("gs", ["-sDEVICE=pdfwrite", "-dNOPAUSE", "-dBATCH", "-dQUIET", "-dSAFER", ...args, `-sOutputFile=${out}`, inFile]);
  return { bytes: new Uint8Array(readFileSync(out)), ms: performance.now() - t };
}

const GS: Record<string, string[]> = {
  "gs /printer (300 dpi)": ["-dPDFSETTINGS=/printer"],
  "gs /ebook (150 dpi)": ["-dPDFSETTINGS=/ebook"],
  "gs /screen (72 dpi)": ["-dPDFSETTINGS=/screen"],
};

console.log(`Ghostscript ${execFileSync("gs", ["--version"]).toString().trim()}\n`);
const rows = [
  "| PDF | método | tamaño | vs. original | vs. nuestro «strong» | texto igual | PSNR pág. 1 (dB) | tiempo |",
  "|---|---|---|---|---|---|---|---|",
];
for (const kind of ["scanned", "photos", "mixed", "text"] as const) {
  const input = await build(kind);
  const inFile = join(dir, `${kind}.pdf`);
  writeFileSync(inFile, input);
  const ref = text(inFile);
  const results: { label: string; bytes: Uint8Array; ms: number }[] = [];
  for (const level of ["low", "recommended", "strong"] as CompressionLevel[]) {
    const t = performance.now();
    const { bytes } = await compressPdf(input, level, recompress);
    results.push({ label: `actual «${level}»`, bytes, ms: performance.now() - t });
  }
  for (const [label, args] of Object.entries(GS)) results.push({ label, ...ghostscript(inFile, args) });
  const strong = results.find((r) => r.label === "actual «strong»")!.bytes.length;
  rows.push(`| ${kind} | original | ${(input.length / 1024).toFixed(0)} KB | — | — | — | — | — |`);
  for (const r of results) {
    const f = join(dir, `${kind}-${r.label.replace(/\W+/g, "_")}.pdf`);
    writeFileSync(f, r.bytes);
    const same = text(f) === ref ? "sí" : "NO";
    const q = await psnr(inFile, f);
    rows.push(
      `| ${kind} | ${r.label} | ${(r.bytes.length / 1024).toFixed(0)} KB | ${(100 * (1 - r.bytes.length / input.length)).toFixed(1)} % | ${(100 * (1 - r.bytes.length / strong)).toFixed(1)} % | ${same} | ${q.toFixed(1)} | ${(r.ms / 1000).toFixed(1)} s |`,
    );
  }
}
console.log(rows.join("\n"));
console.log(`\nFiles in ${dir}`);
