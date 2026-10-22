"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonSecondary, field } from "@/components/ui/styles";
import type { ApiErrorCode } from "@/lib/api-errors";
import { formatTime, parseTime, validRange, type TrimRange } from "@/lib/audio/time";
import { errorCode } from "@/lib/convert-error";
import ToolAlert from "../ToolAlert";

const engine = () => import("@/lib/video/convert");

export interface VideoSelection {
  range: TrimRange | null;
  duration: number | null;
}

type Probe = { status: "loading" } | { status: "ready"; duration: number } | { status: "error"; code: ApiErrorCode };

/**
 * The start/end selection of one video: reads its duration (this loads the
 * engine), shows a player with "use current position" buttons and validates
 * the typed times. `onChange` (a state setter: it must be stable) gets the
 * valid range (or null) and the duration.
 */
export default function VideoRangePicker({
  file,
  initialLength,
  onChange,
}: {
  file: File;
  /** Seconds selected at first (the whole video when absent). */
  initialLength?: number;
  onChange: (selection: VideoSelection) => void;
}) {
  const t = useTranslations("AudioTool");
  const tv = useTranslations("TrimVideoTool");
  const te = useTranslations("ApiErrors");
  const id = useId();
  const [probe, setProbe] = useState<Probe>({ status: "loading" });
  const [start, setStart] = useState("0:00.0");
  const [end, setEnd] = useState("");
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);

  useEffect(() => {
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
        setEnd(formatTime(Math.min(duration, initialLength ?? duration)));
      })
      .catch((error) => !cancelled && setProbe({ status: "error", code: errorCode(error) }));
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file, initialLength]);

  const duration = probe.status === "ready" ? probe.duration : null;
  const startS = parseTime(start);
  const endS = parseTime(end);
  const range = startS !== null && endS !== null ? { start: startS, end: endS } : null;
  const rangeOk = duration !== null && range !== null && validRange(range, duration);

  useEffect(() => {
    onChange({ range: rangeOk && startS !== null && endS !== null ? { start: startS, end: endS } : null, duration });
  }, [onChange, rangeOk, startS, endS, duration]);

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

  if (probe.status === "loading") return <p className="text-sm text-muted">{tv("reading")}</p>;
  if (probe.status === "error") return <ToolAlert>{te(probe.code)}</ToolAlert>;
  return (
    <>
      {/* The browser may not play every file (H.264 or MKV in some); the times can still be typed. */}
      {playerUrl && <video ref={player} src={playerUrl} controls preload="metadata" playsInline className="max-h-80 w-full rounded-lg bg-black" aria-label={tv("player")} />}
      <div className="flex flex-wrap gap-4">
        {timeField("start", start, setStart)}
        {timeField("end", end, setEnd)}
      </div>
      <p id={`${id}-hint`} className={`text-xs ${rangeOk ? "text-muted" : "text-danger"}`}>
        {rangeOk && range
          ? t("selection", { length: formatTime(Math.min(range.end, probe.duration) - range.start), total: formatTime(probe.duration) })
          : t("rangeInvalid", { total: formatTime(probe.duration) })}
      </p>
    </>
  );
}
