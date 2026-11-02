"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { Redo2, Undo2 } from "lucide-react";
import { buttonSecondary } from "@/components/ui/styles";
import { formats, formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { cutPhoto, exportPhoto, preparePhoto, type Prepared } from "@/lib/bg-remove/cutout-client";
import { parseHexColor, type Background } from "@/lib/bg-remove/cutout";
import { initialRect, scaleEdit, type Edit } from "@/lib/bg-remove/edit";
import type { Stroke } from "@/lib/bg-remove/grabcut";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import CropEditor from "./CropEditor";

const info = tools["remove-background"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);

type BackgroundKind = "transparent" | "white" | "color";
type Output = "png" | "webp" | "jpg";
type Mode = "rect" | "keep" | "remove";
type BrushSize = "small" | "medium" | "large";
/** Brush radius as a share of the photo's longest side. */
const brushShare: Record<BrushSize, number> = { small: 0.012, medium: 0.025, large: 0.05 };

type Photo = { status: "loading" } | { status: "error"; code: ApiErrorCode } | { status: "ready"; from: FormatId; prepared: Prepared; url: string };

/**
 * Assisted cutout: the user frames the subject with a rectangle and fixes the
 * result with "keep" and "remove" brushes. GrabCut (our own code, no model)
 * runs in a worker on a reduced copy; the download is made at full size.
 */
export default function RemoveBackgroundTool() {
  const t = useTranslations("RemoveBackgroundTool");
  const tt = useTranslations("Tools.remove-background");
  const te = useTranslations("ApiErrors");
  const colorId = useId();
  const helpId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [history, setHistory] = useState<{ edits: Edit[]; index: number }>({ edits: [], index: 0 });
  const [mask, setMask] = useState<{ edit: Edit; data: Uint8Array } | null>(null);
  const [mode, setMode] = useState<Mode>("rect");
  const [brush, setBrush] = useState<BrushSize>("medium");
  const [kind, setKind] = useState<BackgroundKind>("transparent");
  const [color, setColor] = useState("#4f8ff7");
  const [output, setOutput] = useState<Output>("png");
  const lastRectChange = useRef(0);

  const edit = history.edits[history.index] ?? null;
  const ready = photo?.status === "ready" ? photo : null;

  // A new file: the worker decodes it and returns the reduced copy to work on.
  useEffect(() => {
    if (!file) {
      setPhoto(null);
      return;
    }
    const abort = new AbortController();
    let url: string | null = null;
    setPhoto({ status: "loading" });
    setMask(null);
    setHistory({ edits: [], index: 0 });
    setMode("rect");
    const from = formatFromExtension(file.name);
    (from && info.inputs.includes(from)
      ? preparePhoto(file, from, { signal: abort.signal, timeoutMs: info.limits.timeoutMs })
      : Promise.reject(new ConversionError("unsupportedFormat"))
    )
      .then(async (prepared) => {
        if (abort.signal.aborted || !from) return;
        url = await previewUrl(prepared);
        if (abort.signal.aborted) return URL.revokeObjectURL(url);
        setPhoto({ status: "ready", from, prepared, url });
        setHistory({ edits: [{ rect: initialRect(prepared), strokes: [] }], index: 0 });
      })
      .catch((error) => !abort.signal.aborted && setPhoto({ status: "error", code: errorCode(error) }));
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  // Each change of the marks recomputes the cut (only the latest one when they come fast).
  useEffect(() => {
    if (!ready || !edit) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      const work = scaleEdit(edit, ready.prepared.workWidth / ready.prepared.width);
      cutPhoto(ready.prepared, work.rect, work.strokes, { signal: abort.signal })
        .then(({ mask: data }) => !abort.signal.aborted && setMask({ edit, data: new Uint8Array(data) }))
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [ready, edit]);

  const commit = useCallback((next: Edit, coalesce = false) => {
    setHistory(({ edits, index }) => {
      // Dragging the rectangle is one step, not one per pointer move.
      const base = coalesce ? index : index + 1;
      const kept = edits.slice(0, base);
      return { edits: [...kept, next], index: kept.length };
    });
  }, []);

  function changeRect(rect: Edit["rect"]) {
    if (!edit) return;
    const now = Date.now();
    commit({ ...edit, rect }, now - lastRectChange.current < 600);
    lastRectChange.current = now;
  }

  const canUndo = history.index > 0;
  const canRedo = history.index < history.edits.length - 1;
  const undo = () => canUndo && setHistory((h) => ({ ...h, index: h.index - 1 }));
  const redo = () => canRedo && setHistory((h) => ({ ...h, index: h.index + 1 }));
  function shortcuts(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) undo();
    else if (key === "y" || (key === "z" && event.shiftKey)) redo();
    else return;
    event.preventDefault();
  }

  const background: Background =
    kind === "transparent" ? { kind: "transparent" } : { kind: "color", rgb: kind === "white" ? [255, 255, 255] : parseHexColor(color) };
  const upToDate = !!mask && mask.edit === edit;

  function chooseOutput(next: Output) {
    setOutput(next);
    if (next === "jpg" && kind === "transparent") setKind("white");
  }
  function chooseKind(next: BackgroundKind) {
    setKind(next);
    if (next === "transparent" && output === "jpg") setOutput("png");
  }

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    if (!file || !ready || !mask) throw new ConversionError("invalidRequest");
    const out = await trackTool(
      "remove-background",
      { from: ready.from, to: output, files: [file] },
      () => exportPhoto(file, ready.from, mask.data, ready.prepared, background, output, { signal, onProgress, timeoutMs: info.limits.timeoutMs }),
      (o) => o.buffer.byteLength,
    );
    const name = renameExtension(file.name, output).replace(new RegExp(`\\.${output}$`), `-${t("suffix")}.${output}`);
    return [
      {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[output].mime }),
        message: { ok: true, text: t("done", { pixels: `${out.width} × ${out.height}` }) },
      },
    ];
  }

  const kept = mask ? Math.round((mask.data.reduce((a, v) => a + v, 0) / (255 * mask.data.length)) * 100) : null;

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: false, maxFileBytes: info.limits.maxFileBytes, ready: !!ready && upToDate }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setFile(files[0] ?? null)}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          {!file && <p className="text-sm text-muted">{t("note")}</p>}
          {photo?.status === "loading" && <p className="text-sm text-muted">{t("loading")}</p>}
          {photo?.status === "error" && <ToolAlert>{te(photo.code)}</ToolAlert>}
          {ready && edit && (
            <div className="flex flex-col gap-4" onKeyDown={shortcuts}>
              <ol id={helpId} className="list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>{t("step1")}</li>
                <li>{t("step2")}</li>
                <li>{t("step3")}</li>
              </ol>
              <div className="flex flex-wrap items-end gap-4">
                <ChoiceGroup
                  legend={t("mode")}
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "rect", label: t("modeRect") },
                    { value: "keep", label: t("modeKeep") },
                    { value: "remove", label: t("modeRemove") },
                  ]}
                />
                {mode !== "rect" && (
                  <ChoiceGroup
                    legend={t("brushSize")}
                    value={brush}
                    onChange={setBrush}
                    options={[
                      { value: "small", label: t("brushSmall") },
                      { value: "medium", label: t("brushMedium") },
                      { value: "large", label: t("brushLarge") },
                    ]}
                  />
                )}
                <div className="flex gap-2">
                  <button type="button" className={buttonSecondary} onClick={undo} disabled={!canUndo} aria-keyshortcuts="Control+Z">
                    <Undo2 aria-hidden="true" className="h-4 w-4" />
                    {t("undo")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={redo} disabled={!canRedo} aria-keyshortcuts="Control+Y">
                    <Redo2 aria-hidden="true" className="h-4 w-4" />
                    {t("redo")}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {mode === "rect" && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">{t("original")}</h3>
                    <CropEditor
                      src={ready.url}
                      image={{ width: ready.prepared.width, height: ready.prepared.height }}
                      rect={edit.rect}
                      ratio={null}
                      onChange={changeRect}
                    />
                  </div>
                )}
                <div className={`flex flex-col gap-2 ${mode === "rect" ? "" : "md:col-span-2"}`}>
                  <h3 className="text-sm font-medium">{t("result")}</h3>
                  <ResultCanvas
                    prepared={ready.prepared}
                    mask={mask?.data ?? null}
                    strokes={edit.strokes}
                    background={kind === "transparent" ? null : background.kind === "color" ? background.rgb : null}
                    brush={mode === "rect" ? null : { kind: mode, radius: brushShare[brush] * Math.max(ready.prepared.width, ready.prepared.height) }}
                    onStroke={(stroke) => commit({ ...edit, strokes: [...edit.strokes, stroke] })}
                    label={t("previewLabel")}
                  />
                  {mode !== "rect" && <p className="text-sm text-muted">{t("brushHint")}</p>}
                </div>
              </div>
              <p className="text-sm font-medium" role="status" aria-live="polite">
                {upToDate && kept !== null ? t("status", { percent: kept }) : t("cutting")}
              </p>
            </div>
          )}
          {ready && (
            <div className="flex flex-wrap items-end gap-4">
              <ChoiceGroup
                legend={t("background")}
                value={kind}
                onChange={chooseKind}
                options={[
                  { value: "transparent", label: t("transparent") },
                  { value: "white", label: t("white") },
                  { value: "color", label: t("color") },
                ]}
              />
              {kind === "color" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={colorId} className="text-sm font-medium">
                    {t("colorLabel")}
                  </label>
                  <input
                    id={colorId}
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface p-1"
                  />
                </div>
              )}
              <ChoiceGroup
                legend={t("format")}
                value={output}
                onChange={chooseOutput}
                options={[
                  { value: "png", label: "PNG" },
                  { value: "webp", label: "WEBP" },
                  { value: "jpg", label: "JPG" },
                ]}
              />
            </div>
          )}
          {ready && output === "jpg" && <p className="text-sm text-muted">{t("jpgNoAlpha")}</p>}
        </div>
      }
    />
  );
}

