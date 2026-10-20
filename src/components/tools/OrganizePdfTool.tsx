"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { organizePdfFile } from "@/lib/pdf/client";
import type { PageSpec } from "@/lib/pdf/ops";
import PrimaryButton from "./PrimaryButton";
import ProgressBar from "./ProgressBar";
import SinglePdfInput from "./SinglePdfInput";
import ToolResult from "./ToolResult";
import { usePdfThumbnails } from "./usePdfThumbnails";
import { useSinglePdf } from "./useSinglePdf";

const pageButton =
  "grid h-7 w-7 place-items-center rounded-md text-sm text-muted hover:bg-brand-soft hover:text-foreground disabled:opacity-30";

export default function OrganizePdfTool() {
  const t = useTranslations("ToolUi");
  const tt = useTranslations("Tools.organize-pdf");
  const te = useTranslations("ApiErrors");
  const pdf = useSinglePdf();
  const { thumbs, failed: thumbsFailed } = usePdfThumbnails(pdf.file);
  const [pages, setPages] = useState<PageSpec[]>([]);
  const [dragged, setDragged] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  const reset = () =>
    setPages(
      Array.from({ length: pdf.pages ?? 0 }, (_, index) => ({
        index,
        rotation: 0,
      })),
    );
  useEffect(reset, [pdf.pages, pdf.file]);

  const loaded = thumbs.filter(Boolean).length;
  const update = (fn: (prev: PageSpec[]) => PageSpec[]) => setPages(fn);
  const move = (from: number, to: number) =>
    update((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  async function run() {
    if (!pdf.file) return;
    setFailed(false);
    setWorking(true);
    try {
      setResult(await organizePdfFile(pdf.file, pages));
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
        filename={pdf.file.name.replace(/(\.pdf)?$/i, "-organized.pdf")}
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
          {loaded < (pdf.pages ?? 0) && !thumbsFailed && (
            <ProgressBar
              value={loaded / (pdf.pages || 1)}
              label={t("loadingPages")}
            />
          )}
          <p className="text-sm text-muted">{t("dragHint")}</p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((spec, i) => {
              const n = spec.index + 1;
              return (
                <li
                  key={spec.index}
                  draggable
                  onDragStart={(e) => {
                    // Firefox only starts a drag when data is set.
                    e.dataTransfer.setData("text/plain", String(i));
                    e.dataTransfer.effectAllowed = "move";
                    setDragged(i);
                  }}
                  onDragEnd={() => setDragged(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragged !== null) move(dragged, i);
                    setDragged(null);
                  }}
                  className={`flex cursor-grab flex-col items-center gap-2 rounded-xl border bg-background p-2 ${
                    dragged === i ? "border-brand opacity-50" : "border-border"
                  }`}
                >
                  <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden">
                    {thumbs[spec.index] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                      <img
                        src={thumbs[spec.index]}
                        alt={t("pageLabel", { n })}
                        draggable={false}
                        style={{ transform: `rotate(${spec.rotation}deg)` }}
                        className="max-h-full max-w-full shadow transition-transform"
                      />
                    ) : (
                      <span className="text-sm text-muted">
                        {t("pageLabel", { n })}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{n}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={pageButton}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                      aria-label={t("movePageLeft", { n })}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={pageButton}
                      onClick={() =>
                        update((prev) =>
                          prev.map((p, j) =>
                            j === i
                              ? {
                                  ...p,
                                  rotation: ((p.rotation + 90) %
                                    360) as PageSpec["rotation"],
                                }
                              : p,
                          ),
                        )
                      }
                      aria-label={t("rotatePage", { n })}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      className={pageButton}
                      disabled={pages.length === 1}
                      onClick={() =>
                        update((prev) => prev.filter((_, j) => j !== i))
                      }
                      aria-label={t("deletePage", { n })}
                    >
                      🗑
                    </button>
                    <button
                      type="button"
                      className={pageButton}
                      disabled={i === pages.length - 1}
                      onClick={() => move(i, i + 1)}
                      aria-label={t("movePageRight", { n })}
                    >
                      →
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {failed && (
            <p role="alert" className="text-sm text-danger">
              {te("conversionFailed")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <PrimaryButton onClick={run} disabled={!pages.length || working}>
              {working ? t("working") : tt("action")}
            </PrimaryButton>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border px-6 py-3 font-semibold hover:bg-brand-soft"
            >
              {t("restorePages")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
