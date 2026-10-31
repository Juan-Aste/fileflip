import { describe, expect, it, vi } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { supertonicUrl, type ModelFile } from "./model";
import { cachedBytes, fetchModelFile, sha256Hex, type FileStore } from "./model-cache";

const content = new TextEncoder().encode("model bytes ".repeat(1000));
const file = async (): Promise<ModelFile> => ({ path: "onnx/test.onnx", bytes: content.byteLength, sha256: await sha256Hex(content) });

function memoryStore() {
  const map = new Map<string, Response>();
  const store: FileStore = {
    match: async (url) => map.get(url)?.clone(),
    put: async (url, response) => void map.set(url, response),
    delete: async (url) => map.delete(url),
  };
  return { map, store };
}

/** A response streamed in chunks of 1000 bytes. */
function streamed(data: Uint8Array, ok = true) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < data.length; i += 1000) controller.enqueue(data.slice(i, i + 1000));
      controller.close();
    },
  });
  return new Response(body, { status: ok ? 200 : 404 });
}

describe("AI voice model download", () => {
  it("downloads with byte progress, verifies and caches, then reads from the cache", async () => {
    const f = await file();
    const { map, store } = memoryStore();
    const fetchFn = vi.fn(async () => streamed(content));
    const progress: number[] = [];
    const data = await fetchModelFile(f, { store, fetchFn, onBytes: (n) => progress.push(n) });
    expect(data).toEqual(content);
    expect(fetchFn).toHaveBeenCalledWith(supertonicUrl(f.path), expect.objectContaining({ credentials: "omit" }));
    expect(progress.length).toBeGreaterThan(5);
    expect(progress.at(-1)).toBe(f.bytes);
    expect(map.has(supertonicUrl(f.path))).toBe(true);
    expect(await cachedBytes([f], store)).toBe(f.bytes);

    const again = await fetchModelFile(f, { store, fetchFn });
    expect(again).toEqual(content);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("rejects a file whose content does not match its SHA-256 and does not cache it", async () => {
    const f = await file();
    const { map, store } = memoryStore();
    const tampered = content.slice();
    tampered[10] ^= 1;
    await expect(fetchModelFile(f, { store, fetchFn: async () => streamed(tampered) })).rejects.toThrow(ConversionError);
    expect(map.size).toBe(0);
  });

  it("rejects a file longer than pinned, an HTTP error and a network failure", async () => {
    const f = await file();
    const longer = new Uint8Array(content.length + 1);
    await expect(fetchModelFile(f, { store: null, fetchFn: async () => streamed(longer) })).rejects.toThrow("serviceUnavailable");
    await expect(fetchModelFile(f, { store: null, fetchFn: async () => streamed(content, false) })).rejects.toThrow("serviceUnavailable");
    await expect(fetchModelFile(f, { store: null, fetchFn: async () => Promise.reject(new TypeError("offline")) })).rejects.toThrow("serviceUnavailable");
  });

  it("replaces a corrupted cache entry by downloading again", async () => {
    const f = await file();
    const { map, store } = memoryStore();
    map.set(supertonicUrl(f.path), new Response(new Uint8Array(f.bytes)));
    const fetchFn = vi.fn(async () => streamed(content));
    expect(await fetchModelFile(f, { store, fetchFn })).toEqual(content);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("works without a cache and reports nothing cached", async () => {
    const f = await file();
    expect(await fetchModelFile(f, { store: null, fetchFn: async () => streamed(content) })).toEqual(content);
    expect(await cachedBytes([f], null)).toBe(0);
  });

  it("reports a cancelled download as cancelled", async () => {
    const f = await file();
    const controller = new AbortController();
    controller.abort();
    const fetchFn = async (_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return streamed(content);
    };
    await expect(fetchModelFile(f, { store: null, fetchFn: fetchFn as typeof fetch, signal: controller.signal })).rejects.toThrow("jobCancelled");
  });

  it("downloads and caches other models' files under their own URL (Whisper)", async () => {
    const f = await file();
    const { map, store } = memoryStore();
    const url = "https://huggingface.co/onnx-community/whisper-tiny/resolve/abc/onnx/test.onnx";
    const fetchFn = vi.fn(async () => streamed(content));
    expect(await fetchModelFile(f, { store, fetchFn, url })).toEqual(content);
    expect(fetchFn).toHaveBeenCalledWith(url, expect.anything());
    expect([...map.keys()]).toEqual([url]);
    expect(await cachedBytes([f], store, () => url)).toBe(f.bytes);
    expect(await cachedBytes([f], store)).toBe(0);
  });
});
