"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { ConversionError } from "@/lib/convert-error";
import { MAX_MODEL_TRIANGLES, modelExtension, modelFormat, modelInputs, modelMime, modelTargets, type ModelTarget } from "@/lib/model3d/options";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const tool = tools["model-converter"];
const engine = () => import("@/lib/model3d/client");

/** STL, OBJ, PLY, GLB and glTF models → STL, OBJ, PLY or GLB, in a worker with three.js. */
export default function ModelConverterTool() {
  const t = useTranslations("ModelConverterTool");
  const tt = useTranslations("Tools.model-converter");
  const locale = useLocale() as Locale;
  const [target, setTarget] = useState<ModelTarget>("stl");

  return (
    <ToolShell
      input={{ kind: "files", extensions: [...modelInputs], multiple: true, maxFileBytes: tool.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-3d.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={modelTargets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          <p className="text-sm text-muted">{t("note", { max: MAX_MODEL_TRIANGLES.toLocaleString(locale) })}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) => {
            const from = modelFormat(file.name);
            return trackTool(
              "model-converter",
              { from: from ?? "stl", to: target, files: [file] },
              async () => {
                if (!from) throw new ConversionError("unsupportedFormat");
                return (await engine()).convertModelInWorker(file, from, target, { signal: job.signal, onProgress: job.onProgress, timeoutMs: tool.limits.timeoutMs });
              },
              (out) => out.data.length,
            );
          },
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const file = files[i]!;
          if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
          const { data, triangles } = result.value;
          return {
            kind: "file",
            name: renameExtension(file.name, modelExtension[target]),
            blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: modelMime[target] }),
            message: { ok: true, text: t("done", { triangles: triangles.toLocaleString(locale) }) },
          };
        });
      }}
    />
  );
}
