"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonSecondary, field } from "@/components/ui/styles";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { formatTime, parseTime, validRange } from "@/lib/audio/time";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { videoExtension, videoMime, type VideoTarget } from "@/lib/video/options";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS } from "./shared";

const tool = tools["trim-video"];
const engine = () => import("@/lib/video/convert");

type Probe = { status: "loading" } | { status: "ready"; duration: number } | { status: "error"; code: ApiErrorCode };
type Mode = "exact" | "fast";

/** The result keeps the input's container. */
const sameContainer = (name: string): VideoTarget => {
  const format = formatFromExtension(name);
  return format === "mov" || format === "mkv" || format === "webm" ? format : "mp4";
};

/** One video → the part between two times, cut at the exact frame (re-encoded) or at a key frame (copied). */
export default function TrimVideoTool() {
  const t = useTranslations("AudioTool");
  const tv = useTranslations("TrimVideoTool");
  const tt = useTranslations("Tools.trim-video");
  const te = useTranslations("ApiErrors");
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [start, setStart] = useState("0:00.0");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<Mode>("exact");
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);

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
    engine()
      .then((e) => e.probeVideo(file))
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
    if (!file || !range || !rangeOk) throw new ConversionError("videoRangeInvalid");
    const target = sameContainer(file.name);
    const out = await trackTool(
      "trim-video",
      { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: target, files: [file] },
      () =>
        withTimeLimit(tool.limits.timeoutMs, signal, async (limited) =>
          (await engine()).convertVideo(file, target, { signal: limited, onProgress, edit: { trim: range, exact: mode === "exact" } }),
        ),
      (o) => o.data.length,
    );
    return [
      {
        kind: "file",
        name: renameExtension(file.name, videoExtension[target]),
        blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: videoMime[target] }),
        message: { ok: true, text: t("trimmed", { from: formatTime(range.start), to: formatTime(range.start + out.duration) }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: false, maxFileBytes: tool.limits.maxFileBytes, ready: rangeOk }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        file && (
          <div className="flex flex-col gap-4">
            {probe?.status === "loading" && <p className="text-sm text-muted">{tv("reading")}</p>}
            {probe?.status === "error" && <ToolAlert>{te(probe.code)}</ToolAlert>}
            {duration !== null && (
              <>
                {/* The browser may not play every file (H.264 or MKV in some); the times can still be typed. */}
                {playerUrl && <video ref={player} src={playerUrl} controls preload="metadata" playsInline className="max-h-80 w-full rounded-lg bg-black" aria-label={tv("player")} />}
                <div className="flex flex-wrap gap-4">
                  {timeField("start", start, setStart)}
                  {timeField("end", end, setEnd)}
                </div>
                <p id={`${id}-hint`} className={`text-xs ${rangeOk ? "text-muted" : "text-danger"}`}>
                  {rangeOk && range
                    ? t("selection", { length: formatTime(Math.min(range.end, duration) - range.start), total: formatTime(duration) })
                    : t("rangeInvalid", { total: formatTime(duration) })}
                </p>
                <ChoiceGroup legend={tv("mode")} value={mode} onChange={setMode} options={(["exact", "fast"] as const).map((m) => ({ value: m, label: tv(`modes.${m}`) }))} />
                <p className="text-sm text-muted">{tv(mode === "exact" ? "exactNote" : "fastNote")}</p>
              </>
            )}
          </div>
        )
      }
    />
  );
}
