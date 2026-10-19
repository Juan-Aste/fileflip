"use client";

import { useLocale, useTranslations } from "next-intl";
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
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-foreground disabled:opacity-30";

export default function FileList({ files, onRemove, onMove, rejectLabel }: Props) {
  const t = useTranslations("ToolUi");
  const tc = useTranslations("Converter");
  const locale = useLocale() as Locale;

  return (
    <ol className="divide-y divide-border">
      {files.map((item, i) => (
        <li key={item.id} className="flex items-center gap-2 py-2.5">
          <span className="w-6 text-right text-sm text-muted">{i + 1}</span>
          <span className="min-w-14 rounded-md bg-brand-soft px-2 py-0.5 text-center text-xs font-bold text-brand">
            {item.format ? formats[item.format].label : item.format === null ? "?" : "…"}
          </span>
          <span className="min-w-0 flex-1 truncate" title={item.file.name}>
            {item.file.name}
          </span>
          <span className="hidden shrink-0 text-sm text-muted sm:inline">
            {item.format === null ? (
              <span className="text-red-600 dark:text-red-400">{rejectLabel}</span>
            ) : (
              formatBytes(item.file.size, locale)
            )}
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
                ↑
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={i === files.length - 1}
                onClick={() => onMove(item.id, 1)}
                aria-label={t("moveDown", { name: item.file.name })}
              >
                ↓
              </button>
            </>
          )}
          <button
            type="button"
            className={iconButton}
            onClick={() => onRemove(item.id)}
            aria-label={tc("remove", { name: item.file.name })}
          >
            ✕
          </button>
        </li>
      ))}
    </ol>
  );
}
