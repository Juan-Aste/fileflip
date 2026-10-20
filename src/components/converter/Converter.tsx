"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdSlot from "@/components/ads/AdSlot";
import { saveBlob } from "@/lib/download";
import { useTranslations } from "next-intl";
import { commonOutputs, formats, type FormatId } from "@/config/formats";
import { isRunnable } from "@/lib/convert";
import { canConvertImageInBrowser, preloadImageCodecs } from "@/lib/image/client";
import {
  DEFAULT_QUALITY,
  lossyFormats,
  type ImageOptions,
} from "@/lib/image/options";
import Dropzone from "./Dropzone";
import ProcessingBadge from "./ProcessingBadge";
import { queueSummary } from "./queue-summary";
import { useFileQueue } from "./useFileQueue";
import { buttonPrimary, choicePill } from "@/components/ui/styles";

// Only shown once files are added: keep them out of the initial bundle.
const FileRow = dynamic(() => import("./FileRow"));
const ImageOptionsPanel = dynamic(() => import("./ImageOptionsPanel"));
const QueueStatus = dynamic(() => import("./QueueStatus"));

/** Loads the image codecs for a conversion in the background. */
function preload(froms: readonly (FormatId | undefined)[], to: FormatId | undefined) {
  if (!to || formats[to].category !== "image" || !canConvertImageInBrowser(to)) return;
  for (const from of froms) if (from !== "pdf") preloadImageCodecs(from, to);
}

interface Props {
  /** Conversion pages preselect their formats. */
  from?: FormatId;
  to?: FormatId;
  /** Preset image options (e.g. an ID-photo size on a long-tail page). */
  options?: ImageOptions;
}

export default function Converter({ from, to, options }: Props = {}) {
  const t = useTranslations("Converter");
  const { items, add, remove, clear, convertAll } = useFileQueue();
  const [target, setTarget] = useState<FormatId | null>(to ?? null);
  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    quality: DEFAULT_QUALITY,
    ...options,
  });

  const detected = items
    .filter((i) => i.format)
    .map((i) => i.format as FormatId);
  const detecting = items.some((i) => i.format === undefined);
  const working = items.some((i) => i.job?.status === "working");
  const outputs = commonOutputs(detected).filter(isRunnable);
  const selected = outputs.find((o) => o.to === target) ?? outputs[0];
  const imageOutput = selected && formats[selected.to].category === "image";
  const done = items.flatMap((i) => (i.job?.status === "done" ? [i.job] : []));
  const [zipping, setZipping] = useState(false);
  const summary = queueSummary(items);

  // Picking an output (or adding files) fetches its codecs right away.
  const preloadTo = selected?.engine === "browser" ? selected.to : undefined;
  const preloadFrom = [...new Set(detected)].join(",");
  useEffect(() => {
    preload(preloadFrom ? (preloadFrom.split(",") as FormatId[]) : [undefined], preloadTo);
  }, [preloadFrom, preloadTo]);

  async function downloadAll() {
    setZipping(true);
    try {
      const { zipBlobs } = await import("@/lib/zip");
      saveBlob(await zipBlobs(done), "fileflip.zip");
    } finally {
      setZipping(false);
    }
  }

  return (
    // Conversion pages know the formats: start loading when the user heads
    // for the tool (hover/focus), not on page load.
    <div
      className="flex flex-col gap-4"
      onPointerEnter={to ? () => preload([from], to) : undefined}
      onFocus={to ? () => preload([from], to) : undefined}
    >
      <div className="flex justify-center">
        <ProcessingBadge engine={selected?.engine ?? "browser"} />
      </div>
      <Dropzone
        onFiles={add}
        compact={items.length > 0}
        accept={
          from
            ? [
                formats[from].mime,
                ...formats[from].extensions.map((e) => `.${e}`),
              ].join(",")
            : undefined
        }
      />

      {items.length > 0 && (
        <section
          aria-label={t("fileList")}
          className="rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-6"
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

          <QueueStatus summary={summary} />

          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <FileRow
                key={item.id}
                item={item}
                onRemove={() => remove(item.id)}
              />
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
                    <legend className="mb-2 text-sm font-medium">
                      {t("convertTo")}
                    </legend>
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
                          <span className={choicePill}>
                            {formats[o.to].label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {selected.from === "pdf" && selected.to === "docx" && (
                    <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                      {t("pdfToWordNote")}
                    </p>
                  )}
                  {imageOutput && (
                    <ImageOptionsPanel
                      value={imageOptions}
                      onChange={setImageOptions}
                      showQuality={lossyFormats.includes(selected.to)}
                      pdfSource={detected.includes("pdf")}
                      defaultOpen={Boolean(options?.resize)}
                    />
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={working || !selected}
                      onClick={() =>
                        selected &&
                        convertAll(selected.to, imageOutput ? imageOptions : {})
                      }
                      className={`self-start ${buttonPrimary}`}
                    >
                      {working ? t("converting") : t("convert")}
                    </button>
                    {done.length > 1 && !working && (
                      <button
                        type="button"
                        onClick={downloadAll}
                        disabled={zipping}
                        className="rounded-xl border-2 border-brand px-6 py-3 font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-50"
                      >
                        {t("downloadAll", { count: done.length })}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}
      {/* Below the results, well apart from the download buttons. */}
      {done.length > 0 && !working && (
        <AdSlot placement="result" className="mt-6" />
      )}
    </div>
  );
}
