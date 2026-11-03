"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import type { Prepared } from "@/lib/bg-remove/cutout-client";
import { cutAlpha } from "@/lib/bg-remove/cutout";
import type { Stroke } from "@/lib/bg-remove/grabcut";
import { applyPaint, intersects, strokeBox, type Box, type PaintStroke } from "@/lib/bg-remove/paint";

export type EditorTool = "view" | "keep" | "remove" | "erase" | "restore" | "hand";
export type ViewBackground = "result" | "checker" | "black" | "magenta";

/** Zoom = screen (CSS) pixels per original pixel; 1 is 100 %. */
export const MAX_ZOOM = 8;
const STROKE_COLOR = { keep: "rgba(22, 163, 74, 0.55)", remove: "rgba(220, 38, 38, 0.55)" };
const VIEW_COLORS: Record<Exclude<ViewBackground, "result" | "checker">, string> = { black: "#000000", magenta: "#ff00ff" };

interface Props {
  prepared: Prepared;
  /** Soft cut (0–255) at work size, or null while it is computed. */
  mask: Uint8Array | null;
  /** "Keep"/"remove" marks for GrabCut (shown while using those brushes). */
  hints: readonly Stroke[];
  /** "Erase"/"restore" strokes applied over the cut. */
  paint: readonly PaintStroke[];
  /** Solid color chosen for the download (null: transparent). */
  background: [number, number, number] | null;
  viewBackground: ViewBackground;
  tool: EditorTool;
  /** Brush radius in original pixels. */
  radius: number;
  soft: boolean;
  onHint: (stroke: Stroke) => void;
  onPaint: (stroke: PaintStroke) => void;
  label: string;
}

interface View {
  zoom: number;
  x: number;
  y: number;
  /** Still "fit to screen": refit when the box changes size. */
  fitted: boolean;
}

type Drag =
  | { kind: "stroke"; id: number; stroke: { kind: PaintStroke["kind"] | Stroke["kind"]; radius: number; soft: boolean; points: [number, number][] } }
  | { kind: "pan"; id: number; sx: number; sy: number; view: View }
  | { kind: "pinch"; startDist: number; cx: number; cy: number; view: View }
  | { kind: "locked" };

/** From half the fit-to-screen zoom up to 800 % (more for tiny images). */
const clampZoom = (z: number, fit: number) => Math.min(Math.max(MAX_ZOOM, fit * 2), Math.max(fit * 0.5, z));

/**
 * The zoomable result editor. The cut (with the erase/restore strokes) lives
 * in an off-screen copy of the photo at "view" size (up to 3 MP), changed
 * only where a stroke passes; the visible canvas just draws that copy with
 * the current zoom and pan, the brush outline and the marks.
 */
