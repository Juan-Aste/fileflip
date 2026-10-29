import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mirrorUrl, modelsBaseUrl, type ModelSource } from "@/lib/models/sources";
import { whisperModels, whisperSources, whisperUrl } from "@/lib/transcribe/model";
import { supertonicFiles, supertonicLightFiles, supertonicSources, supertonicUrl, supertonicVoiceFiles, SUPERTONIC_REVISION } from "@/lib/tts/model";
import { bytesToDownload, fetchModelSources, sha256Hex, type FileStore } from "@/lib/tts/model-cache";

// NEXT_PUBLIC_MODELS_BASE_URL (task 11.4a): our own copy of the models first,
// Hugging Face when it fails. Two local HTTP servers stand in for the R2 bucket
// and for Hugging Face.

describe("models base URL", () => {
  it("accepts https URLs (and http on localhost) without a trailing slash", () => {
    expect(modelsBaseUrl(undefined)).toBe("");
    expect(modelsBaseUrl("  ")).toBe("");
    expect(modelsBaseUrl("https://modelos.fileflect.com")).toBe("https://modelos.fileflect.com");
    expect(modelsBaseUrl("https://modelos.fileflect.com/")).toBe("https://modelos.fileflect.com");
    expect(modelsBaseUrl("https://cdn.example/models//")).toBe("https://cdn.example/models");
    expect(modelsBaseUrl("http://localhost:8080")).toBe("http://localhost:8080");
    expect(modelsBaseUrl("http://modelos.fileflect.com")).toBe("");
    expect(modelsBaseUrl("modelos.fileflect.com")).toBe("");
    expect(modelsBaseUrl("https://modelos.fileflect.com/?x=1")).toBe("");
    expect(modelsBaseUrl("javascript:alert(1)")).toBe("");
  });

  it("lays out files like Hugging Face, with the float16 Supertonic models in their own folder", () => {
    const base = "https://m.example";
    const vocoder = supertonicFiles.find((f) => f.path === "onnx/vocoder.onnx")!;
    expect(supertonicSources(vocoder, "")).toEqual([{ file: vocoder, url: supertonicUrl(vocoder.path) }]);
    const [own, hub] = supertonicSources(vocoder, base);
    expect(own).toEqual({ file: supertonicLightFiles.find((f) => f.path === vocoder.path), url: `${base}/Supertone/supertonic-3/${SUPERTONIC_REVISION}-fp16/onnx/vocoder.onnx` });
    expect(hub).toEqual({ file: vocoder, url: supertonicUrl(vocoder.path) });
    const voice = supertonicVoiceFiles.F5;
    expect(supertonicSources(voice, base)[0]).toEqual({ file: voice, url: `${base}/Supertone/supertonic-3/${SUPERTONIC_REVISION}/voice_styles/F5.json` });
    const model = whisperModels.base;
    const enc = model.files[0];
    expect(whisperSources(model, enc, base)).toEqual([
      { file: enc, url: `${base}/onnx-community/whisper-base/${model.revision}/${enc.path}` },
      { file: enc, url: whisperUrl(model, enc.path) },
    ]);
    expect(whisperSources(model, enc, "")).toEqual([{ file: enc, url: whisperUrl(model, enc.path) }]);
  });
});

const original = new TextEncoder().encode("original model ".repeat(2000));
const light = new TextEncoder().encode("light ".repeat(2000));

function serve(files: Record<string, Uint8Array>) {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    hits.push(req.url!);
    const body = files[req.url!];
    if (!body) return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": "application/octet-stream", "access-control-allow-origin": "*" }).end(Buffer.from(body));
  });
  return { server, hits };
}
const listen = (s: Server) => new Promise<string>((resolve) => s.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));

function memoryStore() {
  const map = new Map<string, Response>();
  const store: FileStore = {
    match: async (url) => map.get(url)?.clone(),
    put: async (url, response) => void map.set(url, response),
    delete: async (url) => map.delete(url),
  };
  return { map, store };
}

