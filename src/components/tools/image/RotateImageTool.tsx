"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { transformImageFile } from "@/lib/image/tools-client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["rotate-image"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
/** HEIC can only be read: it is saved as JPG. */
const outputOf = (from: FormatId): FormatId => (from === "heic" ? "jpg" : from);

type Rotation = "0" | "90" | "180" | "270";

export default function RotateImageTool() {
  const t = useTranslations("ImageTools");
  const tu = useTranslations("ToolUi");
  const tt = useTranslations("Tools.rotate-image");
  const [rotation, setRotation] = useState<Rotation>("90");
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  async function process(
    { files }: { files: File[] },
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const rotate = Number(rotation) as 0 | 90 | 180 | 270;
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name);
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        const to = outputOf(from);
        return trackTool(
          "rotate-image",
          { from, to, files: [file] },
          () =>
            transformImageFile(
              { input: file, from, to, rotate, flipH, flipV },
              { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs },
            ).then((out) => ({ ...out, to })),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const name = renameExtension(file.name, formats[out.to].extensions[0]!);
      return {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[out.to].mime }),
        message: { ok: true, text: t("rotatedTo", { name, size: `${out.width} × ${out.height}` }) },
      };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-rotated.zip"
      process={process}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={tu("rotation")}
            value={rotation}
            onChange={setRotation}
            options={[
              { value: "90", label: tu("rotateRight") },
              { value: "180", label: tu("rotate180") },
              { value: "270", label: tu("rotateLeft") },
              { value: "0", label: t("rotateNone") },
            ]}
          />
          <div className="flex flex-col gap-2">
            <Checkbox checked={flipH} onChange={setFlipH} label={t("flipH")} />
            <Checkbox checked={flipV} onChange={setFlipV} label={t("flipV")} />
          </div>
          <p className="text-sm text-muted">{t("orientationHint")}</p>
        </div>
      }
    />
  );
}
