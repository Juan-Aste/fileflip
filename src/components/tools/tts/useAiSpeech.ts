"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiSpeech } from "@/lib/tts/ai-voice";
import type { SupertonicVoice } from "@/lib/tts/model";
import type { SupertonicLanguage } from "@/lib/tts/supertonic";
import type { Sentence } from "@/lib/tts/text";
import type { DeviceSpeech, SpeechStatus } from "./useDeviceSpeech";

// Reading with the AI voice: each sentence is generated in the worker and
// played with Web Audio while the next one is generated (progressive). Pause
// suspends the audio clock; a new speed or voice generates the current
// sentence again. The AudioContext is created or resumed inside a click
// (`unlock`): iOS only starts audio from a user gesture.

/** Silence after each sentence, as in the MP3. */
const GAP_SECONDS = 0.3;
/** Sentences generated ahead of the one playing. */
const AHEAD = 2;

export interface AiSpeechOptions {
  sentences: readonly Sentence[];
  lang: SupertonicLanguage;
  voice: SupertonicVoice;
  /** Listening speed (0.75–2); the model speaks at 1.05 × this. */
  rate: number;
  /** Denoising steps per sentence (fewer on phones, to keep up with the playback). */
  steps: number;
}

export interface AiSpeechControls extends DeviceSpeech {
  /** Waiting for the current sentence to be generated. */
  waiting: boolean;
  /** Creates or resumes the audio output; call it at the start of a click handler. */
  unlock: () => void;
}

/** The model's speed for a listening speed. */
export const modelSpeed = (rate: number) => Math.min(2, Math.max(0.7, rate * 1.05));

type Speak = (text: string, options: { lang: SupertonicLanguage; voice: SupertonicVoice; speed: number; steps: number }) => Promise<AiSpeech>;

export function useAiSpeech({ sentences, lang, voice, rate, steps }: AiSpeechOptions): AiSpeechControls {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const ctx = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const token = useRef(0);
  const generated = useRef(new Map<string, Promise<AiSpeech>>());
  const state = useRef({ sentences, lang, voice, rate, steps, index, status });
  state.current = { sentences, lang, voice, rate, steps, index, status };

  const unlock = useCallback(() => {
    try {
      ctx.current ??= new AudioContext();
      if (ctx.current.state === "suspended" && state.current.status !== "paused") void ctx.current.resume();
    } catch {
      // No Web Audio: play() reports the failure.
    }
  }, []);

  const silence = () => {
    const s = source.current;
    source.current = null;
    if (!s) return;
    s.onended = null;
    try {
      s.stop();
    } catch {
      // Never started.
    }
    s.disconnect();
  };

  const get = useCallback((at: number) => {
    const { sentences, lang, voice, rate, steps } = state.current;
    const sentence = sentences[at];
    if (!sentence) return null;
    const speed = modelSpeed(rate);
    const key = `${at}|${voice}|${speed}|${lang}|${steps}`;
    let audio = generated.current.get(key);
    if (!audio) {
      audio = import("@/lib/tts/ai-voice").then(({ speakAiSentence }) => (speakAiSentence as Speak)(sentence.text, { lang, voice, speed, steps }));
      audio.catch(() => generated.current.delete(key));
      generated.current.set(key, audio);
      // Keep only the sentences around the current one.
      for (const k of generated.current.keys()) {
        const i = Number(k.split("|")[0]);
        if (i < at - 1 || i > at + AHEAD + 1) generated.current.delete(k);
      }
    }
    return audio;
  }, []);

  const speak = useCallback(
    async (at: number) => {
      const mine = ++token.current;
      silence();
      setIndex(at);
      setStatus("playing");
      setFinished(false);
      setFailed(false);
      setWaiting(true);
      try {
        const audio = await get(at);
        if (mine !== token.current || !audio) return;
        for (let i = 1; i <= AHEAD; i++) void get(at + i)?.catch(() => {});
        const out = ctx.current ?? (ctx.current = new AudioContext());
        const gap = Math.round(GAP_SECONDS * audio.sampleRate);
        const buffer = out.createBuffer(1, audio.pcm.length + gap, audio.sampleRate);
        buffer.copyToChannel(audio.pcm as Float32Array<ArrayBuffer>, 0);
        const node = out.createBufferSource();
        node.buffer = buffer;
        node.connect(out.destination);
        node.onended = () => {
          if (mine !== token.current) return;
          source.current = null;
          if (at + 1 < state.current.sentences.length) void speak(at + 1);
          else {
            token.current++;
            setStatus("idle");
            setIndex(0);
            setFinished(true);
          }
        };
        source.current = node;
        setWaiting(false);
        node.start();
      } catch {
        if (mine !== token.current) return;
        token.current++;
        setWaiting(false);
        setStatus("idle");
        setFailed(true);
      }
    },
    [get],
  );

  const play = useCallback((from?: number) => void speak(from ?? state.current.index), [speak]);

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
    token.current++;
    silence();
    void ctx.current?.resume();
    setStatus("idle");
    setIndex(0);
    setWaiting(false);
  }, []);

  const seek = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(to, state.current.sentences.length - 1));
      if (state.current.status === "idle") return setIndex(target);
      if (state.current.status === "paused") void ctx.current?.resume();
      void speak(target);
    },
    [speak],
  );

  // A new speed or voice applies at once: the current sentence is generated again.
  useEffect(() => {
    if (state.current.status !== "idle") {
      if (state.current.status === "paused") void ctx.current?.resume();
      void speak(state.current.index);
    }
  }, [rate, voice, speak]);

  // New text or language: stop and forget what was generated.
  useEffect(() => {
    generated.current.clear();
    if (state.current.status !== "idle") stop();
    else setIndex(0);
  }, [sentences, lang, stop]);

  useEffect(
    () => () => {
      token.current++;
      silence();
      void ctx.current?.close().catch(() => {});
      ctx.current = null;
    },
    [],
  );

  return { status, index, word: null, finished, failed, waiting, play, pause, resume, stop, seek, unlock };
}
