"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { commonOutputs, formats, type FormatId } from "@/config/formats";
import { isRunnable } from "@/lib/convert";
import { DEFAULT_QUALITY, lossyFormats, type ImageOptions } from "@/lib/image/options";
import Dropzone from "./Dropzone";
import FileRow from "./FileRow";
import ImageOptionsPanel from "./ImageOptionsPanel";
import ProcessingBadge from "./ProcessingBadge";
import { useFileQueue } from "./useFileQueue";

export default function Converter() {
  const t = useTranslations("Converter");
  const { items, add, remove, clear, convertAll } = useFileQueue();
  const [target, setTarget] = useState<FormatId | null>(null);
  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    quality: DEFAULT_QUALITY,
  });

  const detected = items.filter((i) => i.format).map((i) => i.format as FormatId);
  const detecting = items.some((i) => i.format === undefined);
  const working = items.some((i) => i.job?.status === "working");
  const outputs = commonOutputs(detected).filter(isRunnable);
  const selected = outputs.find((o) => o.to === target) ?? outputs[0];
  const imageOutput = selected && formats[selected.to].category === "image";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <ProcessingBadge engine={selected?.engine ?? "browser"} />
      </div>
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
              <FileRow key={item.id} item={item} onRemove={() => remove(item.id)} />
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
                  {imageOutput && (
                    <ImageOptionsPanel
                      value={imageOptions}
                      onChange={setImageOptions}
                      showQuality={lossyFormats.includes(selected.to)}
                    />
                  )}
                  <button
                    type="button"
                    disabled={working || !selected}
                    onClick={() => selected && convertAll(selected.to, imageOutput ? imageOptions : {})}
                    className="self-start rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
                  >
                    {working ? t("converting") : t("convert")}
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
