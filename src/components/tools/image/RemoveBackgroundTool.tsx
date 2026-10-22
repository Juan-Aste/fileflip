"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import { DOWNLOAD_MB } from "@/lib/bg-remove/assets";
import { removeImageBackground } from "@/lib/bg-remove/client";
import { parseHexColor, type Background } from "@/lib/bg-remove/mask";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["remove-background"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
type BackgroundKind = "transparent" | "white" | "color";

/** Removes the background of photos with a small segmentation model that runs on the device. */
export default function RemoveBackgroundTool() {
  const t = useTranslations("RemoveBackgroundTool");
  const tt = useTranslations("Tools.remove-background");
  const colorId = useId();
  const [kind, setKind] = useState<BackgroundKind>("transparent");
  const [color, setColor] = useState("#4f8ff7");

  async function process(
    { files }: { files: File[] },
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const background: Background =
      kind === "transparent" ? { kind: "transparent" } : { kind: "color", rgb: kind === "white" ? [255, 255, 255] : parseHexColor(color) };
    const to = background.kind === "transparent" ? "png" : "jpg";
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name);
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        return trackTool(
          "remove-background",
          { from, to, files: [file] },
          () => removeImageBackground(file, from, background, { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs }),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const name = renameExtension(file.name, to).replace(new RegExp(`\\.${to}$`), `-${t("suffix")}.${to}`);
      return {
        kind: "file",
        name,
        blob: new Blob([result.value.buffer], { type: formats[to].mime }),
        message: { ok: true, text: t("done", { pixels: `${result.value.width} × ${result.value.height}` }) },
      };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-no-background.zip"
      process={process}
      options={
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <ChoiceGroup
              legend={t("background")}
              value={kind}
              onChange={setKind}
              options={[
                { value: "transparent", label: t("transparent") },
                { value: "white", label: t("white") },
                { value: "color", label: t("color") },
              ]}
            />
            {kind === "color" && (
              <div className="flex flex-col gap-1">
                <label htmlFor={colorId} className="text-sm font-medium">
                  {t("colorLabel")}
                </label>
                <input
                  id={colorId}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
              </div>
            )}
          </div>
          <p className="text-sm text-muted">{t("note", { size: DOWNLOAD_MB })}</p>
        </div>
      }
    />
  );
}
