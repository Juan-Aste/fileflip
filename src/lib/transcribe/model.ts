// Whisper (OpenAI) speech recognition in the browser: ONNX exports of the
// weights by Hugging Face's onnx-community, run with onnxruntime-web (already
// used by the AI voice). Weights: MIT (openai/whisper on GitHub; the Hugging
// Face card says Apache-2.0, also permissive). Every file is pinned to one
// commit and checked against its size and SHA-256 before use; decision and
// measurements in docs/transcripcion.md.
import { mirrorUrl, type ModelSource } from "../models/sources";
import type { ModelFile } from "@/lib/tts/model";

export type WhisperModelId = "tiny" | "base";

export interface WhisperModel {
  id: WhisperModelId;
  repo: string;
  /** Hugging Face commit of the files below. */
  revision: string;
  /** 8-bit quantized encoder and merged decoder (with and without past keys in one graph). */
  files: readonly ModelFile[];
}

// The tokenizer and the feature extractor settings are the same for both sizes.
const tokenizer: ModelFile = { path: "tokenizer.json", bytes: 2_480_466, sha256: "27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566" };
const preprocessor: ModelFile = { path: "preprocessor_config.json", bytes: 339, sha256: "a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d" };

export const whisperModels: Readonly<Record<WhisperModelId, WhisperModel>> = {
  tiny: {
    id: "tiny",
    repo: "onnx-community/whisper-tiny",
    revision: "ff4177021cc41f7db950912b73ea4fdf7d01d8e7",
    files: [
      { path: "onnx/encoder_model_quantized.onnx", bytes: 10_124_990, sha256: "2af4a414ca47aa30f61246017e5fe82b0a8d229281d1255ba666a2a7f6b84d19" },
      { path: "onnx/decoder_model_merged_quantized.onnx", bytes: 30_719_241, sha256: "25e807a962b6349356d0ea5d0dfe530b7e5bf0e2a484aeca0359d03143faddd3" },
      { path: "config.json", bytes: 2_243, sha256: "46aeea0a406afbeb563fc8e59ca10609203df4299af6a83f73752fef369efd2d" },
      { path: "generation_config.json", bytes: 3_772, sha256: "f5c67e5a4f7102f8cb4d058bc95da276bbc19eeec997267c3bb0f25ef68facd1" },
      preprocessor,
      tokenizer,
    ],
  },
  base: {
    id: "base",
    repo: "onnx-community/whisper-base",
    revision: "1846881b6b3a3024392c1eea3ad983695bc23925",
    files: [
      { path: "onnx/encoder_model_quantized.onnx", bytes: 23_201_314, sha256: "5862993336bf33acd23736071aae2b32261d3b1b2f37780194460d4ef974dd46" },
      { path: "onnx/decoder_model_merged_quantized.onnx", bytes: 53_693_315, sha256: "fa3ef9902734ce5ae6f9ef2bdb2ba9a6c4b5785b09f4f420ce036573dc9d090b" },
      { path: "config.json", bytes: 2_243, sha256: "f4d0608f7d918166da7edb3e188de5ef1bfe70d9802e785d271fd88111e9cf4b" },
      { path: "generation_config.json", bytes: 3_832, sha256: "61070cf8de25b1e9256e8e102ded49d8d24a8369ed36ef84fdf21549e68125a0" },
      preprocessor,
      tokenizer,
    ],
  },
};

/** Download URL of a file at the pinned commit (Hugging Face's CDN, not our server). */
export const whisperUrl = (model: WhisperModel, path: string) => `https://huggingface.co/${model.repo}/resolve/${model.revision}/${path}`;

/** Where a file comes from, in order: our storage (`base`, same file) when configured, then Hugging Face. */
export function whisperSources(model: WhisperModel, file: ModelFile, base: string): ModelSource[] {
  const hub = { file, url: whisperUrl(model, file.path) };
  return base ? [{ file, url: mirrorUrl(base, model.repo, model.revision, file.path) }, hub] : [hub];
}

/** What a model downloads the first time (later uses read it from the Cache API). */
export const whisperDownloadBytes = (model: WhisperModel) => model.files.reduce((sum, f) => sum + f.bytes, 0);

/** One Cache API cache per model and pinned commit: a new version never reads old files. */
export const whisperCacheName = (model: WhisperModel) => `fileflect-whisper-${model.id}-${model.revision.slice(0, 12)}`;

/**
 * Longest audio accepted (seconds). The whole recording is kept as 16 kHz
 * float samples (~115 MB for 30 min) and the fast model runs at about real
 * time on a phone; measured in docs/transcripcion.md.
 */
export const MAX_TRANSCRIBE_SECONDS = 30 * 60;

/** Languages Whisper transcribes (the codes of its generation config; "jw" is Javanese). */
export const whisperLanguageCodes = (
  "af am ar as az ba be bg bn bo br bs ca cs cy da de el en es et eu fa fi fo fr gl gu haw ha he hi hr ht hu hy id is it ja jw ka kk km kn ko " +
  "la lb ln lo lt lv mg mi mk ml mn mr ms mt my ne nl nn no oc pa pl ps pt ro ru sa sd si sk sl sn so sq sr su sv sw ta te tg th tk tl tr tt uk ur uz vi yi yo zh"
).split(" ");
