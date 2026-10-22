"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { audioBitrates, audioExtension, audioMime, audioTargets, type AudioBitrate, type AudioTarget } from "@/lib/audio/options";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const tool = tools["audio-converter"];
const extensions = ["mp3", "wav", "wave", "flac", "ogg", "oga", "opus", "m4a", "aac", "webm", "weba", "aiff", "aif", "aifc"];
// mediabunny and the WASM encoders load when the tool runs.
const engine = () => import("@/lib/audio/convert");

/** Runs one file with the tool's time limit; cancelling or the limit stops the conversion. */
async function withTimeLimit<T>(signal: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, tool.limits.timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    return await run(controller.signal);
  } catch (error) {
    throw timedOut ? new ConversionError("jobTimedOut") : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

type Support = "checking" | "full" | "noAac" | "none";

/** What this browser can decode: WebCodecs at all, and AAC (missing where proprietary codecs aren't built in). */
async function decodeSupport(): Promise<Support> {
  if (typeof AudioDecoder === "undefined") return "none";
  const aac = await AudioDecoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: 44100, numberOfChannels: 2 }).catch(() => ({ supported: false }));
  return aac.supported ? "full" : "noAac";
}

/** MP3, WAV, FLAC, OGG, M4A/AAC, WebM and AIFF audio → MP3, WAV, FLAC, OGG (Opus), M4A (AAC) or AIFF, in the browser. */
export default function AudioConverterTool() {
  const t = useTranslations("AudioTool");
  const tt = useTranslations("Tools.audio-converter");
  const [target, setTarget] = useState<AudioTarget>("mp3");
  const [bitrate, setBitrate] = useState<AudioBitrate>(192);
  const lossy = target !== "wav" && target !== "flac" && target !== "aiff";
  const [support, setSupport] = useState<Support>("checking");
  useEffect(() => {
    void decodeSupport().then(setSupport);
  }, []);

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-audio.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={audioTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {lossy && (
            <ChoiceGroup
              legend={t("bitrate")}
              value={String(bitrate)}
              onChange={(value) => setBitrate(Number(value) as AudioBitrate)}
              options={audioBitrates.filter((b) => target !== "ogg" || b <= 256).map((b) => ({ value: String(b), label: t(`bitrates.${b}`) }))}
            />
          )}
          <p className="text-sm text-muted">{t(lossy ? "lossyNote" : "losslessNote")}</p>
          {(support === "noAac" || support === "none") && (
            <p role="status" className="text-sm text-muted">
              {t(support === "none" ? "noWebCodecs" : "noAac")}
            </p>
          )}
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "audio-converter",
              { from: (formatFromExtension(file.name) ?? "mp3") as FormatId, to: target, files: [file] },
              () =>
                withTimeLimit(job.signal, async (limited) =>
                  (await engine()).convertAudio(file, { target, bitrate: target === "ogg" ? (Math.min(bitrate, 256) as AudioBitrate) : bitrate }, { signal: limited, onProgress: job.onProgress }),
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
