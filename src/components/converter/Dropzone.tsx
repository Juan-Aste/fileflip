"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { FilePlus2, Upload } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  /** Hint for the file picker, e.g. "application/pdf" (content is still verified). */
  accept?: string;
  multiple?: boolean;
}

export default function Dropzone({ onFiles, compact = false, accept, multiple = true }: Props) {
  const t = useTranslations("Converter");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        // Ignore leave events fired when moving over child elements.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
      className={`group relative flex items-center rounded-2xl border-2 border-dashed transition duration-200 ease-out ${
        compact
          ? "flex-row gap-3 px-4 py-3 text-left"
          : "flex-col justify-center gap-3 p-8 text-center sm:p-12"
      } ${
        dragging
          ? "scale-[1.01] border-brand bg-brand-soft shadow-lift"
          : "border-border-strong bg-surface shadow-card hover:border-brand hover:shadow-lift"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full transition duration-200 ${
          compact ? "h-9 w-9" : "h-16 w-16"
        } ${
          dragging
            ? "bg-brand-solid text-white"
            : "bg-brand-soft text-brand group-hover:bg-brand-solid group-hover:text-white"
        }`}
      >
        {compact ? (
          <FilePlus2 className="h-5 w-5" />
        ) : (
          <Upload className={`h-7 w-7 transition-transform duration-200 ${dragging ? "-translate-y-0.5" : ""}`} />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <label
          htmlFor={inputId}
          className={`cursor-pointer font-semibold after:absolute after:inset-0 after:rounded-2xl after:content-[''] ${
            compact ? "text-base" : "font-display text-xl sm:text-2xl"
          }`}
        >
          {dragging ? t("dropActive") : compact && multiple ? t("dropMore") : t("dropTitle")}
        </label>
        {!compact && <span className="text-muted">{t("dropHint")}</span>}
        {!compact && !accept && (
          <span className="mt-1 text-xs font-medium tracking-wide text-muted uppercase">
            {t("dropFormats")}
          </span>
        )}
      </span>
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple={multiple}
        accept={accept}
        aria-label={t("inputLabel")}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          // Allow picking the same file again.
          e.target.value = "";
        }}
      />
    </div>
  );
}
