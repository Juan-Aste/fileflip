"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight, Download } from "lucide-react";
import { buttonPrimary, buttonSecondary, card } from "@/components/ui/styles";
import { TooDifferentError, diffLines, diffStats, diffWords, unifiedPatch, wordStats, type DiffLine, type DiffMode, type DiffPart } from "@/lib/text/diff";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import { TextBox, useUsageReport } from "./TextUtilityTools";

type Result =
  | { mode: "line"; lines: DiffLine[]; a: string; b: string }
  | { mode: "word"; parts: DiffPart[]; a: string; b: string }
  | { mode: "error" };

const removedClass = "rounded-sm bg-danger-soft text-danger line-through decoration-danger/60";
const addedClass = "rounded-sm bg-success-soft text-success underline decoration-success/60";

function Parts({ parts, t }: { parts: DiffPart[]; t: (key: "removedWord" | "addedWord") => string }) {
  return parts.map((p, i) =>
    p.removed ? (
      <del key={i} className={removedClass}>
        <span className="sr-only">{t("removedWord")} </span>
        {p.value}
      </del>
    ) : p.added ? (
      <ins key={i} className={addedClass}>
        <span className="sr-only">{t("addedWord")} </span>
        {p.value}
      </ins>
    ) : (
      <span key={i}>{p.value}</span>
    ),
  );
}

export default function CompareTextTool() {
  const t = useTranslations("TextTools");
  const locale = useLocale();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [mode, setMode] = useState<DiffMode>("line");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  useUsageReport("compare-text", result ? a + b : "");

  function compare() {
    const options = { mode, ignoreCase, ignoreWhitespace, locale };
    try {
      setResult(mode === "line" ? { mode, lines: diffLines(a, b, options), a, b } : { mode, parts: diffWords(a, b, options), a, b });
    } catch (error) {
      if (!(error instanceof TooDifferentError)) throw error;
      setResult({ mode: "error" });
    }
  }

  function downloadPatch() {
    if (!result || result.mode === "error") return;
    const patch = unifiedPatch(result.a, result.b);
    const url = URL.createObjectURL(new Blob([patch], { type: "text/x-diff;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "changes.diff";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let summary = "";
  if (result?.mode === "line") {
    const stats = diffStats(result.lines);
    summary = stats.identical ? t("identical") : t("lineSummary", { changed: stats.changed, added: stats.added, removed: stats.removed });
  } else if (result?.mode === "word") {
    const stats = wordStats(result.parts, locale);
    summary = stats.added + stats.removed === 0 ? t("identical") : t("wordSummary", stats);
  }

  return (
    <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextBox label={t("textA")} value={a} onChange={setA} rows={10} />
        <TextBox label={t("textB")} value={b} onChange={setB} rows={10} />
      </div>
      <div className="flex flex-col gap-3">
        <ChoiceGroup
          legend={t("compareBy")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "line", label: t("byLine") },
            { value: "word", label: t("byWord") },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox checked={ignoreCase} onChange={setIgnoreCase} label={t("ignoreCase")} />
          <Checkbox checked={ignoreWhitespace} onChange={setIgnoreWhitespace} label={t("ignoreWhitespace")} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!a && !b} onClick={compare} className={`${buttonPrimary} disabled:opacity-40`}>
          {t("compare")}
        </button>
        <button
          type="button"
          disabled={!a && !b}
          onClick={() => {
            setA(b);
            setB(a);
            setResult(null);
          }}
          className={`${buttonSecondary} disabled:opacity-40`}
        >
          <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
          {t("swap")}
        </button>
      </div>
      {result && (
        <section aria-labelledby="diff-result" className="flex flex-col gap-3">
          <h2 id="diff-result" className="font-display text-lg font-bold">
            {t("differences")}
          </h2>
          {result.mode === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {t("tooDifferent")}
            </p>
          ) : (
            <>
              <p role="status" className="text-sm font-medium">
                {summary}
              </p>
              {result.mode === "line" ? (
                <ol className="max-h-[32rem] overflow-auto rounded-xl border border-border font-mono text-sm" aria-label={t("differences")}>
                  {result.lines.map((line, i) => (
                    <li
                      key={i}
                      className={`grid grid-cols-[2.5rem_2.5rem_1.25rem_1fr] gap-x-1 px-2 py-0.5 ${line.kind === "removed" ? "bg-danger-soft/50" : line.kind === "added" ? "bg-success-soft/50" : ""}`}
                    >
                      <span className="text-right text-muted tabular-nums" aria-hidden="true">
                        {line.left ?? ""}
                      </span>
                      <span className="text-right text-muted tabular-nums" aria-hidden="true">
                        {line.right ?? ""}
                      </span>
                      <span aria-hidden="true" className={line.kind === "removed" ? "text-danger" : line.kind === "added" ? "text-success" : "text-muted"}>
                        {line.kind === "removed" ? "−" : line.kind === "added" ? "+" : ""}
                      </span>
                      <span className="whitespace-pre-wrap break-words">
                        {line.kind !== "same" && <span className="sr-only">{t(line.kind === "removed" ? "removedLine" : "addedLine")} </span>}
                        <Parts parts={line.parts} t={t} />
                        {line.parts.every((p) => p.value === "") && " "}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border p-3 text-sm leading-relaxed">
                  <Parts parts={result.parts} t={t} />
                </div>
              )}
              <div>
                <button type="button" onClick={downloadPatch} className={buttonSecondary}>
                  <Download aria-hidden="true" className="h-4 w-4" />
                  {t("downloadDiff")}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
