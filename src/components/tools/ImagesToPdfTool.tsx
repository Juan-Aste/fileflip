"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Dropzone from "@/components/converter/Dropzone";
import { formats, type FormatId } from "@/config/formats";
import { imagesToPdfFile } from "@/lib/pdf/client";
import type { PageSize } from "@/lib/pdf/ops";
import ChoiceGroup from "./ChoiceGroup";
import FileList from "./FileList";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import ToolResult from "./ToolResult";
import { useToolFiles } from "./useToolFiles";

const ACCEPTED = (Object.keys(formats) as FormatId[]).filter((f) => formats[f].category === "image");
const MARGINS = { none: 0, small: 18, large: 42 } as const;

export default function ImagesToPdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.images-to-pdf");
  const te = useTranslations("ApiErrors");
  const { files, ready, detecting, add, remove, move, clear } = useToolFiles(ACCEPTED);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<keyof typeof MARGINS>("small");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  async function run() {
    setFailed(false);
    setProgress(0);
    try {
      const inputs = ready.map((f) => ({ file: f.file, format: f.format as FormatId }));
      setResult(await imagesToPdfFile(inputs, { pageSize, margin: MARGINS[margin] }, setProgress));
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setProgress(null);
    }
  }

  if (result) {
    return (
      <ToolResult
        blob={result}
        filename={ready.length === 1 ? ready[0].file.name.replace(/\.[^.]+$/, "") + ".pdf" : "fileflip-images.pdf"}
        onReset={() => {
          setResult(null);
          clear();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Dropzone onFiles={add} compact={files.length > 0} accept="image/*,.heic,.heif" />
      {files.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <FileList files={files} onRemove={remove} onMove={move} rejectLabel={t("onlyImages")} />
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <ChoiceGroup
              legend={t("pageSize")}
              value={pageSize}
              onChange={setPageSize}
              options={[
                { value: "a4", label: t("pageA4") },
                { value: "letter", label: t("pageLetter") },
                { value: "fit", label: t("pageFit") },
              ]}
            />
            <ChoiceGroup
              legend={t("margin")}
              value={margin}
              onChange={setMargin}
              options={[
                { value: "none", label: t("marginNone") },
                { value: "small", label: t("marginSmall") },
                { value: "large", label: t("marginLarge") },
              ]}
            />
            {progress !== null && <ProgressBar value={progress} label={t("working")} />}
            {failed && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {te("conversionFailed")}
              </p>
            )}
            {!ready.length && !detecting && <p className="text-sm text-muted">{t("needOne")}</p>}
            <PrimaryButton onClick={run} disabled={!ready.length || detecting || progress !== null}>
              {progress !== null ? t("working") : tt("action")}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
