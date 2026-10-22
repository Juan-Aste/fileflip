// Emscripten module built by scripts/libarchive/build.sh.
export default function createLibarchive(options?: {
  locateFile?: (path: string) => string;
  wasmBinary?: ArrayBuffer | Uint8Array;
}): Promise<unknown>;
