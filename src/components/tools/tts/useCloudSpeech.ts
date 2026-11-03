"use client";

import { useCallback, useState } from "react";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError } from "@/lib/convert-error";
import type { Sentence } from "@/lib/tts/text";
import { useQueuedSpeech, type QueuedSpeechControls } from "./useQueuedSpeech";

// Reading with a cloud voice (task 13.3c): each sentence is one request to
// /api/tts, several prepared ahead and in parallel (useQueuedSpeech) so the
// next one is ready when the current one ends. Skipping or changing voice or
// speed aborts the requests still running.

/** Sentences requested ahead, and at once. */
const AHEAD = 3;
const CONCURRENCY = 3;

export interface CloudSpeechControls extends QueuedSpeechControls {
  /** Why the last reading failed (daily limit, monthly cap…), when known. */
  errorCode: ApiErrorCode | null;
}

export function useCloudSpeech({ sentences, voice, rate }: { sentences: readonly Sentence[]; voice: string; rate: number }): CloudSpeechControls {
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const generate = useCallback(
    async (text: string, signal: AbortSignal) => {
      const { speakCloudSentence } = await import("@/lib/tts/cloud-client");
      try {
        const audio = await speakCloudSentence(text, { voice, rate }, signal);
        return audio;
      } catch (error) {
        if (!signal.aborted) setErrorCode(error instanceof ConversionError ? error.code : "serviceUnavailable");
        throw error;
      }
    },
    [voice, rate],
  );
  const controls = useQueuedSpeech({ sentences, settings: `cloud|${voice}|${rate}`, generate, ahead: AHEAD, concurrency: CONCURRENCY });
  const play = useCallback(
    (from?: number) => {
      setErrorCode(null);
      controls.play(from);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controls.play],
  );
  return { ...controls, play, errorCode };
}
