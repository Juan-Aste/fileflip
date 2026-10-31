// Download of the AI voice files: from Hugging Face at the pinned commit (or
// our own copy first, src/lib/models/sources.ts), with byte progress, a size
// and SHA-256 check, and the browser's Cache API so the hundreds of MB are
// fetched once. Works in a worker or the page (both have `caches`).
// The transcription models (Whisper) use the same code with their own URLs and cache.

import { ConversionError } from "@/lib/convert-error";
import type { ModelSource } from "@/lib/models/sources";
import { SUPERTONIC_REVISION, supertonicUrl, type ModelFile } from "./model";

/** The Cache API subset used here, so tests can pass a Map-backed fake. */
export interface FileStore {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
  delete(url: string): Promise<boolean>;
}

/** One cache per pinned commit: a new model version never reads old files. */
export const MODEL_CACHE_NAME = `fileflect-tts-supertonic3-${SUPERTONIC_REVISION.slice(0, 12)}`;

/** The model cache, or null where the Cache API is missing or blocked (private mode, insecure origin). */
export async function openModelStore(name = MODEL_CACHE_NAME): Promise<FileStore | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(name);
  } catch {
    return null;
  }
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verified(file: ModelFile, data: Uint8Array) {
  return data.byteLength === file.bytes && (await sha256Hex(data)) === file.sha256;
}

/** Bytes of `files` already in the cache (to tell the user what is left to download). */
export async function cachedBytes(
  files: readonly ModelFile[],
  store: FileStore | null,
  urlOf: (file: ModelFile) => string = (file) => supertonicUrl(file.path),
): Promise<number> {
  if (!store) return 0;
  let total = 0;
  for (const file of files) {
    try {
      const hit = await store.match(urlOf(file));
      if (hit && Number(hit.headers.get("content-length") ?? file.bytes) === file.bytes) total += file.bytes;
    } catch {
      // A broken entry counts as missing.
    }
  }
  return total;
}

/** Bytes still to download for files given as source lists: none for a file cached from any of its sources, else its first source's size. */
export async function bytesToDownload(files: readonly (readonly ModelSource[])[], store: FileStore | null): Promise<number> {
  let total = 0;
  for (const sources of files) {
    const cached = await Promise.all(sources.map((s) => cachedBytes([s.file], store, () => s.url)));
    if (!cached.some((n) => n > 0)) total += sources[0].file.bytes;
  }
  return total;
}

export interface FetchModelOptions {
  store: FileStore | null;
  fetchFn?: typeof fetch;
  /** Bytes of this file received so far (a cached file reports its full size at once). */
  onBytes?: (received: number) => void;
  signal?: AbortSignal;
  /** Where the file is downloaded from (and its cache key); the AI voice's URL by default. */
  url?: string;
}

/** A verified cached copy, or null (a damaged entry is deleted). */
async function readCached(file: ModelFile, url: string, store: FileStore | null): Promise<Uint8Array | null> {
  if (!store) return null;
  try {
    const hit = await store.match(url);
    if (hit) {
      const data = new Uint8Array(await hit.arrayBuffer());
      if (await verified(file, data)) return data;
      await store.delete(url);
    }
  } catch {
    // Unreadable cache: download again.
  }
  return null;
}

/** The verified bytes of one model file, from the cache or the network (then cached). */
export async function fetchModelFile(file: ModelFile, { store, fetchFn = fetch, onBytes, signal, url = supertonicUrl(file.path) }: FetchModelOptions): Promise<Uint8Array> {
  const hit = await readCached(file, url, store);
  if (hit) {
    onBytes?.(file.bytes);
    return hit;
  }
  return download(file, url, { store, fetchFn, onBytes, signal });
}

/**
 * One model file that can come from several places (our storage, then Hugging
 * Face): a cached copy from any of them first, then each source in order until
 * one downloads and passes its size and SHA-256 check. `onBytes` names the
 * source's file, whose size may differ (e.g. the float16 copy of a model).
 */
export async function fetchModelSources(
  sources: readonly ModelSource[],
  { onBytes, ...options }: Omit<FetchModelOptions, "url" | "onBytes"> & { onBytes?: (file: ModelFile, received: number) => void },
): Promise<Uint8Array> {
  for (const { file, url } of sources) {
    const hit = await readCached(file, url, options.store);
    if (hit) {
      onBytes?.(file, file.bytes);
      return hit;
    }
  }
  let failure: unknown = new ConversionError("serviceUnavailable");
  for (const { file, url } of sources) {
    try {
      onBytes?.(file, 0);
      return await download(file, url, { ...options, onBytes: (n) => onBytes?.(file, n) });
    } catch (error) {
      if (options.signal?.aborted || (error instanceof ConversionError && error.code === "jobCancelled")) throw error;
      failure = error;
    }
  }
  throw failure;
}

async function download(file: ModelFile, url: string, { store, fetchFn = fetch, onBytes, signal }: Omit<FetchModelOptions, "url">): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchFn(url, { signal, credentials: "omit" });
  } catch (error) {
    if (signal?.aborted) throw new ConversionError("jobCancelled");
    throw error instanceof ConversionError ? error : new ConversionError("serviceUnavailable");
  }
  if (!response.ok || !response.body) throw new ConversionError("serviceUnavailable");

  // Read into one buffer of the pinned size; more bytes than that is not our file.
  const data = new Uint8Array(file.bytes);
  const reader = response.body.getReader();
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.byteLength > file.bytes) throw new ConversionError("serviceUnavailable");
      data.set(value, received);
      received += value.byteLength;
      onBytes?.(received);
    }
  } catch (error) {
    reader.cancel().catch(() => {});
    if (signal?.aborted) throw new ConversionError("jobCancelled");
    throw error instanceof ConversionError ? error : new ConversionError("connectionLost");
  }
  if (!(await verified(file, data))) throw new ConversionError("serviceUnavailable");

  if (store) {
    try {
      await store.put(url, new Response(data, { headers: { "content-type": "application/octet-stream", "content-length": String(file.bytes) } }));
    } catch {
      // Quota exceeded or storage blocked: works now, downloads again next time.
    }
  }
  return data;
}
