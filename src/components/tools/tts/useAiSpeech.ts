"use client";

import { useCallback, useState } from "react";
import type { AiSpeech } from "@/lib/tts/ai-voice";
import type { SupertonicVoice } from "@/lib/tts/model";
import { aiVoiceWorkers } from "@/lib/tts/parallel";
import type { SupertonicLanguage } from "@/lib/tts/supertonic";
import type { Sentence } from "@/lib/tts/text";
import { useQueuedSpeech, type QueuedSpeechControls } from "./useQueuedSpeech";

// Reading with the AI voice in the browser (Supertonic): each sentence is
// generated in the worker while the ones before it play (useQueuedSpeech).
// Each worker runs one sentence at a time, so the queue asks for as many at
// once as there are workers (1, or 2 on computers with spare cores): cancelling
// then only drops sentences not yet sent to them.

/** Sentences generated ahead of the one playing. */
const AHEAD = 3;

export interface AiSpeechOptions {
  sentences: readonly Sentence[];
  lang: SupertonicLanguage;
  voice: SupertonicVoice;
  /** Listening speed (0.75–2); the model speaks at 1.05 × this. */
  rate: number;
  /** Denoising steps per sentence (fewer on phones, to keep up with the playback). */
  steps: number;
}

export type AiSpeechControls = QueuedSpeechControls;

/** The model's speed for a listening speed. */
export const modelSpeed = (rate: number) => Math.min(2, Math.max(0.7, rate * 1.05));

type Speak = (text: string, options: { lang: SupertonicLanguage; voice: SupertonicVoice; speed: number; steps: number }) => Promise<AiSpeech>;

export function useAiSpeech({ sentences, lang, voice, rate, steps }: AiSpeechOptions): AiSpeechControls {
  const [workers] = useState(aiVoiceWorkers);
  const speed = modelSpeed(rate);
  const generate = useCallback(
    (text: string) =>
      // No signal for the worker: stopping a running sentence would terminate it and unload the model.
      import("@/lib/tts/ai-voice").then(({ speakAiSentence }) => (speakAiSentence as Speak)(text, { lang, voice, speed, steps })),
    [lang, voice, speed, steps],
  );
  return useQueuedSpeech({ sentences, settings: `${voice}|${speed}|${lang}|${steps}`, generate, ahead: AHEAD, concurrency: workers });
}
