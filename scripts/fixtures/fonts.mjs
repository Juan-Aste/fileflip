// Font fixtures for the font converter, made from scratch (no third-party
// font data): `node scripts/fixtures/fonts.mjs`.
//
// - font.ttf: a TrueType (glyf) font written by the small builder below.
// - font.otf: the same glyphs as CFF outlines, written by opentype.js.
// - font.woff: font.ttf wrapped as WOFF 1.0 by the writer below (zlib per table).
// - font.woff2: font.otf compressed by Google's reference encoder (woff2-encoder).
// - corrupt/truncated.woff2, corrupt/bomb.woff (a table declaring 1 GB once inflated).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import opentype from "opentype.js";
import { compress } from "woff2-encoder";

const out = new URL("../../tests/fixtures/", import.meta.url).pathname;
mkdirSync(join(out, "corrupt"), { recursive: true });
const write = (name, bytes) => {
  writeFileSync(join(out, name), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
};

const FAMILY = "Fileflect Test";
const EM = 1000;
// Glyphs as polygons (on-curve points only, clockwise), so both outline formats are exact.
const glyphs = [
  { name: ".notdef", advance: 500, contours: [[[50, 0], [50, 700], [450, 700], [450, 0]], [[100, 50], [400, 50], [400, 650], [100, 650]]] },
  { name: "space", unicode: 0x20, advance: 250, contours: [] },
  { name: "A", unicode: 0x41, advance: 600, contours: [[[20, 0], [300, 700], [580, 0]]] },
  { name: "B", unicode: 0x42, advance: 600, contours: [[[60, 0], [60, 700], [520, 700], [520, 0]]] },
  { name: "a", unicode: 0x61, advance: 500, contours: [[[50, 0], [50, 500], [450, 500], [450, 0]]] },
  { name: "ntilde", unicode: 0xf1, advance: 500, contours: [[[50, 0], [50, 500], [450, 0]], [[100, 600], [100, 680], [400, 680], [400, 600]]] },
];

// ---- TrueType builder ----
const u16 = (v) => [(v >> 8) & 255, v & 255];
const i16 = (v) => u16(v & 0xffff);
const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const bbox = (contours) => {
  const pts = contours.flat();
  if (!pts.length) return [0, 0, 0, 0];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const pad4 = (bytes) => [...bytes, ...Array((4 - (bytes.length % 4)) % 4).fill(0)];

function glyf() {
  const data = [];
  const loca = [];
  for (const g of glyphs) {
    loca.push(data.length);
    if (!g.contours.length) continue;
    const [x0, y0, x1, y1] = bbox(g.contours);
    const bytes = [...i16(g.contours.length), ...i16(x0), ...i16(y0), ...i16(x1), ...i16(y1)];
    let end = -1;
    for (const c of g.contours) bytes.push(...u16((end += c.length)));
    bytes.push(...u16(0)); // no instructions
    const pts = g.contours.flat();
    pts.forEach(() => bytes.push(0x01)); // on curve, 2-byte deltas
    let px = 0;
    let py = 0;
    for (const [x] of pts) {
      bytes.push(...i16(x - px));
      px = x;
    }
    for (const [, y] of pts) {
      bytes.push(...i16(y - py));
      py = y;
    }
    data.push(...pad4(bytes));
  }
  loca.push(data.length);
  return { glyf: data, loca: loca.flatMap(u32) };
}

function cmap() {
  const mapped = glyphs.map((g, gid) => ({ code: g.unicode, gid })).filter((m) => m.code !== undefined).sort((a, b) => a.code - b.code);
  // One segment per code (simple and valid), plus the final 0xFFFF segment.
  const segs = [...mapped.map((m) => ({ start: m.code, end: m.code, delta: (m.gid - m.code) & 0xffff })), { start: 0xffff, end: 0xffff, delta: 1 }];
  const n = segs.length;
  const search = 2 * 2 ** Math.floor(Math.log2(n));
  const sub = [
    ...u16(4), ...u16(16 + n * 8), ...u16(0), ...u16(n * 2), ...u16(search), ...u16(Math.log2(search / 2)), ...u16(n * 2 - search),
    ...segs.flatMap((s) => u16(s.end)), ...u16(0),
    ...segs.flatMap((s) => u16(s.start)),
    ...segs.flatMap((s) => u16(s.delta)),
    ...segs.flatMap(() => u16(0)),
  ];
  return [...u16(0), ...u16(1), ...u16(3), ...u16(1), ...u32(12), ...sub];
}

function name() {
  const strings = { 1: FAMILY, 2: "Regular", 3: "Fileflect Test Regular 1.0", 4: `${FAMILY} Regular`, 5: "Version 1.000", 6: "FileflectTest-Regular" };
  const recs = [];
  const data = [];
  for (const [id, text] of Object.entries(strings)) {
    const bytes = [...text].flatMap((ch) => u16(ch.charCodeAt(0)));
    recs.push(...u16(3), ...u16(1), ...u16(0x409), ...u16(Number(id)), ...u16(bytes.length), ...u16(data.length));
    data.push(...bytes);
  }
  const count = Object.keys(strings).length;
  return [...u16(0), ...u16(count), ...u16(6 + count * 12), ...recs, ...data];
}

function buildTtf() {
  const { glyf: glyfData, loca } = glyf();
  const all = bbox(glyphs.flatMap((g) => g.contours));
  const maxPoints = Math.max(...glyphs.map((g) => g.contours.flat().length));
  const maxContours = Math.max(...glyphs.map((g) => g.contours.length));
  const advances = glyphs.map((g) => g.advance);
  const lsbs = glyphs.map((g) => bbox(g.contours)[0]);
  const codes = glyphs.map((g) => g.unicode).filter((c) => c !== undefined);
  const tables = {
    head: [
      ...u32(0x00010000), ...u32(0x00010000), ...u32(0), ...u32(0x5f0f3cf5), ...u16(0x000b), ...u16(EM),
      ...u32(0), ...u32(0xdf3c5a00), ...u32(0), ...u32(0xdf3c5a00), // created/modified: fixed for reproducible bytes
      ...i16(all[0]), ...i16(all[1]), ...i16(all[2]), ...i16(all[3]),
      ...u16(0), ...u16(8), ...i16(2), ...i16(1), ...i16(0),
    ],
    hhea: [
      ...u32(0x00010000), ...i16(800), ...i16(-200), ...i16(0), ...u16(Math.max(...advances)),
      ...i16(Math.min(...lsbs)), ...i16(Math.min(...glyphs.map((g) => g.advance - bbox(g.contours)[2]))),
      ...i16(all[2]), ...i16(1), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...i16(0), ...u16(glyphs.length),
    ],
    maxp: [...u32(0x00010000), ...u16(glyphs.length), ...u16(maxPoints), ...u16(maxContours), ...u16(0), ...u16(0), ...u16(2), ...Array(18).fill(0)],
    hmtx: glyphs.flatMap((g, i) => [...u16(g.advance), ...i16(lsbs[i])]),
    cmap: cmap(),
    loca,
    glyf: glyfData,
    name: name(),
    "OS/2": [
      ...u16(4), ...i16(525), ...u16(400), ...u16(5), ...u16(0),
      ...i16(650), ...i16(600), ...i16(0), ...i16(75), ...i16(650), ...i16(600), ...i16(0), ...i16(350), ...i16(50), ...i16(250),
      ...i16(0), // sFamilyClass
      ...Array(10).fill(0), // panose
      ...u32(3), ...u32(0), ...u32(0), ...u32(0), // ulUnicodeRange: Basic Latin + Latin-1
      ...[..."FFLT"].map((c) => c.charCodeAt(0)),
      ...u16(0x40), ...u16(Math.min(...codes)), ...u16(Math.max(...codes)),
      ...i16(800), ...i16(-200), ...i16(0), ...u16(800), ...u16(200),
      ...u32(1), ...u32(0), // ulCodePageRange: Latin 1
      ...i16(500), ...i16(700), ...u16(0), ...u16(0x20), ...u16(1),
    ],
    post: [...u32(0x00030000), ...u32(0), ...i16(-100), ...i16(50), ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0)],
  };
  return sfnt(0x00010000, tables);
}

const checksum = (bytes) => {
  const b = pad4(bytes);
  let sum = 0;
  for (let i = 0; i < b.length; i += 4) sum = (sum + ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3])) >>> 0;
  return sum;
};

