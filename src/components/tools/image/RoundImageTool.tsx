"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { parseHexColor } from "@/lib/bg-remove/cutout";
import { MAX_RADIUS_PERCENT, roundPlan, type Corners, type RoundFill, type RoundSpec } from "@/lib/image/round";
import { previewImageFile, roundImageFile } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["round-image"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
const PREVIEW_SIDE = 480;

type Shape = "corners" | "circle";
type Unit = "px" | "percent";
type Outside = "transparent" | "color";
type Output = "png" | "webp" | "avif" | "jpg";

/** JPG cannot be transparent: with a transparent outside it is saved as PNG. */
export const effectiveOutput = (output: Output, outside: Outside): Output => (output === "jpg" && outside === "transparent" ? "png" : output);

type Preview = { file: File; bitmap: ImageBitmap; width: number; height: number } | null;

export default function RoundImageTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.round-image");
  const radiusId = useId();
  const focusId = useId();
  const colorId = useId();
  const [shape, setShape] = useState<Shape>("corners");
  const [radius, setRadius] = useState(10);
  const [unit, setUnit] = useState<Unit>("percent");
  const [corners, setCorners] = useState<Corners>({ tl: true, tr: true, br: true, bl: true });
  const [ellipse, setEllipse] = useState(false);
  const [focus, setFocus] = useState(50);
  const [outside, setOutside] = useState<Outside>("transparent");
  const [color, setColor] = useState("#ffffff");
  const [output, setOutput] = useState<Output>("png");
  const [first, setFirst] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<{ x: number; y: number; focus: number } | null>(null);

  const spec: RoundSpec =
    shape === "corners" ? { shape, radius, unit, corners } : { shape: "circle", ellipse, focus: focus / 100 };
  const fill: RoundFill = outside === "transparent" ? { kind: "transparent" } : { kind: "color", rgb: parseHexColor(color) };
  const to = effectiveOutput(output, outside);

  // The first picture, decoded by the same worker as the result, for the live preview.
  useEffect(() => {
    if (!first) return setPreview(null);
    const from = formatFromExtension(first.name);
    if (!from) return setPreview(null);
    const abort = new AbortController();
    let bitmap: ImageBitmap | null = null;
    previewImageFile({ input: first, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal })
      .then(async ({ blob, width, height }) => {
        bitmap = await createImageBitmap(blob);
        if (abort.signal.aborted) return bitmap.close();
        setPreview({ file: first, bitmap, width, height });
      })
      .catch(() => !abort.signal.aborted && setPreview(null));
    return () => {
      abort.abort();
      bitmap?.close();
    };
  }, [first]);

  // Live preview: the same plan as the worker, drawn as a canvas path.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !preview) return;
    const s = preview.bitmap.width / preview.width;
    const plan = roundPlan(preview.width, preview.height, spec);
    const w = Math.max(1, Math.round(plan.crop.width * s));
    const h = Math.max(1, Math.round(plan.crop.height * s));
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    if (fill.kind === "color") {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.save();
    ctx.beginPath();
    if (spec.shape === "circle") ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else roundedPath(ctx, w, h, plan.radius * s, spec.corners);
    ctx.clip();
    ctx.drawImage(preview.bitmap, -plan.crop.x * s, -plan.crop.y * s);
    ctx.restore();
  });

  /** Dragging the circle preview moves the square crop along the long side. */
  function down(e: PointerEvent<HTMLCanvasElement>) {
    if (shape !== "circle" || ellipse) return;
    dragging.current = { x: e.clientX, y: e.clientY, focus };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    const d = dragging.current;
    if (!d || !preview) return;
    const box = e.currentTarget.getBoundingClientRect();
    const wide = preview.width >= preview.height;
    const long = wide ? preview.width : preview.height;
    const short = Math.min(preview.width, preview.height);
    const free = long - short;
    if (free <= 0) return;
    // Pixels on screen → original pixels → share of the free range (dragging the photo, so inverted).
    const moved = ((wide ? e.clientX - d.x : e.clientY - d.y) * short) / (wide ? box.width : box.height);
    setFocus(Math.round(Math.min(100, Math.max(0, d.focus - (moved / free) * 100))));
  }
  const up = () => (dragging.current = null);

  async function process(
    { files }: { files: File[] },
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name);
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        return trackTool(
          "round-image",
          { from, to, files: [file] },
          () => roundImageFile({ input: file, from, to, spec, fill }, { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs }),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const ext = formats[to as FormatId].extensions[0]!;
      const name = renameExtension(file.name, ext).replace(new RegExp(`\\.${ext}$`), `-${t("roundSuffix")}.${ext}`);
      return {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[to as FormatId].mime }),
        message: { ok: true, text: t("roundDone", { name, size: `${out.width} × ${out.height}` }) },
      };
    });
  }

  const showFocus = shape === "circle" && !ellipse && preview && preview.width !== preview.height;

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-rounded.zip"
      onFilesChange={(files) => setFirst(files[0] ?? null)}
      process={process}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("roundShape")}
            value={shape}
            onChange={setShape}
            options={[
              { value: "corners", label: t("roundCorners") },
              { value: "circle", label: t("roundCircle") },
            ]}
          />
          {shape === "corners" ? (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={radiusId} className="text-sm font-medium">
                  {t("roundRadius")}
                </label>
                <input
                  id={radiusId}
                  type="number"
                  min={0}
                  max={unit === "percent" ? MAX_RADIUS_PERCENT : 10000}
                  step={1}
                  value={radius}
                  onChange={(e) => setRadius(Math.max(0, Math.min(unit === "percent" ? MAX_RADIUS_PERCENT : 10000, Number(e.target.value) || 0)))}
                  className={`${field} w-28`}
                />
              </div>
              <ChoiceGroup
                legend={t("roundUnit")}
                value={unit}
                onChange={(u) => {
                  setUnit(u);
                  if (u === "percent") setRadius((r) => Math.min(r, MAX_RADIUS_PERCENT));
                }}
                options={[
                  { value: "px", label: "px" },
                  { value: "percent", label: t("roundUnitPercent") },
                ]}
              />
              <fieldset>
                <legend className="mb-2 text-sm font-medium">{t("roundWhichCorners")}</legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {(["tl", "tr", "bl", "br"] as const).map((k) => (
                    <Checkbox key={k} checked={corners[k]} onChange={(v) => setCorners((c) => ({ ...c, [k]: v }))} label={t(`round_${k}`)} />
                  ))}
                </div>
              </fieldset>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Checkbox checked={ellipse} onChange={setEllipse} label={t("roundEllipse")} />
              {showFocus && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={focusId} className="text-sm font-medium">
                    {t("roundFocus")}
                  </label>
                  <input
                    id={focusId}
                    type="range"
                    min={0}
                    max={100}
                    value={focus}
                    onChange={(e) => setFocus(Number(e.target.value))}
                    aria-valuetext={`${focus} %`}
                    className="h-11 w-56 accent-brand-solid sm:h-9"
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <ChoiceGroup
              legend={t("roundOutside")}
              value={outside}
              onChange={setOutside}
              options={[
                { value: "transparent", label: t("roundTransparent") },
                { value: "color", label: t("roundColor") },
              ]}
            />
            {outside === "color" && (
              <div className="flex flex-col gap-1">
                <label htmlFor={colorId} className="text-sm font-medium">
                  {t("roundColorLabel")}
                </label>
                <input
                  id={colorId}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1 sm:h-10"
                />
              </div>
            )}
            <ChoiceGroup
              legend={t("roundFormat")}
              value={to}
              onChange={setOutput}
              options={[
                { value: "png", label: "PNG" },
                { value: "webp", label: "WEBP" },
                { value: "avif", label: "AVIF" },
                { value: "jpg", label: "JPG" },
              ]}
            />
          </div>
          {output === "jpg" && outside === "transparent" && (
            <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("roundJpgSwitched")}
            </p>
          )}
          {preview && (
            <figure className="flex flex-col items-center gap-2">
              <canvas
                ref={canvas}
                role="img"
                aria-label={t("roundPreviewLabel")}
                data-testid="round-preview"
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                className={`block h-auto max-h-80 w-auto max-w-full ${showFocus ? "cursor-grab touch-none" : ""}`}
                style={{ backgroundImage: "repeating-conic-gradient(#d4d4d4 0 25%, #ffffff 0 50%)", backgroundSize: "16px 16px" }}
              />
              <figcaption className="text-sm text-muted">{showFocus ? t("roundPreviewDrag") : t("roundPreview")}</figcaption>
            </figure>
          )}
        </div>
      }
    />
  );
}

/** Rectangle with the chosen corners rounded (arcs of radius r). */
function roundedPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, c: Corners) {
  const tl = c.tl ? r : 0;
  const tr = c.tr ? r : 0;
  const br = c.br ? r : 0;
  const bl = c.bl ? r : 0;
  ctx.moveTo(tl, 0);
  ctx.lineTo(w - tr, 0);
  if (tr) ctx.arc(w - tr, tr, tr, -Math.PI / 2, 0);
  ctx.lineTo(w, h - br);
  if (br) ctx.arc(w - br, h - br, br, 0, Math.PI / 2);
  ctx.lineTo(bl, h);
  if (bl) ctx.arc(bl, h - bl, bl, Math.PI / 2, Math.PI);
  ctx.lineTo(0, tl);
  if (tl) ctx.arc(tl, tl, tl, Math.PI, (Math.PI * 3) / 2);
  ctx.closePath();
}
