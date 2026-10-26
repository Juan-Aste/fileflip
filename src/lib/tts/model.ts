// The AI voice: Supertonic 3 (Supertone), ONNX models run in the browser with
// onnxruntime-web. Weights under BigScience OpenRAIL-M (commercial use allowed,
// with the use restrictions of its Attachment A, which our Terms pass on to
// users); decision and license notes in docs/tts-voz-ia.md. The upstream
// repository is archived, so every file is pinned to one Hugging Face commit
// and checked against its size and SHA-256 before use.

export const SUPERTONIC_REPO = "Supertone/supertonic-3";
/** Hugging Face commit of the files below (2026). */
export const SUPERTONIC_REVISION = "3cadd1ee6394adea1bd021217a0e650ede09a323";

export interface ModelFile {
  path: string;
  bytes: number;
  /** SHA-256 of the content (the large ONNX files; small JSON files are checked by size and parsing). */
  sha256?: string;
}

export const supertonicFiles: readonly ModelFile[] = [
  { path: "onnx/duration_predictor.onnx", bytes: 3_700_147, sha256: "c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db" },
  { path: "onnx/text_encoder.onnx", bytes: 36_416_150, sha256: "c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff" },
  { path: "onnx/vector_estimator.onnx", bytes: 256_534_781, sha256: "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c" },
  { path: "onnx/vocoder.onnx", bytes: 101_424_195, sha256: "085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba" },
  { path: "onnx/tts.json", bytes: 8_253 },
  { path: "onnx/unicode_indexer.json", bytes: 277_676 },
];

/** Preset voices shipped with the model (F = female, M = male); one is downloaded when chosen (~290 KB each). */
export const supertonicVoices = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"] as const;
export type SupertonicVoice = (typeof supertonicVoices)[number];

/** Languages of the site the model speaks; Chinese has no compatible AI voice (device voices only). */
export const aiVoiceLanguages = ["es", "en", "pt", "fr"] as const;

/** Download URL of a file at the pinned commit (served by Hugging Face's CDN, not by our server). */
export const supertonicUrl = (path: string) => `https://huggingface.co/${SUPERTONIC_REPO}/resolve/${SUPERTONIC_REVISION}/${path}`;

/** Total download before the first voice: the four models and the two JSON files. */
export const supertonicDownloadBytes = supertonicFiles.reduce((sum, f) => sum + f.bytes, 0);