function sfnt(flavor, tables) {
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  const search = 2 ** Math.floor(Math.log2(n));
  const header = [...u32(flavor), ...u16(n), ...u16(search * 16), ...u16(Math.log2(search)), ...u16(n * 16 - search * 16)];
  let offset = 12 + n * 16;
  const dir = [];
  const body = [];
  for (const tag of tags) {
    const data = tables[tag];
    dir.push(...[...tag].map((c) => c.charCodeAt(0)), ...u32(checksum(data)), ...u32(offset), ...u32(data.length));
    body.push(...pad4(data));
    offset += pad4(data).length;
  }
  const font = [...header, ...dir, ...body];
  // head.checkSumAdjustment
  const headOffset = 12 + n * 16 + tags.slice(0, tags.indexOf("head")).reduce((s, t) => s + pad4(tables[t]).length, 0);
  font.splice(headOffset + 8, 4, ...u32((0xb1b0afba - checksum(font)) >>> 0));
  return Uint8Array.from(font);
}

// ---- CFF (OpenType) with opentype.js ----
function buildOtf() {
  const font = new opentype.Font({
    familyName: FAMILY,
    styleName: "Regular",
    unitsPerEm: EM,
    ascender: 800,
    descender: -200,
    glyphs: glyphs.map((g) => {
      const path = new opentype.Path();
      for (const c of g.contours) {
        // CFF outlines run counter-clockwise.
        const pts = [...c].reverse();
        path.moveTo(...pts[0]);
        pts.slice(1).forEach((p) => path.lineTo(...p));
        path.close();
      }
      return new opentype.Glyph({ name: g.name, unicode: g.unicode, advanceWidth: g.advance, path });
    }),
  });
  return new Uint8Array(font.toArrayBuffer());
}

