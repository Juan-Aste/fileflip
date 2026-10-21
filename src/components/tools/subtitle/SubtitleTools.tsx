"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats } from "@/config/formats";
import { tools, type ToolId } from "@/config/tools";
import { convertSubtitleInput, syncSubtitleInput } from "@/lib/data/client";
import { runBatch, type JobOptions } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import { detectSubtitleFormat, subtitleFormats, type SubtitleFormat, type SubtitleResult } from "@/lib/subtitle/subtitle";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell, { type ShellContext } from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const extensions = [...subtitleFormats, "txt"];
const placeholder = "1\n00:00:01,000 --> 00:00:03,500\nHola, ¿cómo estás?";
const frameRates = ["23.976", "24", "25", "29.97", "30"] as const;
type FrameRate = (typeof frameRates)[number];

/** Format of a picked file by its extension, or of pasted text by its content. */
function inputFormat(file: File | null, text: string): SubtitleFormat {
  const ext = file?.name.split(".").pop()?.toLowerCase();
  if (ext && (subtitleFormats as readonly string[]).includes(ext)) return ext as SubtitleFormat;
  return (file ? null : detectSubtitleFormat(text)) ?? "srt";
}

type Run = (source: File | string, job: JobOptions) => Promise<SubtitleResult & { format?: SubtitleFormat }>;

function useSubtitleRun(id: ToolId) {
  const t = useTranslations("SubtitleTools");
  return async (
    { files, text }: { files: File[]; text: string },
    { signal, onProgress }: ShellContext,
    to: (from: SubtitleFormat) => SubtitleFormat,
    run: Run,
  ): Promise<ShellOutput[]> => {
    const inputs: (File | null)[] = files.length > 0 ? files : [null];
    const results = await runBatch(
      inputs,
      (file, job) => {
        const from = inputFormat(file, text);
        return trackTool(
          id,
          { from, to: to(from), files: [file ?? new Blob([text], { type: "text/plain" })] },
          () => run(file ?? text, job),
          (out) => out.text.length,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const from = inputFormat(inputs[i] ?? null, text);
      const name = inputs[i]?.name ?? `subtitles.${from}`;
      if (result.status === "error") return { kind: "error", name, code: result.code };
      const { text: out, cues, lostStyling, dropped } = result.value;
      const format = result.value.format ?? to(from);
      const notes = [t("cues", { count: cues }), ...(dropped > 0 ? [t("dropped", { count: dropped })] : []), ...(lostStyling ? [t("lostStyling")] : [])];
      return {
        kind: "file",
        name: renameExtension(name, format),
        blob: new Blob([out], { type: `${formats[format].mime};charset=utf-8` }),
        preview: out,
        message: { ok: true, text: notes.join(" ") },
      };
    });
  };
}

export function SubtitleConverterTool() {
  const t = useTranslations("SubtitleTools");
  const tt = useTranslations("Tools.subtitle-converter");
  const [target, setTarget] = useState<SubtitleFormat>("vtt");
  const run = useSubtitleRun("subtitle-converter");
  return (
    <ToolShell
      input={{
        kind: "files",
        extensions,
        multiple: true,
        maxFileBytes: tools["subtitle-converter"].limits.maxFileBytes,
        paste: { label: t("paste"), placeholder },
      }}
      actionLabel={tt("action")}
      zipName={`fileflect-${target}.zip`}
      options={
        <ChoiceGroup
          legend={t("target")}
          value={target}
          onChange={setTarget}
          options={subtitleFormats.map((f) => ({ value: f, label: t(`format.${f}`) }))}
        />
      }
      process={(input, context) => run(input, context, () => target, (source, job) => convertSubtitleInput(source, target, job))}
    />
  );
}

/** Seconds as typed ("-2,5" or "1.25") → ms; null when it isn't a number or is absurd. */
export function parseOffset(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const ms = Math.round(Number(normalized) * 1000);
  return Math.abs(ms) <= 24 * 3_600_000 ? ms : null;
}

export function SubtitleSyncTool() {
  const t = useTranslations("SubtitleTools");
  const tt = useTranslations("Tools.subtitle-sync");
  const offsetId = useId();
  const fromId = useId();
  const toId = useId();
  const [offset, setOffset] = useState("0");
  const [changeFps, setChangeFps] = useState(false);
  const [fromFps, setFromFps] = useState<FrameRate>("23.976");
  const [toFps, setToFps] = useState<FrameRate>("25");
  const offsetMs = parseOffset(offset);
  const run = useSubtitleRun("subtitle-sync");

  const select = (id: string, label: string, value: FrameRate, onChange: (v: FrameRate) => void) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as FrameRate)} className={`h-10 ${field}`}>
        {frameRates.map((rate) => (
          <option key={rate} value={rate}>
            {t("fpsValue", { fps: rate })}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions,
        multiple: true,
        maxFileBytes: tools["subtitle-sync"].limits.maxFileBytes,
        paste: { label: t("paste"), placeholder },
        // Nothing to do with an invalid offset, or with no shift and no frame rate change.
        ready: offsetMs !== null && (offsetMs !== 0 || (changeFps && fromFps !== toFps)),
      }}
      actionLabel={tt("action")}
      zipName="fileflect-subtitles.zip"
      options={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={offsetId} className="text-sm font-medium">
              {t("offset")}
            </label>
            <input
              id={offsetId}
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={offsetMs === null}
              aria-describedby={`${offsetId}-hint`}
              className={`h-10 w-40 ${field}`}
            />
            <span id={`${offsetId}-hint`} className={`text-xs ${offsetMs === null ? "text-danger" : "text-muted"}`}>
              {offsetMs === null ? t("offsetInvalid") : t("offsetHint")}
            </span>
          </div>
          <Checkbox checked={changeFps} onChange={setChangeFps} label={t("changeFps")} />
          {changeFps && (
            <div className="flex flex-wrap gap-4">
              {select(fromId, t("fpsFrom"), fromFps, setFromFps)}
              {select(toId, t("fpsTo"), toFps, setToFps)}
            </div>
          )}
        </div>
      }
      process={(input, context) =>
        run(
          input,
          context,
          (from) => from,
          (source, job) =>
            syncSubtitleInput(source, { offsetMs: offsetMs ?? 0, ...(changeFps ? { fps: { from: Number(fromFps), to: Number(toFps) } } : {}) }, job),
        )
      }
    />
  );
}
