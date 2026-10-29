// Where the browser downloads the AI models from (task 11.4, docs/modelos-r2.md).
// By default, Hugging Face at pinned commits. With NEXT_PUBLIC_MODELS_BASE_URL
// set (our own copy on Cloudflare R2, e.g. https://modelos.fileflect.com) that
// copy is tried first, with the same layout as Hugging Face:
//   <base>/<repo>/<revision>/<path>
// e.g. <base>/onnx-community/whisper-base/1846881b…/onnx/encoder_model_quantized.onnx.
// Every file is still checked against its pinned size and SHA-256, and a failed
// download or check falls back to Hugging Face.
import type { ModelFile } from "@/lib/tts/model";

/** One place a file can come from: the expected bytes there and the URL. */
export interface ModelSource {
  file: ModelFile;
  url: string;
}

/**
 * Our model storage as "https://host[/path]" without a trailing slash, or ""
 * when not configured or not a valid https URL (http only for localhost, in tests).
 */
export function modelsBaseUrl(raw = process.env.NEXT_PUBLIC_MODELS_BASE_URL): string {
  const value = raw?.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return "";
    if (url.search || url.hash || url.username || url.password) return "";
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/** URL of a file in our storage. */
export const mirrorUrl = (base: string, repo: string, revision: string, path: string) => `${base}/${repo}/${revision}/${path}`;

