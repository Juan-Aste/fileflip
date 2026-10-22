"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { ConversionError } from "@/lib/convert-error";
import { formatNumber } from "@/lib/format";
import { MAX_GIF_FRAMES, gifFrameRates, gifFrameTimes, gifWidths } from "@/lib/video/options";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { VIDEO_EXTENSIONS } from "./shared";
import VideoRangePicker, { type VideoSelection } from "./VideoRangePicker";

const tool = tools["video-to-gif"];
// The worker (mediabunny + gifenc) starts when the first GIF is made.
const engine = () => import("@/lib/video/gif-client");
/** A GIF is meant to be short: the first seconds are selected at first. */
const INITIAL_SECONDS = 5;

/** Part of a video → an animated GIF, in a worker. */
export default function VideoToGifTool() {
  const t = useTranslations("VideoToGifTool");
  const tt = useTranslations("Tools.video-to-gif");
  const locale = useLocale() as Locale;
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<VideoSelection>({ range: null, duration: null });
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(10);
  const [loop, setLoop] = useState(true);
  const range = file ? selection.range : null;
  const frames = range ? gifFrameTimes(range, fps)?.length ?? null : null;
  const ready = range !== null && frames !== null;

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !range) throw new ConversionError("videoRangeInvalid");
    const out = await trackTool(
      "video-to-gif",
      { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: "gif", files: [file] },
      async () => (await engine()).makeGif(file, { range, width, fps, loop }, { signal, onProgress, timeoutMs: tool.limits.timeoutMs }),
      (o) => o.data.length,
    );
    return [
      {
        kind: "file",
        name: renameExtension(file.name, "gif"),
        blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: "image/gif" }),
        message: { ok: true, text: t("made", { frames: formatNumber(out.frames, locale), width: out.width, height: out.height }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: false, maxFileBytes: tool.limits.maxFileBytes, ready }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        file && (
          <div className="flex flex-col gap-4">
            <VideoRangePicker file={file} initialLength={INITIAL_SECONDS} onChange={setSelection} />
            {selection.duration !== null && (
              <>
                <ChoiceGroup legend={t("width")} value={String(width)} onChange={(v) => setWidth(Number(v))} options={gifWidths.map((w) => ({ value: String(w), label: `${w} px` }))} />
                <ChoiceGroup legend={t("fps")} value={String(fps)} onChange={(v) => setFps(Number(v))} options={gifFrameRates.map((f) => ({ value: String(f), label: t("fpsValue", { fps: f }) }))} />
                <Checkbox checked={loop} onChange={setLoop} label={t("loop")} />
                <p role="status" className={`text-sm ${range && frames === null ? "text-danger" : "text-muted"}`}>
                  {range && frames === null ? t("tooManyFrames", { max: MAX_GIF_FRAMES }) : t("note", { max: MAX_GIF_FRAMES })}
                </p>
              </>
            )}
          </div>
        )
      }
    />
  );
}
