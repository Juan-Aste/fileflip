"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { rotatePdfFile } from "@/lib/pdf/client";
import type { Rotation } from "@/lib/pdf/ops";
import { parsePageRanges } from "@/lib/pdf/ranges";
import { unexpectedErrorCode } from "@/lib/convert-error";
import ToolAlert from "./ToolAlert";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import RangesInput from "./RangesInput";
import SinglePdfInput from "./SinglePdfInput";
import ToolResult from "./ToolResult";
import { useSinglePdf } from "./useSinglePdf";
import { trackTool } from "@/lib/stats-client";

export default function RotatePdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.rotate-pdf");
  const te = useTranslations("ApiErrors");
  const pdf = useSinglePdf();
  const [rotation, setRotation] = useState<`${Rotation}`>("90");
  const [scope, setScope] = useState<"all" | "some">("all");
  const [ranges, setRanges] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  const pages = scope === "some" && pdf.pages ? parsePageRanges(ranges, pdf.pages)?.flat() : undefined;
  const ready = pdf.file && pdf.pages !== null && (scope === "all" || pages);

  async function run() {
    if (!pdf.file) return;
    setFailed(false);
    setWorking(true);
    try {
      const file = pdf.file;
      setResult(
        await trackTool(
          "rotate-pdf",
          { from: "pdf", to: "pdf", files: [file] },
          () => rotatePdfFile(file, Number(rotation) as Rotation, pages),
          (b) => b.size,
        ),
      );
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setWorking(false);
    }
  }

  if (result && pdf.file) {
    return (
      <ToolResult
        blob={result}
        filename={pdf.file.name.replace(/(\.pdf)?$/i, "-rotated.pdf")}
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
            legend={t("rotation")}
            value={rotation}
            onChange={setRotation}
            options={[
              { value: "90", label: `↻ ${t("rotateRight")}` },
              { value: "180", label: t("rotate180") },
              { value: "270", label: `↺ ${t("rotateLeft")}` },
            ]}
          />
          <ChoiceGroup
            legend={t("rotateScope")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: t("allPages") },
              { value: "some", label: t("somePages") },
            ]}
          />
          {scope === "some" && (
            <RangesInput
              value={ranges}
              onChange={setRanges}
              valid={Boolean(pages)}
              pageCount={pdf.pages} placeholder="1, 3-4"
            />
          )}
          {failed && (
            <ToolAlert>
              {te(unexpectedErrorCode())}
            </ToolAlert>
          )}
          <PrimaryButton onClick={run} disabled={!ready || working}>
            {working ? t("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
