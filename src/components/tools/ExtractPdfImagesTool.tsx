"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { originalPdfJpegs } from "@/lib/pdf/client";
import { extractPdfImages, toRgba, type ExtractedImage, type PdfjsImage } from "@/lib/pdf/images";
import { canvasToBlob, openPdf } from "@/lib/pdf/render";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ToolShell from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";
/** "Skip small images": icons, bullets and lines are rarely what people want. */
const SMALL_SIDE = 50;

/** A decoded image (ImageBitmap in browsers, else raw pixels) as PNG. */
async function encodePng(image: PdfjsImage): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  if (image.bitmap) ctx.drawImage(image.bitmap, 0, 0);
  else ctx.putImageData(new ImageData(toRgba(image) as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0);
  const blob = await canvasToBlob(canvas, "image/png");
  canvas.width = canvas.height = 0;
  return new Uint8Array(await blob.arrayBuffer());
}

export default function ExtractPdfImagesTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.extract-pdf-images");
  const [skipSmall, setSkipSmall] = useState(true);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true }}
      actionLabel={tt("action")}
      zipName="fileflect-images.zip"
      options={
        <div className="flex flex-col gap-3">
          <Checkbox checked={skipSmall} onChange={setSkipSmall} label={t("skipSmallImages", { size: SMALL_SIDE })} />
          <p className="text-sm text-muted">{t("extractImagesNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "extract-pdf-images",
              { from: "pdf", to: "png", files: [file] },
              async () => {
                const jpegs = await originalPdfJpegs(file, { signal: job.signal });
                let doc;
                try {
                  doc = await openPdf(file);
                } catch {
                  throw new ConversionError("fileDamaged");
                }
                try {
                  return await extractPdfImages(doc, {
                    minSide: skipSmall ? SMALL_SIDE : 1,
                    jpegs,
                    encodePng,
                    onProgress: job.onProgress,
                    signal: job.signal,
                  });
                } finally {
                  void doc.loadingTask.destroy();
                }
              },
              (images: ExtractedImage[]) => images.reduce((sum, i) => sum + i.bytes.length, 0),
            ),
          { signal, onProgress },
        );
        return results.flatMap((result, i): ShellOutput[] => {
          const base = baseName(files[i]!.name);
          if (result.status === "error") return [{ kind: "error", name: files[i]!.name, code: result.code }];
          return result.value.map((image) => ({
            kind: "file",
            name: `${base}-p${image.page}-${image.index}.${image.type}`,
            blob: new Blob([image.bytes.slice().buffer], { type: image.type === "jpg" ? "image/jpeg" : "image/png" }),
          }));
        });
      }}
    />
  );
}
