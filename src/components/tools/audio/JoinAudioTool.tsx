"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { audioBitrates, audioExtension, audioMime, audioTargets, type AudioBitrate, type AudioTarget } from "@/lib/audio/options";
import { formatTime } from "@/lib/audio/time";
import { InputFileError } from "@/lib/convert-error";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { AUDIO_EXTENSIONS, withTimeLimit } from "./shared";

const tool = tools["join-audio"];
const engine = () => import("@/lib/audio/convert");
const gaps = ["0", "0.5", "1", "2"] as const;
type Gap = (typeof gaps)[number];

/** Several audio files, in the chosen order, → one file, in the browser. */
export default function JoinAudioTool() {
  const t = useTranslations("AudioTool");
  const tt = useTranslations("Tools.join-audio");
  const [target, setTarget] = useState<AudioTarget>("mp3");
  const [bitrate, setBitrate] = useState<AudioBitrate>(192);
  const [gap, setGap] = useState<Gap>("0");
  const [count, setCount] = useState(0);
  const lossy = target !== "wav" && target !== "flac" && target !== "aiff";

  async function process(files: File[], signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    const first = files[0]!;
    try {
      const out = await trackTool(
        "join-audio",
        { from: (formatFromExtension(first.name) ?? "mp3") as FormatId, to: target, files },
        () =>
          withTimeLimit(tool.limits.timeoutMs, signal, async (limited) =>
            (await engine()).joinAudio(
              files,
              { target, bitrate: target === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate },
              { signal: limited, onProgress, gapSeconds: Number(gap) },
            ),
          ),
        (o) => o.data.length,
      );
      const name = renameExtension(first.name, audioExtension[target]).replace(/(\.[^.]+)$/, `-${t("joinedSuffix")}$1`);
      return [
        {
          kind: "file",
          name,
          blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: audioMime[target] }),
          message: { ok: true, text: t("joined", { count: files.length, length: formatTime(out.duration) }) },
        },
      ];
    } catch (error) {
      // Name the file that failed: the whole join has a single result.
      if (error instanceof InputFileError) return [{ kind: "error", name: files[error.index]?.name ?? first.name, code: error.code }];
      throw error;
    }
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: AUDIO_EXTENSIONS, multiple: true, reorderable: true, maxFileBytes: tool.limits.maxFileBytes, ready: count >= 2 }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setCount(files.length)}
      process={({ files }, { signal, onProgress }) => process(files, signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          {count < 2 && <p className="text-sm text-muted">{t("joinNeedsTwo")}</p>}
          <ChoiceGroup legend={t("gap")} value={gap} onChange={setGap} options={gaps.map((g) => ({ value: g, label: t(`gaps.${g.replace(".", "_")}`) }))} />
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={audioTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {lossy && (
            <ChoiceGroup
              legend={t("bitrate")}
              value={String(bitrate)}
              onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
              options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
            />
          )}
          <p className="text-sm text-muted">{t("joinNote")}</p>
        </div>
      }
    />
  );
}
