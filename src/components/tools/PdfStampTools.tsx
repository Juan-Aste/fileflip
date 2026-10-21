"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import type { ToolId } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { runBatch, type JobOptions } from "@/lib/jobs";
import { countPdfPages, numberPdfPages, watermarkPdf } from "@/lib/pdf/client";
import { parsePageRanges } from "@/lib/pdf/ranges";
import { MAX_STAMP_TEXT, type StampPosition, type StampSize, type WatermarkLayout } from "@/lib/pdf/stamp";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ChoiceGroup from "./ChoiceGroup";
import RangesInput from "./RangesInput";
import ToolShell, { type ShellContext } from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

/** Runs a PDF-to-PDF stamp over a batch, one output (or error) per file. */
async function stampBatch(
  id: ToolId,
  suffix: string,
  files: File[],
  { signal, onProgress }: ShellContext,
  stamp: (file: File, job: JobOptions) => Promise<Blob>,
): Promise<ShellOutput[]> {
  const results = await runBatch(
    files,
    (file, job) => trackTool(id, { from: "pdf", to: "pdf", files: [file] }, () => stamp(file, job), (b) => b.size),
    { signal, onProgress },
  );
  return results.map((result, i): ShellOutput => {
    const name = `${baseName(files[i]!.name)}-${suffix}.pdf`;
    return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
  });
}

const positions: StampPosition[] = ["bottom-center", "bottom-right", "bottom-left", "top-center", "top-right", "top-left"];

export function PdfPageNumbersTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.pdf-page-numbers");
  const startId = useId();
  const [position, setPosition] = useState<StampPosition>("bottom-center");
  const [style, setStyle] = useState<"n" | "of" | "words">("n");
  const [size, setSize] = useState<StampSize>("medium");
  const [start, setStart] = useState("1");
  const [skipFirst, setSkipFirst] = useState(false);
  const startNumber = /^\d{1,5}$/.test(start.trim()) ? Number(start) : null;
  // The localized "Page {n} of {total}" with the placeholders left in.
  const template = style === "n" ? "{n}" : style === "of" ? "{n} / {total}" : t("pageOf", { n: "{n}", total: "{total}" });

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, ready: startNumber !== null }}
      actionLabel={tt("action")}
      zipName="fileflect-numbered.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("position")} value={position} onChange={setPosition} options={positions.map((p) => ({ value: p, label: t(`positions.${p}`) }))} />
          <ChoiceGroup
            legend={t("numberStyle")}
            value={style}
            onChange={setStyle}
            options={[
              { value: "n", label: "1, 2, 3" },
              { value: "of", label: "1 / 10" },
              { value: "words", label: t("pageOf", { n: 1, total: 10 }) },
            ]}
          />
          <ChoiceGroup
            legend={t("textSize")}
            value={size}
            onChange={setSize}
            options={(["small", "medium", "large"] as const).map((s) => ({ value: s, label: t(`sizes.${s}`) }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={startId} className="text-sm font-medium">
              {t("startAt")}
            </label>
            <input
              id={startId}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              inputMode="numeric"
              aria-invalid={startNumber === null}
              className={`h-10 w-28 ${field}`}
            />
          </div>
          <Checkbox checked={skipFirst} onChange={setSkipFirst} label={t("skipFirst")} />
        </div>
      }
      process={({ files }, context) =>
        stampBatch("pdf-page-numbers", "numbered", files, context, (file, job) =>
          numberPdfPages(file, { position, template, start: startNumber ?? 1, skipFirst, size }, job),
        )
      }
    />
  );
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function PdfWatermarkTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.pdf-watermark");
  const textId = useId();
  const colorId = useId();
  const opacityId = useId();
  const [text, setText] = useState(() => t("defaultWatermark"));
  const [layout, setLayout] = useState<WatermarkLayout>("diagonal");
  const [size, setSize] = useState<StampSize>("medium");
  const [color, setColor] = useState("#c0392b");
  const [opacity, setOpacity] = useState(30);
  const [scope, setScope] = useState<"all" | "some">("all");
  const [ranges, setRanges] = useState("");
  // Ranges are checked against each file's pages when it runs; here only the syntax.
  const rangesValid = scope === "all" || parsePageRanges(ranges, Number.MAX_SAFE_INTEGER) !== null;

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, ready: text.trim() !== "" && rangesValid }}
      actionLabel={tt("action")}
      zipName="fileflect-watermarked.zip"
      options={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={textId} className="text-sm font-medium">
              {t("watermarkText")}
            </label>
            <input
              id={textId}
              value={text}
              maxLength={MAX_STAMP_TEXT}
              onChange={(e) => setText(e.target.value)}
              className={`h-10 ${field}`}
            />
          </div>
          <ChoiceGroup
            legend={t("layout")}
            value={layout}
            onChange={setLayout}
            options={(["diagonal", "horizontal", "tiled"] as const).map((l) => ({ value: l, label: t(`layouts.${l}`) }))}
          />
          <ChoiceGroup
            legend={t("textSize")}
            value={size}
            onChange={setSize}
            options={(["small", "medium", "large"] as const).map((s) => ({ value: s, label: t(`sizes.${s}`) }))}
          />
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1">
              <label htmlFor={colorId} className="text-sm font-medium">
                {t("color")}
              </label>
              <input
                id={colorId}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <label htmlFor={opacityId} className="text-sm font-medium">
                {t("opacity", { value: opacity })}
              </label>
              <input
                id={opacityId}
                type="range"
                min={10}
                max={100}
                step={5}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="accent-[var(--brand-solid)]"
              />
            </div>
          </div>
          <ChoiceGroup
            legend={t("pagesScope")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: t("allPages") },
              { value: "some", label: t("somePages") },
            ]}
          />
          {scope === "some" && <RangesInput value={ranges} onChange={setRanges} valid={rangesValid} pageCount={0} invalidHint={t("rangesSyntax")} />}
        </div>
      }
      process={({ files }, context) =>
        stampBatch("pdf-watermark", "watermark", files, context, async (file, job) => {
          let pages: number[] | undefined;
          if (scope === "some") {
            const parsed = parsePageRanges(ranges, await countPdfPages(file));
            if (!parsed) throw new ConversionError("pagesOutOfRange");
            pages = parsed.flat();
          }
          return watermarkPdf(file, { text, layout, size, opacity: opacity / 100, color: hexToRgb(color), ...(pages ? { pages } : {}) }, job);
        })
      }
    />
  );
}
