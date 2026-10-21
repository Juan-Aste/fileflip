// Minimal writer for 8-bit palette PNGs (color type 3), used by the image
// compressor after quantizing: the pixels become indices into up to 256
// colors, with a tRNS chunk for transparency. Filtering and the final deflate
// tuning are left to oxipng.
import { zlibSync } from "fflate";
import { hasTransparency, type RawImage } from "./pixels";

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Palette entries as [r, g, b] or [r, g, b, a]. */
export type Palette = readonly (readonly number[])[];

export function encodeIndexedPng(width: number, height: number, indices: Uint8Array, palette: Palette): ArrayBuffer {
  if (palette.length === 0 || palette.length > 256) throw new Error("Palette must have 1–256 colors");
  if (indices.length !== width * height) throw new Error("Index count does not match the size");

  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // palette

  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((c, i) => plte.set([c[0]!, c[1]!, c[2]!], i * 3));
  // tRNS only up to the last non-opaque entry (absent entries are opaque).
  const alphas = palette.map((c) => c[3] ?? 255);
  let lastTranslucent = -1;
  alphas.forEach((a, i) => {
    if (a < 255) lastTranslucent = i;
  });

  // Each row starts with filter type 0 (none).
  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    ...(lastTranslucent >= 0 ? [chunk("tRNS", new Uint8Array(alphas.slice(0, lastTranslucent + 1)))] : []),
    chunk("IDAT", zlibSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out.buffer;
}

/**
 * Reduces the image to at most `colors` colors (gifenc's quantizer, MIT) and
 * writes it as a palette PNG. Images with transparency keep it (alpha is
 * quantized too); opaque ones use the finer RGB565 color bins.
 */
export async function quantizedPng(image: RawImage, colors: number): Promise<ArrayBuffer> {
  const { quantize, applyPalette } = await import("gifenc");
  const format = hasTransparency(image) ? "rgba4444" : "rgb565";
  const palette = quantize(image.data, colors, { format });
  const indices = applyPalette(image.data, palette, format);
  return encodeIndexedPng(image.width, image.height, indices, palette);
}
