"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { formatTime } from "@/lib/audio/time";
import { videoExtension, videoMime, videoSpeeds, type VideoSpeed, type VideoTarget } from "@/lib/video/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS, videoSupport, type VideoSupport } from "./shared";

const tool = tools["video-speed"];
const engine = () => import("@/lib/video/convert");

type Sound = "keep" | "remove";

/** The result keeps the input's container. */
const sameContainer = (name: string): VideoTarget => {
  const format = formatFromExtension(name);
  return format === "mov" || format === "mkv" || format === "webm" ? format : "mp4";
};

/** Speeds MP4, MOV, MKV and WebM videos up or down (0.25×–4×), keeping the sound (its pitch changes) or removing it. */
export default function VideoSpeedTool() {
  const t = useTranslations("VideoSpeedTool");
  const tv = useTranslations("VideoTool");
  const tt = useTranslations("Tools.video-speed");
  const locale = useLocale() as Locale;
  const [speed, setSpeed] = useState<VideoSpeed>(2);
  const [sound, setSound] = useState<Sound>("keep");
  const [support, setSupport] = useState<VideoSupport>("checking");
  useEffect(() => {
    void videoSupport().then(setSupport);
  }, []);
  const label = (s: number) => `${s.toLocaleString(locale)}×`;

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-video.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("speed")} value={String(speed)} onChange={(v) => setSpeed(Number(v) as VideoSpeed)} options={videoSpeeds.map((s) => ({ value: String(s), label: label(s) }))} />
          <ChoiceGroup legend={t("sound")} value={sound} onChange={setSound} options={(["keep", "remove"] as const).map((s) => ({ value: s, label: t(`sounds.${s}`) }))} />
          <p className="text-sm text-muted">{t("note")}</p>
          {support === "none" && (
            <p role="status" className="text-sm text-muted">
              {tv("noWebCodecs")}
            </p>
          )}
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const edit = { speed, removeAudio: sound === "remove" };
        const results = await runBatch(
          files,
          (file, job) => {
            const target = sameContainer(file.name);
            return trackTool(
              "video-speed",
              { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: target, files: [file] },
              () => withTimeLimit(tool.limits.timeoutMs, job.signal, async (limited) => (await engine()).convertVideo(file, target, { signal: limited, onProgress: job.onProgress, edit })),
              (out) => out.data.length,
            );
          },
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const file = files[i]!;
          if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
          const target = sameContainer(file.name);
          const name = renameExtension(file.name, videoExtension[target]).replace(/(\.[^.]+)$/, `-${speed}x$1`);
          return {
            kind: "file",
            name,
            blob: new Blob([result.value.data as Uint8Array<ArrayBuffer>], { type: videoMime[target] }),
            message: { ok: true, text: t("done", { speed: label(speed), length: formatTime(result.value.duration) }) },
          };
        });
      }}
    />
  );
}
