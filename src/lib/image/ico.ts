export interface IcoEntry {
  /** 1–256 px; ICO stores 256 as 0. */
  size: number;
  png: ArrayBuffer;
}

/** Standard favicon sizes, filtered to those not larger than the source. */
export function icoSizes(sourceSide: number): number[] {
  const sizes = [16, 32, 48, 64, 128, 256].filter((s) => s <= sourceSide);
  return sizes.length ? sizes : [Math.max(1, Math.round(sourceSide))];
}

/** Packs square PNG images into an ICO container (supported since Windows Vista). */
export function encodeIco(entries: readonly IcoEntry[]): ArrayBuffer {
  const headerSize = 6 + entries.length * 16;
  const total = entries.reduce((sum, e) => sum + e.png.byteLength, headerSize);
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, entries.length, true);

  let offset = headerSize;
  entries.forEach((entry, i) => {
    const at = 6 + i * 16;
    const side = entry.size >= 256 ? 0 : entry.size;
    view.setUint8(at, side);
    view.setUint8(at + 1, side);
    view.setUint16(at + 4, 1, true); // color planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.png.byteLength, true);
    view.setUint32(at + 12, offset, true);
    bytes.set(new Uint8Array(entry.png), offset);
    offset += entry.png.byteLength;
  });
  return buffer;
}
