"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { createOcrSession, type OcrSession } from "@/lib/ocr/client";
import { ocrLanguages, type OcrLanguage } from "@/lib/ocr/text";
import { addOcrLayersToPdf } from "@/lib/pdf/client";
import { canvasToBlob, openPdf, renderPage } from "@/lib/pdf/render";
import { pageText, type TextItemLike } from "@/lib/pdf/text";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";
import { withTimeout } from "./timeout";

/** Every page is rendered and recognized in the browser: about 2–10 s each. */
export const MAX_OCR_PAGES = 100;
/** Pages rendered at 300 dpi (what tesseract's models expect), at most 4000 px on the long side. */
const RENDER_SCALE = 300 / 72;
const RENDER_MAX_SIDE = 4000;
/** A page with at least this much real text is not a scan. */
const MIN_TEXT_CHARS = 20;

type Output = "pdf" | "txt";
const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

async function openOrFail(file: Blob) {
  try {
    return await openPdf(file);
  } catch (error) {
    throw new ConversionError((error as Error)?.name === "PasswordException" ? "pdfAlreadyProtected" : "fileDamaged");
  }
}

/** Scanned PDF → searchable PDF (original pages + invisible text) or plain text. */
export default function OcrPdfTool() {
  const t = useTranslations("OcrTool");
  const tt = useTranslations("Tools.ocr-pdf");
  const locale = useLocale();
  const [language, setLanguage] = useState<OcrLanguage>((ocrLanguages as readonly string[]).includes(locale) ? (locale as OcrLanguage) : "en");
  const [output, setOutput] = useState<Output>("pdf");
  const [skipText, setSkipText] = useState(true);
  const { timeoutMs, maxFileBytes } = tools["ocr-pdf"].limits;

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-ocr.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("language")} value={language} onChange={setLanguage} options={ocrLanguages.map((l) => ({ value: l, label: t(`languages.${l}`) }))} />
          <ChoiceGroup
            legend={t("output")}
            value={output}
            onChange={setOutput}
            options={[
              { value: "pdf", label: t("outputPdf") },
              { value: "txt", label: t("outputTxt") },
            ]}
          />
          <Checkbox checked={skipText} onChange={setSkipText} label={t("skipText")} />
          <p className="text-sm text-muted">{t("pdfNote", { pages: MAX_OCR_PAGES })}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        let session: OcrSession | null = null;
        try {
          const results = await runBatch(
            files,
            (file, job) =>
              trackTool(
                "ocr-pdf",
                { from: "pdf", to: output, files: [file] },
                async () => {
                  const jobSignal = job.signal ?? signal;
                  const doc = await openOrFail(file);
                  try {
                    const pages = doc.numPages;
                    if (pages > MAX_OCR_PAGES) throw new ConversionError("tooManyPages");
                    const layers: (Uint8Array | null)[] = [];
                    const texts: string[] = [];
                    let recognized = 0;
                    for (let n = 1; n <= pages; n++) {
                      if (jobSignal.aborted) throw new ConversionError("jobCancelled");
                      const page = await doc.getPage(n);
                      const existing = pageText((await page.getTextContent()).items as TextItemLike[]);
                      if (skipText && existing.replace(/\s/g, "").length >= MIN_TEXT_CHARS) {
                        layers.push(null);
                        texts.push(existing);
                        job.onProgress(n / pages);
                        continue;
                      }
                      const limit = withTimeout(jobSignal, timeoutMs);
                      try {
                        const canvas = await renderPage(doc, n - 1, { scale: RENDER_SCALE, maxSide: RENDER_MAX_SIDE });
                        const png = await canvasToBlob(canvas, "image/png");
                        canvas.width = canvas.height = 0;
                        session ??= await createOcrSession(language, limit.signal);
                        const result = await session.recognize(png, {
                          signal: limit.signal,
                          pdf: output === "pdf",
                          onProgress: (p) => job.onProgress((n - 1 + p) / pages),
                        });
                        layers.push(result.text ? (result.pdf ?? null) : null);
                        texts.push(result.text.trimEnd());
                        if (result.text) recognized++;
                      } catch (error) {
                        if (limit.signal.aborted) session = null;
                        throw error;
                      } finally {
                        limit.done();
                      }
                    }
                    if (output === "txt") {
                      if (texts.every((text) => text.trim() === "")) throw new ConversionError("ocrNoText");
                      return new Blob([`${texts.join("\n\n").trim()}\n`], { type: "text/plain;charset=utf-8" });
                    }
                    if (recognized === 0) {
                      throw new ConversionError(layers.length > 0 && texts.some((text) => text.trim() !== "") ? "pdfAlreadySearchable" : "ocrNoText");
                    }
                    return await addOcrLayersToPdf(file, layers, { signal: jobSignal });
                  } finally {
                    void doc.loadingTask.destroy();
                  }
                },
                (out) => out.size,
              ),
            { signal, onProgress },
          );
          return results.map((result, i): ShellOutput => {
            const base = baseName(files[i]!.name);
            const name = output === "pdf" ? `${base}-ocr.pdf` : `${base}.txt`;
            if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
            return { kind: "file", name, blob: result.value };
          });
        } finally {
          await (session as OcrSession | null)?.terminate().catch(() => {});
        }
      }}
    />
  );
}
