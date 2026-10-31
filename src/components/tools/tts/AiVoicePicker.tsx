"use client";

// Hear each AI voice before downloading the model: a short recording per voice
// and language, served as a static file (public/tts-samples/) and fetched only
// when its button is pressed. Choosing a voice here does not download anything
// either: the model comes when the user plays the text or asks for the MP3.
import { Check, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { supertonicVoices, type SupertonicVoice } from "@/lib/tts/model";
import { RECOMMENDED_VOICE, samplePath } from "@/lib/tts/recommended";
import type { SupertonicLanguage } from "@/lib/tts/supertonic";

interface Props {
  lang: SupertonicLanguage;
  voice: SupertonicVoice;
  /** Download size of the model, already formatted. */
  size: string;
  disabled?: boolean;
  onChoose: (voice: SupertonicVoice) => void;
}

export function AiVoicePicker({ lang, voice, size, disabled, onChoose }: Props) {
  const t = useTranslations("ReadAloudTool");
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<SupertonicVoice | null>(null);
  const [failed, setFailed] = useState(false);
  const recommended = RECOMMENDED_VOICE[lang];

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  };
  useEffect(() => stop, []);
  useEffect(stop, [lang]);

  function toggle(v: SupertonicVoice) {
    if (playing === v) return stop();
    stop();
    const a = new Audio(samplePath(lang, v));
    audio.current = a;
    setFailed(false);
    setPlaying(v);
    a.onended = () => audio.current === a && setPlaying(null);
    a.play().catch(() => {
      if (audio.current !== a) return;
      setFailed(true);
      setPlaying(null);
    });
  }

  const name = (v: SupertonicVoice) => t(v.startsWith("F") ? "aiVoiceFemale" : "aiVoiceMale", { n: v.slice(1) });

  return (
    <details className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">{t("aiSamplesTitle")}</summary>
      <p className="mt-2 text-xs text-muted">{t("aiSamplesNote", { size })}</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {supertonicVoices.map((v) => {
          const chosen = v === voice;
          return (
            <li key={v} className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${chosen ? "border-brand bg-brand-soft" : "border-transparent"}`}>
              <button
                type="button"
                onClick={() => toggle(v)}
                aria-label={playing === v ? t("aiSampleStop", { voice: name(v) }) : t("aiSamplePlay", { voice: name(v) })}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground hover:border-brand"
              >
                {playing === v ? <Square aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
              </button>
              <span className="flex-1">
                {name(v)}
                {v === recommended && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">{t("aiRecommended")}</span>}
              </span>
              <button
                type="button"
                onClick={() => onChoose(v)}
                disabled={disabled || chosen}
                aria-pressed={chosen}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand hover:underline disabled:cursor-default disabled:no-underline"
              >
                {chosen && <Check aria-hidden className="h-4 w-4" />}
                {chosen ? t("aiVoiceChosen") : t("aiVoiceChoose")}
                {!chosen && <span className="sr-only"> {name(v)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {failed && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t("aiSampleError")}
        </p>
      )}
    </details>
  );
}
