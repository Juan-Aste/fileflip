"use client";

import { useLocale, useTranslations } from "next-intl";
import { formats } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatPercent } from "@/lib/format";
import type { QueuedFile } from "./useFileQueue";

interface Props {
  item: QueuedFile;
  onRemove: () => void;
}

export default function FileRow({ item, onRemove }: Props) {
  const t = useTranslations("Converter");
  const tc = useTranslations("Common");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const { file, format, job } = item;

  let status: React.ReactNode;
  if (format === null) {
    status = <span className="text-red-600 dark:text-red-400">{t("unsupported")}</span>;
  } else if (format === undefined) {
    status = t("detecting");
  } else if (job?.status === "error") {
    status = <span className="text-red-600 dark:text-red-400">{te(job.code)}</span>;
  } else if (job?.status === "done") {
    const ratio = 1 - job.blob.size / file.size;
    status = (
      <>
        {t("sizeChange", {
          before: formatBytes(file.size, locale),
          after: formatBytes(job.blob.size, locale),
        })}
        {job.engine === "server" && (
          <span className="ml-2" title={t("processedOnServer")}>
            ☁️<span className="sr-only">{t("processedOnServer")}</span>
          </span>
        )}
        {ratio > 0.01 && (
          <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
            {t("saved", { percent: formatPercent(ratio, locale) })}
          </span>
        )}
      </>
    );
  } else {
    status = formatBytes(file.size, locale);
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-14 rounded-md bg-brand-soft px-2 py-0.5 text-center text-xs font-bold text-brand">
          {format ? formats[format].label : format === null ? "?" : "…"}
        </span>
        <span className="min-w-0 flex-1 truncate" title={file.name}>
          {job?.status === "done" ? job.name : file.name}
        </span>
        <span className="hidden shrink-0 text-sm text-muted sm:inline">{status}</span>
        {job?.status === "done" && (
          <a
            href={job.url}
            download={job.name}
            className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {tc("download")}
          </a>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove", { name: file.name })}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <span className="text-sm text-muted sm:hidden">{status}</span>
      {job?.status === "working" && (
        <div
          role="progressbar"
          aria-label={t("progress", { name: file.name })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(job.progress * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-brand-soft"
        >
          <div
            className="h-full animate-pulse rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${Math.max(5, job.progress * 100)}%` }}
          />
        </div>
      )}
    </li>
  );
}
