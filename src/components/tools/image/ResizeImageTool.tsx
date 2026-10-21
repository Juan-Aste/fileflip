"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { MAX_PERCENT, MIN_PERCENT, socialPresets, type ResizeRequest, type SocialPresetId } from "@/lib/image/resize-plan";
import { resizeImageFile } from "@/lib/image/tools-client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["resize-image"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);

type Mode = "pixels" | "percent" | "social";
type Output = "same" | "jpg" | "png" | "webp" | "avif";

/** Output when keeping the format: HEIC can only be read, so it becomes JPG. */
const sameAs = (from: FormatId): FormatId => (from === "heic" ? "jpg" : from);

const parse = (value: string) => (value.trim() === "" ? undefined : Number(value.replace(",", ".")));

function NumberField({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={`h-10 w-32 ${field}`}
      />
    </div>
  );
}

export default function ResizeImageTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.resize-image");
  const presetId = useId();
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("");
  const [keepRatio, setKeepRatio] = useState(true);
  const [enlarge, setEnlarge] = useState(false);
  const [percent, setPercent] = useState("50");
  const [preset, setPreset] = useState<SocialPresetId>("instagramSquare");
  const [fit, setFit] = useState<"crop" | "pad">("crop");
  const [output, setOutput] = useState<Output>("same");

  const request = ((): ResizeRequest | null => {
    if (mode === "percent") {
      const p = parse(percent);
      return p !== undefined && p >= MIN_PERCENT && p <= MAX_PERCENT ? { kind: "percent", percent: p } : null;
    }
    if (mode === "social") {
      const box = socialPresets.find((p) => p.id === preset)!;
      return { kind: "box", width: box.width, height: box.height, fit };
    }
    const w = parse(width);
    const h = parse(height);
    const ok = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 1);
    if ((w === undefined && h === undefined) || !ok(w) || !ok(h)) return null;
    return { kind: "pixels", width: w, height: h, keepRatio, enlarge };
  })();

  async function process(
    files: File[],
    req: ResizeRequest,
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name);
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        const to = output === "same" ? sameAs(from) : output;
        return trackTool(
          "resize-image",
          { from, to, files: [file] },
          () =>
            resizeImageFile(
              { input: file, from, to, request: req },
              { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs },
            ).then((out) => ({ ...out, to })),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const name = renameExtension(file.name, formats[out.to].extensions[0]!);
      return {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[out.to].mime }),
        message: {
          ok: true,
          text: t("resizedTo", {
            name,
            before: `${out.before.width} × ${out.before.height}`,
            after: `${out.width} × ${out.height}`,
          }),
        },
      };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-resized.zip"
      process={({ files }, context) => {
        if (!request) throw new ConversionError("invalidRequest");
        return process(files, request, context);
      }}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("resizeMode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "pixels", label: t("byPixels") },
              { value: "percent", label: t("byPercent") },
              { value: "social", label: t("bySocial") },
            ]}
          />
          {mode === "pixels" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <NumberField label={t("width")} value={width} onChange={setWidth} invalid={!request} />
                <NumberField label={t("height")} value={height} onChange={setHeight} invalid={!request} />
              </div>
              <Checkbox checked={keepRatio} onChange={setKeepRatio} label={t("keepRatio")} />
              {keepRatio ? (
                <Checkbox checked={enlarge} onChange={setEnlarge} label={t("enlarge")} />
              ) : (
                <p className="text-sm text-muted">{t("stretchHint")}</p>
              )}
              {!request && <p className="text-sm text-danger">{t("pixelsInvalid")}</p>}
            </div>
          )}
          {mode === "percent" && (
            <div className="flex flex-col gap-1">
              <NumberField label={t("percent")} value={percent} onChange={setPercent} invalid={!request} />
              {!request && <p className="text-sm text-danger">{t("percentInvalid")}</p>}
            </div>
          )}
          {mode === "social" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={presetId} className="text-sm font-medium">
                  {t("preset")}
                </label>
                <select
                  id={presetId}
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as SocialPresetId)}
                  className={`h-10 max-w-sm ${field}`}
                >
                  {socialPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(`presets.${p.id}`)}
                    </option>
                  ))}
                </select>
                {/* The size goes under the select: long names would cut it off on phones. */}
                <p className="text-sm text-muted tabular-nums">
                  {(() => {
                    const box = socialPresets.find((p) => p.id === preset)!;
                    return `${box.width} × ${box.height} px`;
                  })()}
                </p>
              </div>
              <ChoiceGroup
                legend={t("fit")}
                value={fit}
                onChange={setFit}
                options={[
                  { value: "crop", label: t("fitCrop") },
                  { value: "pad", label: t("fitPad") },
                ]}
              />
            </div>
          )}
          <ChoiceGroup
            legend={t("format")}
            value={output}
            onChange={setOutput}
            options={[
              { value: "same", label: t("formatSame") },
              { value: "jpg", label: "JPG" },
              { value: "png", label: "PNG" },
              { value: "webp", label: "WEBP" },
              { value: "avif", label: "AVIF" },
            ]}
          />
        </div>
      }
    />
  );
}
