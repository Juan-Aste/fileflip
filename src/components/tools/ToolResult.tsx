"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatBytes } from "@/lib/format";

interface Props {
  blob: Blob;
  filename: string;
  onReset: () => void;
}

/** Download card shown when a tool finishes. */
export default function ToolResult({ blob, filename, onReset }: Props) {
  const t = useTranslations("ToolUi");
  const tc = useTranslations("Common");
  const locale = useLocale() as Locale;
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center"
    >
      <span aria-hidden="true" className="text-4xl">
        ✅
      </span>
      <p className="text-lg font-semibold">{t("result")}</p>
      <p className="text-sm text-muted">
        {filename} · {formatBytes(blob.size, locale)}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={url}
          download={filename}
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong"
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
  );
}
