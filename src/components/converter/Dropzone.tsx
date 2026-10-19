"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";

interface Props {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function Dropzone({ onFiles, compact = false }: Props) {
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
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition ${
        compact ? "p-5" : "p-10 sm:p-14"
      } ${
        dragging
          ? "border-brand bg-brand-soft"
          : "border-border bg-surface hover:border-brand"
      }`}
    >
      <span aria-hidden="true" className={compact ? "text-2xl" : "text-5xl"}>
        📂
      </span>
      <label
        htmlFor={inputId}
        className="cursor-pointer text-lg font-semibold after:absolute after:inset-0 after:content-['']"
      >
        {dragging ? t("dropActive") : t("dropTitle")}
      </label>
      {!compact && <p className="text-sm text-muted">{t("dropHint")}</p>}
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
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
