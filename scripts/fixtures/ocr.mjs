// OCR fixtures: our own sentences rendered as images with sharp (librsvg),
// so the expected text is known exactly: `node scripts/fixtures/ocr.mjs`.
//
// - ocr-es.png, ocr-es.tiff: Spanish paragraph (accents, ñ, ¿?, numbers), clean, black on white (TIFF: 1 bit, CCITT G4).
// - ocr-en.jpg: English text slightly rotated, grey background, noise and JPEG at 80 %, like a phone photo.
// - ocr-zh.png: simplified Chinese (needs a CJK font installed when regenerating, e.g. WenQuanYi Zen Hei).
// - ocr-blank.png: an image with no text at all.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import sharp from "sharp";

const out = new URL("../../tests/fixtures/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const write = (name, bytes) => {
  writeFileSync(join(out, name), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
};

export const OCR_TEXT = {
  es: ["El pingüino Ñandú comió", "kiwi y papaya en enero.", "¿Cuánto cuesta? 1.250 pesos."],
  en: ["The quick brown fox", "jumps over the lazy dog", "Invoice 4821 due in May"],
  zh: ["今天天气很好", "我们去公园散步"],
};

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function svg(lines, { width, size, family, background = "#ffffff", color = "#111111" }) {
  const lineHeight = Math.round(size * 1.5);
  const height = lineHeight * lines.length + size * 2;
  const text = lines
    .map((line, i) => `<text x="${size}" y="${size * 1.6 + i * lineHeight}" font-family="${family}" font-size="${size}" fill="${color}">${escape(line)}</text>`)
    .join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/>${text}</svg>`);
}

const es = svg(OCR_TEXT.es, { width: 900, size: 44, family: "DejaVu Sans" });
write("ocr-es.png", await sharp(es).png({ compressionLevel: 9, palette: true }).toBuffer());
// The same page as a 1-bit fax-style TIFF, as many scanners save it.
write("ocr-es.tiff", await sharp(es).flatten({ background: "#ffffff" }).threshold(128).toColourspace("b-w").tiff({ compression: "ccittfax4", bitdepth: 1 }).toBuffer());

// Photo-like: grey paper, slight rotation, noise, blur and JPEG compression.
const en = await sharp(svg(OCR_TEXT.en, { width: 820, size: 46, family: "Liberation Serif", background: "#d9d4c7", color: "#222222" }))
  .rotate(2.5, { background: "#cfc9bb" })
  .png()
  .toBuffer();
const { width, height } = await sharp(en).metadata();
const noise = Buffer.alloc(width * height * 3);
let seed = 7;
for (let i = 0; i < noise.length; i++) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  noise[i] = 128 + ((seed >> 16) % 41) - 20;
}
const noisy = await sharp(en)
  .composite([{ input: await sharp(noise, { raw: { width, height, channels: 3 } }).png().toBuffer(), blend: "overlay" }])
  .blur(0.6)
  .jpeg({ quality: 80 })
  .toBuffer();
write("ocr-en.jpg", noisy);

write("ocr-zh.png", await sharp(svg(OCR_TEXT.zh, { width: 520, size: 48, family: "WenQuanYi Zen Hei" })).png({ compressionLevel: 9, palette: true }).toBuffer());
write("ocr-blank.png", await sharp({ create: { width: 400, height: 300, channels: 3, background: "#f4f1ea" } }).png().toBuffer());

// A scanned document: page 1 is the Spanish page as an image (A4), page 2 the
// English photo on a page with /Rotate 90 (the image drawn sideways so it reads
// upright), page 3 real digital text (must be left alone by OCR).
const pdf = await PDFDocument.create();
const A4 = [595.28, 841.89];
const esImage = await pdf.embedPng(await sharp(es).flatten({ background: "#ffffff" }).greyscale().png().toBuffer());
const p1 = pdf.addPage(A4);
p1.drawImage(esImage, { x: 40, y: A4[1] - 40 - esImage.height * 0.55, width: esImage.width * 0.55, height: esImage.height * 0.55 });
const enImage = await pdf.embedJpg(noisy);
const p2 = pdf.addPage(A4);
p2.setRotation(degrees(90));
// Rotated page: seen in landscape; draw the image turned 90° counter-clockwise so it is upright for the reader.
const scale = 0.6;
p2.drawImage(enImage, { x: 60 + enImage.height * scale, y: 60, width: enImage.width * scale, height: enImage.height * scale, rotate: degrees(90) });
const p3 = pdf.addPage(A4);
p3.drawText("Texto digital existente en la tercera pagina.", { x: 60, y: 700, size: 16, font: await pdf.embedFont(StandardFonts.Helvetica) });
pdf.setTitle("Fileflect OCR test");
write("scan-text.pdf", await pdf.save());
