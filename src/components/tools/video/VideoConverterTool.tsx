"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { videoExtension, videoMime, videoTargets, type VideoTarget } from "@/lib/video/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS, videoSupport, type VideoSupport } from "./shared";

const tool = tools["video-converter"];
// mediabunny (and the AAC encoder, when needed) load when the tool runs.
const engine = () => import("@/lib/video/convert");

const codecNames: Record<string, string> = { avc: "H.264", hevc: "HEVC (H.265)", vp8: "VP8", vp9: "VP9", av1: "AV1", prores: "ProRes" };

/** MP4, MOV, MKV and WebM video → MP4, WebM, MOV or MKV, in the browser; streams are copied when the target takes them. */
export default function VideoConverterTool() {
  const t = useTranslations("VideoTool");
  const tt = useTranslations("Tools.video-converter");
  const [target, setTarget] = useState<VideoTarget>("mp4");
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
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={videoTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          <p className="text-sm text-muted">{t("copyNote")}</p>
          {(support === "noH264" || support === "none") && (
            <p role="status" className="text-sm text-muted">
              {t(support === "none" ? "noWebCodecs" : "noH264")}
            </p>
          )}
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "video-converter",
              { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: target, files: [file] },
              () => withTimeLimit(tool.limits.timeoutMs, job.signal, async (limited) => (await engine()).convertVideo(file, target, { signal: limited, onProgress: job.onProgress })),
              (out) => out.data.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          const { data, copied, videoCodec } = result.value;
          return {
            kind: "file",
            name: renameExtension(files[i]!.name, videoExtension[target]),
            blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: videoMime[target] }),
            message: { ok: true, text: t(copied ? "copied" : "encoded", { codec: codecNames[videoCodec] ?? videoCodec.toUpperCase() }) },
          };
        });
      }}
    />
  );
}
