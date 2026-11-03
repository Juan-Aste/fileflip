"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formats, formatFromExtension } from "@/config/formats";
import { enhanceLimits } from "@/config/limits";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { autoEnhanceFile, upscaleFile } from "@/lib/enhance/client";
import type { UpscaleFactor } from "@/lib/enhance/upscale";
import { megapixels } from "@/lib/enhance/output";
import { previewImageFile } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["enhance-photo"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
// Pro is hidden (PRO_ENABLED=false): everyone gets the free limits.
const caps = enhanceLimits.free;

/** Longest side of the "before" picture shown next to the result. */
const PREVIEW_SIDE = 1600;

type Mode = "auto" | "ai";
type Preview = { status: "loading" } | { status: "ready"; blob: Blob; width: number; height: number } | { status: "error"; code: ApiErrorCode };

/** "Enhance photo": automatic classic filters (levels, color, noise, sharpness) or AI enlargement (Real-ESRGAN, x2/x4). */
export default function EnhancePhotoTool() {
  const t = useTranslations("EnhancePhotoTool");
  const tt = useTranslations("Tools.enhance-photo");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<Mode>("auto");
  const [factor, setFactor] = useState<UpscaleFactor>(2);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const from = formatFromExtension(file.name);
    const abort = new AbortController();
    setPreview({ status: "loading" });
    (from ? previewImageFile({ input: file, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal }) : Promise.reject(new ConversionError("unsupportedFormat")))
      .then((p) => !abort.signal.aborted && setPreview({ status: "ready", blob: p.blob, width: p.width, height: p.height }))
      .catch((error) => !abort.signal.aborted && setPreview({ status: "error", code: errorCode(error) }));
    return () => abort.abort();
  }, [file]);

  const ready = preview?.status === "ready" ? preview : null;
  const mp = ready ? megapixels(ready.width, ready.height) : 0;
  const maxMp = mode === "auto" ? caps.autoMaxMegapixels : caps.upscaleMaxMegapixels;
  const tooBig = !!ready && mp > maxMp;
  const number = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !ready) throw new ConversionError("invalidRequest");
    const from = formatFromExtension(file.name);
    if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
    const job = { signal, onProgress, timeoutMs: info.limits.timeoutMs };
    const named = (format: "jpg" | "png" | "webp", suffix: string) =>
      renameExtension(file.name, format).replace(new RegExp(`\\.${format}$`), `-${suffix}.${format}`);
    if (mode === "auto") {
      const out = await trackTool(
        "enhance-photo",
        { from, to: from, files: [file] },
        () => autoEnhanceFile({ input: file, from, maxMegapixels: maxMp }, job),
        (o) => o.buffer.byteLength,
      );
      return [
        {
          kind: "file",
          name: named(out.format, t("suffix")),
          blob: new Blob([out.buffer], { type: formats[out.format].mime }),
          message: { ok: true, text: t("doneAuto", { pixels: `${out.width} × ${out.height}` }) },
          compare: { before: ready.blob },
        },
      ];
    }
    const out = await trackTool(
      "enhance-photo",
      { from, to: from, files: [file] },
      () => upscaleFile({ input: file, from, maxMegapixels: maxMp, factor }, job),
      (o) => o.buffer.byteLength,
    );
    return [
      {
        kind: "file",
        name: named(out.format, `x${factor}`),
        blob: new Blob([out.buffer], { type: formats[out.format].mime }),
        message: {
          ok: true,
          text: t("doneAi", {
            factor,
            pixels: `${out.width} × ${out.height}`,
            backend: out.backend === "webgpu" ? "WebGPU" : "WASM",
            seconds: number(out.inferenceMs / 1000),
          }),
        },
        compare: { before: ready.blob, pixelated: true },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes, ready: !!ready && !tooBig }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("mode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "auto", label: t("modes.auto") },
              { value: "ai", label: t("modes.ai") },
            ]}
          />
          {mode === "auto" ? (
            <p className="text-sm text-muted">{t("autoHint")}</p>
          ) : (
            <>
              <ChoiceGroup
                legend={t("factor")}
                value={String(factor) as "2" | "4"}
                onChange={(v) => setFactor(Number(v) as UpscaleFactor)}
                options={[
                  { value: "2", label: t("factors.2") },
                  { value: "4", label: t("factors.4") },
                ]}
              />
              <p className="text-sm text-muted">{t("aiHint", { max: number(caps.upscaleMaxMegapixels) })}</p>
              <p className="text-sm text-muted">{t("aiSlow")}</p>
            </>
          )}
          {preview?.status === "loading" && <p className="text-sm text-muted">{t("loading")}</p>}
          {preview?.status === "error" && <ToolAlert>{te(preview.code)}</ToolAlert>}
          {ready && (
            <p className="text-sm text-muted">{t("size", { pixels: `${ready.width} × ${ready.height}`, mp: number(mp) })}</p>
          )}
          {tooBig && <ToolAlert>{t("tooBig", { mp: number(mp), max: number(maxMp) })}</ToolAlert>}
        </div>
      }
    />
  );
}
