"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { normalizeModes, type NormalizeMode } from "@/lib/audio/normalize";
import { audioBitrates, audioExtension, audioMime, audioTargets, type AudioBitrate, type AudioTarget } from "@/lib/audio/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { AUDIO_EXTENSIONS, sameTarget, withTimeLimit } from "./shared";

const tool = tools["normalize-audio"];
const engine = () => import("@/lib/audio/convert");

type Target = "same" | AudioTarget;

/** Batch: measures each file's levels and applies one gain (peak or average loudness), in the browser. */
export default function NormalizeAudioTool() {
  const t = useTranslations("AudioTool");
  const tt = useTranslations("Tools.normalize-audio");
  const decibels = new Intl.NumberFormat(useLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
  const [mode, setMode] = useState<NormalizeMode>("loudness");
  const [target, setTarget] = useState<Target>("same");
  const [bitrate, setBitrate] = useState<AudioBitrate>(192);
  // With "same", lossy inputs get the chosen bitrate too.
  const lossy = target !== "wav" && target !== "flac" && target !== "aiff";

  return (
    <ToolShell
      input={{ kind: "files", extensions: AUDIO_EXTENSIONS, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-audio.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("normalizeMode")} value={mode} onChange={setMode} options={normalizeModes.map((m) => ({ value: m, label: t(`normalizeModes.${m}`) }))} />
          <p className="text-sm text-muted">{t(`normalizeHints.${mode}`)}</p>
          <ChoiceGroup
            legend={t("target")}
            value={target}
            onChange={setTarget}
            options={[{ value: "same" as Target, label: t("targetSame") }, ...audioTargets.map((f) => ({ value: f as Target, label: t(`targets.${f}`) }))]}
          />
          {lossy && (
            <ChoiceGroup
              legend={t("bitrate")}
              value={String(bitrate)}
              onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
              options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
            />
          )}
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const targets = files.map((file) => (target === "same" ? sameTarget(formatFromExtension(file.name)) : target));
        const results = await runBatch(
          files,
          (file, job) => {
            const to = targets[job.index]!;
            return trackTool(
              "normalize-audio",
              { from: (formatFromExtension(file.name) ?? "mp3") as FormatId, to, files: [file] },
              () =>
                withTimeLimit(tool.limits.timeoutMs, job.signal, async (limited) =>
                  (await engine()).convertAudio(
                    file,
                    { target: to, bitrate: to === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate },
                    { signal: limited, onProgress: job.onProgress, edit: { normalize: mode } },
                  ),
                ),
              (out) => out.data.length,
            );
          },
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const to = targets[i]!;
          const name = renameExtension(files[i]!.name, audioExtension[to]);
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          return {
            kind: "file",
            name,
            blob: new Blob([result.value.data as Uint8Array<ArrayBuffer>], { type: audioMime[to] }),
            message: { ok: true, text: t("gainApplied", { gain: decibels.format(result.value.gainDb ?? 0) }) },
          };
        });
      }}
    />
  );
}
