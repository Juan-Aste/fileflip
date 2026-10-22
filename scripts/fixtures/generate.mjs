// Generates the sample files in tests/fixtures/ (run: node scripts/fixtures/generate.mjs).
// Everything is synthetic (gradients, shapes and our own placeholder text): no
// third-party content and no personal data. Output is deterministic except for
// the office files, which LibreOffice stamps with its own metadata.
//
// Office fixtures (DOCX, XLSX, PPTX, ODT, ODS, ODP, DOC, XLS, PPT, RTF) are
// converted from hand-written flat ODF sources with LibreOffice (`soffice`) when
// it is installed; otherwise they are skipped and the committed files stay.
// photo.heic is not generated here (sharp's prebuilt binaries cannot encode HEIC;
// it was made with pillow-heif, see tests/fixtures/README.md).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";

const out = new URL("../../tests/fixtures/", import.meta.url).pathname;
const corrupt = join(out, "corrupt");
mkdirSync(corrupt, { recursive: true });
const write = (name, bytes) => {
  writeFileSync(join(out, name), bytes);
  console.log(`${name} (${bytes.length} B)`);
};

// --- Source picture: 160×120 RGBA, diagonal gradient, a solid disc and a
// transparent corner, so conversions can check size, colors and alpha.
const W = 160;
const H = 120;
const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const inDisc = (x - 110) ** 2 + (y - 60) ** 2 < 30 ** 2;
    rgba[i] = inDisc ? 242 : Math.round((x / W) * 255);
    rgba[i + 1] = inDisc ? 107 : Math.round((y / H) * 255);
    rgba[i + 2] = inDisc ? 58 : 160;
    rgba[i + 3] = x < 24 && y < 24 ? 0 : 255;
  }
}
const picture = () => sharp(rgba, { raw: { width: W, height: H, channels: 4 } });

write("image.png", await picture().png({ compressionLevel: 9 }).toBuffer());
write("image.jpg", await picture().flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer());
write("image.webp", await picture().webp({ quality: 80 }).toBuffer());
write("image.avif", await picture().avif({ quality: 60 }).toBuffer());
write("image.gif", await picture().gif().toBuffer());
write("image.tiff", await picture().tiff({ compression: "lzw" }).toBuffer());

// BMP: 24-bit bottom-up, rows padded to 4 bytes (alpha flattened on white).
{
  const rowSize = Math.ceil((W * 3) / 4) * 4;
  const bmp = Buffer.alloc(54 + rowSize * H);
  bmp.write("BM", 0, "ascii");
  bmp.writeUInt32LE(bmp.length, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(W, 18);
  bmp.writeInt32LE(H, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(rowSize * H, 34);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = rgba[i + 3] / 255;
      const o = 54 + (H - 1 - y) * rowSize + x * 3;
      bmp[o] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
      bmp[o + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
      bmp[o + 2] = Math.round(rgba[i] * a + 255 * (1 - a));
    }
  }
  write("image.bmp", bmp);
}

// ICO: one 32×32 and one 64×64 PNG entry.
{
  const sizes = [32, 64];
  const pngs = await Promise.all(sizes.map((s) => picture().resize(s, s, { fit: "contain", background: "#0000" }).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, n) => {
    const e = 6 + 16 * n;
    header[e] = s;
    header[e + 1] = s;
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[n].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += pngs[n].length;
  });
  write("image.ico", Buffer.concat([header, ...pngs]));
}

write(
  "image.svg",
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6f6a"/><stop offset="1" stop-color="#5fd4c6"/></linearGradient></defs>` +
      `<rect width="160" height="120" fill="url(#g)"/><circle cx="110" cy="60" r="30" fill="#f26b3a"/></svg>\n`,
  ),
);