/** The reduced copy as an image URL (for the rectangle editor). */
async function previewUrl(p: Prepared): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = p.workWidth;
  canvas.height = p.workHeight;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.work.slice(0)), p.workWidth, p.workHeight), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No preview");
  return URL.createObjectURL(blob);
}

interface CanvasProps {
  prepared: Prepared;
  mask: Uint8Array | null;
  strokes: readonly Stroke[];
  /** Solid color behind the subject; null shows the checkerboard (transparent). */
  background: [number, number, number] | null;
  /** Painting brush (radius in original pixels), or null when not painting. */
  brush: { kind: "keep" | "remove"; radius: number } | null;
  onStroke: (stroke: Stroke) => void;
  label: string;
}

const STROKE_COLOR = { keep: "rgba(22, 163, 74, 0.55)", remove: "rgba(220, 38, 38, 0.55)" };

/**
 * The result at work size over the chosen background. While painting, the
 * removed parts show faintly (so they can be brought back) and the strokes
 * are drawn on top.
 */
function ResultCanvas({ prepared, mask, strokes, background, brush, onStroke, label }: CanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const { workWidth: w, workHeight: h, width, height } = prepared;
  const s = w / width;

  // The faint original (shown while painting) and the cutout, rebuilt only when the mask changes.
  const ghost = useMemo(() => layer(w, h, new Uint8ClampedArray(prepared.work.slice(0))), [prepared, w, h]);
  const cutout = useMemo(() => {
    if (!mask) return null;
    const src = new Uint8ClampedArray(prepared.work.slice(0));
    for (let i = 0; i < mask.length; i++) src[i * 4 + 3] = (src[i * 4 + 3]! * mask[i]!) / 255;
    return layer(w, h, src);
  }, [prepared, mask, w, h]);

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (background) {
      ctx.fillStyle = `rgb(${background.join(",")})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (brush) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(ghost, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (cutout) ctx.drawImage(cutout, 0, 0);
    if (brush) {
      const all = drawing.current ? [...strokes, drawing.current] : strokes;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of all) {
        ctx.strokeStyle = STROKE_COLOR[stroke.kind];
        ctx.fillStyle = STROKE_COLOR[stroke.kind];
        ctx.lineWidth = stroke.radius * 2 * s;
        const [first, ...rest] = stroke.points;
        if (!first) continue;
        ctx.beginPath();
        if (rest.length === 0) {
          ctx.arc(first[0] * s, first[1] * s, stroke.radius * s, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.moveTo(first[0] * s, first[1] * s);
        for (const [x, y] of rest) ctx.lineTo(x * s, y * s);
        ctx.stroke();
      }
    }
  }, [ghost, cutout, strokes, background, brush, w, h, s]);

  useEffect(draw, [draw]);

  /** Pointer position in original pixels. */
  function at(event: PointerEvent): [number, number] {
    const box = canvas.current!.getBoundingClientRect();
    return [
      Math.min(width, Math.max(0, ((event.clientX - box.left) / box.width) * width)),
      Math.min(height, Math.max(0, ((event.clientY - box.top) / box.height) * height)),
    ];
  }

  function down(event: PointerEvent) {
    if (!brush) return;
    event.preventDefault();
    canvas.current?.setPointerCapture(event.pointerId);
    drawing.current = { kind: brush.kind, radius: brush.radius, points: [at(event)] };
    draw();
  }
  function move(event: PointerEvent) {
    if (!drawing.current) return;
    drawing.current.points.push(at(event));
    draw();
  }
  function up() {
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke) onStroke({ ...stroke, points: stroke.points.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) });
  }

  return (
    <canvas
      ref={canvas}
      width={w}
      height={h}
      role="img"
      aria-label={label}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      data-testid="cutout-preview"
      className={`mx-auto block h-auto max-h-[60vh] w-auto max-w-full rounded-sm ${brush ? "cursor-crosshair touch-none" : ""}`}
      style={{
        aspectRatio: `${w} / ${h}`,
        backgroundImage: background ? undefined : "repeating-conic-gradient(#d4d4d4 0 25%, #ffffff 0 50%)",
        backgroundSize: background ? undefined : "16px 16px",
      }}
    />
  );
}

/** RGBA pixels → a canvas that drawImage accepts. */
function layer(w: number, h: number, data: Uint8ClampedArray<ArrayBuffer>): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}
