"use client";

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { QueueSummary } from "./queue-summary";

/** One-line status of the conversion run: progress, success or failures. */
export default function QueueStatus({ summary }: { summary: QueueSummary }) {
  const t = useTranslations("Converter");
  const { state, total, working, done, errors, progress } = summary;
  if (state === "idle") return null;

  const tone =
    state === "working"
      ? "border-brand/30 bg-brand-soft text-brand"
      : state === "done"
        ? "border-success/30 bg-success-soft text-success"
        : "border-danger/30 bg-danger-soft text-danger";

  return (
    <div className={`mb-4 animate-rise rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex items-start gap-3">
        {state === "working" ? (
          <LoaderCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 motion-safe:animate-spin" />
        ) : state === "done" ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {/* Only the headline is live: the percentage would be read on every tick. */}
          <p role="status" className="font-semibold">
            {state === "working"
              ? t("statusWorking", { done: total - working, total })
              : state === "done"
                ? t("statusDone", { count: done })
                : t("statusErrors", { count: errors })}
          </p>
          {state !== "working" && (
            <p className="text-sm text-foreground/80">
              {state === "done" ? t("statusDoneHint") : t("statusErrorsHint")}
            </p>
          )}
        </div>
        {state === "working" && (
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>
      {state === "working" && (
        <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface/70">
          <div
            className="h-full rounded-full bg-brand-solid transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(4, progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
