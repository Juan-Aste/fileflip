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
  const sources = { text: [fodt, "fodt"], sheet: [fods, "fods"], slides: [fodp, "fodp"] };
  const targets = {
    text: [["odt", "document.odt"], ["docx", "document.docx"], ["doc", "document.doc"], ["rtf", "document.rtf"]],
    sheet: [["ods", "spreadsheet.ods"], ["xlsx", "spreadsheet.xlsx"], ["xls", "spreadsheet.xls"]],
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
