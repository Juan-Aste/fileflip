"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSentencePlayer, type GeneratedAudio } from "@/lib/tts/player";
import { createPrefetchQueue } from "@/lib/tts/prefetch";
import type { Sentence } from "@/lib/tts/text";
import type { DeviceSpeech, SpeechStatus } from "./useDeviceSpeech";

// Reading with a generated voice (the in-browser AI voice now, a cloud voice
// later): sentences are generated ahead of playback by a prefetch queue
// (src/lib/tts/prefetch.ts) and each one is scheduled on the audio clock to
// start exactly when the previous one ends (src/lib/tts/player.ts), so a
// sentence ready in time leaves no silence beyond the pause that belongs to
// the text (task 13.1, docs/tts-pausas.md). Pause suspends the audio clock
// (the scheduled sentence waits with it); a seek, a new speed or a new voice
// stops what is scheduled and drops what was being prepared. The
// AudioContext is created or resumed inside a click (`unlock`): iOS only
// starts audio from a user gesture.

/** Silence after each sentence, as in the MP3. */
export const GAP_SECONDS = 0.3;

export type { GeneratedAudio };

export interface QueuedSpeechOptions {
  sentences: readonly Sentence[];
  /** Everything the audio depends on besides the text (voice, speed, language…): a change regenerates. */
  settings: string;
  generate: (text: string, signal: AbortSignal) => Promise<GeneratedAudio>;
  /** Sentences prepared after the one playing. */
  ahead: number;
  /** Requests generated at the same time. */
  concurrency: number;
}

export interface QueuedSpeechControls extends DeviceSpeech {
  /** Waiting for the current sentence to be generated. */
  waiting: boolean;
  /** Creates or resumes the audio output; call it at the start of a click handler. */
  unlock: () => void;
}

export function useQueuedSpeech({ sentences, settings, generate, ahead, concurrency }: QueuedSpeechOptions): QueuedSpeechControls {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const ctx = useRef<AudioContext | null>(null);
  const state = useRef({ sentences, generate, index, status });
  state.current = { sentences, generate, index, status };

  const { queue, player } = useMemo(() => {
    const count = () => state.current.sentences.length;
    const queue = createPrefetchQueue<GeneratedAudio>({
      generate: (at, signal) => state.current.generate(state.current.sentences[at].text, signal),
      ahead,
      concurrency,
      count,
    });
    const player = createSentencePlayer({
      output: () => ctx.current ?? (ctx.current = new AudioContext()),
      queue,
      count,
      gapSeconds: GAP_SECONDS,
      events: {
        onIndex: setIndex,
        onWaiting: setWaiting,
        onFinished: () => {
          setStatus("idle");
          setIndex(0);
          setFinished(true);
        },
        onFailed: () => {
          setStatus("idle");
          setFailed(true);
        },
      },
    });
    return { queue, player };
  }, [ahead, concurrency]);

  const unlock = useCallback(() => {
    try {
      ctx.current ??= new AudioContext();
      if (ctx.current.state === "suspended" && state.current.status !== "paused") void ctx.current.resume();
    } catch {
      // No Web Audio: play() reports the failure.
    }
  }, []);

  const start = useCallback(
    (at: number) => {
      setStatus("playing");
      setFinished(false);
      setFailed(false);
      player.start(at);
    },
    [player],
  );

  const play = useCallback((from?: number) => start(from ?? state.current.index), [start]);

  const pause = useCallback(() => {
    if (state.current.status !== "playing") return;
    void ctx.current?.suspend();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (state.current.status !== "paused") return;
    void ctx.current?.resume();
    setStatus("playing");
  }, []);

  const stop = useCallback(() => {
    player.stop();
    void ctx.current?.resume();
    setStatus("idle");
    setIndex(0);
    setWaiting(false);
  }, [player]);

  const seek = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(to, state.current.sentences.length - 1));
      if (state.current.status === "idle") return setIndex(target);
      if (state.current.status === "paused") void ctx.current?.resume();
      start(target);
    },
    [start],
  );

  // A new speed or voice applies at once: what was prepared is dropped and the current sentence is generated again.
  const lastSettings = useRef(settings);
  useEffect(() => {
    if (lastSettings.current === settings) return;
    lastSettings.current = settings;
    queue.reset();
    if (state.current.status !== "idle") {
      if (state.current.status === "paused") void ctx.current?.resume();
      start(state.current.index);
    }
  }, [settings, queue, start]);

  // New text: stop and forget what was generated.
  useEffect(() => {
    queue.reset();
    if (state.current.status !== "idle") stop();
    else setIndex(0);
  }, [sentences, queue, stop]);

  useEffect(
    () => () => {
      player.stop();
      queue.reset();
      void ctx.current?.close().catch(() => {});
      ctx.current = null;
    },
    [player, queue],
  );

  return { status, index, word: null, finished, failed, waiting, play, pause, resume, stop, seek, unlock };
}
