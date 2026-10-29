import { createJobPool, type JobOptions } from "@/lib/jobs";
import { modelsBaseUrl } from "@/lib/models/sources";
import { bytesToDownload, openModelStore } from "@/lib/tts/model-cache";
import { whisperCacheName, whisperModels, whisperSources, type WhisperModelId } from "./model";
import type { Segment } from "./whisper";

// Transcription from the page: one worker holding Whisper, started the first
// time the user transcribes (never on page load). Cancelling terminates the
// worker; the model stays in the Cache API, so the next run only reloads it.

const pool = createJobPool(() => new Worker(new URL("../../workers/transcribe.worker.ts", import.meta.url), { type: "module" }));

/** Bytes still to download before transcribing (0 when the model is cached). */
export async function whisperBytesToDownload(id: WhisperModelId): Promise<number> {
  const model = whisperModels[id];
  const base = modelsBaseUrl();
  return bytesToDownload(model.files.map((f) => whisperSources(model, f, base)), await openModelStore(whisperCacheName(model)));
}

/** Loads a model (downloading what is not cached); progress 0–1 by bytes. */
export const prepareWhisper = (model: WhisperModelId, job: JobOptions = {}) => pool.run<null>("prepare", { model, base: modelsBaseUrl() }, job);

export interface Transcript {
  segments: Segment[];
  /** Whisper's code of the language used ("es", "en"…), detected when none was chosen. */
  language: string;
}

/** Transcribes 16 kHz mono samples (the buffer is transferred to the worker). */
export const transcribeSamples = (
  model: WhisperModelId,
  samples: Float32Array<ArrayBuffer>,
  language: string | undefined,
  job: Omit<JobOptions, "transfer"> = {},
) => pool.run<Transcript>("transcribe", { model, audio: samples.buffer, language }, { ...job, transfer: [samples.buffer] });

/** Frees the model (well over 100 MB of memory), e.g. when leaving the page. */
export const disposeWhisper = () => pool.dispose();
