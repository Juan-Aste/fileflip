"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { aspectPresets, aspectRatio, fitAspect, type AspectId, type Rect, type Size } from "@/lib/image/crop-rect";
import { cropImageFile, previewImageFile } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import CropEditor from "./CropEditor";

const info = tools["crop-image"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);

type Output = "same" | "jpg" | "png" | "webp" | "avif";

/** Output when keeping the format: HEIC can only be read, so it becomes JPG. */
const sameAs = (from: FormatId): FormatId => (from === "heic" ? "jpg" : from);

/** Longest side of the editing preview. */
const PREVIEW_SIDE = 1600;

type Preview = { status: "loading" } | { status: "ready"; url: string; image: Size } | { status: "error"; code: ApiErrorCode };

export default function CropImageTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.crop-image");
  const te = useTranslations("ApiErrors");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [aspect, setAspect] = useState<AspectId>("free");
  const [rect, setRect] = useState<Rect | null>(null);
  const [output, setOutput] = useState<Output>("same");
  const job = useRef<AbortController | null>(null);
  // Read when the preview arrives: the user may pick a ratio while it loads.
  const aspectNow = useRef(aspect);
  useEffect(() => {
    aspectNow.current = aspect;
  }, [aspect]);

  // A new file: decode it in the worker for the preview and its real size.
  useEffect(() => {
    job.current?.abort();
    if (!file) {
      setPreview(null);
      return;
    }
    const from = formatFromExtension(file.name);
    const abort = new AbortController();
    job.current = abort;
    let url: string | null = null;
    setPreview({ status: "loading" });
    setRect(null);
    (from ? previewImageFile({ input: file, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal }) : Promise.reject(new ConversionError("unsupportedFormat")))
      .then((p) => {
        if (abort.signal.aborted) return;
        url = URL.createObjectURL(p.blob);
        const image = { width: p.width, height: p.height };
        setPreview({ status: "ready", url, image });
        setRect(fitAspect(image, aspectRatio(aspectNow.current, image)));
      })
      .catch((error) => !abort.signal.aborted && setPreview({ status: "error", code: errorCode(error) }));
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const ready = preview?.status === "ready" ? preview : null;
  const ratio = ready ? aspectRatio(aspect, ready.image) : null;

  function chooseAspect(id: AspectId) {
    setAspect(id);
    if (ready) setRect(fitAspect(ready.image, aspectRatio(id, ready.image)));
  }

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !rect) throw new ConversionError("invalidRequest");
    const from = formatFromExtension(file.name);
    if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
    const to = output === "same" ? sameAs(from) : output;
    const out = await trackTool(
      "crop-image",
      { from, to, files: [file] },
      () => cropImageFile({ input: file, from, to, rect }, { signal, onProgress, timeoutMs: info.limits.timeoutMs }),
      (o) => o.buffer.byteLength,
    );
    const name = renameExtension(file.name, formats[to].extensions[0]!);
    return [
      {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[to].mime }),
        message: { ok: true, text: t("croppedTo", { name, size: `${out.width} × ${out.height}` }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes, ready: !!ready && !!rect }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        file && (
          <div className="flex flex-col gap-4">
            <ChoiceGroup
              legend={t("cropAspect")}
              value={aspect}
              onChange={chooseAspect}
              options={aspectPresets.map((p) => ({
                value: p.id,
                label: p.id === "free" ? t("aspectFree") : p.id === "original" ? t("aspectOriginal") : p.id,
              }))}
            />
            {preview?.status === "loading" && <p className="text-sm text-muted">{t("cropLoading")}</p>}
            {preview?.status === "error" && <ToolAlert>{te(preview.code)}</ToolAlert>}
            {ready && rect && <CropEditor src={ready.url} image={ready.image} rect={rect} ratio={ratio} onChange={setRect} />}
            {ready && rect && (
              <p className="text-sm font-medium tabular-nums">
                {t("cropSize", { width: rect.width, height: rect.height, imageWidth: ready.image.width, imageHeight: ready.image.height })}
              </p>
            )}
            <ChoiceGroup
              legend={t("format")}
              value={output}
              onChange={setOutput}
              options={[
                { value: "same", label: t("formatSame") },
                { value: "jpg", label: "JPG" },
                { value: "png", label: "PNG" },
                { value: "webp", label: "WEBP" },
                { value: "avif", label: "AVIF" },
              ]}
            />
          </div>
        )
      }
    />
  );
}
