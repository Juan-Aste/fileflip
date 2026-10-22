import type { LibarchiveWasm } from "libarchive-wasm/dist/libarchiveWasm";
import { wrapLibarchiveWasm } from "libarchive-wasm/dist/wrapLibarchiveWasm";
import createLibarchive from "@/vendor/libarchive/libarchive.mjs";

// Our own build of libarchive (scripts/libarchive/build.sh: 3.8.x with a UTF-8
// locale) behind libarchive-wasm's JavaScript wrapper. Only the wrapper is
// imported from that package, never its older WASM.

/** A fresh libarchive instance; the browser passes where the .wasm is, Node passes its bytes. */
export async function loadLibarchive(options: { locateFile?: (path: string) => string; wasmBinary?: Uint8Array } = {}): Promise<LibarchiveWasm> {
  return wrapLibarchiveWasm((await createLibarchive(options)) as Parameters<typeof wrapLibarchiveWasm>[0]);
}
