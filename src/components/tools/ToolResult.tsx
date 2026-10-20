"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import AdSlot from "@/components/ads/AdSlot";
import { formatBytes } from "@/lib/format";
import { CheckCircle2, Download, FileText, RotateCcw } from "lucide-react";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";

interface Props {
  blob: Blob;
  filename: string;
  onReset: () => void;
  /** Extra line under the file name (e.g. size savings). */
  note?: React.ReactNode;
}

/** Download card shown when a tool finishes. */
export default function ToolResult({ blob, filename, onReset, note }: Props) {
  const t = useTranslations("ToolUi");
  const tc = useTranslations("Common");
  const locale = useLocale() as Locale;
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <>
      <div className="flex animate-rise flex-col items-center gap-4 rounded-2xl border border-success/30 bg-surface p-6 text-center shadow-card sm:p-8">
        <span className="grid h-14 w-14 animate-pop place-items-center rounded-full bg-success-soft text-success [animation-delay:80ms]">
          <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
        </span>
        <p role="status" className="font-display text-xl font-bold">
          {t("result")}
        </p>
        <p className="flex max-w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-medium">{filename}</span>
          <span className="shrink-0 text-muted tabular-nums">{formatBytes(blob.size, locale)}</span>
        </p>
        {note && <p className="text-sm font-medium text-success">{note}</p>}
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <a href={url} download={filename} className={`group ${buttonPrimary} w-full sm:w-auto`}>
            <Download aria-hidden="true" className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
            {tc("download")}
          </a>
          <button type="button" onClick={onReset} className={`${buttonSecondary} w-full sm:w-auto`}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t("startOver")}
          </button>
        </div>
      </div>
      {/* Below the result card, well apart from the download button. */}
      <AdSlot placement="result" className="mt-8" />
    </>
  );
}
