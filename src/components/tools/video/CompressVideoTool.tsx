"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatPercent } from "@/lib/format";
import { savedFraction } from "@/lib/image/compress";
import { videoExtension, videoMime, videoQualities, videoResolutions, type VideoQuality } from "@/lib/video/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS, videoSupport, type VideoSupport } from "./shared";

const tool = tools["compress-video"];
const engine = () => import("@/lib/video/convert");

type Target = "mp4" | "webm";

/** Re-encodes MP4, MOV, MKV and WebM videos at a lower quality and, optionally, a smaller size. */
export default function CompressVideoTool() {
  const t = useTranslations("CompressVideoTool");
  const tv = useTranslations("VideoTool");
  const tu = useTranslations("ToolUi");
  const tt = useTranslations("Tools.compress-video");
  const locale = useLocale() as Locale;
  const [quality, setQuality] = useState<VideoQuality>("medium");
  const [resolution, setResolution] = useState("720");
  const [target, setTarget] = useState<Target>("mp4");
  const [support, setSupport] = useState<VideoSupport>("checking");
  useEffect(() => {
    void videoSupport().then(setSupport);
  }, []);

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-video.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("quality")} value={quality} onChange={setQuality} options={videoQualities.map((q) => ({ value: q, label: t(`qualities.${q}`) }))} />
          <ChoiceGroup
            legend={t("resolution")}
            value={resolution}
            onChange={setResolution}
            options={[{ value: "original", label: t("original") }, ...videoResolutions.map((r) => ({ value: String(r), label: `${r}p` }))]}
          />
          <ChoiceGroup legend={tv("target")} value={target} onChange={setTarget} options={(["mp4", "webm"] as const).map((f) => ({ value: f, label: tv(`targets.${f}`) }))} />
          <p className="text-sm text-muted">{t("note")}</p>
          {(support === "noH264" || support === "none") && (
            <p role="status" className="text-sm text-muted">
              {tv(support === "none" ? "noWebCodecs" : "noH264")}
            </p>
          )}
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const edit = { quality, ...(resolution === "original" ? {} : { maxShortSide: Number(resolution) }) };
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "compress-video",
              { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: target, files: [file] },
              () => withTimeLimit(tool.limits.timeoutMs, job.signal, async (limited) => (await engine()).convertVideo(file, target, { signal: limited, onProgress: job.onProgress, edit })),
              (out) => out.data.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const file = files[i]!;
          if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
          const { data, width, height } = result.value;
          const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: videoMime[target] });
          const smaller = blob.size < file.size;
          const text = smaller
            ? `${tu("reduced", { before: formatBytes(file.size, locale), after: formatBytes(blob.size, locale), percent: formatPercent(savedFraction(file.size, blob.size), locale) })} ${t("size", { width, height })}`
            : t("notSmaller");
          return { kind: "file", name: renameExtension(file.name, videoExtension[target]), blob, message: { ok: smaller, text } };
        });
      }}
    />
  );
}
