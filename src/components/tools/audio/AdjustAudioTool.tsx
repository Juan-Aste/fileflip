"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import {
  audioBitrates,
  audioExtension,
  audioMime,
  audioSampleRates,
  audioTargets,
  type AudioBitrate,
  type AudioSampleRate,
  type AudioTarget,
} from "@/lib/audio/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { AUDIO_EXTENSIONS, withTimeLimit } from "./shared";

const tool = tools["adjust-audio"];
const engine = () => import("@/lib/audio/convert");

type Channels = "original" | "1" | "2";
type Rate = "original" | `${AudioSampleRate}`;

/** Batch: channels (mono/stereo), sample rate and bitrate of audio files, in the browser. */
export default function AdjustAudioTool() {
  const t = useTranslations("AudioTool");
  const tt = useTranslations("Tools.adjust-audio");
  const [target, setTarget] = useState<AudioTarget>("mp3");
  const [bitrate, setBitrate] = useState<AudioBitrate>(128);
  const [channels, setChannels] = useState<Channels>("original");
  const [rate, setRate] = useState<Rate>("44100");
  const lossy = target !== "wav" && target !== "flac" && target !== "aiff";
  // MP3 is always resampled (44.1 kHz unless chosen) and Opus always runs at 48 kHz.
  const rateChoices: Rate[] = target === "mp3" ? audioSampleRates.map((r) => `${r}` as Rate) : ["original", ...audioSampleRates.map((r) => `${r}` as Rate)];
  const shownRate: Rate = target === "mp3" && rate === "original" ? "44100" : rate;
  const sampleRate = target === "ogg" || shownRate === "original" ? undefined : Number(shownRate);

  return (
    <ToolShell
      input={{ kind: "files", extensions: AUDIO_EXTENSIONS, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-audio.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("channels")}
            value={channels}
            onChange={setChannels}
            options={(["original", "1", "2"] as const).map((c) => ({ value: c, label: t(`channelOptions.${c}`) }))}
          />
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={audioTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {target === "ogg" ? (
            <p className="text-sm text-muted">{t("opusRate")}</p>
          ) : (
            <ChoiceGroup
              legend={t("sampleRate")}
              value={shownRate}
              onChange={setRate}
              options={rateChoices.map((r) => ({ value: r, label: r === "original" ? t("rateOriginal") : t("rateKhz", { khz: Number(r) / 1000 }) }))}
            />
          )}
          {lossy && (
            <ChoiceGroup
              legend={t("bitrate")}
              value={String(bitrate)}
              onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
              options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
            />
          )}
          <p className="text-sm text-muted">{t(lossy ? "lossyNote" : "losslessNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const edit = { ...(channels !== "original" ? { channels: Number(channels) as 1 | 2 } : {}), ...(sampleRate ? { sampleRate } : {}) };
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "adjust-audio",
              { from: (formatFromExtension(file.name) ?? "mp3") as FormatId, to: target, files: [file] },
              () =>
                withTimeLimit(tool.limits.timeoutMs, job.signal, async (limited) =>
                  (await engine()).convertAudio(
                    file,
                    { target, bitrate: target === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate },
                    { signal: limited, onProgress: job.onProgress, edit },
                  ),
                ),
              (out) => out.data.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = renameExtension(files[i]!.name, audioExtension[target]);
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          return { kind: "file", name, blob: new Blob([result.value.data as Uint8Array<ArrayBuffer>], { type: audioMime[target] }) };
        });
      }}
    />
  );
}
