"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonSecondary, field } from "@/components/ui/styles";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { audioBitrates, audioExtension, audioMime, audioTargets, type AudioBitrate, type AudioTarget } from "@/lib/audio/options";
import { formatTime, parseTime, validRange } from "@/lib/audio/time";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { AUDIO_EXTENSIONS, withTimeLimit } from "./shared";

const tool = tools["trim-audio"];
const engine = () => import("@/lib/audio/convert");
/** Length of each fade when it's on (capped at half the selection by the engine). */
const FADE_SECONDS = 2;

type Probe = { status: "loading" } | { status: "ready"; duration: number } | { status: "error"; code: ApiErrorCode };

/** Keeps the output in the input's format when the converter can write it. */
const sameTarget = (from: FormatId | null): AudioTarget => ((audioTargets as readonly string[]).includes(from ?? "") ? (from as AudioTarget) : "mp3");

/** One audio file → the part between two times, with optional fades, in the browser. */
export default function TrimAudioTool() {
  const t = useTranslations("AudioTool");
  const tt = useTranslations("Tools.trim-audio");
  const te = useTranslations("ApiErrors");
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [start, setStart] = useState("0:00.0");
  const [end, setEnd] = useState("");
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [target, setTarget] = useState<AudioTarget>("mp3");
  const [bitrate, setBitrate] = useState<AudioBitrate>(192);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement>(null);
  const lossy = target !== "wav" && target !== "flac" && target !== "aiff";

  // A new file: read its duration (this loads the engine) and offer a player to find the times.
  useEffect(() => {
    if (!file) {
      setProbe(null);
      setPlayerUrl(null);
      return;
    }
    let cancelled = false;
    const url = URL.createObjectURL(file);
    setPlayerUrl(url);
    setProbe({ status: "loading" });
    setTarget(sameTarget(formatFromExtension(file.name)));
    engine()
      .then((e) => e.probeAudio(file))
      .then(({ duration }) => {
        if (cancelled) return;
        setProbe({ status: "ready", duration });
        setStart(formatTime(0));
        setEnd(formatTime(duration));
      })
      .catch((error) => !cancelled && setProbe({ status: "error", code: errorCode(error) }));
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const duration = probe?.status === "ready" ? probe.duration : null;
  const startS = parseTime(start);
  const endS = parseTime(end);
  const range = startS !== null && endS !== null ? { start: startS, end: endS } : null;
  const rangeOk = duration !== null && range !== null && validRange(range, duration);

  const setFromPlayer = (set: (v: string) => void) => {
    const now = player.current?.currentTime;
    if (now !== undefined && Number.isFinite(now)) set(formatTime(now));
  };

  const timeField = (key: "start" | "end", value: string, set: (v: string) => void) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className="text-sm font-medium">
        {t(key)}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${id}-${key}`}
          value={value}
          onChange={(e) => set(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!rangeOk}
          aria-describedby={`${id}-hint`}
          className={`h-10 w-32 tabular-nums ${field}`}
        />
        {playerUrl && (
          <button
            type="button"
            className={`${buttonSecondary} h-10 px-3 text-sm`}
            aria-label={`${t(key)}: ${t(key === "start" ? "startHere" : "endHere")}`}
            onClick={() => setFromPlayer(set)}
          >
            {t(key === "start" ? "startHere" : "endHere")}
          </button>
        )}
      </div>
    </div>
  );

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !range || !rangeOk) throw new ConversionError("audioRangeInvalid");
    const from = (formatFromExtension(file.name) ?? "mp3") as FormatId;
    const out = await trackTool(
      "trim-audio",
      { from, to: target, files: [file] },
      () =>
        withTimeLimit(tool.limits.timeoutMs, signal, async (limited) =>
          (await engine()).convertAudio(
            file,
            { target, bitrate: target === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate },
            { signal: limited, onProgress, edit: { trim: range, fadeIn: fadeIn ? FADE_SECONDS : 0, fadeOut: fadeOut ? FADE_SECONDS : 0 } },
          ),
        ),
      (o) => o.data.length,
    );
    const name = renameExtension(file.name, audioExtension[target]);
    return [
      {
        kind: "file",
        name,
        blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: audioMime[target] }),
        message: { ok: true, text: t("trimmed", { from: formatTime(range.start), to: formatTime(Math.min(range.end, out.duration)) }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: AUDIO_EXTENSIONS, multiple: false, maxFileBytes: tool.limits.maxFileBytes, ready: rangeOk }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        file && (
          <div className="flex flex-col gap-4">
            {probe?.status === "loading" && <p className="text-sm text-muted">{t("reading")}</p>}
            {probe?.status === "error" && <ToolAlert>{te(probe.code)}</ToolAlert>}
            {duration !== null && (
              <>
                {/* The browser may not play every format (FLAC or AIFF in some); the times can still be typed. */}
                {playerUrl && <audio ref={player} src={playerUrl} controls preload="metadata" className="w-full" aria-label={t("player")} />}
                <div className="flex flex-wrap gap-4">
                  {timeField("start", start, setStart)}
                  {timeField("end", end, setEnd)}
                </div>
                <p id={`${id}-hint`} className={`text-xs ${rangeOk ? "text-muted" : "text-danger"}`}>
                  {rangeOk && range
                    ? t("selection", { length: formatTime(Math.min(range.end, duration) - range.start), total: formatTime(duration) })
                    : t("rangeInvalid", { total: formatTime(duration) })}
                </p>
                <div className="flex flex-col gap-2">
                  <Checkbox checked={fadeIn} onChange={setFadeIn} label={t("fadeIn", { seconds: FADE_SECONDS })} />
                  <Checkbox checked={fadeOut} onChange={setFadeOut} label={t("fadeOut", { seconds: FADE_SECONDS })} />
                </div>
                <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={audioTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
                {lossy && (
                  <ChoiceGroup
                    legend={t("bitrate")}
                    value={String(bitrate)}
                    onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
                    options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
                  />
                )}
              </>
            )}
          </div>
        )
      }
    />
  );
}
