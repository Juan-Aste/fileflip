"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Download,
  FileImage,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { formats, type FormatId } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { formatBytes, formatPercent } from "@/lib/format";
import type { QueuedFile } from "./useFileQueue";
import { previewSource } from "./preview";
import { buttonPrimarySmall } from "@/components/ui/styles";

interface Props {
  item: QueuedFile;
  onRemove: () => void;
}

/** Object URL for the original file's thumbnail, freed when no longer shown. */
function useOriginalUrl(file: File, enabled: boolean) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!enabled) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(undefined);
    };
  }, [file, enabled]);
  return url;
}

function Thumbnail({ item }: { item: QueuedFile }) {
  const { file, format, job } = item;
  const source = previewSource(format, file.size, job?.status === "done" ? job.blob : undefined);
  const originalUrl = useOriginalUrl(file, source === "original");
  const [broken, setBroken] = useState(false);
  const src = source === "result" && job?.status === "done" ? job.url : originalUrl;
  const Icon = format && formats[format].category === "image" ? FileImage : FileText;

  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2 text-muted">
      {src && !broken ? (
        // Blob URLs: next/image does not apply here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon aria-hidden="true" className="h-6 w-6" />
      )}
    </span>
  );
}

function FormatTag({ format }: { format: FormatId | null | undefined }) {
  return (
    <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand">
      {format ? formats[format].label : format === null ? "?" : "…"}
    </span>
  );
}

export default function FileRow({ item, onRemove }: Props) {
  const t = useTranslations("Converter");
  const tc = useTranslations("Common");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const { file, format, job } = item;
  const failed = format === null || job?.status === "error";

  let status: React.ReactNode;
  if (format === null) {
    status = (
      <span className="inline-flex items-center gap-1 text-danger">
        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
        {t("unsupported")}
      </span>
    );
  } else if (format === undefined) {
    status = t("detecting");
  } else if (job?.status === "error") {
    status = (
      <span className="inline-flex items-center gap-1 text-danger">
        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
        {te(job.code)}
      </span>
    );
  } else if (job?.status === "done") {
    const ratio = 1 - job.blob.size / file.size;
    status = (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-pop text-success" />
        <span className="tabular-nums">
          {t("sizeChange", {
            before: formatBytes(file.size, locale),
            after: formatBytes(job.blob.size, locale),
          })}
        </span>
        {ratio > 0.01 && (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
            {t("saved", { percent: formatPercent(ratio, locale) })}
          </span>
        )}
        {ratio < -0.01 && (
          <span className="text-xs">{t("larger", { percent: formatPercent(-ratio, locale) })}</span>
        )}
        {job.engine === "server" && (
          <span className="inline-flex" title={t("processedOnServer")}>
            <Cloud aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">{t("processedOnServer")}</span>
          </span>
        )}
      </span>
    );
  } else if (job?.status === "working") {
    status = (
      <span className="inline-flex items-center gap-1 text-brand">
        <LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        <span className="tabular-nums">{Math.round(job.progress * 100)}%</span>
      </span>
    );
  } else {
    status = <span className="tabular-nums">{formatBytes(file.size, locale)}</span>;
  }

  const outFormat =
    job?.status === "done"
      ? (Object.values(formats).find((f) => f.mime === job.blob.type)?.id ?? undefined)
      : undefined;

  return (
    <li
      className={`relative flex flex-col gap-3 rounded-xl border p-3 transition-colors duration-200 sm:flex-row sm:items-center ${
        failed
          ? "border-danger/30 bg-danger-soft/60"
          : job?.status === "done"
            ? "border-success/30 bg-surface"
            : "border-border bg-surface"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 pr-9 sm:pr-0">
        <Thumbnail item={item} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium" title={file.name}>
            {job?.status === "done" ? job.name : file.name}
          </span>
          <span className="flex items-center gap-1.5">
            <FormatTag format={format} />
            {outFormat && outFormat !== format && (
              <>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
                <FormatTag format={outFormat} />
              </>
            )}
          </span>
          <span className="text-sm text-muted">{status}</span>
        </div>
      </div>
      {job?.status === "done" && (
        <a
          href={job.url}
          download={job.name}
          className={`group animate-rise ${buttonPrimarySmall} w-full py-2.5 sm:w-auto sm:px-4`}
        >
          <Download aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          {tc("download")}
          <span className="sr-only"> {job.name}</span>
        </a>
      )}
      {job?.status === "working" && (
        <div
          role="progressbar"
          aria-label={t("progress", { name: file.name })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(job.progress * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-brand-soft sm:w-32"
        >
          <div
            className="h-full rounded-full bg-brand-solid transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(5, job.progress * 100)}%` }}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("remove", { name: file.name })}
        className="absolute top-2 right-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground sm:static"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </li>
  );
}