// --- PDFs
async function textPdf(pages, { image = false } = {}) {
  const doc = await PDFDocument.create();
  doc.setTitle("Fileflect fixture");
  doc.setProducer("Fileflect fixtures");
  doc.setCreator("Fileflect fixtures");
  doc.setCreationDate(new Date("2026-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2026-01-01T00:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const jpg = image ? await doc.embedJpg(await picture().resize(640, 480).flatten({ background: "#fff" }).jpeg({ quality: 95 }).toBuffer()) : null;
  for (let n = 1; n <= pages; n++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Fileflect sample page ${n} of ${pages}`, { x: 56, y: 770, size: 20, font, color: rgb(0.08, 0.09, 0.12) });
    page.drawText("Synthetic text for automated tests.", { x: 56, y: 740, size: 12, font });
    if (jpg) page.drawImage(jpg, { x: 56, y: 300, width: 480, height: 360 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
const pdf3 = await textPdf(3);
write("document.pdf", pdf3);
write("document-1page.pdf", await textPdf(1));
write("document-images.pdf", await textPdf(2, { image: true }));
// A "scan": one page that is only a picture (no text layer), for PDF → text and OCR.
{
  const doc = await PDFDocument.create();
  doc.setProducer("Fileflect fixtures");
  doc.setCreator("Fileflect fixtures");
  doc.setCreationDate(new Date("2026-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2026-01-01T00:00:00Z"));
  const jpg = await doc.embedJpg(await picture().resize(320, 240).flatten({ background: "#fff" }).jpeg({ quality: 80 }).toBuffer());
  doc.addPage([595, 842]).drawImage(jpg, { x: 100, y: 400, width: 320, height: 240 });
  write("scan.pdf", Buffer.from(await doc.save({ useObjectStreams: false })));
}

// --- Plain text formats
write("text.txt", Buffer.from("Fileflect sample text.\nSegunda línea con acentos: áéíóú ñ ç ü.\n中文示例\n", "utf8"));
write("table.csv", Buffer.from("name,qty,price\nalpha,1,9.50\n\"beta, with comma\",2,3.25\ngamma,3,0\n", "utf8"));
// --- Data formats (JSON, CSV variants)
const records = [
  { id: 1, name: "Ana Pérez", active: true, score: 9.5, address: { city: "Lima", zip: "007" }, tags: ["a", "b"] },
  { id: 2, name: "Zoë \"Z\", Jr.", active: false, score: null, address: { city: "São Paulo", zip: "01000" }, tags: ["c"] },
  { id: 3, name: "李雷", active: true, score: 7, address: { city: "北京", zip: "100000" }, tags: [], note: "line 1\nline 2" },
];
write("data.json", Buffer.from(JSON.stringify(records, null, 2) + "\n", "utf8"));
// Excel on Windows in Spanish: semicolons, decimal commas and Windows-1252 accents.
write("table-excel.csv", Buffer.from("nombre;cantidad;precio\r\nCañón;2;3,25\r\nAçaí;1;9,50\r\n", "latin1"));
write("table.tsv", Buffer.from("name\tqty\nalpha\t1\nbeta\t2\n", "utf8"));
write(
  "config.yaml",
  Buffer.from(
    "# Sample service config\ndefaults: &defaults\n  retries: 3\n  debug: no\nservice:\n  <<: *defaults\n  name: \"web\"\n  ports: [80, 443]\n  zip: \"007\"\n---\nname: second document\n",
    "utf8",
  ),
);
write(
  "config.toml",
  Buffer.from('title = "Fileflect demo"\n\n[owner]\nname = "Ana"\nsince = 2024-05-27\n\n[[servers]]\nip = "10.0.0.1"\nports = [80, 443]\n\n[[servers]]\nip = "10.0.0.2"\nports = [8080]\n', "utf8"),
);


write(
  "catalog.xml",
  Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Sample catalog -->\n<catalog lang="es">\n  <book id="1">\n    <title>Café &amp; té</title>\n    <code>007</code>\n  </book>\n  <book id="2">\n    <title>&#20013;&#25991;</title>\n    <note><![CDATA[<b>raw</b>]]></note>\n  </book>\n</catalog>\n',
    "utf8",
  ),
);

// --- Office documents through LibreOffice
const fodt = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:body><office:text>
<text:h text:outline-level="1">Fileflect sample document</text:h>
<text:p>Synthetic paragraph for automated conversion tests. Acentos: áéíóú ñ.</text:p>
<text:p>Second paragraph.</text:p>
</office:text></office:body></office:document>
`;
const fods = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:body><office:spreadsheet><table:table table:name="Sheet1">
${[["name", "qty", "price"], ["alpha", 1, 9.5], ["beta", 2, 3.25], ["gamma", 3, 0]]
  .map(
    (row) =>
      `<table:table-row>${row
        .map((v) =>
          typeof v === "number"
            ? `<table:table-cell office:value-type="float" office:value="${v}"><text:p>${v}</text:p></table:table-cell>`
            : `<table:table-cell office:value-type="string"><text:p>${v}</text:p></table:table-cell>`,
        )
        .join("")}</table:table-row>`,
  )
  .join("\n")}
</table:table></office:spreadsheet></office:body></office:document>
`;
// Two sheets with formulas, dates, a zero-padded code and non-ASCII text (spreadsheet converter).
const cell = (v) => {
  if (typeof v === "number") return `<table:table-cell office:value-type="float" office:value="${v}"><text:p>${v}</text:p></table:table-cell>`;
  if (v.formula) return `<table:table-cell table:formula="of:=${v.formula}" office:value-type="float" office:value="${v.value}"><text:p>${v.value}</text:p></table:table-cell>`;
  if (v.date) return `<table:table-cell table:style-name="date" office:value-type="date" office:date-value="${v.date}"><text:p>${v.date}</text:p></table:table-cell>`;
  return `<table:table-cell office:value-type="string"><text:p>${v}</text:p></table:table-cell>`;
};
const sheetXml = (name, rows) => `<table:table table:name="${name}">${rows.map((row) => `<table:table-row>${row.map(cell).join("")}</table:table-row>`).join("\n")}</table:table>`;
const fodsWorkbook = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:automatic-styles><number:date-style style:name="iso"><number:year number:style="long"/><number:text>-</number:text><number:month number:style="long"/><number:text>-</number:text><number:day number:style="long"/></number:date-style><style:style style:name="date" style:family="table-cell" style:data-style-name="iso"/></office:automatic-styles>
<office:body><office:spreadsheet>
${sheetXml("Ventas", [
  ["producto", "cantidad", "precio", "total", "fecha"],
  ["Café", 2, 3.25, { formula: "[.B2]*[.C2]", value: 6.5 }, { date: "2024-03-15" }],
  ["北京 té", 1, 9.5, { formula: "[.B3]*[.C3]", value: 9.5 }, { date: "2024-12-01" }],
  ["código", "007", 0.1, { formula: "SUM([.D2:.D3])", value: 16 }, ""],
])}
${sheetXml("Notas", [["nota"], ["segunda hoja ñ"]])}
</office:spreadsheet></office:body></office:document>
`;
const fodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
<office:body><office:presentation>
${[1, 2]
  .map(
    (n) => `<draw:page draw:name="Slide ${n}"><draw:frame svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="3cm"><draw:text-box><text:p>Fileflect slide ${n}</text:p></draw:text-box></draw:frame></draw:page>`,
  )
  .join("\n")}
</office:presentation></office:body></office:document>
`;

const soffice = ["soffice", "libreoffice"].find((bin) => {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
if (!soffice) {
  console.warn("LibreOffice not found: office fixtures skipped (committed files kept).");
} else {
  const work = mkdtempSync(join(tmpdir(), "fixtures-"));
  const profile = `file://${join(work, "profile")}`;
  const sources = { text: [fodt, "fodt"], sheet: [fods, "fods"], workbook: [fodsWorkbook, "fods"], slides: [fodp, "fodp"] };
  const targets = {
    text: [["odt", "document.odt"], ["docx", "document.docx"], ["doc", "document.doc"], ["rtf", "document.rtf"]],
    sheet: [["ods", "spreadsheet.ods"], ["xlsx", "spreadsheet.xlsx"], ["xls", "spreadsheet.xls"]],
    workbook: [["ods", "workbook.ods"], ["xlsx", "workbook.xlsx"]],
    slides: [["odp", "slides.odp"], ["pptx", "slides.pptx"]], // PPT export is ~450 KB: skipped
  };
  for (const [kind, [xml, ext]] of Object.entries(sources)) {
    const src = join(work, `${kind}.${ext}`);
    writeFileSync(src, xml);
    for (const [format, name] of targets[kind]) {
      execFileSync(soffice, [`-env:UserInstallation=${profile}`, "--headless", "--convert-to", format, "--outdir", work, src], { stdio: "ignore" });
      const produced = join(work, `${kind}.${format}`);
      if (!existsSync(produced)) throw new Error(`LibreOffice did not produce ${name}`);
      copyFileSync(produced, join(out, name));
      console.log(`${name} (${readFileSync(produced).length} B)`);
    }
  }
  rmSync(work, { recursive: true, force: true });
}

// --- QR codes: a clean screenshot-like PNG, a "photo" (rotated code on a noisy,
// uneven background, saved as a lossy JPEG) and a light-on-dark code.
const qrSvg = (text, dark, light) => QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark, light } });
write("qr.png", await sharp(Buffer.from(await qrSvg("https://fileflect.example/qr-test?ok=1", "#000000ff", "#ffffffff"))).resize(300, 300, { kernel: "nearest" }).png({ compressionLevel: 9 }).toBuffer());
{
  const code = await sharp(Buffer.from(await qrSvg("WIFI:T:WPA;S:Café 5G;P:secreto123;;", "#1b1b1bff", "#f4f1e8ff")))
    .resize(260, 260, { kernel: "nearest" })
    .rotate(12, { background: "#f4f1e8" })
    .toBuffer();
  const W2 = 640;
  const H2 = 480;
  const bg = Buffer.alloc(W2 * H2 * 3);
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      // Uneven light plus deterministic speckle noise.
      const v = 120 + Math.round((x / W2) * 70 + (y / H2) * 30) + (((x * 7919 + y * 104729) % 23) - 11);
      bg.fill(Math.max(0, Math.min(255, v)), (y * W2 + x) * 3, (y * W2 + x) * 3 + 3);
    }
  }
  write(
    "qr-photo.jpg",
    await sharp(bg, { raw: { width: W2, height: H2, channels: 3 } })
      .composite([{ input: code, left: 330, top: 120 }])
      .blur(0.8)
      .jpeg({ quality: 70 })
      .toBuffer(),
  );
}
write("qr-inverted.png", await sharp(Buffer.from(await qrSvg("Olá, 中文 ✓ 123", "#ffffffff", "#0f2a1dff"))).resize(240, 240, { kernel: "nearest" }).png().toBuffer());

