"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Dropzone from "@/components/converter/Dropzone";
import { mergePdfFiles } from "@/lib/pdf/client";
import { unexpectedErrorCode } from "@/lib/convert-error";
import ToolAlert from "./ToolAlert";
import FileList from "./FileList";
import ProgressBar from "./ProgressBar";
import ToolResult from "./ToolResult";
import { useToolFiles } from "./useToolFiles";
import { buttonPrimary } from "@/components/ui/styles";
import { trackTool } from "@/lib/stats-client";

const ACCEPTED = ["pdf"] as const;

export default function MergePdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.merge-pdf");
  const te = useTranslations("ApiErrors");
  const { files, ready, detecting, add, remove, move, clear } = useToolFiles(ACCEPTED);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  async function run() {
    setFailed(false);
    setProgress(0);
    try {
      const inputs = ready.map((f) => f.file);
      setResult(
        await trackTool("merge-pdf", { from: "pdf", to: "pdf", files: inputs }, () => mergePdfFiles(inputs, setProgress), (b) => b.size),
      );
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
        filename="fileflect-merged.pdf"
        onReset={() => {
          setResult(null);
          clear();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Dropzone onFiles={add} compact={files.length > 0} accept="application/pdf,.pdf" />
      {files.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-6">
          <FileList files={files} onRemove={remove} onMove={move} rejectLabel={t("onlyPdf")} />
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {progress !== null && <ProgressBar value={progress} label={t("working")} />}
            {failed && (
              <ToolAlert>
                {te(unexpectedErrorCode())}
              </ToolAlert>
            )}
            {ready.length < 2 && !detecting && <p className="text-sm text-muted">{t("needMore", { count: 2 })}</p>}
            <button
              type="button"
              onClick={run}
              disabled={ready.length < 2 || detecting || progress !== null}
              className={`self-start ${buttonPrimary}`}
            >
              {progress !== null ? t("working") : tt("action")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
