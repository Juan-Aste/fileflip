// Copies the AI models to our Cloudflare R2 bucket (task 11.4b, steps for the
// owner in docs/modelos-r2.md). The site then downloads them from
// NEXT_PUBLIC_MODELS_BASE_URL (src/lib/models/sources.ts), with the same layout
// as Hugging Face:
//   <repo>/<commit>/<path>          Supertonic 3 JSON files and voices, Whisper tiny and base
//   <repo>/<commit>-fp16/onnx/…     Supertonic's four ONNX with float16 weights (onnx-light.mjs)
// Every file is downloaded from Hugging Face at its pinned commit and checked
// against the size and SHA-256 the site expects (the float16 files are made
// here and checked against theirs) before anything is uploaded. Files already
// in the bucket with the same SHA-256 are skipped, so it can be run again.
//
//   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… node scripts/models/sync-r2.mjs
//   node scripts/models/sync-r2.mjs --dry-run        (download and verify only, no credentials)
//   --cache=<dir>  where downloads are kept between runs (default: a folder in the system temp dir)
//
// Credentials are read only from those environment variables and never printed.
// Requests are signed with AWS Signature V4 (R2's S3-compatible API) by hand:
// no extra dependency.
import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lighten } from "./onnx-light.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const IMMUTABLE = "public, max-age=31536000, immutable";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

/** Content-Type of a file by extension. */
export function contentType(path) {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".txt") || path.endsWith("/LICENSE")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

/**
 * AWS Signature V4 headers for one request. `headers` are signed too (lower-case
 * names); `payloadHash` is the hex SHA-256 of the body.
 */
export function signV4({ method, url, headers = {}, payloadHash = sha256(""), accessKeyId, secretAccessKey, region = "auto", service = "s3", date = new Date() }) {
  const u = new URL(url);
  const amzDate = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const all = { ...headers, host: u.host, "x-amz-date": amzDate };
  if (payloadHash && service === "s3") all["x-amz-content-sha256"] = payloadHash;
  const names = Object.keys(all).map((n) => n.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, " ")]));
  const encode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const path = u.pathname.split("/").map((seg) => encode(decodeURIComponent(seg))).join("/") || "/";
  const query = [...u.searchParams].map(([k, v]) => [encode(k), encode(v)]).sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&");
  const canonical = [method, path, query, names.map((n) => `${n}:${lower[n]}\n`).join(""), names.join(";"), payloadHash].join("\n");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), region), service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
}

// fetch sets Host from the URL (it is signed all the same).
const send = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => name !== "host"));