describe("download from our storage with Hugging Face as fallback", () => {
  const repo = "Supertone/supertonic-3";
  const rev = "abc123";
  const path = "onnx/vocoder.onnx";
  let bucket: ReturnType<typeof serve>, hub: ReturnType<typeof serve>, bucketUrl: string, hubUrl: string;
  let lightFile: { path: string; bytes: number; sha256: string }, originalFile: typeof lightFile;
  const sources = (base: string): ModelSource[] => [
    { file: lightFile, url: mirrorUrl(base, repo, `${rev}-fp16`, path) },
    { file: originalFile, url: `${hubUrl}/${repo}/resolve/${rev}/${path}` },
  ];

  beforeAll(async () => {
    lightFile = { path, bytes: light.byteLength, sha256: await sha256Hex(light) };
    originalFile = { path, bytes: original.byteLength, sha256: await sha256Hex(original) };
    bucket = serve({ [`/${repo}/${rev}-fp16/${path}`]: light, [`/bad/${repo}/${rev}-fp16/${path}`]: light.map((b) => b ^ 1) });
    hub = serve({ [`/${repo}/resolve/${rev}/${path}`]: original });
    bucketUrl = await listen(bucket.server);
    hubUrl = await listen(hub.server);
  });
  afterAll(() => {
    bucket.server.close();
    hub.server.close();
  });

  it("uses the base URL when it works, and caches what it got", async () => {
    const { map, store } = memoryStore();
    hub.hits.length = 0;
    const progress: [number, number][] = [];
    const data = await fetchModelSources(sources(bucketUrl), { store, onBytes: (f, n) => progress.push([f.bytes, n]) });
    expect(data).toEqual(light);
    expect(hub.hits).toEqual([]);
    expect(progress.at(-1)).toEqual([light.byteLength, light.byteLength]);
    expect([...map.keys()]).toEqual([sources(bucketUrl)[0].url]);
    expect(await bytesToDownload([sources(bucketUrl)], store)).toBe(0);
  });

  it("falls back to Hugging Face when the base URL is down", async () => {
    const down = createServer();
    const downUrl = await listen(down);
    down.close();
    hub.hits.length = 0;
    const sizes: number[] = [];
    const data = await fetchModelSources(sources(downUrl), { store: null, onBytes: (f) => sizes.push(f.bytes) });
    expect(data).toEqual(original);
    expect(hub.hits).toEqual([`/${repo}/resolve/${rev}/${path}`]);
    // Progress switches to the original's size.
    expect(sizes.at(-1)).toBe(original.byteLength);
  });

  it("falls back to Hugging Face when the file there fails its SHA-256 or is missing", async () => {
    const { map, store } = memoryStore();
    expect(await fetchModelSources(sources(`${bucketUrl}/bad`), { store })).toEqual(original);
    expect(await fetchModelSources(sources(`${bucketUrl}/missing`), { store: null })).toEqual(original);
    // Only the verified file is cached, under its own URL.
    expect([...map.keys()]).toEqual([sources(bucketUrl)[1].url]);
  });

  it("reads a copy cached from any source before downloading", async () => {
    const { store } = memoryStore();
    await fetchModelSources([sources(bucketUrl)[1]], { store }); // cached earlier from Hugging Face only
    bucket.hits.length = 0;
    hub.hits.length = 0;
    expect(await bytesToDownload([sources(bucketUrl)], store)).toBe(0);
    expect(await fetchModelSources(sources(bucketUrl), { store })).toEqual(original);
    expect(bucket.hits).toEqual([]);
    expect(hub.hits).toEqual([]);
    expect(await bytesToDownload([sources(bucketUrl)], memoryStore().store)).toBe(light.byteLength);
  });

  it("does not fall back after the user cancels", async () => {
    const controller = new AbortController();
    controller.abort();
    hub.hits.length = 0;
    await expect(fetchModelSources(sources(bucketUrl), { store: null, signal: controller.signal })).rejects.toThrow("jobCancelled");
    expect(hub.hits).toEqual([]);
  });

  it("fails when every source fails", async () => {
    await expect(fetchModelSources([{ file: originalFile, url: `${bucketUrl}/nothing` }], { store: null })).rejects.toThrow("serviceUnavailable");
  });
});
