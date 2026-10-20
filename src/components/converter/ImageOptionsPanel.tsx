"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_PDF_DPI,
  PDF_DPI_CHOICES,
  type ImageOptions,
} from "@/lib/image/options";
import type { Resize } from "@/lib/image/dimensions";
import { field } from "@/components/ui/styles";

interface Props {
  value: ImageOptions;
  onChange: (value: ImageOptions) => void;
  showQuality: boolean;
  /** PDF sources choose a render resolution instead of a resize. */
  pdfSource?: boolean;
  /** Start expanded (e.g. when a page presets the options). */
  defaultOpen?: boolean;
}

const input =
  `h-9 w-full text-sm ${field}`;

const toNumber = (v: string) => (v === "" ? undefined : Math.max(1, Number(v)));

export default function ImageOptionsPanel({
  value,
  onChange,
  showQuality,
  pdfSource = false,
  defaultOpen = false,
}: Props) {
  const t = useTranslations("ImageOptions");
  const id = useId();
  const resize: Resize = value.resize ?? { mode: "none" };
  const setResize = (next: Resize) => onChange({ ...value, resize: next });

  return (
    <details open={defaultOpen} className="group rounded-xl border border-border px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">
        {t("title")}
      </summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {showQuality && (
          <div>
            <label
              htmlFor={`${id}-q`}
              className="flex justify-between text-sm font-medium"
            >
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
              onChange={(e) =>
                onChange({ ...value, quality: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[var(--brand)]"
            />
            <p className="mt-1 text-xs text-muted">{t("qualityHint")}</p>
          </div>
        )}

        {pdfSource && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-dpi`} className="text-sm font-medium">
              {t("resolution")}
            </label>
            <select
              id={`${id}-dpi`}
              value={value.dpi ?? DEFAULT_PDF_DPI}
              onChange={(e) =>
                onChange({ ...value, dpi: Number(e.target.value) })
              }
              className={input}
            >
              {PDF_DPI_CHOICES.map((dpi) => (
                <option key={dpi} value={dpi}>
                  {t(`dpi${dpi}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!pdfSource && (
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
                  mode === "percent"
                    ? { mode, percent: 50 }
                    : mode === "fit"
                      ? { mode, width: 1920 }
                      : mode === "cover"
                        ? { mode, width: 1080, height: 1080 }
                        : { mode },
                );
              }}
              className={input}
            >
              <option value="none">{t("sizeNone")}</option>
              <option value="percent">{t("sizePercent")}</option>
              <option value="fit">{t("sizeFit")}</option>
              <option value="cover">{t("sizeCover")}</option>
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
                    onChange={(e) =>
                      setResize({
                        mode: "percent",
                        percent: toNumber(e.target.value) ?? 100,
                      })
                    }
                    className={input}
                  />
                  <span aria-hidden="true">%</span>
                </div>
              </label>
            )}

            {(resize.mode === "fit" || resize.mode === "cover") && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted">
                    {resize.mode === "cover" ? t("widthExact") : t("width")}
                    <input
                      type="number"
                      min={1}
                      value={resize.width ?? ""}
                      onChange={(e) => {
                        const width = toNumber(e.target.value);
                        setResize(
                          resize.mode === "cover"
                            ? { ...resize, width: width ?? 1 }
                            : { ...resize, width },
                        );
                      }}
                      className={`${input} mt-1 text-foreground`}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    {resize.mode === "cover" ? t("heightExact") : t("height")}
                    <input
                      type="number"
                      min={1}
                      value={resize.height ?? ""}
                      onChange={(e) => {
                        const height = toNumber(e.target.value);
                        setResize(
                          resize.mode === "cover"
                            ? { ...resize, height: height ?? 1 }
                            : { ...resize, height },
                        );
                      }}
                      className={`${input} mt-1 text-foreground`}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">
                  {resize.mode === "cover" ? t("coverHint") : t("fitHint")}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
