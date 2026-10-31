"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { conversionSlug } from "@/config/conversion-pages";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { buildPptx, type SlideImage } from "@/lib/pdf/pptx";
import { canvasToBlob, openPdf, renderPage } from "@/lib/pdf/render";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "./ChoiceGroup";
import ToolShell from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

type Quality = "standard" | "high";
/** Pictures sharp enough to project and zoom: 150 DPI, or 220 DPI for small print and drawings. */
const DPI: Record<Quality, number> = { standard: 150, high: 220 };
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const deckName = (name: string) =>
  `${name.replace(/\.pdf$/i, "") || "presentation"}.pptx`;

/** PDF → PPTX in the browser: every page rendered by pdf.js as a picture on its own slide. */
export default function PdfToPowerPointTool() {
  const t = useTranslations("PdfPptTool");
  const tt = useTranslations("Tools.pdf-to-powerpoint");
  const tu = useTranslations("ToolUi");
  const locale = useLocale() as Locale;
  const [quality, setQuality] = useState<Quality>("standard");

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true }}
      actionLabel={tt("action")}
      zipName="fileflect-pptx.zip"
      options={
        <div className="flex flex-col gap-3">
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            {t("imagesNote")}{" "}
            <Link
              href={`/${conversionSlug({ from: "pdf", to: "docx" }, locale)}`}
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {t("wordLink")}
            </Link>
          </p>
          <ChoiceGroup
            legend={t("quality")}
            value={quality}
            onChange={setQuality}
            options={[
              { value: "standard", label: t("standard") },
              { value: "high", label: t("high") },
            ]}
          />
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const outputs: ShellOutput[] = [];
        for (const [f, file] of files.entries()) {
          try {
            const deck = await trackTool(
              "pdf-to-powerpoint",
              { from: "pdf", to: "pptx", files: [file] },
              async () => {
                const doc = await openPdf(file);
                try {
                  const slides: SlideImage[] = [];
                  for (let i = 0; i < doc.numPages; i++) {
                    if (signal.aborted)
                      throw new ConversionError("jobCancelled");
                    const { width, height } = (
                      await doc.getPage(i + 1)
                    ).getViewport({ scale: 1 });
                    const canvas = await renderPage(doc, i, {
                      scale: DPI[quality] / 72,
                      maxSide: 4000,
                    });
                    const jpeg = new Uint8Array(
                      await (
                        await canvasToBlob(canvas, "image/jpeg", 0.9)
                      ).arrayBuffer(),
                    );
                    // Free the bitmap right away: long PDFs would otherwise pile up.
                    canvas.width = canvas.height = 0;
                    slides.push({ jpeg, width, height });
                    onProgress((f + (i + 1) / doc.numPages) / files.length);
                  }
                  return buildPptx(slides, {
                    title: file.name.replace(/\.pdf$/i, ""),
                    slideName: tu("pageLabel", { n: "" }).trim(),
                  });
                } finally {
                  await doc.loadingTask.destroy();
                }
              },
              (bytes) => bytes.length,
            );
            outputs.push({
              kind: "file",
              name: deckName(file.name),
              blob: new Blob([deck.slice().buffer], { type: PPTX_MIME }),
            });
          } catch (error) {
            if (signal.aborted) throw error;
            console.error(error);
            outputs.push({
              kind: "error",
              name: file.name,
              code: errorCode(error),
            });
          }
        }
        return outputs;
      }}
    />
  );
}
