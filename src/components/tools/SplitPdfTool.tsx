"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { splitPdfFile } from "@/lib/pdf/client";
import { parsePageRanges, rangeLabel } from "@/lib/pdf/ranges";
import ToolAlert from "./ToolAlert";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import RangesInput from "./RangesInput";
import SinglePdfInput from "./SinglePdfInput";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";
import { trackTool } from "@/lib/stats-client";

type Mode = "each" | "ranges" | "extract";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

export default function SplitPdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.split-pdf");
  const te = useTranslations("ApiErrors");
  const pdf = useSinglePdf();
  const [mode, setMode] = useState<Mode>("each");
  const [ranges, setRanges] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [failed, setFailed] = useState(false);

  const parsed = pdf.pages && mode !== "each" ? parsePageRanges(ranges, pdf.pages) : null;
  const groups: number[][] | null =
    pdf.pages === null
      ? null
      : mode === "each"
        ? Array.from({ length: pdf.pages }, (_, i) => [i])
        : mode === "extract" && parsed
          ? [parsed.flat()]
          : parsed;

  async function run() {
    if (!pdf.file || !groups) return;
    setFailed(false);
    setProgress(0);
    try {
      const base = baseName(pdf.file.name);
      const file = pdf.file;
      const outputs = await trackTool(
        "split-pdf",
        { from: "pdf", to: "pdf", files: [file] },
        () => splitPdfFile(file, groups, setProgress),
        (parts) => parts.reduce((sum, b) => sum + b.size, 0),
      );
      if (outputs.length === 1) {
        setResult({ blob: outputs[0], name: `${base}-${rangeLabel(groups[0])}.pdf` });
      } else {
        const { zipBlobs } = await import("@/lib/zip");
        const files = outputs.map((blob, i) => ({ blob, name: `${base}-${rangeLabel(groups[i])}.pdf` }));
        setResult({ blob: await zipBlobs(files), name: `${base}.zip` });
      }
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
        blob={result.blob}
        filename={result.name}
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
            legend={t("splitMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "each", label: t("splitEach") },
              { value: "ranges", label: t("splitRanges") },
              { value: "extract", label: t("splitExtract") },
            ]}
          />
          {mode !== "each" && (
            <RangesInput
              value={ranges}
              onChange={setRanges}
              valid={Boolean(parsed)}
              pageCount={pdf.pages}
            />
          )}
          {progress !== null && <ProgressBar value={progress} label={t("working")} />}
          {failed && (
            <ToolAlert>
              {te("conversionFailed")}
            </ToolAlert>
          )}
          <PrimaryButton onClick={run} disabled={!groups || progress !== null}>
            {progress !== null ? t("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
