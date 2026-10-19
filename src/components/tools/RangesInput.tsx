"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

interface Props {
  value: string;
  onChange: (value: string) => void;
  valid: boolean;
  pageCount: number;
  placeholder?: string;
}

/** Text field for page ranges ("1-3, 5, 8-") with an inline hint/error. */
export default function RangesInput({ value, onChange, valid, pageCount, placeholder = "1-3, 5, 8-" }: Props) {
  const t = useTranslations("ToolUi");
  const id = useId();
  const invalid = value !== "" && !valid;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {t("ranges")}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        inputMode="numeric"
        className="h-10 rounded-lg border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-red-500"
      />
      <span id={`${id}-hint`} className={`text-xs ${invalid ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
        {invalid ? t("rangesInvalid", { count: pageCount }) : t("rangesHint")}
      </span>
    </div>
  );
}
