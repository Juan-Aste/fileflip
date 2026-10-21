"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import {
  drawOverlay,
  MAX_OVERLAY_TEXT,
  overlayPositions,
  type OverlayFont,
  type OverlayPosition,
  type OverlaySpec,
} from "@/lib/image/overlay";
import { overlayImageFile, previewImageFile } from "@/lib/image/tools-client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

type Variant = "watermark-image" | "add-text-to-image";
type Output = "same" | "jpg" | "png" | "webp" | "avif";

const PREVIEW_SIDE = 1000;
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const MAX_LOGO_BYTES = 10 * 1024 * 1024;

/** Output when keeping the format: HEIC can only be read, so it becomes JPG. */
const sameAs = (from: FormatId): FormatId => (from === "heic" ? "jpg" : from);

const textSizes = { watermark: [3, 5, 8], text: [4, 6, 9, 13] };
const logoSizes = [10, 20, 30, 50];

export const WatermarkImageTool = () => <OverlayImageTool variant="watermark-image" />;
export const AddTextToImageTool = () => <OverlayImageTool variant="add-text-to-image" />;

function OverlayImageTool({ variant }: { variant: Variant }) {
  const t = useTranslations("ImageTools");
  const tt = useTranslations(`Tools.${variant}`);
  const info = tools[variant];
  const extensions = info.inputs.flatMap((f) => formats[f].extensions);
  const watermark = variant === "watermark-image";
  const ids = { text: useId(), color: useId(), opacity: useId(), font: useId(), logo: useId() };

  const [mode, setMode] = useState<"text" | "logo">("text");
  const [content, setContent] = useState(() => t(watermark ? "watermarkDefault" : "textDefault"));
  const [font, setFont] = useState<OverlayFont>("sans");
  const [bold, setBold] = useState(true);
  const [color, setColor] = useState("#ffffff");
  const [outline, setOutline] = useState(!watermark);
  const [background, setBackground] = useState(false);
  const [size, setSize] = useState(watermark ? 5 : 6);
  const [logoSize, setLogoSize] = useState(20);
  const [opacity, setOpacity] = useState(watermark ? 50 : 100);
  const [position, setPosition] = useState<OverlayPosition | "tile">(watermark ? "br" : "bc");
  const [output, setOutput] = useState<Output>("same");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoBitmap, setLogoBitmap] = useState<ImageBitmap | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [first, setFirst] = useState<File | null>(null);
  const [previewBitmap, setPreviewBitmap] = useState<ImageBitmap | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const useLogo = watermark && mode === "logo";
  const spec: OverlaySpec = {
    item: useLogo
      ? { kind: "logo" }
      : { kind: "text", content, font, bold, color, outline, background },
    size: useLogo ? logoSize : size,
    opacity: opacity / 100,
    position,
  };
  const valid = useLogo ? !!logoBitmap : content.trim().length > 0;

  // Preview of the first picked image, from the same decoder as the result.
  useEffect(() => {
    if (!first) {
      setPreviewBitmap(null);
      return;
    }
    const from = formatFromExtension(first.name);
    if (!from) return;
    const abort = new AbortController();
    let bitmap: ImageBitmap | null = null;
    previewImageFile({ input: first, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal })
      .then((p) => createImageBitmap(p.blob))
      .then((b) => {
        bitmap = b;
        if (abort.signal.aborted) b.close();
        else setPreviewBitmap(b);
      })
      // A damaged file has no preview; running the tool reports the error for it.
      .catch(() => !abort.signal.aborted && setPreviewBitmap(null));
    return () => {
      abort.abort();
      bitmap?.close();
    };
  }, [first]);

  useEffect(() => {
    if (!logo) {
      setLogoBitmap(null);
      setLogoError(false);
      return;
    }
    let bitmap: ImageBitmap | null = null;
    let cancelled = false;
    createImageBitmap(logo)
      .then((b) => {
        bitmap = b;
        if (!cancelled) {
          setLogoBitmap(b);
          setLogoError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogoBitmap(null);
          setLogoError(true);
        }
      });
    return () => {
      cancelled = true;
      bitmap?.close();
    };
  }, [logo]);

  // Redraw the preview whenever an option changes.
  const specKey = JSON.stringify(spec);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !previewBitmap) return;
    el.width = previewBitmap.width;
    el.height = previewBitmap.height;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(previewBitmap, 0, 0);
    const current = JSON.parse(specKey) as OverlaySpec;
    if (current.item.kind === "text" ? current.item.content.trim() : logoBitmap) {
      drawOverlay(ctx, el.width, el.height, current, logoBitmap ?? undefined);
    }
  }, [previewBitmap, logoBitmap, specKey]);

  async function process(
    files: File[],
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    if (!valid) throw new ConversionError("invalidRequest");
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name);
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        const to = output === "same" ? sameAs(from) : output;
        return trackTool(
          variant,
          { from, to, files: [file] },
          () =>
            overlayImageFile(
              { input: file, from, to, spec, logo: useLogo ? logo! : undefined },
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
      return { kind: "file", name, blob: new Blob([out.buffer], { type: formats[out.to].mime }) };
    });
  }

  const sizeOptions = (useLogo ? logoSizes : watermark ? textSizes.watermark : textSizes.text).map((s, i) => ({
    value: String(s),
    label: useLogo ? `${s} %` : t(`overlaySizes.${["s", "m", "l", "xl"][i]}`),
  }));

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes, ready: valid }}
      actionLabel={tt("action")}
      zipName={watermark ? "fileflect-watermarked.zip" : "fileflect-text.zip"}
      onFilesChange={(files) => setFirst(files[0] ?? null)}
      process={({ files }, context) => process(files, context)}
      options={
        <div className="flex flex-col gap-4">
          {previewBitmap && (
            <figure className="flex flex-col items-center gap-1">
              <canvas
                ref={canvas}
                role="img"
                aria-label={t("overlayPreview")}
                className="h-auto max-h-[50vh] w-auto max-w-full rounded-lg border border-border"
              />
              <figcaption className="text-xs text-muted">{t("overlayPreview")}</figcaption>
            </figure>
          )}
          {watermark && (
            <ChoiceGroup
              legend={t("overlayMode")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "text", label: t("modeText") },
                { value: "logo", label: t("modeLogo") },
              ]}
            />
          )}
          {useLogo ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.logo} className="text-sm font-medium">
                {t("logoFile")}
              </label>
              <input
                id={ids.logo}
                type="file"
                accept={LOGO_EXTENSIONS.map((e) => `.${e}`).join(",")}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setLogo(f && f.size <= MAX_LOGO_BYTES ? f : null);
                  setLogoError(!!f && f.size > MAX_LOGO_BYTES);
                }}
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:font-semibold file:text-brand"
              />
              <p className={`text-sm ${logoError ? "text-danger" : "text-muted"}`}>{logoError ? t("logoInvalid") : t("logoHint")}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.text} className="text-sm font-medium">
                  {t(watermark ? "watermarkText" : "textContent")}
                </label>
                {watermark ? (
                  <input
                    id={ids.text}
                    value={content}
                    maxLength={MAX_OVERLAY_TEXT}
                    onChange={(e) => setContent(e.target.value)}
                    className={`h-10 max-w-md ${field}`}
                  />
                ) : (
                  <textarea
                    id={ids.text}
                    value={content}
                    rows={3}
                    maxLength={MAX_OVERLAY_TEXT}
                    onChange={(e) => setContent(e.target.value)}
                    className={`max-w-md py-2 ${field}`}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-end gap-4">
                {!watermark && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor={ids.font} className="text-sm font-medium">
                      {t("font")}
                    </label>
                    <select id={ids.font} value={font} onChange={(e) => setFont(e.target.value as OverlayFont)} className={`h-10 ${field}`}>
                      {(["sans", "serif", "mono"] as const).map((f) => (
                        <option key={f} value={f}>
                          {t(`fonts.${f}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label htmlFor={ids.color} className="text-sm font-medium">
                    {t("textColor")}
                  </label>
                  <input
                    id={ids.color}
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox checked={bold} onChange={setBold} label={t("bold")} />
                <Checkbox checked={outline} onChange={setOutline} label={t("outline")} />
                <Checkbox checked={background} onChange={setBackground} label={t("textBackground")} />
              </div>
            </>
          )}
          <ChoiceGroup legend={t("overlaySize")} value={String(useLogo ? logoSize : size)} onChange={(v) => (useLogo ? setLogoSize : setSize)(Number(v))} options={sizeOptions} />
          <div className="flex max-w-sm flex-col gap-1">
            <label htmlFor={ids.opacity} className="text-sm font-medium">
              {t("opacity", { value: opacity })}
            </label>
            <input
              id={ids.opacity}
              type="range"
              min={10}
              max={100}
              step={5}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="accent-[var(--brand-solid)]"
            />
          </div>
          <PositionPicker value={position} onChange={setPosition} allowTile={watermark} />
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

/** 3 × 3 grid of radio buttons (plus "tile"), labelled for screen readers. */
function PositionPicker({
  value,
  onChange,
  allowTile,
}: {
  value: OverlayPosition | "tile";
  onChange: (v: OverlayPosition | "tile") => void;
  allowTile: boolean;
}) {
  const t = useTranslations("ImageTools");
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-4">
      <legend className="mb-2 text-sm font-medium">{t("overlayPosition")}</legend>
      <div className="grid w-fit grid-cols-3 gap-1 rounded-xl border border-border p-1">
        {overlayPositions.map((p) => (
          <label key={p} className="cursor-pointer" title={t(`positions.${p}`)}>
            <input type="radio" name={name} checked={value === p} onChange={() => onChange(p)} className="peer sr-only" />
            <span className="sr-only">{t(`positions.${p}`)}</span>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted peer-checked:bg-brand-solid peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand hover:bg-surface-2"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-current" />
            </span>
          </label>
        ))}
      </div>
      {allowTile && (
        <label className="cursor-pointer">
          <input type="radio" name={name} checked={value === "tile"} onChange={() => onChange("tile")} className="peer sr-only" />
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm font-medium peer-checked:border-brand-solid peer-checked:bg-brand-solid peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
            {t("positionTile")}
          </span>
        </label>
      )}
    </fieldset>
  );
}
