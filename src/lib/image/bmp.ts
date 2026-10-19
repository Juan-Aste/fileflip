import { flattenAlpha, type RawImage } from "./pixels";

/** Encodes a 24-bit uncompressed BMP (transparency is flattened over white). */
export function encodeBmp(image: RawImage): ArrayBuffer {
  const { width, height, data } = flattenAlpha(image);
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const buffer = new ArrayBuffer(54 + pixelBytes);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // "B"
  view.setUint8(1, 0x4d); // "M"
  view.setUint32(2, buffer.byteLength, true);
  view.setUint32(10, 54, true); // pixel data offset
  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // positive = bottom-up rows
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);

  const out = new Uint8Array(buffer, 54);
  for (let y = 0; y < height; y++) {
    const row = (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = row + x * 3;
      out[dst] = data[src + 2];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src];
    }
  }
  return buffer;
}
