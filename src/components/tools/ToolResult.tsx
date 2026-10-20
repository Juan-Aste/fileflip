"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import AdSlot from "@/components/ads/AdSlot";
import { formatBytes } from "@/lib/format";
import { buttonPrimary } from "@/components/ui/styles";

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
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface shadow-card p-6 text-center"
      >
        <span aria-hidden="true" className="text-4xl">
          ✅
        </span>
        <p className="text-lg font-semibold">{t("result")}</p>
        <p className="text-sm text-muted">
          {filename} · {formatBytes(blob.size, locale)}
        </p>
        {note && <p className="text-sm font-medium">{note}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={url}
            download={filename}
            className={buttonPrimary}
          >
            {tc("download")}
          </a>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-border px-6 py-3 font-semibold hover:bg-brand-soft"
          >
            {t("startOver")}
          </button>
        </div>
      </div>
      {/* Below the result card, well apart from the download button. */}
      <AdSlot placement="result" className="mt-8" />
    </>
  );
}
