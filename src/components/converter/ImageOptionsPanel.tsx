"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { ImageOptions } from "@/lib/image/options";
import type { Resize } from "@/lib/image/dimensions";

interface Props {
  value: ImageOptions;
  onChange: (value: ImageOptions) => void;
  showQuality: boolean;
}

const input =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-brand";

const toNumber = (v: string) => (v === "" ? undefined : Math.max(1, Number(v)));

export default function ImageOptionsPanel({ value, onChange, showQuality }: Props) {
  const t = useTranslations("ImageOptions");
  const id = useId();
  const resize: Resize = value.resize ?? { mode: "none" };
  const setResize = (next: Resize) => onChange({ ...value, resize: next });

  return (
    <details className="group rounded-xl border border-border px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">{t("title")}</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {showQuality && (
          <div>
            <label htmlFor={`${id}-q`} className="flex justify-between text-sm font-medium">
              {t("quality")}
              <output htmlFor={`${id}-q`}>{value.quality}</output>
            </label>
            <input
              id={`${id}-q`}
              type="range"
              min={10}
              max={100}
              step={1}
              value={value.quality}
              onChange={(e) => onChange({ ...value, quality: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--brand)]"
            />
            <p className="mt-1 text-xs text-muted">{t("qualityHint")}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-mode`} className="text-sm font-medium">
            {t("size")}
          </label>
          <select
            id={`${id}-mode`}
            value={resize.mode}
            onChange={(e) => {
              const mode = e.target.value as Resize["mode"];
              setResize(
                mode === "percent" ? { mode, percent: 50 } : mode === "fit" ? { mode, width: 1920 } : { mode },
              );
            }}
            className={input}
          >
            <option value="none">{t("sizeNone")}</option>
            <option value="percent">{t("sizePercent")}</option>
            <option value="fit">{t("sizeFit")}</option>
          </select>

          {resize.mode === "percent" && (
            <label className="text-sm">
              <span className="sr-only">{t("percent")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={resize.percent}
                  onChange={(e) => setResize({ mode: "percent", percent: toNumber(e.target.value) ?? 100 })}
                  className={input}
                />
                <span aria-hidden="true">%</span>
              </div>
            </label>
          )}

          {resize.mode === "fit" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted">
                  {t("width")}
                  <input
                    type="number"
                    min={1}
                    value={resize.width ?? ""}
                    onChange={(e) => setResize({ ...resize, width: toNumber(e.target.value) })}
                    className={`${input} mt-1 text-foreground`}
                  />
                </label>
                <label className="text-xs text-muted">
                  {t("height")}
                  <input
                    type="number"
                    min={1}
                    value={resize.height ?? ""}
                    onChange={(e) => setResize({ ...resize, height: toNumber(e.target.value) })}
                    className={`${input} mt-1 text-foreground`}
                  />
                </label>
              </div>
              <p className="text-xs text-muted">{t("fitHint")}</p>
            </>
          )}
        </div>
      </div>
    </details>
  );
}
