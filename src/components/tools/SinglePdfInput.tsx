"use client";

import { useTranslations } from "next-intl";
import Dropzone from "@/components/converter/Dropzone";
import FileList from "./FileList";
import type { useSinglePdf } from "./useSinglePdf";

/** Dropzone + selected file row + page count for single-PDF tools. */
export default function SinglePdfInput({ pdf }: { pdf: ReturnType<typeof useSinglePdf> }) {
  const t = useTranslations("ToolUi");
  return (
    <>
      <Dropzone onFiles={pdf.pick} compact={pdf.files.length > 0} accept="application/pdf,.pdf" multiple={false} />
      {pdf.files.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface shadow-card px-4 sm:px-6">
          <FileList files={pdf.files} onRemove={pdf.remove} rejectLabel={t("onlyPdf")} />
          {pdf.pages !== null && <p className="pb-3 text-sm text-muted">{t("pages", { count: pdf.pages })}</p>}
          {pdf.broken && (
            <p role="alert" className="pb-3 text-sm text-danger">
              {t("brokenPdf")}
            </p>
          )}
        </div>
      )}
    </>
  );
}
