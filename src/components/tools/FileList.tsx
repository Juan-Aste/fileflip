"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileImage,
  FileText,
  X,
} from "lucide-react";
import { formats } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { formatBytes } from "@/lib/format";
import type { ToolFile } from "./useToolFiles";

interface Props {
  files: ToolFile[];
  onRemove: (id: string) => void;
  /** Shows reorder buttons when given. */
  onMove?: (id: string, delta: number) => void;
  rejectLabel: string;
}

const iconButton =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export default function FileList({
  files,
  onRemove,
  onMove,
  rejectLabel,
}: Props) {
  const t = useTranslations("ToolUi");
  const tc = useTranslations("Converter");
  const locale = useLocale() as Locale;

  return (
    <ol className="flex flex-col gap-2 py-3">
      {files.map((item, i) => {
        const Icon =
          item.format && formats[item.format].category === "image"
            ? FileImage
            : FileText;
        return (
          <li
            key={item.id}
            className={`flex items-center gap-2 rounded-xl border p-2.5 ${
              item.format === null
                ? "border-danger/30 bg-danger-soft/60"
                : "border-border bg-surface"
            }`}
          >
            {onMove && (
              <span className="w-5 text-right text-sm text-muted tabular-nums">
                {i + 1}
              </span>
            )}
            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted sm:grid">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium" title={item.file.name}>
                {item.file.name}
              </span>
              <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted">
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-bold text-brand">
                  {item.format
                    ? formats[item.format].label
                    : item.format === null
                      ? "?"
                      : "…"}
                </span>
                {item.format === null ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <AlertCircle aria-hidden="true" className="h-4 w-4" />
                    {rejectLabel}
                  </span>
                ) : (
                  <span className="tabular-nums">
                    {formatBytes(item.file.size, locale)}
                  </span>
                )}
              </span>
            </span>
            {onMove && (
              <>
                <button
                  type="button"
                  className={iconButton}
                  disabled={i === 0}
                  onClick={() => onMove(item.id, -1)}
                  aria-label={t("moveUp", { name: item.file.name })}
                >
                  <ChevronUp aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={i === files.length - 1}
                  onClick={() => onMove(item.id, 1)}
                  aria-label={t("moveDown", { name: item.file.name })}
                >
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              className={iconButton}
              onClick={() => onRemove(item.id)}
              aria-label={tc("remove", { name: item.file.name })}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
