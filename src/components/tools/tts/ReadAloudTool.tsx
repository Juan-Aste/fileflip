"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eraser, FileUp, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { buttonPrimary, buttonSecondary, card, field } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import type { FormatId } from "@/config/formats";
import { errorCode } from "@/lib/convert-error";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { reportConversion } from "@/lib/stats-client";
import type { TextSourceKind } from "@/lib/tts/extract";
import { aiVoiceLanguages, supertonicDownloadBytes, supertonicUrl, supertonicVoices, type SupertonicVoice } from "@/lib/tts/model";
import { DEFAULT_STEPS, type SupertonicLanguage } from "@/lib/tts/supertonic";
import { detectLanguage, splitSentences, ttsLanguages, TTS_MAX_CHARS, type TtsLanguage } from "@/lib/tts/text";
import { clampRate, defaultVoice, SPEECH_RATES, speechLang, voicesFor } from "@/lib/tts/voices";
import ProgressBar from "../ProgressBar";
import ToolAlert from "../ToolAlert";
import { useAiSpeech } from "./useAiSpeech";
import { useDeviceSpeech, useSpeechVoices } from "./useDeviceSpeech";

const RATE_KEY = "fileflect.tts.rate";
const ENGINE_KEY = "fileflect.tts.engine";
const AI_VOICE_KEY = "fileflect.tts.aiVoice";
/** Slowest AI voice speed: the model does not speak slower than 0.7. */
const AI_MIN_RATE = 0.75;
/**
 * Longest text turned into an MP3 on a phone: ~4 minutes of audio, which a
 * mid-range phone takes ~15 minutes to generate (4× slower than a computer,
 * measured in docs/tts-voz-ia.md). Computers have no limit beyond TTS_MAX_CHARS.
 */
const AI_MP3_MAX_CHARS_MOBILE = 3_000;
/** Listening on a phone uses fewer denoising steps (~1.5× faster, measured in docs/tts-voz-ia.md); the MP3 always uses DEFAULT_STEPS. */
const PHONE_LISTEN_STEPS = 3;
const LICENSE_URL = supertonicUrl("LICENSE").replace("/resolve/", "/blob/");

const isAiLanguage = (language: TtsLanguage): language is SupertonicLanguage => (aiVoiceLanguages as readonly string[]).includes(language);
const isPhone = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches) && navigator.maxTouchPoints > 0;
const voiceKey = (language: TtsLanguage) => `fileflect.tts.voice.${language}`;

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

const sourceFormat: Record<TextSourceKind, FormatId> = { txt: "txt", md: "md", html: "html", docx: "docx", epub: "epub", pdf: "pdf", image: "png" };

