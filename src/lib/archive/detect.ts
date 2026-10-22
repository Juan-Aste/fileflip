// Signatures of the archives read by libarchive (lib/archive/libarchive.ts),
// kept apart so checking them doesn't load the WASM wrapper.

const startsWith = (b: Uint8Array, signature: number[]) => signature.every((v, i) => b[i] === v);

export function detectLibarchiveFormat(b: Uint8Array): "7z" | "rar" | null {
  if (startsWith(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "7z";
  // RAR 4 ends the signature with 00, RAR 5 with 01 00.
  if (startsWith(b, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]) && (b[6] === 0 || (b[6] === 1 && b[7] === 0))) return "rar";
  return null;
}
