// Hard real-world files for the edge-case audit (6E in PLAN.md), generated
// into tests/fixtures/edge/ (git-ignored: some are tens of MB):
//   node scripts/fixtures/edge.mjs [--out dir]
// Everything is synthetic (gradients, noise and our own filler text): no
// personal data, no third-party content. Prints a JSON manifest.
import { copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, "..", "..");
const fixtures = join(root, "tests", "fixtures");
const outArg = process.argv.indexOf("--out");
const out = outArg > 0 ? process.argv[outArg + 1] : join(fixtures, "edge");
const MB = 1024 * 1024;
/** Same numbers as src/config/limits.ts (free plan). */
const SERVER_MAX = 15 * MB;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const manifest = {};
const put = (name, bytes, note) => {
  writeFileSync(join(out, name), bytes);
  manifest[name] = { bytes: statSync(join(out, name)).size, note };
};

/** A phone-like photo: smooth sky, a horizon and sensor noise, so JPEG sizes are realistic. */
async function phonePhoto(width, height) {
  const sky = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b6fb6"/><stop offset="0.6" stop-color="#f3c58b"/><stop offset="1" stop-color="#2f4a2a"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="${width * 0.7}" cy="${height * 0.35}" r="${height * 0.08}" fill="#fff3c4"/>
      <text x="${width * 0.05}" y="${height * 0.12}" font-size="${height * 0.06}" font-family="sans-serif" fill="#ffffff">TOP ↑</text>
    </svg>`,
  );
  const noise = await sharp({
    create: { width, height, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 18 } },
  })
    .png()
    .toBuffer();
  return sharp(sky).composite([{ input: noise, blend: "overlay" }]);
}

// Phone photos: stored sideways with EXIF orientation 6 (the usual portrait
// shot), at 12, 24 and 48 MP.
for (const [mp, w, h] of [
  [12, 4000, 3000],
  [24, 6000, 4000],
  [48, 8000, 6000],
]) {
  const jpg = await (await phonePhoto(w, h)).jpeg({ quality: 90 }).withMetadata({ orientation: 6 }).toBuffer();
  put(`phone-${mp}mp-orientation6.jpg`, jpg, `${w}×${h} JPEG, EXIF orientation 6 (shows as ${h}×${w})`);
}
put(
  "phone-12mp.png",
  await (await phonePhoto(4000, 3000)).png({ compressionLevel: 3 }).toBuffer(),
  "4000×3000 PNG (big uncompressed source)",
);
// sharp's prebuilt libvips can't encode HEVC: HEIC stays the small
// tests/fixtures/photo.heic made with pillow-heif.

// PDFs: many pages, a scan (images only), and one with a password (qpdf).
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 500; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${i} of 500`, { x: 50, y: 780, size: 24, font });
    page.drawText("Synthetic filler text for the page-count audit.", { x: 50, y: 740, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
  }
  put("many-pages-500.pdf", await doc.save(), "500 A4 pages of text");
}
{
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const scan = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754">
          <rect width="100%" height="100%" fill="#f4f1ea"/>
          <text x="120" y="220" font-size="64" font-family="serif" fill="#222">Scanned page ${i}</text>
          <text x="120" y="340" font-size="40" font-family="serif" fill="#333">El veloz murciélago hindú comía feliz cardillo y kiwi.</text>
          <text x="120" y="420" font-size="40" font-family="serif" fill="#333">The quick brown fox jumps over the lazy dog.</text>
        </svg>`,
      ),
    )
      .rotate(0.7, { background: "#f4f1ea" })
      .jpeg({ quality: 70 })
      .toBuffer();
    const image = await doc.embedJpg(scan);
    doc.addPage([595, 842]).drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }
  put("scanned-5-pages.pdf", await doc.save(), "5 pages that are only a 150 dpi JPEG each (no text layer), slightly rotated");
}
{
  const qpdfJs = require.resolve("@neslinesli93/qpdf-wasm");
  const create = require(qpdfJs);
  const qpdf = await create({ locateFile: () => join(dirname(qpdfJs), "qpdf.wasm"), print: () => {}, printErr: () => {} });
  qpdf.FS.writeFile("/in.pdf", new Uint8Array(await (await import("node:fs/promises")).readFile(join(fixtures, "document.pdf"))));
  for (const [name, user, note] of [
    ["password-abre123.pdf", "abre123", "document.pdf with AES-256 and open password abre123"],
    ["permissions-only.pdf", "", "document.pdf with AES-256, no open password, printing and copying restricted"],
  ]) {
    const code = qpdf.callMain(["--encrypt", `--user-password=${user}`, "--owner-password=dueño456", "--bits=256", "--print=none", "--extract=n", "--", "/in.pdf", `/${name}`]);
    if (code !== 0) throw new Error(`qpdf exited with ${code}`);
    put(name, qpdf.FS.readFile(`/${name}`), note);
  }
}

// File names: accents, spaces, emoji, very long (and every kind together).
const names = {
  "Fotografía de año nuevo — ñandú.jpg": "image.jpg",
  "my  photo (1) final.png": "image.png",
  "🎉 fiesta 😀.png": "image.png",
  "资料 文档.pdf": "document.pdf",
  [`${"informe-trimestral-".repeat(12)}fin.pdf`]: "document.pdf",
  "archivo.con.muchos.puntos.v2.final.jpg": "image.jpg",
  "SIN EXTENSION": "image.png",
  ".hidden.jpg": "image.jpg",
};
for (const [name, source] of Object.entries(names)) {
  copyFileSync(join(fixtures, source), join(out, name));
  manifest[name] = { bytes: statSync(join(out, name)).size, note: `copy of ${source}` };
}

// Empty files with each family's extension.
for (const ext of ["jpg", "png", "pdf", "docx", "csv", "json", "zip", "epub", "mp3", "mp4", "stl", "dxf", "txt"]) {
  put(`empty.${ext}`, Buffer.alloc(0), "0 bytes");
}

// Extensions that lie about the content.
const lies = {
  "png-named.jpg": "image.png",
  "jpg-named.png": "image.jpg",
  "pdf-named.docx": "document.pdf",
  "docx-named.pdf": "document.docx",
  "zip-named.epub": "archive.zip",
  "mp3-named.wav": "audio.mp3",
  "webm-named.mp4": "video.webm",
  "json-named.csv": "data.json",
};
for (const [name, source] of Object.entries(lies)) {
  copyFileSync(join(fixtures, source), join(out, name));
  manifest[name] = { bytes: statSync(join(out, name)).size, note: `really ${source}` };
}

// Around the free plan's server limit (15 MB). Browser limits (200 MB / 1 GB)
// are tested with in-page File objects instead of files on disk.
const markdown = (size) => {
  const line = "Línea de relleno para el límite de tamaño del servidor.\n";
  return Buffer.from(line.repeat(Math.ceil(size / Buffer.byteLength(line)))).subarray(0, size);
};
put("server-limit-minus-1kb.md", markdown(SERVER_MAX - 1024), "Markdown 1 KB under the free server limit");
put("server-limit-plus-1kb.md", markdown(SERVER_MAX + 1024), "Markdown 1 KB over the free server limit");

console.log(JSON.stringify({ out, files: Object.keys(manifest).length, manifest }, null, 2));
