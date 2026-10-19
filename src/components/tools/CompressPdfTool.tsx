"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatPercent } from "@/lib/format";
import { compressPdfFile } from "@/lib/pdf/client";
import type { CompressionLevel } from "@/lib/pdf/compress";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import SinglePdfInput from "./SinglePdfInput";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";

export default function CompressPdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.compress-pdf");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const pdf = useSinglePdf();
  const [level, setLevel] = useState<CompressionLevel>("recommended");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  async function run() {
    if (!pdf.file) return;
    setFailed(false);
    setProgress(0);
    try {
      setResult((await compressPdfFile(pdf.file, level, setProgress)).blob);
    } catch (error) {
      console.error(error);
      setFailed(true);
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
            <span className="text-emerald-600 dark:text-emerald-400">
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
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
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
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {te("conversionFailed")}
            </p>
          )}
          <PrimaryButton onClick={run} disabled={progress !== null}>
            {progress !== null ? t("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
