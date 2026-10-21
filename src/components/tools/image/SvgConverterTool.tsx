"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { convertImage } from "@/lib/image/client";
import type { Resize } from "@/lib/image/dimensions";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["svg-converter"];
const MAX_WIDTH = 8000;

type Scale = "1" | "2" | "4" | "width";
type Output = "png" | "jpg" | "webp";

export default function SvgConverterTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.svg-converter");
  const widthId = useId();
  const [scale, setScale] = useState<Scale>("2");
  const [width, setWidth] = useState("1024");
  const [output, setOutput] = useState<Output>("png");

  const widthValue = Number(width);
  const widthValid = Number.isInteger(widthValue) && widthValue >= 1 && widthValue <= MAX_WIDTH;
  const resize: Resize | null =
    scale === "width" ? (widthValid ? { mode: "fit", width: widthValue } : null) : { mode: "percent", percent: Number(scale) * 100 };

  async function process(
    files: File[],
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    if (!resize) throw new ConversionError("invalidRequest");
    const results = await runBatch(
      files,
      (file, job) =>
        trackTool(
          "svg-converter",
          { from: "svg", to: output, files: [file] },
          // Rendered through an <img>: the SVG's scripts never run and external files are not loaded.
          () =>
            convertImage(file, "svg", output, { resize, quality: 92 }, job.onProgress).catch((error) => {
              throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
            }),
          (out) => out.blob.size,
        ),
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const name = renameExtension(file.name, formats[output].extensions[0]!);
      return {
        kind: "file",
        name,
        blob: out.blob,
        message: { ok: true, text: t("svgSize", { name, size: `${out.width} × ${out.height}` }) },
      };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["svg"], multiple: true, maxFileBytes: info.limits.maxFileBytes, ready: !!resize }}
      actionLabel={tt("action")}
      zipName="fileflect-svg.zip"
      process={({ files }, context) => process(files, context)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("svgScale")}
            value={scale}
            onChange={setScale}
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "4", label: "4×" },
              { value: "width", label: t("svgByWidth") },
            ]}
          />
          {scale === "width" && (
            <div className="flex flex-col gap-1">
              <label htmlFor={widthId} className="text-sm font-medium">
                {t("width")}
              </label>
              <input
                id={widthId}
                inputMode="numeric"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                aria-invalid={!widthValid || undefined}
                className={`h-10 w-32 ${field}`}
              />
              {!widthValid && <p className="text-sm text-danger">{t("svgWidthInvalid", { max: MAX_WIDTH })}</p>}
            </div>
          )}
          <ChoiceGroup
            legend={t("format")}
            value={output}
            onChange={setOutput}
            options={[
              { value: "png", label: "PNG" },
              { value: "jpg", label: "JPG" },
              { value: "webp", label: "WEBP" },
            ]}
          />
          <p className="text-sm text-muted">{t("svgHint")}</p>
        </div>
      }
    />
  );
}
