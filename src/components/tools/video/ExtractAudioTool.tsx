"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { audioBitrates, audioExtension, audioMime, audioTargets, type AudioBitrate, type AudioTarget } from "@/lib/audio/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS } from "./shared";

const tool = tools["extract-audio"];
// mediabunny and the WASM encoders load when the tool runs.
const engine = () => import("@/lib/audio/convert");

const codecNames: Record<string, string> = { aac: "AAC", mp3: "MP3", opus: "Opus", vorbis: "Vorbis", flac: "FLAC", "pcm-s16": "PCM", "pcm-s24": "PCM", "pcm-f32": "PCM" };

type Target = "original" | AudioTarget;

interface Extracted {
  data: Uint8Array;
  ext: string;
  mime: string;
  /** Source codec when the track was copied as it is. */
  copied?: string;
}

/** The audio of MP4, MOV, MKV and WebM videos: copied as it is, or converted to MP3, WAV, FLAC, OGG, M4A or AIFF. */
export default function ExtractAudioTool() {
  const t = useTranslations("AudioTool");
  const te = useTranslations("ExtractAudioTool");
  const tt = useTranslations("Tools.extract-audio");
  const [target, setTarget] = useState<Target>("original");
  const [bitrate, setBitrate] = useState<AudioBitrate>(192);
  const lossy = target === "mp3" || target === "ogg" || target === "m4a";

  const extract = async (file: File, signal: AbortSignal, onProgress: (p: number) => void): Promise<Extracted> => {
    const audio = await engine();
    if (target === "original") {
      const copy = await audio.copyAudioTrack(file, { signal, onProgress });
      if (copy) return { data: copy.data, ext: copy.ext, mime: copy.mime, copied: copy.codec };
    }
    // Not copyable as it is (or a format was chosen): decode and convert (MP3 when "original" can't be kept).
    const to: AudioTarget = target === "original" ? "mp3" : target;
    const out = await audio.convertAudio(file, { target: to, bitrate: to === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate }, { signal, onProgress });
    return { data: out.data, ext: audioExtension[to], mime: audioMime[to] };
  };

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-audio.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("target")}
            value={target}
            onChange={setTarget}
            options={[{ value: "original" as Target, label: te("original") }, ...audioTargets.map((f) => ({ value: f as Target, label: t(`targets.${f}`) }))]}
          />
          {lossy && (
            <ChoiceGroup
              legend={t("bitrate")}
              value={String(bitrate)}
              onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
              options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
            />
          )}
          <p className="text-sm text-muted">{target === "original" ? te("originalNote") : t(lossy ? "lossyNote" : "losslessNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "extract-audio",
              // The copied container is only known afterwards; stats count it as M4A (AAC in MP4/MOV, the usual case).
              { from: (formatFromExtension(file.name) ?? "mp4") as FormatId, to: (target === "original" ? "m4a" : target) as FormatId, files: [file] },
              () => withTimeLimit(tool.limits.timeoutMs, job.signal, (limited) => extract(file, limited, job.onProgress)),
              (out) => out.data.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          const { data, ext, mime, copied } = result.value;
          return {
            kind: "file",
            name: renameExtension(files[i]!.name, ext),
            blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: mime }),
            message: { ok: true, text: copied ? te("copied", { codec: codecNames[copied] ?? copied.toUpperCase() }) : te("converted", { format: ext.toUpperCase() }) },
          };
        });
      }}
    />
  );
}