// ---- WOFF 1.0 writer (independent of the app's) ----
function woff(sfntBytes) {
  const view = new DataView(sfntBytes.buffer, sfntBytes.byteOffset, sfntBytes.byteLength);
  const n = view.getUint16(4);
  const entries = [];
  for (let i = 0; i < n; i++) {
    const at = 12 + i * 16;
    const tag = sfntBytes.subarray(at, at + 4);
    const sum = view.getUint32(at + 4);
    const off = view.getUint32(at + 8);
    const len = view.getUint32(at + 12);
    const raw = sfntBytes.subarray(off, off + len);
    const z = deflateSync(raw);
    entries.push({ tag, sum, len, data: z.length < len ? z : raw });
  }
  let offset = 44 + n * 20;
  const dir = [];
  const body = [];
  for (const e of entries) {
    dir.push(...e.tag, ...u32(offset), ...u32(e.data.length), ...u32(e.len), ...u32(e.sum));
    body.push(...pad4([...e.data]));
    offset += pad4([...e.data]).length;
  }
  const total = 44 + dir.length + body.length;
  const header = [
    ..."wOFF".split("").map((c) => c.charCodeAt(0)), ...u32(view.getUint32(0)), ...u32(total), ...u16(n), ...u16(0),
    ...u32(sfntBytes.length), ...u16(1), ...u16(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0),
  ];
  return Uint8Array.from([...header, ...dir, ...body]);
}

const ttf = buildTtf();
const otf = buildOtf();
write("font.ttf", ttf);
write("font.otf", otf);
write("font.woff", woff(ttf));
const woff2 = await compress(otf);
write("font.woff2", woff2);
write("corrupt/truncated.woff2", woff2.subarray(0, Math.floor(woff2.length / 2)));
// A WOFF whose single table claims to inflate to 1 GB: must be refused before inflating.
const bomb = woff(ttf);
const bv = new DataView(bomb.buffer);
bv.setUint32(16, 1 << 30); // totalSfntSize
bv.setUint32(44 + 12, 1 << 30); // first table's origLength
write("corrupt/bomb.woff", bomb);
