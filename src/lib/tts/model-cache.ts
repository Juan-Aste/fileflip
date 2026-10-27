// Download of the AI voice files: from Hugging Face at the pinned commit, with
// byte progress, a size and SHA-256 check, and the browser's Cache API so the
// ~398 MB are fetched once. Works in a worker or the page (both have `caches`).

import { ConversionError } from "@/lib/convert-error";
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
export async function openModelStore(): Promise<FileStore | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(MODEL_CACHE_NAME);
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
export async function cachedBytes(files: readonly ModelFile[], store: FileStore | null): Promise<number> {
  if (!store) return 0;
  let total = 0;
  for (const file of files) {
    try {
      const hit = await store.match(supertonicUrl(file.path));
      if (hit && Number(hit.headers.get("content-length") ?? file.bytes) === file.bytes) total += file.bytes;
    } catch {
      // A broken entry counts as missing.
    }
  }
  return total;
}

export interface FetchModelOptions {
  store: FileStore | null;
  fetchFn?: typeof fetch;
  /** Bytes of this file received so far (a cached file reports its full size at once). */
  onBytes?: (received: number) => void;
  signal?: AbortSignal;
}

/** The verified bytes of one model file, from the cache or the network (then cached). */
export async function fetchModelFile(file: ModelFile, { store, fetchFn = fetch, onBytes, signal }: FetchModelOptions): Promise<Uint8Array> {
  const url = supertonicUrl(file.path);
  if (store) {
    try {
      const hit = await store.match(url);
      if (hit) {
        const data = new Uint8Array(await hit.arrayBuffer());
        if (await verified(file, data)) {
          onBytes?.(file.bytes);
          return data;
        }
        await store.delete(url);
      }
    } catch {
      // Unreadable cache: download again.
    }
  }

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
