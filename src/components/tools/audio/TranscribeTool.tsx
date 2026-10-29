"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Download } from "lucide-react";
import Dropzone from "@/components/converter/Dropzone";
import { buttonPrimary, buttonSecondary, field } from "@/components/ui/styles";
import { formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { formatTime } from "@/lib/audio/time";
import { errorCode } from "@/lib/convert-error";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { reportConversion } from "@/lib/stats-client";
import { modelsBaseUrl } from "@/lib/models/sources";
import { whisperDownloadBytes, whisperLanguageCodes, whisperModels, type WhisperModelId } from "@/lib/transcribe/model";
import { correctedSegments, transcriptFile, transcriptMime, transcriptName, transcriptText, type TranscriptFormat } from "@/lib/transcribe/output";
import type { Segment } from "@/lib/transcribe/whisper";
import ChoiceGroup from "../ChoiceGroup";
import ProgressBar from "../ProgressBar";
import ToolAlert from "../ToolAlert";
import { AUDIO_EXTENSIONS } from "./shared";

const tool = tools["audio-to-text"];
/** Audio files, plus the video containers mediabunny reads (their sound is transcribed). */
const EXTENSIONS = [...AUDIO_EXTENSIONS, "mp4", "m4v", "mov", "mkv"];
const ACCEPT = ["audio/*", "video/*", ...EXTENSIONS.map((e) => `.${e}`)].join(",");
/** The site's languages first in the list, then the rest by name. */
const SITE_LANGUAGES = ["es", "en", "pt", "fr", "zh"];

type Probe = { status: "loading" } | { status: "ready"; duration: number } | { status: "error"; code: ApiErrorCode };
type Run = { phase: "decoding" | "model" | "transcribing"; progress: number; secondsLeft: number | null; controller: AbortController };
interface Result {
  segments: Segment[];
  language: string;
  text: string;
  name: string;
}

const extensionOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

/** Audio or video → text with times, by Whisper running in the browser. */
export default function TranscribeTool() {
  const t = useTranslations("TranscribeTool");
  const tt = useTranslations("Tools.audio-to-text");
  const tu = useTranslations("ToolUi");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const languageId = useId();
  const textId = useId();
  const hintId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [model, setModel] = useState<WhisperModelId>("tiny");
  const [language, setLanguage] = useState("auto");
  // Bytes each model still has to download (null until checked).
  const [toDownload, setToDownload] = useState<Partial<Record<WhisperModelId, number>>>({});
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function checkCache() {
    try {
      const { whisperBytesToDownload } = await import("@/lib/transcribe/client");
      const [tiny, base] = await Promise.all([whisperBytesToDownload("tiny"), whisperBytesToDownload("base")]);
      setToDownload({ tiny, base });
    } catch {
      // Without the Cache API the full size applies.
    }
  }
  useEffect(() => {
    void checkCache();
    return () => {
      void import("@/lib/transcribe/client").then((c) => c.disposeWhisper());
    };
  }, []);

  // A new file: check its type and size, then read its duration (loads mediabunny).
  useEffect(() => {
    if (!file) return setProbe(null);
    let cancelled = false;
    setProbe({ status: "loading" });
    import("@/lib/transcribe/audio")
      .then((m) => m.probeForTranscription(file))
      .then((duration) => !cancelled && setProbe({ status: "ready", duration }))
      .catch((e) => !cancelled && setProbe({ status: "error", code: errorCode(e) }));
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Language names come from the browser's Intl data (the server's may differ): listed after hydration.
  const [languages, setLanguages] = useState<{ code: string; label: string }[]>([]);
  useEffect(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      // Old browsers: codes only.
    }
    const name = (code: string) => {
      const label = names?.of(code === "jw" ? "jv" : code) ?? code;
      return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
    };
    const rest = whisperLanguageCodes.filter((c) => !SITE_LANGUAGES.includes(c)).map((code) => ({ code, label: name(code) }));
    rest.sort((a, b) => a.label.localeCompare(b.label, locale));
    setLanguages([...SITE_LANGUAGES.map((code) => ({ code, label: name(code) })), ...rest]);
  }, [locale]);
  const languageName = (code: string) => languages.find((l) => l.code === code)?.label ?? code;

  function pick(files: File[]) {
    const picked = files[0];
    if (!picked || run) return;
    setError(null);
    setResult(null);
    if (!EXTENSIONS.includes(extensionOf(picked.name))) return setError(te("unsupportedFormat"));
    if (picked.size === 0) return setError(te("fileDamaged"));
    if (picked.size > (tool.limits.maxFileBytes ?? Infinity)) return setError(te("fileTooLarge"));
    setFile(picked);
  }

  async function transcribe() {
    if (!file || probe?.status !== "ready") return;
    const controller = new AbortController();
    const { signal } = controller;
    const update = (patch: Partial<Run>) => setRun((r) => (r?.controller === controller ? { ...r, ...patch } : r));
    setRun({ phase: "decoding", progress: 0, secondsLeft: null, controller });
    setError(null);
    setResult(null);
    setCopied(false);
    const started = performance.now();
    const from = formatFromExtension(file.name) ?? "mp3";
    try {
      const [{ decodeForWhisper }, client, { createEta }] = await Promise.all([
        import("@/lib/transcribe/audio"),
        import("@/lib/transcribe/client"),
        import("@/lib/transcribe/eta"),
      ]);
      const audio = await decodeForWhisper(file, { signal, onProgress: (progress) => update({ progress }) });
      update({ phase: "model", progress: 0 });
      await client.prepareWhisper(model, { signal, onProgress: (progress) => update({ progress }) });
      update({ phase: "transcribing", progress: 0 });
      const eta = createEta();
      const out = await client.transcribeSamples(model, audio.samples, language === "auto" ? undefined : language, {
        signal,
        timeoutMs: tool.limits.timeoutMs,
        onProgress: (p) => update({ progress: eta.update(p), secondsLeft: eta.secondsLeft() }),
      });
      if (signal.aborted) return;
      const text = transcriptText(out.segments);
      setResult({ segments: out.segments, language: out.language, text, name: file.name });
      reportConversion({ tool: "audio-to-text", from, to: "txt", size: file.size, outputSize: new Blob([text]).size, success: true, durationMs: Math.round(performance.now() - started) });
    } catch (e) {
      if (signal.aborted) return;
      console.error(e);
      setError(te(errorCode(e)));
      reportConversion({ tool: "audio-to-text", from, to: "txt", size: file.size, success: false, errorCode: errorCode(e), durationMs: Math.round(performance.now() - started) });
    } finally {
      setRun((r) => (r?.controller === controller ? null : r));
      void checkCache();
    }
  }

  function download(format: TranscriptFormat) {
    if (!result) return;
    saveBlob(new Blob([transcriptFile(result.segments, result.text, format)], { type: transcriptMime[format] }), transcriptName(result.name, format));
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text can still be selected by hand.
    }
  }

  const sizeOf = (id: WhisperModelId) => formatBytes(whisperDownloadBytes(whisperModels[id]), locale);
  const left = toDownload[model] ?? whisperDownloadBytes(whisperModels[model]);
  const linesChanged = result !== null && correctedSegments(result.segments, result.text) === null;
  const timeLeft = (seconds: number) => (seconds < 60 ? t("seconds", { n: seconds }) : t("minutes", { n: Math.ceil(seconds / 60) }));
  const phaseLabel = run
    ? run.phase === "decoding"
      ? t("decoding")
      : run.phase === "model"
        ? left > 0
          ? t("downloading", { size: formatBytes(left, locale) })
          : t("loadingModel")
        : t("transcribing")
    : "";
  const link = "font-medium text-brand underline-offset-2 hover:underline";

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{t("whereNote")}</p>

      <div className="flex flex-col gap-2">
        <Dropzone onFiles={pick} accept={ACCEPT} multiple={false} compact={file !== null} />
        {!file && <p className="text-xs text-muted">{t("pickHint")}</p>}
        {file && (
          <p className="text-sm">
            <span className="font-semibold break-all">{file.name}</span>
            {probe?.status === "ready" && <span className="text-muted"> · {t("duration", { time: formatTime(Math.round(probe.duration)).replace(/\.\d$/, "") })}</span>}
            {probe?.status === "loading" && <span className="text-muted"> · {t("reading")}</span>}
          </p>
        )}
        {probe?.status === "error" && <ToolAlert>{te(probe.code)}</ToolAlert>}
      </div>

      <ChoiceGroup
        legend={t("model")}
        value={model}
        onChange={setModel}
        options={(["tiny", "base"] as const).map((id) => ({
          value: id,
          label: `${id === "tiny" ? t("modelFast") : t("modelPrecise")} · ${toDownload[id] === 0 ? t("modelCached") : sizeOf(id)}`,
        }))}
      />
      <p className="-mt-3 text-xs text-muted">{left > 0 ? t("downloadNote", { size: formatBytes(left, locale), source: modelsBaseUrl() ? "own" : "hub" }) : t("cachedNote")}</p>

      <div className="flex flex-col gap-1 text-sm font-medium sm:max-w-xs">
        <label htmlFor={languageId}>{t("language")}</label>
        <select id={languageId} value={language} onChange={(e) => setLanguage(e.target.value)} disabled={run !== null} className={`h-10 ${field}`}>
          <option value="auto">{t("languageAuto")}</option>
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {run ? (
        <div className="flex flex-col gap-2">
          <ProgressBar value={run.progress} label={phaseLabel} />
          <p className="min-h-5 text-sm text-muted tabular-nums" aria-live="polite">
            {run.phase === "transcribing" && run.secondsLeft !== null ? t("timeLeft", { time: timeLeft(run.secondsLeft) }) : ""}
          </p>
          <button type="button" onClick={() => run.controller.abort()} className={`self-start ${buttonSecondary}`}>
            {tu("cancel")}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void transcribe()} disabled={probe?.status !== "ready"} className={`self-start ${buttonPrimary}`}>
          {tt("action")}
        </button>
      )}
      {error && <ToolAlert>{error}</ToolAlert>}

      {result && (
        <section className="flex flex-col gap-3">
          {result.segments.length === 0 ? (
            <ToolAlert>{t("empty")}</ToolAlert>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor={textId} className="text-sm font-medium">
                  {t("resultLabel")}
                </label>
                <textarea
                  id={textId}
                  value={result.text}
                  aria-describedby={hintId}
                  onChange={(e) => setResult({ ...result, text: e.target.value })}
                  rows={12}
                  className={`h-80 w-full resize-y py-2 ${field}`}
                />
                <p id={hintId} className="text-xs text-muted">
                  {linesChanged ? t("linesChanged") : t("resultHint")}
                </p>
              </div>
              {language === "auto" && <p className="text-sm text-muted">{t("detected", { language: languageName(result.language) })}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy()} className={buttonSecondary}>
                  {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                  {copied ? tu("copied") : tu("copy")}
                </button>
                {(["txt", "srt", "vtt"] as const).map((format) => (
                  <button key={format} type="button" onClick={() => download(format)} className={buttonSecondary}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t("download", { format: format.toUpperCase() })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{t("accuracyNote")}</p>
            </>
          )}
          <p className="flex flex-col gap-1 text-sm">
            <Link href={`/${tools["subtitle-sync"].slugs[locale]}`} className={link}>
              {t("syncLink")}
            </Link>
            <Link href={`/${tools["text-to-speech"].slugs[locale]}`} className={link}>
              {t("readLink")}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
