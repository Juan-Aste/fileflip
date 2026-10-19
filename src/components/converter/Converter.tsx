"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { commonOutputs, formats, type FormatId } from "@/config/formats";
import type { Locale } from "@/i18n/routing";
import { formatBytes } from "@/lib/format";
import Dropzone from "./Dropzone";
import { useFileQueue } from "./useFileQueue";

export default function Converter() {
  const t = useTranslations("Converter");
  const locale = useLocale() as Locale;
  const { items, add, remove, clear } = useFileQueue();
  const [target, setTarget] = useState<FormatId | null>(null);

  const detected = items.filter((i) => i.format).map((i) => i.format as FormatId);
  const detecting = items.some((i) => i.format === undefined);
  const outputs = commonOutputs(detected);
  const selected = outputs.find((o) => o.to === target) ?? outputs[0];

  return (
    <div className="flex flex-col gap-4">
      <Dropzone onFiles={add} compact={items.length > 0} />

      {items.length > 0 && (
        <section
          aria-label={t("fileList")}
          className="rounded-2xl border border-border bg-surface p-4 sm:p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {t("filesCount", { count: items.length })}
            </h2>
            <button
              type="button"
              onClick={clear}
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("clear")}
            </button>
          </div>

          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-14 rounded-md bg-brand-soft px-2 py-0.5 text-center text-xs font-bold text-brand">
                  {item.format ? formats[item.format].label : item.format === null ? "?" : "…"}
                </span>
                <span className="min-w-0 flex-1 truncate" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {item.format === null ? (
                    <span className="text-red-600 dark:text-red-400">{t("unsupported")}</span>
                  ) : item.format === undefined ? (
                    t("detecting")
                  ) : (
                    formatBytes(item.file.size, locale)
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={t("remove", { name: item.file.name })}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-foreground"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {!detecting && detected.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              {outputs.length === 0 ? (
                <p role="alert" className="text-sm text-muted">
                  {t("noCommonOutput")}
                </p>
              ) : (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">{t("convertTo")}</legend>
                    <div className="flex flex-wrap gap-2">
                      {outputs.map((o) => (
                        <label key={o.to} className="cursor-pointer">
                          <input
                            type="radio"
                            name="target"
                            value={o.to}
                            checked={selected?.to === o.to}
                            onChange={() => setTarget(o.to)}
                            className="peer sr-only"
                          />
                          <span className="block rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                            {formats[o.to].label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button
                    type="button"
                    className="self-start rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
                  >
                    {t("convert")}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
