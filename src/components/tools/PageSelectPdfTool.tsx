"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { buttonSecondary } from "@/components/ui/styles";
import { organizePdfFile, splitPdfFile } from "@/lib/pdf/client";
import { formatPageRanges, parsePageRanges } from "@/lib/pdf/ranges";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "./ChoiceGroup";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import RangesInput from "./RangesInput";
import SinglePdfInput from "./SinglePdfInput";
import ToolAlert from "./ToolAlert";
import ToolResult from "./ToolResult";
import { usePdfThumbnails } from "./usePdfThumbnails";
import { useSinglePdf } from "./useSinglePdf";

type Variant = "delete" | "extract";
type Output = "single" | "each";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

/**
 * Pick pages on thumbnails (or type ranges) to remove them from a PDF, or to
 * take them out into a new one (one PDF, or one per page in a ZIP).
 */
function PageSelectPdfTool({ variant }: { variant: Variant }) {
  const id = variant === "delete" ? "delete-pdf-pages" : "extract-pdf-pages";
  const t = useTranslations("ToolUi");
  const tt = useTranslations(`Tools.${id}`);
  const te = useTranslations("ApiErrors");
  const pdf = useSinglePdf();
  const { thumbs, failed: thumbsFailed } = usePdfThumbnails(pdf.file);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ranges, setRanges] = useState("");
  const [output, setOutput] = useState<Output>("single");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [failed, setFailed] = useState(false);

  const total = pdf.pages ?? 0;
  useEffect(() => {
    setSelected(new Set());
    setRanges("");
  }, [pdf.file, pdf.pages]);

  const choose = (next: Set<number>) => {
    setSelected(next);
    setRanges(formatPageRanges(next));
  };
  const toggle = (page: number) => {
    const next = new Set(selected);
    if (!next.delete(page)) next.add(page);
    choose(next);
  };
  const typeRanges = (value: string) => {
    setRanges(value);
    const parsed = total ? parsePageRanges(value, total) : null;
    setSelected(new Set(parsed?.flat() ?? []));
  };
  const rangesValid = ranges.trim() === "" || (total > 0 && parsePageRanges(ranges, total) !== null);

  const pages = [...selected].sort((a, b) => a - b);
  // Deleting every page would leave an empty (invalid) PDF.
  const allSelected = variant === "delete" && total > 0 && selected.size === total;
  const canRun = pages.length > 0 && rangesValid && !allSelected && !working;
  const loaded = thumbs.filter(Boolean).length;

  async function run() {
    if (!pdf.file || !canRun) return;
    const file = pdf.file;
    const base = baseName(file.name);
    setFailed(false);
    setWorking(true);
    try {
      if (variant === "delete") {
        const keep = Array.from({ length: total }, (_, index) => index).filter((i) => !selected.has(i));
        const blob = await trackTool(
          id,
          { from: "pdf", to: "pdf", files: [file] },
          () => organizePdfFile(file, keep.map((index) => ({ index, rotation: 0 }))),
          (b) => b.size,
        );
        setResult({ blob, name: `${base}-edited.pdf` });
      } else {
        const groups = output === "each" ? pages.map((p) => [p]) : [pages];
        const outputs = await trackTool(
          id,
          { from: "pdf", to: "pdf", files: [file] },
          () => splitPdfFile(file, groups),
          (parts) => parts.reduce((sum, b) => sum + b.size, 0),
        );
        if (outputs.length === 1) {
          setResult({ blob: outputs[0]!, name: `${base}-${formatPageRanges(pages).replace(/, /g, "_")}.pdf` });
        } else {
          const { zipBlobs } = await import("@/lib/zip");
          const files = outputs.map((blob, i) => ({ blob, name: `${base}-${pages[i]! + 1}.pdf` }));
          setResult({ blob: await zipBlobs(files), name: `${base}-pages.zip` });
        }
      }
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setWorking(false);
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

  const Mark = variant === "delete" ? X : Check;
  return (
    <div className="flex flex-col gap-4">
      <SinglePdfInput pdf={pdf} />
      {pdf.pages !== null && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
          {loaded < total && !thumbsFailed && <ProgressBar value={loaded / (total || 1)} label={t("loadingPages")} />}
          <p className="text-sm text-muted">{t(variant === "delete" ? "pickDeleteHint" : "pickExtractHint")}</p>
          <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: total }, (_, index) => {
              const n = index + 1;
              const on = selected.has(index);
              return (
                <li key={index}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={t("pageLabel", { n })}
                    onClick={() => toggle(index)}
                    className={`relative flex w-full flex-col items-center gap-1 rounded-xl border-2 bg-background p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      on ? (variant === "delete" ? "border-danger" : "border-brand") : "border-border hover:border-muted"
                    }`}
                  >
                    <span className="grid aspect-[3/4] w-full place-items-center overflow-hidden">
                      {thumbs[index] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                        <img
                          src={thumbs[index]}
                          alt=""
                          draggable={false}
                          className={`max-h-full max-w-full shadow ${on && variant === "delete" ? "opacity-40" : ""}`}
                        />
                      ) : (
                        <span className="text-sm text-muted">{n}</span>
                      )}
                    </span>
                    <span className="text-xs font-medium tabular-nums">{n}</span>
                    {on && (
                      <span
                        className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-white ${
                          variant === "delete" ? "bg-danger" : "bg-brand"
                        }`}
                      >
                        <Mark aria-hidden="true" className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={buttonSecondary} onClick={() => choose(new Set(Array.from({ length: total }, (_, i) => i)))}>
              {t("selectAll")}
            </button>
            <button type="button" className={buttonSecondary} disabled={selected.size === 0} onClick={() => choose(new Set())}>
              {t("selectNone")}
            </button>
          </div>
          <RangesInput value={ranges} onChange={typeRanges} valid={rangesValid} pageCount={total} />
          <p role="status" className="text-sm font-medium">
            {t(variant === "delete" ? "pagesToDelete" : "pagesToExtract", { count: pages.length, total })}
          </p>
          {allSelected && <ToolAlert>{t("cannotDeleteAll")}</ToolAlert>}
          {variant === "extract" && (
            <ChoiceGroup
              legend={t("extractOutput")}
              value={output}
              onChange={setOutput}
              options={[
                { value: "single", label: t("extractSingle") },
                { value: "each", label: t("extractEach") },
              ]}
            />
          )}
          {failed && <ToolAlert>{te("conversionFailed")}</ToolAlert>}
          <PrimaryButton onClick={run} disabled={!canRun}>
            {working ? t("working") : tt("action")}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

export const DeletePdfPagesTool = () => <PageSelectPdfTool variant="delete" />;
export const ExtractPdfPagesTool = () => <PageSelectPdfTool variant="extract" />;
