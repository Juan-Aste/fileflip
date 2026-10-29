// The AI voice: Supertonic 3 (Supertone), ONNX models run in the browser with
// onnxruntime-web. Weights under BigScience OpenRAIL-M (commercial use allowed,
// with the use restrictions of its Attachment A, which our Terms pass on to
// users); decision and license notes in docs/tts-voz-ia.md. The upstream
// repository is archived, so every file is pinned to one Hugging Face commit
// and checked against its size and SHA-256 before use.

import { mirrorUrl, type ModelSource } from "@/lib/models/sources";

export const SUPERTONIC_REPO = "Supertone/supertonic-3";
/** Hugging Face commit of the files below (2026). */
export const SUPERTONIC_REVISION = "3cadd1ee6394adea1bd021217a0e650ede09a323";

export interface ModelFile {
  path: string;
  bytes: number;
  /** SHA-256 of the content, checked before the file is used or cached. */
  sha256: string;
}

export const supertonicFiles: readonly ModelFile[] = [
  { path: "onnx/duration_predictor.onnx", bytes: 3_700_147, sha256: "c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db" },
  { path: "onnx/text_encoder.onnx", bytes: 36_416_150, sha256: "c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff" },
  { path: "onnx/vector_estimator.onnx", bytes: 256_534_781, sha256: "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c" },
  { path: "onnx/vocoder.onnx", bytes: 101_424_195, sha256: "085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba" },
  { path: "onnx/tts.json", bytes: 8_253, sha256: "42078d3aef1cd43ab43021f3c54f47d2d75ceb4e75f627f118890128b06a0d09" },
  { path: "onnx/unicode_indexer.json", bytes: 277_676, sha256: "9bf7346e43883a81f8645c81224f786d43c5b57f3641f6e7671a7d6c493cb24f" },
];

/**
 * The four ONNX above with their weights stored as float16 (half the download,
 * same float32 math; WER and audio compared in docs/tts-modelo-liviano.md),
 * made from them by scripts/models/onnx-light.mjs ("fp16w"). Supertone does
 * not publish them: they are served from our own storage when configured.
 */
export const supertonicLightFiles: readonly ModelFile[] = [
  { path: "onnx/duration_predictor.onnx", bytes: 1_993_709, sha256: "6f53e96d47917a28918ed0970abf393089e3bc6d7d6bf7b115342a1bdae89c36" },
  { path: "onnx/text_encoder.onnx", bytes: 18_474_768, sha256: "cbf2c872a22b7d1d99303425c249ee1eca1198db11fe1459aec53921073159a0" },
  { path: "onnx/vector_estimator.onnx", bytes: 128_735_277, sha256: "0e3c8d92896ad6642036a5a856f4311a087f712dffcaf2e4c0f412a64aded6a4" },
  { path: "onnx/vocoder.onnx", bytes: 50_810_904, sha256: "8ea6955582b93eb4ac5d8746549e49cb4d6b5ffaa844f8506f8d9fa0ab9a4309" },
];

/** Preset voices shipped with the model (F = female, M = male); one is downloaded when chosen (~290 KB each). */
export const supertonicVoices = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"] as const;
export type SupertonicVoice = (typeof supertonicVoices)[number];

/** Style file of each preset voice. */
export const supertonicVoiceFiles: Readonly<Record<SupertonicVoice, ModelFile>> = {
  F1: { path: "voice_styles/F1.json", bytes: 292_046, sha256: "bbdec6ee00231c2c742ad05483df5334cab3b52fda3ba38e6a07059c4563dbc2" },
  F2: { path: "voice_styles/F2.json", bytes: 292_423, sha256: "7c722c6a72707b1a77f035d67f0d1351ba187738e06f7683e8c72b1df3477fc6" },
  F3: { path: "voice_styles/F3.json", bytes: 290_794, sha256: "12f6ef2573baa2defa1128069cb59f203e3ab67c92af77b42df8a0e3a2f7c6ab" },
  F4: { path: "voice_styles/F4.json", bytes: 291_808, sha256: "c2fa764c1225a76dfc3e2c73e8aa4f70d9ee48793860eb34c295fff01c2e032b" },
  F5: { path: "voice_styles/F5.json", bytes: 291_479, sha256: "45966e73316415626cf41a7d1c6f3b4c70dbc1ba2bee5c1978ef0ce33244fc8d" },
  M1: { path: "voice_styles/M1.json", bytes: 291_748, sha256: "e35604687f5d23694b8e91593a93eec0e4eca6c0b02bb8ed69139ab2ea6b0a5b" },
  M2: { path: "voice_styles/M2.json", bytes: 292_055, sha256: "b76cbf62bac707c710cf0ae5aba5e31eea1a6339a9734bfae33ab98499534a50" },
  M3: { path: "voice_styles/M3.json", bytes: 290_198, sha256: "ea1ac35ccb91b0d7ecad533a2fbd0eec10c91513d8951e3b25fbba99954e159b" },
  M4: { path: "voice_styles/M4.json", bytes: 291_522, sha256: "ca8eefad4fcd989c9379032ff3e50738adc547eeb5e221b82593a6d7b3bac303" },
  M5: { path: "voice_styles/M5.json", bytes: 291_469, sha256: "dd22b92740314321f8ae11c5e87f8dd60d060f15dd3a632b5adf77f471f77af2" },
};

/** Languages of the site the model speaks; Chinese has no compatible AI voice (device voices only). */
export const aiVoiceLanguages = ["es", "en", "pt", "fr"] as const;

/** Download URL of a file at the pinned commit (served by Hugging Face's CDN, not by our server). */
export const supertonicUrl = (path: string) => `https://huggingface.co/${SUPERTONIC_REPO}/resolve/${SUPERTONIC_REVISION}/${path}`;

/** Folder ("revision") of the float16 ONNX in our storage, next to the original files. */
export const SUPERTONIC_LIGHT_REVISION = `${SUPERTONIC_REVISION}-fp16`;

/**
 * Where a model or voice file comes from, in order: with our storage (`base`,
 * src/lib/models/sources.ts), its copy there (the float16 ONNX for the four
 * models), then the original on Hugging Face.
 */
export function supertonicSources(file: ModelFile, base: string): ModelSource[] {
  const hub = { file, url: supertonicUrl(file.path) };
  if (!base) return [hub];
  const light = supertonicLightFiles.find((f) => f.path === file.path);
  const own = light
    ? { file: light, url: mirrorUrl(base, SUPERTONIC_REPO, SUPERTONIC_LIGHT_REVISION, light.path) }
    : { file, url: mirrorUrl(base, SUPERTONIC_REPO, SUPERTONIC_REVISION, file.path) };
  return [own, hub];
}

/** Total download before the first voice: the four models and the two JSON files (smaller from our storage). */
export const supertonicDownloadBytes = (base: string) => supertonicFiles.reduce((sum, f) => sum + supertonicSources(f, base)[0].file.bytes, 0);
