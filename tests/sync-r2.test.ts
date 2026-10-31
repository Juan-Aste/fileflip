import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lighten } from "../scripts/models/onnx-light.mjs";
import { bucketClient, contentType, manifest, signV4, sync } from "../scripts/models/sync-r2.mjs";
import { whisperModels, whisperSources } from "@/lib/transcribe/model";
import { supertonicFiles, supertonicSources, supertonicVoiceFiles } from "@/lib/tts/model";

// scripts/models/sync-r2.mjs (task 11.4b): what it uploads must be exactly what
// the site asks NEXT_PUBLIC_MODELS_BASE_URL for, signed as R2's S3 API expects.

const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");

describe("AWS Signature V4", () => {
  it("matches the official test vector (get-vanilla)", () => {
    const headers = signV4({
      method: "GET",
      url: "https://example.amazonaws.com/",
      accessKeyId: "AKIDEXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      service: "service",
      date: new Date("2015-08-30T12:36:00Z"),
    });
    expect(headers.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("sets the content type by extension", () => {
    expect(contentType("a/onnx/vocoder.onnx")).toBe("application/octet-stream");
    expect(contentType("a/onnx/tts.json")).toBe("application/json");
    expect(contentType("a/LICENSE")).toBe("text/plain; charset=utf-8");
    expect(contentType("a/NOTICE.txt")).toBe("text/plain; charset=utf-8");
  });
});

describe("the bucket layout is the one the site reads", () => {
  it("lists every Supertonic and Whisper file under the key the site requests", async () => {
    const entries = (await manifest()) as { key: string; bytes: number; sha256: string; source?: { url: string } }[];
    const keys = new Set(entries.map((e) => e.key));
    const base = "https://m.example";
    const wanted = [
      ...[...supertonicFiles, ...Object.values(supertonicVoiceFiles)].map((f) => supertonicSources(f, base)[0]),
      ...Object.values(whisperModels).flatMap((m) => m.files.map((f) => whisperSources(m, f, base)[0])),
    ];
    for (const source of wanted) {
      const entry = entries.find((e) => `${base}/${e.key}` === source.url);
      expect([entry?.bytes, entry?.sha256], source.url).toEqual([source.file.bytes, source.file.sha256]);
    }
    // Plus the license next to the original and the float16 files, and the note on the modified copy.
    expect(keys.size).toBe(wanted.length + 3);
    expect([...keys].filter((k) => k.endsWith("LICENSE") || k.endsWith("NOTICE.txt"))).toHaveLength(3);
    // Every source on Hugging Face is a pinned commit.
    for (const e of entries) if (e.source) expect(e.source.url).toMatch(/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\//);
  });
});

/** A fake R2 bucket: checks each request's signature and keeps the objects. */
function fakeBucket(secret: string) {
  const objects = new Map<string, { body: Buffer; headers: IncomingMessage["headers"] }>();
  const log: string[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks);
    const url = `http://${req.headers.host}${req.url}`;
    const auth = String(req.headers.authorization);
    const signed = /SignedHeaders=([^,]+)/.exec(auth)![1].split(";");
    const headers = Object.fromEntries(signed.filter((h) => h !== "host" && h !== "x-amz-date" && h !== "x-amz-content-sha256").map((h) => [h, String(req.headers[h])]));
    const amz = String(req.headers["x-amz-date"]);
    const date = new Date(`${amz.slice(0, 4)}-${amz.slice(4, 6)}-${amz.slice(6, 8)}T${amz.slice(9, 11)}:${amz.slice(11, 13)}:${amz.slice(13, 15)}Z`);
    const expected = signV4({ method: req.method!, url, headers, payloadHash: String(req.headers["x-amz-content-sha256"]), accessKeyId: "key-id", secretAccessKey: secret, date });
    log.push(`${req.method} ${req.url}`);
    if (expected.authorization !== auth) return void res.writeHead(403).end("SignatureDoesNotMatch");
    const key = req.url!.replace(/^\/bucket\//, "");
    if (req.method === "PUT") {
      if (sha256(body) !== req.headers["x-amz-content-sha256"]) return void res.writeHead(400).end("BadDigest");
      objects.set(key, { body, headers: req.headers });
      return void res.writeHead(200).end();
    }
    const obj = objects.get(key);
    if (!obj) return void res.writeHead(404).end();
    res.writeHead(200, { "x-amz-meta-sha256": String(obj.headers["x-amz-meta-sha256"]) }).end();
  });
  return { server, objects, log };
}

describe("sync to the bucket", () => {
  const bucket = fakeBucket("the-secret");
  let endpoint = "";
  beforeAll(async () => {
    await new Promise<void>((resolve) => bucket.server.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${(bucket.server.address() as AddressInfo).port}`;
  });
  afterAll(() => bucket.server.close());

  // A small ONNX model (one 32×32 weight) to exercise the float16 conversion.
  const len = (n: number) => {
    const out = [];
    do {
      let b = n & 0x7f;
      n >>>= 7;
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    return Buffer.from(out);
  };
  const bytesField = (f: number, data: Buffer) => Buffer.concat([len((f << 3) | 2), len(data.length), data]);
  const weight = Buffer.from(Float32Array.from({ length: 1024 }, (_, i) => i / 1000).buffer);
  const tensor = Buffer.concat([len(1 << 3), len(32), len(1 << 3), len(32), len(2 << 3), len(1), bytesField(8, Buffer.from("W")), bytesField(9, weight)]);
  const model = Buffer.concat([len(1 << 3), len(8), bytesField(7, bytesField(5, tensor))]);
  const light = lighten(model, "fp16w") as Buffer;
  const json = Buffer.from('{"a":1}');

  const hub = new Map<string, Buffer>([
    ["https://huggingface.co/x/y/resolve/0/onnx/m.onnx", model],
    ["https://huggingface.co/x/y/resolve/0/onnx/c.json", json],
  ]);
  const fetchFn = async (url: string) => (hub.has(url) ? new Response(new Uint8Array(hub.get(url)!)) : new Response(null, { status: 404 }));
  const entries = [
    { key: "x/y/0-fp16/onnx/m.onnx", bytes: light.length, sha256: sha256(light), convert: "fp16w", source: { url: "https://huggingface.co/x/y/resolve/0/onnx/m.onnx", bytes: model.length, sha256: sha256(model) } },
    { key: "x/y/0/onnx/c.json", bytes: json.length, sha256: sha256(json), source: { url: "https://huggingface.co/x/y/resolve/0/onnx/c.json", bytes: json.length, sha256: sha256(json) } },
    { key: "x/y/0-fp16/NOTICE.txt", bytes: 2, sha256: sha256("hi"), data: Buffer.from("hi") },
  ];

  it("downloads, verifies, converts and uploads with immutable caching, then skips what is there", async () => {
    const client = bucketClient({ endpoint, bucket: "bucket", accessKeyId: "key-id", secretAccessKey: "the-secret" });
    const cache = mkdtempSync(join(tmpdir(), "sync-r2-"));
    const first = await sync({ client, cache, fetchFn, entries, log: () => {} });
    expect(first.uploaded).toEqual(entries.map((e) => e.key));
    const onnx = bucket.objects.get("x/y/0-fp16/onnx/m.onnx")!;
    expect(onnx.body.equals(light)).toBe(true);
    expect(onnx.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(onnx.headers["content-type"]).toBe("application/octet-stream");
    expect(bucket.objects.get("x/y/0/onnx/c.json")!.headers["content-type"]).toBe("application/json");
    const second = await sync({ client, cache, fetchFn: async () => new Response(null, { status: 500 }), entries, log: () => {} });
    expect(second).toMatchObject({ uploaded: [], skipped: entries.map((e) => e.key) });
  });

  it("uploads nothing when a download does not match its pinned SHA-256", async () => {
    const client = bucketClient({ endpoint, bucket: "bucket", accessKeyId: "key-id", secretAccessKey: "the-secret" });
    const bad = [{ ...entries[1], key: "x/y/0/onnx/bad.json", source: { ...entries[1].source, sha256: sha256("other") } }];
    await expect(sync({ client, cache: mkdtempSync(join(tmpdir(), "sync-r2-")), fetchFn, entries: bad, log: () => {} })).rejects.toThrow(/SHA-256/);
    expect(bucket.objects.has("x/y/0/onnx/bad.json")).toBe(false);
  });

  it("is rejected with the wrong secret", async () => {
    const client = bucketClient({ endpoint, bucket: "bucket", accessKeyId: "key-id", secretAccessKey: "wrong" });
    await expect(client.put("x/z", Buffer.from("a"), sha256("a"))).rejects.toThrow(/403/);
  });
});