export default function BgEditor({ prepared, mask, hints, paint, background, viewBackground, tool, radius, soft, onHint, onPaint, label }: Props) {
  const t = useTranslations("RemoveBackgroundTool");
  const box = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLCanvasElement>(null);
  const composite = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0, fitted: true });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; touch: boolean }>());
  const hover = useRef<{ x: number; y: number } | null>(null);
  const space = useRef(false);
  const frame = useRef(0);

  const { width: W, height: H, viewWidth: vw, viewHeight: vh } = prepared;
  const scale = vw / W;
  const rgba = useMemo(() => new Uint8ClampedArray(prepared.view.slice(0)), [prepared]);
  const own = useCallback((p: number) => rgba[p * 4 + 3]!, [rgba]);
  /** The photo itself (for the faint copy of what was removed). */
  const original = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = vw;
    c.height = vh;
    c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), vw, vh), 0, 0);
    return c;
  }, [rgba, vw, vh]);

  // The cut at view size and its alpha with the strokes applied.
  const base = useMemo(() => (mask ? cutAlpha(mask, prepared.workWidth, prepared.workHeight, vw, vh, own) : null), [mask, prepared, vw, vh, own]);
  const alpha = useRef<Uint8Array | null>(null);
  const applied = useRef<{ base: Uint8Array | null; paint: readonly PaintStroke[] }>({ base: null, paint: [] });

  const fit = size.w && size.h ? Math.min(size.w / W, size.h / H) : 1;

  /** Recomputes `region` (view pixels) from the cut and the strokes, and copies it to the composite. */
  const refresh = useCallback(
    (region: Box | null, strokes: readonly PaintStroke[]) => {
      const ctx = composite.current?.getContext("2d");
      const a = alpha.current;
      if (!ctx || !a || !base) return;
      const r = region
        ? { x0: Math.max(0, Math.floor(region.x0)), y0: Math.max(0, Math.floor(region.y0)), x1: Math.min(vw - 1, Math.ceil(region.x1)), y1: Math.min(vh - 1, Math.ceil(region.y1)) }
        : { x0: 0, y0: 0, x1: vw - 1, y1: vh - 1 };
      if (r.x1 < r.x0 || r.y1 < r.y0) return;
      for (let y = r.y0; y <= r.y1; y++) a.set(base.subarray(y * vw + r.x0, y * vw + r.x1 + 1), y * vw + r.x0);
      const imageBox = { x0: r.x0 / scale, y0: r.y0 / scale, x1: (r.x1 + 1) / scale, y1: (r.y1 + 1) / scale };
      applyPaint(a, own, vw, vh, scale, strokes.filter((s) => intersects(strokeBox(s), imageBox)), r);
      const w = r.x1 - r.x0 + 1;
      const h = r.y1 - r.y0 + 1;
      const img = new ImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = (r.y0 + y) * vw + r.x0 + x;
          const o = (y * w + x) * 4;
          img.data[o] = rgba[p * 4]!;
          img.data[o + 1] = rgba[p * 4 + 1]!;
          img.data[o + 2] = rgba[p * 4 + 2]!;
          img.data[o + 3] = a[p]!;
        }
      ctx.putImageData(img, r.x0, r.y0);
    },
    [base, own, rgba, scale, vw, vh],
  );

  const toView = (b: Box): Box => ({ x0: b.x0 * scale - 1, y0: b.y0 * scale - 1, x1: b.x1 * scale + 1, y1: b.y1 * scale + 1 });

  const draw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = screen.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx || !composite.current) return;
      const dpr = c.width / Math.max(1, size.w);
      const { zoom, x, y } = viewRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const iw = W * zoom;
      const ih = H * zoom;
      // Background behind the cut, only over the photo.
      const solid = viewBackground === "result" ? (background ? `rgb(${background.join(",")})` : null) : viewBackground === "checker" ? null : VIEW_COLORS[viewBackground];
      if (solid) ctx.fillStyle = solid;
      else {
        const tile = document.createElement("canvas");
        tile.width = tile.height = 16;
        const tc = tile.getContext("2d")!;
        tc.fillStyle = "#ffffff";
        tc.fillRect(0, 0, 16, 16);
        tc.fillStyle = "#d4d4d4";
        tc.fillRect(0, 0, 8, 8);
        tc.fillRect(8, 8, 8, 8);
        ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
      }
      ctx.fillRect(x, y, iw, ih);
      // Big zoom: show the pixels as squares, for precise work.
      ctx.imageSmoothingEnabled = zoom * (W / vw) < 2;
      if (tool === "keep" || tool === "restore") {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(original, x, y, iw, ih);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(composite.current, x, y, iw, ih);
      // GrabCut marks while using those brushes (and the one being drawn).
      const live = drag.current?.kind === "stroke" ? drag.current.stroke : null;
      if (tool === "keep" || tool === "remove") {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const s of live && (live.kind === "keep" || live.kind === "remove") ? [...hints, live as Stroke] : hints) {
          ctx.strokeStyle = ctx.fillStyle = STROKE_COLOR[s.kind];
          ctx.lineWidth = s.radius * 2 * zoom;
          const [first, ...rest] = s.points;
          if (!first) continue;
          ctx.beginPath();
          if (rest.length === 0) {
            ctx.arc(x + first[0] * zoom, y + first[1] * zoom, s.radius * zoom, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          ctx.moveTo(x + first[0] * zoom, y + first[1] * zoom);
          for (const [px, py] of rest) ctx.lineTo(x + px * zoom, y + py * zoom);
          ctx.stroke();
        }
      }
      // Brush outline at its real size (and the soft core).
      const brush = tool === "keep" || tool === "remove" || tool === "erase" || tool === "restore";
      if (brush && hover.current && drag.current?.kind !== "pinch") {
        const r = Math.max(1, radius * zoom);
        ctx.lineWidth = 1;
        for (const [color, extra] of [["rgba(0,0,0,0.8)", 1], ["rgba(255,255,255,0.95)", 0]] as const) {
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(hover.current.x, hover.current.y, r + extra, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (soft && (tool === "erase" || tool === "restore") && r > 6) {
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(hover.current.x, hover.current.y, r / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });
  }, [size.w, W, H, vw, viewBackground, background, tool, original, hints, radius, soft]);

  // The box size (CSS pixels), and the canvas backing store at device resolution.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = screen.current;
    if (!c || !size.w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    setView((v) => (v.fitted ? fitted(size, W, H) : place(v, size, W, H)));
  }, [size, W, H]);
  // A new photo starts fitted.
  useEffect(() => setView(fitted(size, W, H)), [prepared]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new cut (or undo/redo of strokes) recomputes everything; one more stroke only its area.
  useEffect(() => {
    if (!base) {
      alpha.current = null;
      composite.current?.getContext("2d")?.clearRect(0, 0, vw, vh);
      applied.current = { base: null, paint: [] };
      draw();
      return;
    }
    const prev = applied.current;
    const oneMore = prev.base === base && alpha.current && paint.length === prev.paint.length + 1 && prev.paint.every((s, i) => s === paint[i]);
    if (oneMore) refresh(toView(strokeBox(paint[paint.length - 1]!)), paint);
    else {
      alpha.current = new Uint8Array(base);
      refresh(null, paint);
    }
    applied.current = { base, paint };
    draw();
  }, [base, paint]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(draw, [draw, view]);

  // Wheel (with or without Ctrl) zooms around the pointer; needs a non-passive listener.
  useEffect(() => {
    const c = screen.current;
    if (!c) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const step = e.deltaMode === 1 ? e.deltaY * 0.05 : e.deltaY * 0.0015;
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, viewRef.current.zoom * Math.exp(-step));
    };
    c.addEventListener("wheel", wheel, { passive: false });
    return () => c.removeEventListener("wheel", wheel);
  });

  // Space held: drag to pan (desktop), like image editors.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !hover.current) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) && target !== screen.current) return;
      e.preventDefault();
      space.current = true;
      if (screen.current) screen.current.style.cursor = "grab";
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      space.current = false;
      if (screen.current) screen.current.style.cursor = "";
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function zoomAt(sx: number, sy: number, zoom: number) {
    setView((v) => {
      const z = clampZoom(zoom, fit);
      const ix = (sx - v.x) / v.zoom;
      const iy = (sy - v.y) / v.zoom;
      return place({ zoom: z, x: sx - ix * z, y: sy - iy * z, fitted: false }, size, W, H);
    });
  }

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = screen.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const toImage = (p: { x: number; y: number }): [number, number] => {
    const { zoom, x, y } = viewRef.current;
    const ix = Math.min(W, Math.max(0, (p.x - x) / zoom));
    const iy = Math.min(H, Math.max(0, (p.y - y) / zoom));
    return [Math.round(ix * 10) / 10, Math.round(iy * 10) / 10];
  };

  const painting = tool === "keep" || tool === "remove" || tool === "erase" || tool === "restore";

  /** Drops the stroke being drawn (a second finger arrived: it was the start of a gesture). */
  function dropStroke() {
    const d = drag.current;
    if (d?.kind !== "stroke") return;
    drag.current = null;
    if (d.stroke.kind === "erase" || d.stroke.kind === "restore") refresh(toView(strokeBox(d.stroke as PaintStroke)), paint);
  }

  function down(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = local(e);
    const touch = e.pointerType === "touch";
    pointers.current.set(e.pointerId, { ...p, touch });
    screen.current?.focus({ preventScroll: true });
    try {
      screen.current?.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests) cannot be captured.
    }
    e.preventDefault();
    if (pointers.current.size >= 2) {
      // Two fingers: zoom and pan, never paint.
      dropStroke();
      const [a, b] = [...pointers.current.values()];
      drag.current = { kind: "pinch", startDist: Math.max(1, Math.hypot(a!.x - b!.x, a!.y - b!.y)), cx: (a!.x + b!.x) / 2, cy: (a!.y + b!.y) / 2, view: viewRef.current };
      draw();
      return;
    }
    if (drag.current?.kind === "locked") return;
    hover.current = touch ? null : p;
    if (!painting || space.current || e.button === 1) {
      drag.current = { kind: "pan", id: e.pointerId, sx: p.x, sy: p.y, view: viewRef.current };
      return;
    }
    if (e.button !== 0) return;
    drag.current = { kind: "stroke", id: e.pointerId, stroke: { kind: tool, radius, soft, points: [toImage(p)] } };
    paintLive(null);
  }

  /** Repaints the live stroke where it just grew. */
  function paintLive(from: [number, number] | null) {
    const d = drag.current;
    if (d?.kind !== "stroke") return;
    const s = d.stroke;
    if (s.kind === "erase" || s.kind === "restore") {
      const last = s.points[s.points.length - 1]!;
      const seg: PaintStroke = { ...(s as PaintStroke), points: from ? [from, last] : [last] };
      refresh(toView(strokeBox(seg)), [...paint, s as PaintStroke]);
    }
    draw();
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = local(e);
    const known = pointers.current.get(e.pointerId);
    if (known) pointers.current.set(e.pointerId, { ...p, touch: known.touch });
    if (e.pointerType !== "touch") hover.current = p;
    const d = drag.current;
    if (d?.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const cx = (a!.x + b!.x) / 2;
      const cy = (a!.y + b!.y) / 2;
      const z = clampZoom((d.view.zoom * dist) / d.startDist, fit);
      const ix = (d.cx - d.view.x) / d.view.zoom;
      const iy = (d.cy - d.view.y) / d.view.zoom;
      setView(place({ zoom: z, x: cx - ix * z, y: cy - iy * z, fitted: false }, size, W, H));
      return;
    }
    if (d?.kind === "pan" && d.id === e.pointerId) {
      setView(place({ ...d.view, x: d.view.x + p.x - d.sx, y: d.view.y + p.y - d.sy, fitted: false }, size, W, H));
      return;
    }
    if (d?.kind === "stroke" && d.id === e.pointerId) {
      const prev = d.stroke.points[d.stroke.points.length - 1]!;
      const next = toImage(p);
      if (next[0] === prev[0] && next[1] === prev[1]) return;
      d.stroke.points.push(next);
      paintLive(prev);
      return;
    }
    draw();
  }

  function up(e: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.kind === "stroke" && d.id === e.pointerId) {
      if (cancelled) dropStroke();
      else {
        drag.current = null;
        const s = d.stroke;
        if (s.kind === "erase" || s.kind === "restore") onPaint({ kind: s.kind, radius: s.radius, soft: s.soft, points: s.points });
        else onHint({ kind: s.kind, radius: s.radius, points: s.points } as Stroke);
      }
    } else if (d?.kind === "pinch") {
      // The remaining finger must lift before it can paint.
      drag.current = pointers.current.size ? { kind: "locked" } : null;
    } else if (pointers.current.size === 0) drag.current = null;
    if (e.pointerType === "touch") hover.current = null;
    draw();
  }

  const zoomButton = (factor: number) => zoomAt(size.w / 2, size.h / 2, view.zoom * factor);
  const percent = Math.round(view.zoom * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("zoom")}>
        <button type="button" className={zoomBtn} onClick={() => zoomButton(1 / 1.5)} aria-label={t("zoomOut")} aria-keyshortcuts="-">
          <ZoomOut aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="min-w-14 text-center text-sm tabular-nums" aria-live="polite" data-testid="zoom-level">
          {percent} %
        </span>
        <button type="button" className={zoomBtn} onClick={() => zoomButton(1.5)} aria-label={t("zoomIn")} aria-keyshortcuts="+">
          <ZoomIn aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={`${zoomBtn} w-auto px-3`} onClick={() => setView(fitted(size, W, H))} aria-keyshortcuts="0">
          <Maximize aria-hidden="true" className="h-4 w-4" />
          {t("zoomFit")}
        </button>
        <button type="button" className={`${zoomBtn} w-auto px-3`} onClick={() => zoomAt(size.w / 2, size.h / 2, 1)} aria-keyshortcuts="1">
          100 %
        </button>
      </div>
      <div ref={box} className="relative h-[55vh] max-h-[640px] min-h-[260px] w-full overflow-hidden rounded-xl border border-border bg-surface-2">
        <canvas
          ref={screen}
          role="img"
          aria-label={label}
          tabIndex={0}
          data-testid="cutout-editor"
          data-zoom={view.zoom}
          data-pan-x={view.x}
          data-pan-y={view.y}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={(e) => up(e)}
          onPointerCancel={(e) => up(e, true)}
          onPointerLeave={() => {
            hover.current = null;
            draw();
          }}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "=") zoomButton(1.5);
            else if (e.key === "-") zoomButton(1 / 1.5);
            else if (e.key === "0") setView(fitted(size, W, H));
            else if (e.key === "1") zoomAt(size.w / 2, size.h / 2, 1);
            else return;
            e.preventDefault();
          }}
          className={`absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-brand ${painting ? "cursor-none" : "cursor-grab"}`}
        />
        {/* The cut at view size (what the editor draws), kept for reading back in tests. */}
        <canvas ref={composite} width={vw} height={vh} hidden data-testid="cutout-preview" />
      </div>
    </div>
  );
}

const zoomBtn =
  "inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface text-sm font-medium text-foreground transition hover:border-brand hover:text-brand sm:h-9 sm:w-9";

function fitted(size: { w: number; h: number }, W: number, H: number): View {
  if (!size.w || !size.h) return { zoom: 1, x: 0, y: 0, fitted: true };
  const zoom = Math.min(size.w / W, size.h / H);
  return { zoom, x: (size.w - W * zoom) / 2, y: (size.h - H * zoom) / 2, fitted: true };
}

/** Keeps the photo on screen: centered when smaller than the box, else no empty margin. */
function place(v: View, size: { w: number; h: number }, W: number, H: number): View {
  const iw = W * v.zoom;
  const ih = H * v.zoom;
  const x = iw <= size.w ? (size.w - iw) / 2 : Math.min(0, Math.max(size.w - iw, v.x));
  const y = ih <= size.h ? (size.h - ih) / 2 : Math.min(0, Math.max(size.h - ih, v.y));
  return { ...v, x, y };
}