// --- Photo-like pictures for the image compressor: a noisy 1000×750 landscape
// saved at JPEG quality 95 (plenty to compress) and a 360×270 PNG with smooth
// colors and a transparent background (palette reduction must keep the alpha).
{
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const PW = 1000;
  const PH = 750;
  const photo = Buffer.alloc(PW * PH * 3);
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const i = (y * PW + x) * 3;
      const n = (rand() - 0.5) * 8;
      const sky = y < PH * 0.55;
      const sun = (x - 860) ** 2 + (y - 220) ** 2 < 90 ** 2;
      let r = sky ? 90 + (y / PH) * 160 : 60 + Math.sin(x / 37) * 20 + (y / PH) * 40;
      let g = sky ? 140 + (y / PH) * 90 : 110 + Math.cos(y / 23) * 25;
      let b = sky ? 230 - (y / PH) * 60 : 50 + Math.sin((x + y) / 51) * 15;
      if (sun) [r, g, b] = [255, 214, 120];
      photo[i] = clamp(r + n);
      photo[i + 1] = clamp(g + n);
      photo[i + 2] = clamp(b + n);
    }
  }
  write("photo.jpg", await sharp(photo, { raw: { width: PW, height: PH, channels: 3 } }).jpeg({ quality: 95 }).toBuffer());

  const AW = 360;
  const AH = 270;
  const alpha = Buffer.alloc(AW * AH * 4);
  for (let y = 0; y < AH; y++) {
    for (let x = 0; x < AW; x++) {
      const i = (y * AW + x) * 4;
      const n = (rand() - 0.5) * 2;
      alpha[i] = clamp((x / AW) * 255 + n);
      alpha[i + 1] = clamp(120 + Math.sin(y / 15) * 60 + n);
      alpha[i + 2] = clamp((y / AH) * 255);
      alpha[i + 3] = (x - 180) ** 2 + (y - 135) ** 2 < 120 ** 2 ? 255 : 0;
    }
  }
  write("photo-alpha.png", await sharp(alpha, { raw: { width: AW, height: AH, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer());

  // Heavy grain that survives low JPEG qualities: reaching a small size forces scaling down.
  const NW = 480;
  const NH = 360;
  const grain = Buffer.alloc(NW * NH * 3);
  for (let i = 0; i < grain.length; i++) grain[i] = clamp(128 + Math.sin(i / 7000) * 60 + (rand() - 0.5) * 120);
  // Photos carrying made-up camera, date, author and GPS metadata (a point in
  // the Río de la Plata), for the metadata remover. The JPEG is stored sideways
  // with EXIF orientation 6 (shown 240×320), as phones do.
  const exif = {
    IFD0: { Make: "Fileflect", Model: "Test Cam 1", Software: "fixture-gen", Artist: "Fixture" },
    IFD2: { DateTimeOriginal: "2024:05:01 10:20:30" },
    IFD3: { GPSLatitudeRef: "S", GPSLatitude: "34/1 36/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "58/1 22/1 0/1" },
  };
  const small = () => sharp(photo, { raw: { width: PW, height: PH, channels: 3 } }).resize(320, 240);
  write("exif-gps.jpg", await small().jpeg({ quality: 85 }).withExif(exif).withMetadata({ orientation: 6 }).toBuffer());
  write("exif-gps.png", await small().png().withExif(exif).toBuffer());
  write("exif-gps.webp", await small().webp({ quality: 80 }).withExif(exif).toBuffer());

  write("noise.jpg", await sharp(grain, { raw: { width: NW, height: NH, channels: 3 } }).jpeg({ quality: 85 }).toBuffer());
}

// --- HEIF: the same HEVC picture as photo.heic in a container declared with
// the generic brand "mif1" (what cameras other than iPhones write as .heif).
if (existsSync(join(out, "photo.heic"))) {
  const heif = Buffer.from(readFileSync(join(out, "photo.heic")));
  if (heif.toString("ascii", 4, 12) === "ftypheic") heif.write("mif1", 8, "ascii");
  write("photo.heif", heif);
}

// --- Subtitles (our own placeholder lines): italics, bold, a color, accents,
// Chinese, an ampersand, VTT settings/NOTE/STYLE and ASS styles with overrides.
write(
  "subtitles.srt",
  Buffer.from(
    '1\n00:00:01,000 --> 00:00:03,500\nHola, ¿cómo estás?\n<i>Ñandú en cursiva</i>\n\n2\n00:00:04,000 --> 00:00:06,250\n<font color="#ff0000">Texto en rojo</font>\nSecond line\n\n3\n00:01:02,003 --> 00:01:05,000\n中文字幕 & <b>negrita</b>\n',
    "utf8",
  ),
);
write(
  "subtitles.vtt",
  Buffer.from(
    "WEBVTT - Fileflect sample\n\nNOTE A comment that is not a cue\n\nSTYLE\n::cue { color: yellow }\n\nintro\n00:01.000 --> 00:03.500 align:start position:10%\n<v Ana>Hola</v> &amp; bienvenidos\n<i>segunda línea</i>\n\n00:00:04.000 --> 00:00:06.000\nÁrvore &lt;3\n",
    "utf8",
  ),
);
const assEvents = (marked) =>
  [
    `Comment: ${marked}0:00:00.00,0:00:01.00,Default,,0,0,0,,not shown`,
    `Dialogue: ${marked}0:00:01.00,0:00:03.50,Default,,0,0,0,,Hola, {\\i1}mundo{\\i0}\\NSegunda línea`,
    `Dialogue: ${marked}0:00:04.00,0:00:06.25,Sign,,0,0,0,,{\\pos(100,50)\\c&H0000FF&}Cartel, con comas`,
  ].join("\n");
write(
  "subtitles.ass",
  Buffer.from(
    "[Script Info]\nTitle: Fileflect sample\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,20,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\nStyle: Sign,Arial,30,&H0000FFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,8,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" +
      assEvents("0,") +
      "\n",
    "utf8",
  ),
);
write(
  "subtitles.ssa",
  Buffer.from(
    "[Script Info]\nTitle: Fileflect sample\nScriptType: v4.00\n\n[V4 Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding\nStyle: Default,Arial,20,16777215,65535,65535,0,0,0,1,2,2,2,10,10,10,0,1\nStyle: Sign,Arial,30,65535,65535,65535,0,-1,0,1,2,2,6,10,10,10,0,1\n\n[Events]\nFormat: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" +
      assEvents("Marked=0,") +
      "\n",
    "utf8",
  ),
);
// As saved by old Windows tools in Spanish: Windows-1252 and CRLF.
write("subtitles-latin1.srt", Buffer.from("1\r\n00:00:00,500 --> 00:00:02,000\r\nCanción de cuna\r\n\r\n2\r\n00:00:02,500 --> 00:00:04,000\r\nAçúcar y piñón\r\n", "latin1"));

// --- Broken files for error paths
const writeCorrupt = (name, bytes) => write(join("corrupt", name), bytes);
const png = readFileSync(join(out, "image.png"));
const jpg = readFileSync(join(out, "image.jpg"));
writeCorrupt("truncated.jpg", jpg.subarray(0, Math.floor(jpg.length / 2)));
writeCorrupt("truncated.png", png.subarray(0, Math.floor(png.length / 2)));
writeCorrupt("truncated.pdf", pdf3.subarray(0, Math.floor(pdf3.length / 3)));
// Valid signature followed by garbage.
writeCorrupt("garbage.png", Buffer.concat([png.subarray(0, 16), Buffer.alloc(512, 0xab)]));
writeCorrupt("garbage.pdf", Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(512, 0x5a)]));
// Content that does not match the extension.
writeCorrupt("text-as.jpg", Buffer.from("this is plain text, not a JPEG\n"));
writeCorrupt("random-as.docx", Buffer.from(Array.from({ length: 1024 }, (_, i) => (i * 73 + 41) % 256)));
writeCorrupt("empty.png", Buffer.alloc(0));
writeCorrupt("broken.json", Buffer.from('[{"id": 1, "name": "Ana"}, {"id": 2, "name": '));
writeCorrupt("bad-quotes.csv", Buffer.from('name,note\nAna,"unclosed quote\nBeto,ok\n'));
// "Billion laughs": 9 levels of 9 aliases each.
writeCorrupt(
  "alias-bomb.yaml",
  Buffer.from(
    ["a: &a [lol, lol, lol, lol, lol, lol, lol, lol, lol]", ..."bcdefghi".split("").map((c, i) => `${c}: &${c} [${Array(9).fill(`*${"abcdefgh"[i]}`).join(", ")}]`)].join("\n") + "\n",
  ),
);
writeCorrupt("broken.toml", Buffer.from('title = "unclosed\n[owner\n'));
// XXE: an external entity pointing at a local file.
writeCorrupt("xxe.xml", Buffer.from('<?xml version="1.0"?>\n<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<r>&x;</r>\n'));
writeCorrupt("broken.xml", Buffer.from("<catalog><book><title>open</book></catalog>\n"));
writeCorrupt("broken.srt", Buffer.from("1\nthis is not a timing line\nHello\n\n2\n00:00:99,000 -> nope\nBye\n"));

// Markdown and HTML for the markup tools: GitHub tables, a task list, code, a
// link, and things that must never survive (script, event handler, javascript: link).
write(
  "document.md",
  Buffer.from(
    "# Informe ñandú\n\nTexto con **negrita**, *cursiva* y ~~tachado~~.\n\n- [x] hecho\n- pendiente\n\n| Producto | Precio |\n| --- | ---: |\n| Té | 2,50 |\n| Café | 3,10 |\n\n```js\nconst total = 5.6;\n```\n\n[Fileflect](https://example.com) <script>window.top.pwned = 1</script> <img src=\"x.png\" onerror=\"window.top.pwned = 2\"> [mal](javascript:alert(1))\n",
  ),
);
write(
  "page.html",
  Buffer.from(
    '<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><title>Página</title><style>h1{color:red}</style><script>window.top.pwned = 3</script></head>\n<body><h1>Guía 中文</h1><p>Hola <strong>mundo</strong> y <em>bienvenidos</em>.</p>\n<ul><li>uno</li><li>dos</li></ul>\n<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>\n<pre><code class="language-py">print("hola")</code></pre>\n<p><a href="https://example.com/docs">Documentación</a> <img src="https://example.com/remote.png" alt="logo" onerror="window.top.pwned = 4"></p>\n<form><input name="q"></form></body></html>\n',
  ),
);
