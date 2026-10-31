/// <reference lib="webworker" />
import { ffmpegAssets } from "@/lib/legacy-media/assets";
import type { LegacyKind } from "@/lib/legacy-media/options";
import { LegacyError, runLegacy, type FFmpegCore } from "@/lib/legacy-media/run";
import { exposeHandlers } from "@/lib/worker-rpc";

// The FFmpeg WASM fallback for old video and audio formats, off the main thread.
// The core (about 31 MB) is fetched from our domain the first time an old file is
// converted and kept for the next files of the batch. The input is mounted read-only
// (WORKERFS reads the File in slices, without copying it into WASM memory).

let core: Promise<FFmpegCore> | null = null;

function loadCore() {
  core ??= (async () => {
    const origin = self.location.origin;
    const url = new URL(ffmpegAssets.js, origin).href;
    const { default: create } = (await import(/* webpackIgnore: true */ url)) as { default: (options: object) => Promise<FFmpegCore> };
    const wasmURL = new URL(ffmpegAssets.wasm, origin).href;
    // The core finds its WASM through `mainScriptUrlOrBlob` (its own locateFile hook).
    return create({ mainScriptUrlOrBlob: `${url}#${btoa(JSON.stringify({ wasmURL, workerURL: "" }))}` });
  })();
  // A failed load (offline, blocked) is retried by the next file.
  core.catch(() => (core = null));
  return core;
}

let mounted = 0;

exposeHandlers({
  async transcode({ file, kind }: { file: File | Blob; kind: LegacyKind }, onProgress) {
    const ffmpeg = await loadCore();
    const dir = `/in${++mounted}`;
    ffmpeg.FS.mkdir(dir);
    ffmpeg.FS.mount(ffmpeg.FS.filesystems.WORKERFS, { blobs: [{ name: "input", data: file }] }, dir);
    try {
      const { data, duration } = runLegacy(ffmpeg, `${dir}/input`, kind, onProgress);
      const buffer = data.buffer.byteLength === data.byteLength ? (data.buffer as ArrayBuffer) : (data.slice().buffer as ArrayBuffer);
      return { result: { buffer, duration }, transfer: [buffer] };
    } catch (error) {
      // A crash inside the WASM (not a file we rejected) can leave its memory broken: start a fresh core next time.
      if (!(error instanceof LegacyError)) core = null;
      throw error;
    } finally {
      try {
        ffmpeg.FS.unmount(dir);
      } catch {
        core = null;
      }
    }
  },
});
