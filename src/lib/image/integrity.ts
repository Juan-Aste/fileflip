// Structural checks for JPEG and PNG, run before decoding. Browser decoders
// are lenient: a JPEG cut in half decodes with the missing part painted gray,
// and a damaged file would otherwise be retried (uploaded) on the server for
// nothing. Both walks only look at segment/chunk framing, never at pixels.

/** True when the JPEG reaches its end-of-image marker inside the file. */
export function isCompleteJpeg(bytes: Uint8Array): boolean {
  const n = bytes.length;
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 1 < n) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    if (marker === 0xd9) return true;
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (i + 3 >= n) return false;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) return false;
    i += 2 + length;
    if (i > n) return false;
    if (marker === 0xda) {
      // Entropy-coded data runs until a marker other than stuffing or RSTn.
      while (i + 1 < n) {
        if (bytes[i] === 0xff) {
          const next = bytes[i + 1];
          if (next !== 0x00 && next !== 0xff && !(next >= 0xd0 && next <= 0xd7)) break;
          i += next === 0xff ? 1 : 2;
        } else i++;
      }
    }
  }
  return false;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** True when every PNG chunk fits in the file, up to IEND, starting with IHDR. */
export function isCompletePng(bytes: Uint8Array): boolean {
  const n = bytes.length;
  if (n < 8 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 8;
  let first = true;
  while (i + 12 <= n) {
    const length = view.getUint32(i);
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    if (!/^[A-Za-z]{4}$/.test(type) || (first && type !== "IHDR")) return false;
    first = false;
    const end = i + 12 + length;
    if (end > n) return false;
    if (type === "IEND") return true;
    i = end;
  }
  return false;
}

/** Whether `bytes` of a detected format look damaged (only JPEG and PNG are checked). */
export function isDamagedImage(bytes: Uint8Array, format: string): boolean {
  if (format === "jpg") return !isCompleteJpeg(bytes);
  if (format === "png") return !isCompletePng(bytes);
  return false;
}
