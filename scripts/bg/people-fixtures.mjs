// Builds the "people" test photos for background removal (phase 15) from
// public-domain NASA portraits (works of the U.S. federal government,
// 17 U.S.C. § 105; origin in tests/fixtures/people/README.md). The
// portraits are shot on a plain white backdrop, so the reference mask is
// exact and independent of any model: everything not connected to the
// backdrop is the person. Then the person is pasted over harder
// backgrounds (stripes, a gradient with noise) with that same mask.
//
//   node scripts/bg/people-fixtures.mjs <dir with the downloaded JPGs> <out dir> [--all]
//
// Each JPG is https://images-assets.nasa.gov/image/<id>/<id>~medium.jpg (checked by sha256).
//
// Without --all only the e2e fixture is written (small, kept in the repo).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export const SOURCES = [
  { id: "jsc2026e035015_alt", sha256: "b657558f221d6fe27035c2f6f2f01dd2c6f61bdbb51fc618fc4e999563fcfb76" },
  { id: "jsc2026e034984_alt", sha256: "40699a827a122ab82ce2d7463e98a7baa4a50dc1ba5d1acd26586c58dbe11df5" },
  { id: "jsc2026e035005_alt", sha256: "179bf69ae6ec574327800aa981d10ba73b945436b7167734be44d8780a4b5c4f" },
  { id: "jsc2026e034992_alt", sha256: "33a68a8b4e094d7489faa3ae6f25fa7e7a3cdcfd904e0dbba246a3ab3e921bd3" },
];

/** Backdrop pixel: light and grey. */
const isBackdrop = (r, g, b) => Math.min(r, g, b) > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 28;

/** Person mask (1 = person): pixels not connected to the border through backdrop pixels. */
export function personMask(rgb, w, h, channels = 3) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => {
    if (bg[i]) return;
    const o = i * channels;
    if (!isBackdrop(rgb[o], rgb[o + 1], rgb[o + 2])) return;
    bg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = bg[i] ? 0 : 1;
  return mask;
}

function bbox(mask, w, h) {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** Deterministic backgrounds, same size as the photo. */
function background(kind, w, h) {
  const out = Buffer.alloc(w * h * 3);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 3;
    let c;
    if (kind === "stripes") c = (Math.floor((x + y * 0.5) / 18) % 2 ? [176, 128, 64] : [96, 140, 70]);
    else {
      const n = (rand() - 0.5) * 50;
      c = [60 + (120 * x) / w + n, 90 + (100 * y) / h + n, 150 - (80 * x) / w + n];
    }
    out[o] = Math.max(0, Math.min(255, c[0]));
    out[o + 1] = Math.max(0, Math.min(255, c[1]));
    out[o + 2] = Math.max(0, Math.min(255, c[2]));
  }
  return out;
}

/** Photo + its reference mask → upper-body crop at `width` px (selfie framing). */
export async function upperBody(file, width) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = personMask(data, info.width, info.height);
  const box = bbox(mask, info.width, info.height);
  const personH = box.y1 - box.y0;
  const cx = (box.x0 + box.x1) / 2;
  const top = Math.max(0, Math.round(box.y0 - personH * 0.06));
  const height = Math.round(personH * 0.5);
  const cropW = Math.min(info.width, Math.round(height * 0.8));
  const left = Math.max(0, Math.min(info.width - cropW, Math.round(cx - cropW / 2)));
  const region = { left, top, width: cropW, height };
  const outH = Math.round((width * height) / cropW);
  const photo = await sharp(data, { raw: info }).extract(region).resize(width, outH).raw().toBuffer();
  const maskImg = await sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width: info.width, height: info.height, channels: 1 } })
    .extract(region).resize(width, outH).extractChannel(0).raw().toBuffer();
  return { photo, mask: maskImg, width, height: outH };
}

/** The person over another background (alpha from the reference mask, soft by its scaling). */
export function composite({ photo, mask, width, height }, kind) {
  if (kind === "white") return Buffer.from(photo);
  const bg = background(kind, width, height);
  const out = Buffer.alloc(photo.length);
  for (let i = 0; i < width * height; i++) {
    const a = mask[i] / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(photo[i * 3 + c] * a + bg[i * 3 + c] * (1 - a));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , srcDir, outDir, flag] = process.argv;
  mkdirSync(outDir, { recursive: true });
  const all = flag === "--all";
  const list = all ? SOURCES : SOURCES.slice(0, 1);
  for (const { id, sha256 } of list) {
    const file = join(srcDir, `${id}.jpg`);
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (actual !== sha256) throw new Error(`${id}.jpg has sha256 ${actual}, expected ${sha256}`);
    const crop = await upperBody(file, all ? 512 : 480);
    const bin = Buffer.from(crop.mask.map((v) => (v >= 128 ? 255 : 0)));
    for (const kind of all ? ["white", "stripes", "noise"] : ["stripes"]) {
      const name = all ? `${id}-${kind}` : "person";
      await sharp(composite(crop, kind), { raw: { width: crop.width, height: crop.height, channels: 3 } }).jpeg({ quality: 85 }).toFile(join(outDir, `${name}.jpg`));
      await sharp(bin, { raw: { width: crop.width, height: crop.height, channels: 1 } }).png().toFile(join(outDir, `${name}-mask.png`));
    }
  }
}
