"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatPercent } from "@/lib/format";
import { compressPdfFile } from "@/lib/pdf/client";
import type { CompressionLevel } from "@/lib/pdf/compress";
import { errorCode } from "@/lib/convert-error";
import type { ApiErrorCode } from "@/lib/api-errors";
import ToolAlert from "./ToolAlert";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import SinglePdfInput from "./SinglePdfInput";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";
import { trackTool } from "@/lib/stats-client";

export default function CompressPdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.compress-pdf");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const pdf = useSinglePdf();
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState<ApiErrorCode | null>(null);

  async function run() {
    if (!pdf.file) return;
    setFailed(null);
    setProgress(0);
    try {
      const file = pdf.file;
      const { blob } = await trackTool(
        "compress-pdf",
        { from: "pdf", to: "pdf", files: [file] },
        () => compressPdfFile(file, level, setProgress),
        (r) => r.blob.size,
      );
      setResult(blob);
    } catch (error) {
      console.error(error);
      setFailed(errorCode(error));
    } finally {
      setProgress(null);
    }
  }

  if (result && pdf.file) {
    const before = pdf.file.size;
    const saved = 1 - result.size / before;
    return (
      <ToolResult
        blob={result}
        filename={pdf.file.name.replace(/(\.pdf)?$/i, "-compressed.pdf")}
        note={
          saved > 0.01 ? (
            <span className="text-success">
              {t("reduced", {
                before: formatBytes(before, locale),
                after: formatBytes(result.size, locale),
                percent: formatPercent(saved, locale),
              })}
            </span>
          ) : (
            t("alreadyOptimized")
          )
        }
        onReset={() => {
          setResult(null);
          pdf.clear();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SinglePdfInput pdf={pdf} />
      {pdf.pages !== null && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-6">
          <ChoiceGroup
            legend={t("level")}
            value={level}
            onChange={setLevel}
            options={[
              { value: "low", label: t("levelLow") },
              { value: "recommended", label: t("levelRecommended") },
              { value: "strong", label: t("levelStrong") },
            ]}
          />
          {progress !== null && <ProgressBar value={progress} label={t("working")} />}
          {failed && (
            <ToolAlert>
              {te(failed)}
            </ToolAlert>
          )}
          <PrimaryButton onClick={run} disabled={progress !== null}>
            {progress !== null ? t("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
