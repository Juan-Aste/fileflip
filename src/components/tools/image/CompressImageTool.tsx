"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { ConversionError } from "@/lib/convert-error";
import { formatBytes, formatPercent } from "@/lib/format";
import {
  MIN_TARGET_BYTES,
  compressInputs,
  savedFraction,
  targetFormat,
  targetPresets,
  type CompressFormat,
  type CompressionLevel,
} from "@/lib/image/compress";
import { compressImageFile } from "@/lib/image/tools-client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["compress-image"];
const extensions = compressInputs.flatMap((f) => formats[f].extensions);

type Mode = "level" | "target";
type Output = CompressFormat | "same";

export default function CompressImageTool() {
  const t = useTranslations("ImageTools");
  const tu = useTranslations("ToolUi");
  const tt = useTranslations("Tools.compress-image");
  const locale = useLocale() as Locale;
  const customId = useId();
  const [mode, setMode] = useState<Mode>("level");
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [output, setOutput] = useState<Output>("same");
  const [preset, setPreset] = useState<string>(String(targetPresets[1]));
  const [customKb, setCustomKb] = useState("300");

  const targetBytes = preset === "custom" ? Math.round(Number(customKb.replace(",", ".")) * 1000) : Number(preset);
  const targetValid = Number.isFinite(targetBytes) && targetBytes >= MIN_TARGET_BYTES;

  async function process(
    { files }: { files: File[] },
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name) as CompressFormat | undefined;
        if (!from || !compressInputs.includes(from)) throw new ConversionError("unsupportedFormat");
        const to = mode === "target" ? targetFormat(from, output) : output === "same" ? from : output;
        return trackTool(
          "compress-image",
          { from, to, files: [file] },
          () =>
            compressImageFile(
              {
                input: file,
                from,
                to: output,
                mode: mode === "level" ? { kind: "level", level } : { kind: "target", bytes: targetBytes },
              },
              { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs },
            ),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const name = out.kept ? file.name : renameExtension(file.name, formats[out.format].extensions[0]!);
      const blob = new Blob([out.buffer], { type: formats[out.format].mime });
      const reduced = tu("reduced", {
        before: formatBytes(file.size, locale),
        after: formatBytes(blob.size, locale),
        percent: formatPercent(Math.max(0, savedFraction(file.size, blob.size)), locale),
      });
      const text = out.kept
        ? t("kept")
        : out.scale < 1
          ? `${reduced} ${t("resized", { width: out.width, height: out.height })}`
          : reduced;
      return { kind: "file", name, blob, message: { ok: true, text: `${name}: ${text}` } };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-compressed.zip"
      process={(input, context) => {
        if (mode === "target" && !targetValid) throw new ConversionError("invalidRequest");
        return process(input, context);
      }}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("mode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "level", label: t("modeLevel") },
              { value: "target", label: t("modeTarget") },
            ]}
          />
          {mode === "level" ? (
            <ChoiceGroup
              legend={tu("level")}
              value={level}
              onChange={setLevel}
              options={[
                { value: "low", label: tu("levelLow") },
                { value: "medium", label: tu("levelRecommended") },
                { value: "high", label: tu("levelStrong") },
              ]}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <ChoiceGroup
                legend={t("target")}
                value={preset}
                onChange={setPreset}
                options={[
                  // Decimal KB on purpose: 100 000 bytes fits a "100 KB" limit read either way (1000 or 1024).
                  ...targetPresets.map((bytes) => ({
                    value: String(bytes),
                    label: bytes >= 1_000_000 ? `${bytes / 1_000_000} MB` : `${bytes / 1000} KB`,
                  })),
                  { value: "custom", label: t("targetCustom") },
                ]}
              />
              {preset === "custom" && (
                <div className="flex max-w-xs flex-col gap-1">
                  <label htmlFor={customId} className="text-sm font-medium">
                    {t("targetKb")}
                  </label>
                  <input
                    id={customId}
                    inputMode="decimal"
                    value={customKb}
                    onChange={(e) => setCustomKb(e.target.value)}
                    aria-invalid={!targetValid}
                    aria-describedby={targetValid ? undefined : `${customId}-error`}
                    className={`h-10 ${field}`}
                  />
                  {!targetValid && (
                    <p id={`${customId}-error`} className="text-sm text-danger">
                      {t("targetInvalid")}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-muted">{t("targetHint")}</p>
            </div>
          )}
          <ChoiceGroup
            legend={t("format")}
            value={output}
            onChange={setOutput}
            options={[
              { value: "same", label: t("formatSame") },
              { value: "jpg", label: "JPG" },
              ...(mode === "level" ? [{ value: "png" as const, label: "PNG" }] : []),
              { value: "webp", label: "WEBP" },
              { value: "avif", label: "AVIF" },
            ]}
          />
          {mode === "target" && (output === "same" || output === "png") && (
            <p className="text-sm text-muted">{t("pngToJpg")}</p>
          )}
        </div>
      }
    />
  );
}