/** Pastes, types or opens a text and reads it aloud with the device's voices. */
export default function ReadAloudTool() {
  const t = useTranslations("ReadAloudTool");
  const te = useTranslations("ApiErrors");
  const locale = useLocale();
  const pageLanguage = (ttsLanguages as readonly string[]).includes(locale) ? (locale as TtsLanguage) : "en";
  const textId = useId();
  const hintId = useId();
  const languageId = useId();
  const voiceId = useId();
  const rateId = useId();
  const engineId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [source, setSource] = useState<FormatId>("txt");
  const [language, setLanguage] = useState<TtsLanguage>(pageLanguage);
  const [languageChosen, setLanguageChosen] = useState(false);
  const [loading, setLoading] = useState<{ progress: number; controller: AbortController } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [engine, setEngine] = useState<"device" | "ai">("device");
  const [aiVoice, setAiVoice] = useState<SupertonicVoice>("F1");
  // Set once the model is loaded; a ref, since the download continues in the closure that started it.
  const aiReady = useRef(false);
  // Before the first AI reading: the size to confirm, then the download.
  const [aiPrep, setAiPrep] = useState<
    { phase: "confirm"; bytes: number; action: "play" | "mp3" } | { phase: "loading"; progress: number; controller: AbortController } | null
  >(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [mp3, setMp3] = useState<{ done: number; total: number; controller: AbortController } | null>(null);
  const [mp3Notice, setMp3Notice] = useState<string | null>(null);
  const [phone, setPhone] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    setPhone(isPhone());
    setRate(clampRate(readStored(RATE_KEY) ?? 1));
    if (readStored(ENGINE_KEY) === "ai") setEngine("ai");
    const v = readStored(AI_VOICE_KEY);
    if ((supertonicVoices as readonly string[]).includes(v ?? "")) setAiVoice(v as SupertonicVoice);
  }, []);

  const deferredText = useDeferredValue(text);
  const sentences = useMemo(() => splitSentences(deferredText), [deferredText]);
  const detected = useMemo(() => detectLanguage(deferredText, pageLanguage), [deferredText, pageLanguage]);
  useEffect(() => {
    if (!languageChosen) setLanguage(detected);
  }, [detected, languageChosen]);

  const device = useSpeechVoices();
  const voices = useMemo(() => voicesFor(device.voices, language), [device.voices, language]);
  useEffect(() => setVoiceURI(defaultVoice(voices, readStored(voiceKey(language)))?.voiceURI ?? null), [voices, language]);
  const voice = voices.find((v) => v.voiceURI === voiceURI);

  const aiLanguage = isAiLanguage(language) ? language : null;
  // Without device voices the AI voice is the only way to listen.
  const useAi = aiLanguage !== null && (engine === "ai" || device.supported === false);
  const aiRate = Math.max(AI_MIN_RATE, rate);
  const deviceSpeech = useDeviceSpeech({ sentences, voice, lang: speechLang[language], rate });
  const aiSpeech = useAiSpeech({ sentences, lang: aiLanguage ?? "en", voice: aiVoice, rate: aiRate, steps: phone ? PHONE_LISTEN_STEPS : DEFAULT_STEPS });
  const speech = useAi ? aiSpeech : deviceSpeech;
  const busy = mp3 !== null || aiPrep?.phase === "loading";
  const reading = speech.status !== "idle";

  // Switching the kind of voice stops the reading of the other one.
  useEffect(() => {
    if (useAi) deviceSpeech.stop();
    else aiSpeech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAi]);

  async function open(file: File | undefined) {
    if (!file) return;
    loading?.controller.abort();
    setLoadError(null);
    setNotice(null);
    if (file.size === 0) return setLoadError(te("fileDamaged"));
    if (file.size > (tools["text-to-speech"].limits.maxFileBytes ?? Infinity)) return setLoadError(te("fileTooLarge"));
    const controller = new AbortController();
    setLoading({ progress: 0, controller });
    try {
      const { extractTextFromFile } = await import("@/lib/tts/extract");
      const result = await extractTextFromFile(file, {
        ocrLanguage: language,
        signal: controller.signal,
        onProgress: (progress) => setLoading((l) => (l?.controller === controller ? { ...l, progress } : l)),
      });
      if (controller.signal.aborted) return;
      if (!result.text) return setLoadError(t("noTextInFile"));
      const cut = result.text.length > TTS_MAX_CHARS;
      setText(result.text.slice(0, TTS_MAX_CHARS));
      setSource(sourceFormat[result.kind]);
      setTitle(result.title ?? file.name.replace(/\.[^.]+$/, ""));
      setLanguageChosen(false);
      reported.current = false;
      setNotice(
        cut ? t("truncated", { count: result.text.length.toLocaleString(locale), max: TTS_MAX_CHARS.toLocaleString(locale) }) : t("loadedFrom", { name: file.name }),
      );
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(te(errorCode(error)));
    } finally {
      setLoading((l) => (l?.controller === controller ? null : l));
    }
  }

  /** Runs `action` with the AI voice, first confirming and downloading the model if needed. */
  async function withAiVoice(action: "play" | "mp3") {
    setAiError(null);
    if (aiReady.current) return action === "play" ? startPlaying() : void downloadMp3();
    const { aiVoiceDownloadBytes } = await import("@/lib/tts/ai-voice");
    const bytes = await aiVoiceDownloadBytes(aiVoice);
    if (bytes > 1_000_000) setAiPrep({ phase: "confirm", bytes, action });
    else void prepareAi(action);
  }

  async function prepareAi(action: "play" | "mp3") {
    aiSpeech.unlock();
    const controller = new AbortController();
    setAiPrep({ phase: "loading", progress: 0, controller });
    try {
      const { prepareAiVoice } = await import("@/lib/tts/ai-voice");
      await prepareAiVoice(aiVoice, {
        signal: controller.signal,
        onProgress: (progress) => setAiPrep((p) => (p?.phase === "loading" && p.controller === controller ? { ...p, progress } : p)),
      });
      aiReady.current = true;
      setAiPrep(null);
      if (action === "play") startPlaying();
      else void downloadMp3();
    } catch (error) {
      setAiPrep(null);
      if (!controller.signal.aborted) setAiError(te(errorCode(error)));
    }
  }

  async function downloadMp3() {
    if (!aiLanguage || sentences.length === 0) return;
    if (phone && text.length > AI_MP3_MAX_CHARS_MOBILE) return setAiError(t("mp3TooLongMobile", { max: number(AI_MP3_MAX_CHARS_MOBILE) }));
    if (!aiReady.current) return withAiVoice("mp3");
    aiSpeech.stop();
    setMp3Notice(null);
    const controller = new AbortController();
    const list = sentences;
    setMp3({ done: 0, total: list.length, controller });
    try {
      const [{ speakAiSentence }, { createMp3Writer, mp3FileName }] = await Promise.all([import("@/lib/tts/ai-voice"), import("@/lib/tts/mp3")]);
      const { modelSpeed } = await import("./useAiSpeech");
      let writer: Awaited<ReturnType<typeof createMp3Writer>> | null = null;
      for (let i = 0; i < list.length; i++) {
        // Cancelling waits for the sentence in progress: the loaded model is kept.
        const audio = await speakAiSentence(list[i]!.text, { lang: aiLanguage, voice: aiVoice, speed: modelSpeed(aiRate) });
        if (controller.signal.aborted) return;
        writer ??= await createMp3Writer(audio.sampleRate);
        await writer.add(audio.pcm);
        setMp3((m) => (m?.controller === controller ? { ...m, done: i + 1 } : m));
      }
      if (!writer) return;
      const data = await writer.finish();
      const name = mp3FileName(text, title);
      saveBlob(new Blob([data as Uint8Array<ArrayBuffer>], { type: "audio/mpeg" }), name);
      setMp3Notice(t("mp3Done", { name }));
      reportConversion({ tool: "text-to-speech", from: source, to: "mp3", size: new Blob([text]).size, success: true });
    } catch (error) {
      if (!controller.signal.aborted) setAiError(te(errorCode(error)));
    } finally {
      setMp3((m) => (m?.controller === controller ? null : m));
    }
  }

  function startPlaying() {
    speech.play();
  }

  function play() {
    if (sentences.length === 0 || busy) return;
    if (useAi) {
      aiSpeech.unlock();
      if (!aiReady.current) return void withAiVoice("play");
    }
    startPlaying();
    if (!reported.current) {
      reported.current = true;
      reportConversion({ tool: "text-to-speech", from: source, to: "txt", size: new Blob([text]).size, success: true });
    }
  }

  const toggle = () => (speech.status === "playing" ? speech.pause() : speech.status === "paused" ? speech.resume() : play());
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  // Space bar pauses and resumes, except while typing or on a control that uses it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("textarea, input, select, button, a, [contenteditable='true'], [role='slider']")) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      toggleRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const languageName = (l: TtsLanguage) => t(`languages.${l}`);
  const number = (n: number) => n.toLocaleString(locale);
  const statusText =
    speech.status === "playing" ? t("statusPlaying") : speech.status === "paused" ? t("statusPaused") : speech.finished ? t("statusFinished") : "";
  const noSupport = device.supported === false && !useAi;
  const noVoices = device.supported && device.ready && voices.length === 0;

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={textId} className="text-sm font-medium">
            {t("textLabel")}
          </label>
          <div className="flex items-center gap-1">
            {text && !reading && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setNotice(null);
                  setLanguageChosen(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-brand-soft hover:text-brand"
              >
                <Eraser aria-hidden="true" className="h-4 w-4" />
                {t("clear")}
              </button>
            )}
            <button
              type="button"
              disabled={reading}
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
            >
              <FileUp aria-hidden="true" className="h-4 w-4" />
              {t("openFile")}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            data-testid="tts-file"
            accept=".txt,.md,.markdown,.html,.htm,.docx,.epub,.pdf,image/*,.heic,.heif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void open(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p id={hintId} className="text-xs text-muted">
          {t("fileHint")}
        </p>
        {reading ? (
          <ReadingView text={text} sentence={sentences[speech.index]} word={speech.word} label={t("readingView")} />
        ) : (
          <div
            className="relative"
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              if (!e.dataTransfer.files.length) return;
              e.preventDefault();
              setDragging(false);
              void open(e.dataTransfer.files[0]);
            }}
          >
            <textarea
              id={textId}
              value={text}
              maxLength={TTS_MAX_CHARS}
              aria-describedby={hintId}
              placeholder={t("placeholder")}
              onChange={(e) => {
                setText(e.target.value);
                setNotice(null);
              }}
              rows={10}
              className={`h-72 w-full resize-y py-2 ${field}`}
            />
            {dragging && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand-soft/90 font-semibold text-brand">
                {t("dropHere")}
              </div>
            )}
          </div>
        )}
        <p className={`text-xs tabular-nums ${text.length >= TTS_MAX_CHARS ? "text-danger" : "text-muted"}`}>
          {text.length >= TTS_MAX_CHARS ? t("limitReached", { max: number(TTS_MAX_CHARS) }) : t("count", { count: number(text.length), max: number(TTS_MAX_CHARS) })}
        </p>
        {notice && <p className="text-sm text-muted">{notice}</p>}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <ProgressBar value={loading.progress} label={t("extracting")} />
          <button type="button" onClick={() => loading.controller.abort()} className={`self-start ${buttonSecondary}`}>
            {t("cancel")}
          </button>
        </div>
      )}
      {loadError && <ToolAlert>{loadError}</ToolAlert>}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("engine")}</legend>
        <div className="flex flex-wrap gap-2" role="presentation">
          {(["device", "ai"] as const).map((kind) => {
            const disabled = reading || busy || (kind === "ai" && !aiLanguage) || (kind === "device" && device.supported === false);
            const checked = (kind === "ai") === useAi;
            return (
              <label
                key={kind}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${checked ? "border-brand bg-brand-soft text-brand" : "border-border-strong bg-surface"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name={engineId}
                  value={kind}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    setEngine(kind);
                    store(ENGINE_KEY, kind);
                  }}
                  className="accent-brand-solid"
                />
                {kind === "ai" ? t("engineAi") : t("engineDevice")}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {aiLanguage ? t("engineAiHint", { size: formatBytes(supertonicDownloadBytes, locale as Locale) }) : t("aiNoChinese")}
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={languageId}>{t("language")}</label>
          <select
            id={languageId}
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as TtsLanguage);
              setLanguageChosen(true);
            }}
            className={`h-10 ${field}`}
          >
            {ttsLanguages.map((l) => (
              <option key={l} value={l}>
                {languageName(l)}
              </option>
            ))}
          </select>
          {text.trim() && <span className="text-xs font-normal text-muted">{t("detected", { language: languageName(detected) })}</span>}
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={voiceId}>{t("voice")}</label>
          {useAi ? (
            <select
              id={voiceId}
              value={aiVoice}
              disabled={busy}
              onChange={(e) => {
                setAiVoice(e.target.value as SupertonicVoice);
                store(AI_VOICE_KEY, e.target.value);
              }}
              className={`h-10 ${field}`}
            >
              {supertonicVoices.map((v) => (
                <option key={v} value={v}>
                  {t(v.startsWith("F") ? "aiVoiceFemale" : "aiVoiceMale", { n: v.slice(1) })}
                </option>
              ))}
            </select>
          ) : (
            <select
              id={voiceId}
              value={voiceURI ?? ""}
              disabled={voices.length === 0}
              onChange={(e) => {
                setVoiceURI(e.target.value);
                store(voiceKey(language), e.target.value);
              }}
              className={`h-10 ${field}`}
            >
              {voices.length === 0 && <option value="">{t("defaultVoice")}</option>}
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.localService ? v.name : t("voiceOnline", { name: v.name })}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={rateId}>{t("speed")}</label>
          <select
            id={rateId}
            value={useAi ? aiRate : rate}
            onChange={(e) => {
              const value = clampRate(e.target.value);
              setRate(value);
              store(RATE_KEY, String(value));
            }}
            className={`h-10 ${field}`}
          >
            {SPEECH_RATES.filter((r) => !useAi || r >= AI_MIN_RATE).map((r) => (
              <option key={r} value={r}>
                {`${r.toLocaleString(locale)}×`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {noSupport && <ToolAlert>{t("noSupport")}</ToolAlert>}
      {!useAi && !noSupport && noVoices && <p className="text-sm text-muted">{t("noVoices", { language: languageName(language) })}</p>}
      {speech.failed && <ToolAlert>{useAi ? t("aiSpeechError") : t("speechError")}</ToolAlert>}
      {!useAi && voices.some((v) => !v.localService) && <p className="text-xs text-muted">{t("onlineNote")}</p>}

      {aiPrep?.phase === "confirm" && (
        <div role="group" aria-label={t("engineAi")} className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4 text-sm">
          <p>{t("aiConfirm", { size: formatBytes(aiPrep.bytes, locale as Locale) })}</p>
          {phone && <p className="text-muted">{t("aiConfirmPhone")}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void prepareAi(aiPrep.action)} className={buttonPrimary}>
              <Download aria-hidden="true" className="h-5 w-5" />
              {t("aiDownload")}
            </button>
            <button type="button" onClick={() => setAiPrep(null)} className={buttonSecondary}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
      {aiPrep?.phase === "loading" && (
        <div className="flex flex-col gap-2">
          <ProgressBar value={aiPrep.progress} label={t("aiDownloading")} />
          <button type="button" onClick={() => aiPrep.controller.abort()} className={`self-start ${buttonSecondary}`}>
            {t("cancel")}
          </button>
        </div>
      )}
      {aiError && <ToolAlert>{aiError}</ToolAlert>}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggle} disabled={noSupport || sentences.length === 0 || busy || aiPrep !== null} className={buttonPrimary}>
            {speech.status === "playing" ? <Pause aria-hidden="true" className="h-5 w-5" /> : <Play aria-hidden="true" className="h-5 w-5" />}
            {speech.status === "playing" ? t("pause") : speech.status === "paused" ? t("resume") : t("play")}
          </button>
          <button type="button" onClick={speech.stop} disabled={!reading} aria-label={t("stop")} title={t("stop")} className={iconButton}>
            <Square aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => speech.seek(speech.index - 1)} disabled={!reading || speech.index === 0} aria-label={t("previous")} title={t("previous")} className={iconButton}>
            <SkipBack aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => speech.seek(speech.index + 1)}
            disabled={!reading || speech.index >= sentences.length - 1}
            aria-label={t("next")}
            title={t("next")}
            className={iconButton}
          >
            <SkipForward aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="ml-auto text-xs text-muted">{t("shortcut")}</p>
        </div>
        {useAi && speech.status === "playing" && aiSpeech.waiting && <p className="text-sm text-muted">{t("aiGenerating")}</p>}
        {sentences.length > 0 && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={sentences.length}
              step={1}
              value={Math.min(speech.index + 1, sentences.length)}
              aria-label={t("sentence")}
              aria-valuetext={t("progress", { current: speech.index + 1, total: sentences.length })}
              onChange={(e) => speech.seek(Number(e.target.value) - 1)}
              className="flex-1 accent-brand-solid"
            />
            <span className="shrink-0 text-xs tabular-nums text-muted">{t("progress", { current: number(speech.index + 1), total: number(sentences.length) })}</span>
          </div>
        )}
        {!text.trim() && <p className="text-sm text-muted">{t("emptyText")}</p>}
        <p role="status" aria-live="polite" className="sr-only">
          {statusText}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {mp3 ? (
          <div className="flex flex-col gap-2">
            <ProgressBar value={mp3.done / Math.max(1, mp3.total)} label={t("mp3Generating", { current: number(Math.min(mp3.done + 1, mp3.total)), total: number(mp3.total) })} />
            <button type="button" onClick={() => mp3.controller.abort()} className={`self-start ${buttonSecondary}`}>
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              aiSpeech.unlock();
              void downloadMp3();
            }}
            disabled={!aiLanguage || sentences.length === 0 || busy || aiPrep !== null}
            className={`self-start ${buttonSecondary}`}
          >
            <Download aria-hidden="true" className="h-5 w-5" />
            {t("downloadMp3")}
          </button>
        )}
        <p className="text-xs text-muted">
          {aiLanguage ? t("mp3Hint") : t("mp3NoChinese")}{" "}
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
            {t("aiLicense")}
          </a>
        </p>
        {mp3Notice && <p className="text-sm text-muted">{mp3Notice}</p>}
      </div>
    </div>
  );
}

const iconButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface text-foreground hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50";

/** The text while it is read: the sentence highlighted (and its word, when known), kept in view. */
function ReadingView({ text, sentence, word, label }: { text: string; sentence?: { start: number; end: number }; word: { start: number; end: number } | null; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = box.current;
    const el = mark.current;
    if (!container || !el) return;
    const top = el.offsetTop - container.offsetTop;
    if (top < container.scrollTop || top + el.offsetHeight > container.scrollTop + container.clientHeight) {
      const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      container.scrollTo({ top: Math.max(0, top - container.clientHeight / 3), behavior: smooth ? "smooth" : "auto" });
    }
  }, [sentence]);

  if (!sentence) return null;
  const inWord = word && word.start >= sentence.start && word.end <= sentence.end ? word : null;
  return (
    <div ref={box} role="region" aria-label={label} tabIndex={0} data-testid="tts-reading" className={`h-72 overflow-y-auto whitespace-pre-wrap py-2 leading-relaxed ${field}`}>
      {text.slice(0, sentence.start)}
      <mark ref={mark} data-testid="tts-current" className="rounded bg-brand-soft px-0.5 text-foreground">
        {inWord ? (
          <>
            {text.slice(sentence.start, inWord.start)}
            <span data-testid="tts-word" className="underline decoration-brand decoration-2 underline-offset-4">
              {text.slice(inWord.start, inWord.end)}
            </span>
            {text.slice(inWord.end, sentence.end)}
          </>
        ) : (
          text.slice(sentence.start, sentence.end)
        )}
      </mark>
      {text.slice(sentence.end)}
    </div>
  );
}
