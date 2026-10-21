"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { rasterizeSvg } from "@/lib/image/client";
import { FAVICON_MASTER, MAX_APP_NAME, type FaviconFit } from "@/lib/image/favicon";
import { faviconPack } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const info = tools["favicon-generator"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);

export default function FaviconTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.favicon-generator");
  const ids = { name: useId(), color: useId() };
  const [fit, setFit] = useState<FaviconFit>("contain");
  const [backgroundKind, setBackgroundKind] = useState<"transparent" | "color">("transparent");
  const [color, setColor] = useState("#ffffff");
  const [appName, setAppName] = useState("");

  async function process(file: File, signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    const from = formatFromExtension(file.name);
    if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
    const out = await trackTool(
      "favicon-generator",
      { from, to: "ico", files: [file] },
      async () => {
        // Workers can't render SVG: it is drawn here through an <img>, which never runs its scripts.
        let input: Parameters<typeof faviconPack>[0]["input"];
        if (from === "svg") {
          try {
            input = { pixels: await rasterizeSvg(file, { resize: { mode: "fit", width: FAVICON_MASTER, height: FAVICON_MASTER } }) };
          } catch {
            throw new ConversionError("fileDamaged");
          }
        } else input = { blob: file, from };
        return faviconPack(
          { input, fit, background: backgroundKind === "color" ? color : null, appName },
          { signal, onProgress, timeoutMs: info.limits.timeoutMs },
        );
      },
      (o) => o.files.reduce((n, f) => n + f.buffer.byteLength, 0),
    );
    return out.files.map((f) => ({ kind: "file", name: f.name, blob: new Blob([f.buffer], { type: f.mime }) }));
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="favicon.zip"
      process={({ files }, { signal, onProgress }) => process(files[0]!, signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("faviconFit")}
            value={fit}
            onChange={setFit}
            options={[
              { value: "contain", label: t("faviconContain") },
              { value: "cover", label: t("faviconCover") },
            ]}
          />
          <div className="flex flex-wrap items-end gap-4">
            <ChoiceGroup
              legend={t("faviconBackground")}
              value={backgroundKind}
              onChange={setBackgroundKind}
              options={[
                { value: "transparent", label: t("faviconTransparent") },
                { value: "color", label: t("faviconColor") },
              ]}
            />
            {backgroundKind === "color" && (
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.color} className="text-sm font-medium">
                  {t("textColor")}
                </label>
                <input
                  id={ids.color}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.name} className="text-sm font-medium">
              {t("faviconAppName")}
            </label>
            <input
              id={ids.name}
              value={appName}
              maxLength={MAX_APP_NAME}
              onChange={(e) => setAppName(e.target.value)}
              className={`h-10 max-w-sm ${field}`}
            />
          </div>
          <p className="text-sm text-muted">{t("faviconHint")}</p>
        </div>
      }
    />
  );
}
