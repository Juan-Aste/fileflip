"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { cropPdfFile } from "@/lib/pdf/client";
import { contentMargins, MM, type Margins } from "@/lib/pdf/crop";
import { openPdf, renderPage } from "@/lib/pdf/render";
import { extractPdfText } from "@/lib/pdf/text";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ChoiceGroup from "./ChoiceGroup";
import ToolShell from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

/** Opens a PDF with pdf.js; anything it can't parse is a damaged file. */
async function openOrFail(file: Blob) {
  try {
    return await openPdf(file);
  } catch {
    throw new ConversionError("fileDamaged");
  }
}

export function PdfToTextTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.pdf-to-text");
  const [headings, setHeadings] = useState(false);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true }}
      actionLabel={tt("action")}
      zipName="fileflect-text.zip"
      options={<Checkbox checked={headings} onChange={setHeadings} label={t("pageHeadings")} />}
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "pdf-to-text",
              { from: "pdf", to: "txt", files: [file] },
              async () => {
                const doc = await openOrFail(file);
                try {
                  return await extractPdfText(doc, {
                    pageHeading: headings ? (n) => t("pageHeading", { n }) : undefined,
                    onProgress: job.onProgress,
                    signal: job.signal,
                  });
                } finally {
                  void doc.loadingTask.destroy();
                }
              },
              (text) => text.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = `${baseName(files[i]!.name)}.txt`;
          return result.status === "error"
            ? { kind: "error", name, code: result.code }
            : { kind: "file", name, blob: new Blob([result.value], { type: "text/plain;charset=utf-8" }), preview: result.value };
        });
      }}
    />
  );
}

type Side = keyof Margins;
const sides: Side[] = ["top", "right", "bottom", "left"];
/** Space kept around the content when cropping automatically (3 mm). */
const marginsOf = (value: (side: Side) => number): Margins => ({ top: value("top"), right: value("right"), bottom: value("bottom"), left: value("left") });
const AUTO_PADDING = 3 * MM;
/** Render scale for finding the content: 0.5 = 36 DPI, enough to see where it ends. */
const DETECT_SCALE = 0.5;

/** Margins around each page's content, as the reader sees it; null for blank pages. */
async function detectMargins(file: Blob, signal: AbortSignal, onProgress: (p: number) => void): Promise<(Margins | null)[]> {
  const doc = await openOrFail(file);
  try {
    const margins: (Margins | null)[] = [];
    for (let i = 0; i < doc.numPages; i++) {
      if (signal.aborted) throw new ConversionError("jobCancelled");
      const canvas = await renderPage(doc, i, { scale: DETECT_SCALE, maxSide: 2000 });
      const scale = canvas.width / (await doc.getPage(i + 1)).getViewport({ scale: 1 }).width;
      const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      const px = contentMargins(data, canvas.width, canvas.height);
      margins.push(px && marginsOf((side) => Math.max(0, px[side] / scale - AUTO_PADDING)));
      canvas.width = canvas.height = 0;
      onProgress((i + 1) / doc.numPages);
    }
    return margins;
  } finally {
    void doc.loadingTask.destroy();
  }
}

export function CropPdfTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.crop-pdf");
  const id = useId();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [mm, setMm] = useState<Record<Side, string>>({ top: "10", right: "10", bottom: "10", left: "10" });
  const parsed = marginsOf((s) => (/^\d{1,3}([.,]\d+)?$/.test(mm[s].trim()) ? Number(mm[s].replace(",", ".")) : NaN));
  const manualValid = sides.every((s) => Number.isFinite(parsed[s])) && sides.some((s) => parsed[s] > 0);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, ready: mode === "auto" || manualValid }}
      actionLabel={tt("action")}
      zipName="fileflect-cropped.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("cropMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "auto", label: t("cropAuto") },
              { value: "manual", label: t("cropManual") },
            ]}
          />
          {mode === "manual" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t("cropMargins")}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sides.map((side) => (
                  <div key={side} className="flex flex-col gap-1">
                    <label htmlFor={`${id}-${side}`} className="text-sm">
                      {t(`sides.${side}`)}
                    </label>
                    <input
                      id={`${id}-${side}`}
                      value={mm[side]}
                      onChange={(e) => setMm((prev) => ({ ...prev, [side]: e.target.value }))}
                      inputMode="decimal"
                      aria-invalid={!Number.isFinite(parsed[side])}
                      className={`h-10 ${field}`}
                    />
                  </div>
                ))}
              </div>
              {!manualValid && <span className="text-xs text-danger">{t("cropInvalid")}</span>}
            </fieldset>
          )}
          <p className="text-sm text-muted">{t("cropNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "crop-pdf",
              { from: "pdf", to: "pdf", files: [file] },
              async () => {
                let margins: (Margins | null)[];
                if (mode === "auto") {
                  margins = await detectMargins(file, job.signal ?? new AbortController().signal, (p) => job.onProgress(p * 0.8));
                } else {
                  const doc = await openOrFail(file);
                  const pages = doc.numPages;
                  void doc.loadingTask.destroy();
                  const m = marginsOf((s) => parsed[s] * MM);
                  margins = Array.from({ length: pages }, () => m);
                }
                return cropPdfFile(file, margins, { signal: job.signal });
              },
              (b) => b.size,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = `${baseName(files[i]!.name)}-cropped.pdf`;
          return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
        });
      }}
    />
  );
}
