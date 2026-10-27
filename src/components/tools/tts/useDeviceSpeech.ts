"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "@/lib/tts/text";

// Reading with the device's voices (Web Speech API), one sentence per
// utterance: Chrome stops long utterances (~15 s with online voices) and
// Android ignores pause(), so pausing cancels and resuming speaks again from
// the last word heard. Each utterance carries a token: events of one that was
// cancelled (pause, seek, a new speed) are ignored. The first utterance is
// spoken inside the click handler: iOS only starts speech from a user gesture.

export type SpeechStatus = "idle" | "playing" | "paused";

export interface SpeechOptions {
  sentences: readonly Sentence[];
  voice: SpeechSynthesisVoice | undefined;
  /** BCP 47 tag used when there is no voice for the language. */
  lang: string;
  rate: number;
}

export interface DeviceSpeech {
  status: SpeechStatus;
  index: number;
  /** The word being read, as offsets in the text (when the browser reports word boundaries). */
  word: { start: number; end: number } | null;
  /** The last reading reached the end of the text. */
  finished: boolean;
  failed: boolean;
  play: (from?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (index: number) => void;
}

const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

/** The device's voices; `ready` once the list arrived (or after 3 s: some devices have none). */
export function useSpeechVoices(): { supported: boolean | null; voices: SpeechSynthesisVoice[]; ready: boolean } {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = synth();
    setSupported(Boolean(s) && typeof window.SpeechSynthesisUtterance === "function");
    if (!s) return;
    const load = () => {
      const list = s.getVoices();
      setVoices(list);
      if (list.length) setReady(true);
    };
    load();
    s.addEventListener?.("voiceschanged", load);
    // Some browsers fill the list late without the event.
    const timers = [250, 1000, 3000].map((ms) => setTimeout(load, ms));
    const giveUp = setTimeout(() => setReady(true), 3000);
    return () => {
      s.removeEventListener?.("voiceschanged", load);
      timers.forEach(clearTimeout);
      clearTimeout(giveUp);
    };
  }, []);
  return { supported, voices, ready };
}

export function useDeviceSpeech({ sentences, voice, lang, rate }: SpeechOptions): DeviceSpeech {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState<{ start: number; end: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);

  const token = useRef(0);
  // Chrome may drop events of an utterance nobody references (garbage collected).
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  // Where to resume within the current sentence (characters from its start).
  const resumeAt = useRef(0);
  const state = useRef({ sentences, voice, lang, rate, index, status });
  state.current = { sentences, voice, lang, rate, index, status };

  // Leaving the page stops the reading.
  useEffect(
    () => () => {
      token.current++;
      synth()?.cancel();
    },
    [],
  );

  const speak = useCallback((at: number, offset = 0) => {
    const s = synth();
    const { sentences, voice, lang, rate } = state.current;
    const sentence = sentences[at];
    if (!s || !sentence) return;
    const mine = ++token.current;
    s.cancel();
    if (s.paused) s.resume();
    const utterance = new SpeechSynthesisUtterance(sentence.text.slice(offset));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? lang;
    utterance.rate = rate;
    resumeAt.current = offset;
    utterance.onboundary = (event) => {
      if (mine !== token.current || (event.name && event.name !== "word")) return;
      const from = offset + event.charIndex;
      const length = event.charLength || (/^\S+/.exec(sentence.text.slice(from))?.[0].length ?? 0);
      resumeAt.current = from;
      setWord({ start: sentence.start + from, end: sentence.start + from + length });
    };
    utterance.onend = () => {
      if (mine !== token.current) return;
      setWord(null);
      if (at + 1 < state.current.sentences.length) {
        setIndex(at + 1);
        speak(at + 1);
      } else {
        token.current++;
        current.current = null;
        setStatus("idle");
        setIndex(0);
        setFinished(true);
      }
    };
    utterance.onerror = (event) => {
      if (mine !== token.current || event.error === "interrupted" || event.error === "canceled") return;
      token.current++;
      current.current = null;
      setStatus("idle");
      setWord(null);
      setFailed(true);
    };
    current.current = utterance;
    setIndex(at);
    setWord(null);
    setStatus("playing");
    setFinished(false);
    setFailed(false);
    s.speak(utterance);
  }, []);

  const halt = () => {
    token.current++;
    current.current = null;
    synth()?.cancel();
  };

  const play = useCallback((from?: number) => speak(from ?? state.current.index), [speak]);

  const pause = useCallback(() => {
    if (state.current.status !== "playing") return;
    const offset = resumeAt.current;
    halt();
    resumeAt.current = offset;
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (state.current.status === "paused") speak(state.current.index, resumeAt.current);
  }, [speak]);

  const stop = useCallback(() => {
    halt();
    resumeAt.current = 0;
    setStatus("idle");
    setIndex(0);
    setWord(null);
  }, []);

  const seek = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(to, state.current.sentences.length - 1));
      if (state.current.status === "playing") return speak(target);
      resumeAt.current = 0;
      setIndex(target);
      setWord(null);
    },
    [speak],
  );

  // A new speed or voice applies at once: the current sentence starts again with it.
  const voiceURI = voice?.voiceURI;
  useEffect(() => {
    if (state.current.status === "playing") speak(state.current.index);
  }, [rate, voiceURI, speak]);

  // New text: stop reading the old one.
  useEffect(() => {
    if (state.current.status !== "idle") stop();
    else setIndex(0);
  }, [sentences, stop]);

  return { status, index, word, finished, failed, play, pause, resume, stop, seek };
}
