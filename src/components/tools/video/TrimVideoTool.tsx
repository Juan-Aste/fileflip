"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { formatTime } from "@/lib/audio/time";
import { ConversionError } from "@/lib/convert-error";
import { videoExtension, videoMime, type VideoTarget } from "@/lib/video/options";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS } from "./shared";
import VideoRangePicker, { type VideoSelection } from "./VideoRangePicker";

const tool = tools["trim-video"];
const engine = () => import("@/lib/video/convert");

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
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<VideoSelection>({ range: null, duration: null });
  const [mode, setMode] = useState<Mode>("exact");
  const range = file ? selection.range : null;

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !range) throw new ConversionError("videoRangeInvalid");
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
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: false, maxFileBytes: tool.limits.maxFileBytes, ready: range !== null }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        file && (
          <div className="flex flex-col gap-4">
            <VideoRangePicker file={file} onChange={setSelection} />
            {selection.duration !== null && (
              <>
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