/** A minimal S3 client for one bucket: HEAD and PUT of whole objects. */
export function bucketClient({ endpoint, bucket, accessKeyId, secretAccessKey, fetchFn = fetch }) {
  const urlOf = (key) => `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
  return {
    /** The object's stored SHA-256 (our metadata), "" when it exists without it, or null when missing. */
    async storedSha256(key) {
      const url = urlOf(key);
      const res = await fetchFn(url, { method: "HEAD", headers: send(signV4({ method: "HEAD", url, payloadHash: sha256(""), accessKeyId, secretAccessKey })) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HEAD ${key}: HTTP ${res.status}`);
      return res.headers.get("x-amz-meta-sha256") ?? "";
    },
    async put(key, body, hash) {
      const url = urlOf(key);
      const headers = { "content-type": contentType(key), "cache-control": IMMUTABLE, "x-amz-meta-sha256": hash };
      const res = await fetchFn(url, { method: "PUT", body, headers: send(signV4({ method: "PUT", url, headers, payloadHash: hash, accessKeyId, secretAccessKey })) });
      if (!res.ok) throw new Error(`PUT ${key}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    },
  };
}

/** Everything the site can download from the bucket: { key, bytes, sha256, source: { url, bytes, sha256 }, convert? }. */
export async function manifest() {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url);
  const tts = await jiti.import(join(root, "src/lib/tts/model.ts"));
  const whisper = await jiti.import(join(root, "src/lib/transcribe/model.ts"));
  const hub = (repo, rev, path) => `https://huggingface.co/${repo}/resolve/${rev}/${path}`;
  const list = [];
  const repo = tts.SUPERTONIC_REPO, rev = tts.SUPERTONIC_REVISION;
  for (const f of [...tts.supertonicFiles, ...Object.values(tts.supertonicVoiceFiles)]) {
    const light = tts.supertonicLightFiles.find((l) => l.path === f.path);
    const source = { url: hub(repo, rev, f.path), bytes: f.bytes, sha256: f.sha256 };
    if (light) list.push({ key: `${repo}/${tts.SUPERTONIC_LIGHT_REVISION}/${f.path}`, bytes: light.bytes, sha256: light.sha256, source, convert: "fp16w" });
    else list.push({ key: `${repo}/${rev}/${f.path}`, bytes: f.bytes, sha256: f.sha256, source });
  }
  // The weights' license travels with them (OpenRAIL-M 4.b), and a note says the float16 copy is modified (4.c).
  const license = { url: hub(repo, rev, "LICENSE"), bytes: 15_007, sha256: "0d944a9110fed9a9602d60e0423a272903e7bd21ab060490774efc77c2275e9f" };
  list.push({ key: `${repo}/${rev}/LICENSE`, ...license, source: license });
  list.push({ key: `${repo}/${tts.SUPERTONIC_LIGHT_REVISION}/LICENSE`, ...license, source: license });
  const notice = Buffer.from(
    `Supertonic 3 by Supertone Inc. (https://huggingface.co/${repo}/tree/${rev}), BigScience OpenRAIL-M (LICENSE).\n` +
      "MODIFIED FILES: onnx/*.onnx in this folder are a copy made by Fileflect with the weights stored as float16\n" +
      "(converted back to float32 when loaded), made with scripts/models/onnx-light.mjs from the original files.\n" +
      "The use restrictions of the license (Attachment A) apply to them.\n",
  );
  list.push({ key: `${repo}/${tts.SUPERTONIC_LIGHT_REVISION}/NOTICE.txt`, bytes: notice.length, sha256: sha256(notice), data: notice });
  for (const model of Object.values(whisper.whisperModels)) {
    for (const f of model.files) list.push({ key: `${model.repo}/${model.revision}/${f.path}`, bytes: f.bytes, sha256: f.sha256, source: { url: hub(model.repo, model.revision, f.path), bytes: f.bytes, sha256: f.sha256 } });
  }
  return list;
}

/** The verified bytes of one entry (downloaded once into `cache`, then converted if needed). */
export async function materialize(entry, { cache, fetchFn = fetch, log = () => {} }) {
  if (entry.data) return entry.data;
  const { url, bytes, sha256: expected } = entry.source;
  const file = join(cache, expected);
  let data = existsSync(file) ? readFileSync(file) : null;
  if (!data || sha256(data) !== expected) {
    log(`downloading ${url} (${(bytes / 1e6).toFixed(1)} MB)`);
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
    if (data.length !== bytes || sha256(data) !== expected) throw new Error(`${url}: size or SHA-256 does not match the pinned file`);
    mkdirSync(cache, { recursive: true });
    writeFileSync(file, data);
  }
  if (entry.convert) data = lighten(data, entry.convert);
  if (data.length !== entry.bytes || sha256(data) !== entry.sha256) throw new Error(`${entry.key}: size or SHA-256 does not match the pinned file`);
  return data;
}

/** Uploads what is missing or different; returns { uploaded, skipped } keys. */
export async function sync({ client, cache, fetchFn, log = console.log, dryRun = false, entries }) {
  entries ??= await manifest();
  const uploaded = [], skipped = [];
  for (const entry of entries) {
    if (!dryRun && (await client.storedSha256(entry.key)) === entry.sha256) {
      skipped.push(entry.key);
      log(`ok       ${entry.key}`);
      continue;
    }
    const data = await materialize(entry, { cache, fetchFn, log });
    if (dryRun) {
      log(`verified ${entry.key}`);
      continue;
    }
    await client.put(entry.key, data, entry.sha256);
    uploaded.push(entry.key);
    log(`uploaded ${entry.key} (${(data.length / 1e6).toFixed(1)} MB)`);
  }
  return { uploaded, skipped, total: entries.reduce((n, e) => n + e.bytes, 0) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes("--dry-run");
  const cache = process.argv.find((a) => a.startsWith("--cache="))?.slice(8) || join(tmpdir(), "fileflect-models");
  let client = null;
  if (!dryRun) {
    const env = (name) => {
      const value = process.env[name]?.trim();
      if (!value) {
        console.error(`Missing ${name}. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET (docs/modelos-r2.md).`);
        process.exit(1);
      }
      return value;
    };
    const account = env("R2_ACCOUNT_ID");
    client = bucketClient({ endpoint: `https://${account}.r2.cloudflarestorage.com`, bucket: env("R2_BUCKET"), accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") });
  }
  try {
    const { uploaded, skipped, total } = await sync({ client, cache, dryRun });
    console.log(dryRun ? `\nAll files verified (${(total / 1e6).toFixed(0)} MB). Nothing was uploaded (--dry-run).` : `\nDone: ${uploaded.length} uploaded, ${skipped.length} already there (${(total / 1e6).toFixed(0)} MB in the bucket).`);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}
