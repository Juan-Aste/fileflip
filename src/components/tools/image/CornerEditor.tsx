"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { isValidQuad, type Point, type Quad } from "@/lib/image/scan";

interface Props {
  /** Preview URL (may be smaller than the image: corners are in image pixels). */
  src: string;
  image: { width: number; height: number };
  quad: Quad;
  onChange: (quad: Quad) => void;
}

const names = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;

/**
 * The page's four corners over the photo: drag a handle (mouse or touch) or
 * focus it and use the arrow keys (Shift for bigger steps). Moves that would
 * cross the outline or leave the photo are ignored.
 */
export default function CornerEditor({ src, image, quad, onChange }: Props) {
  const t = useTranslations("ScanDocumentTool");
  const hintId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  const clampPoint = (p: Point): Point => ({ x: Math.min(image.width, Math.max(0, p.x)), y: Math.min(image.height, Math.max(0, p.y)) });
  const setCorner = (i: number, p: Point) => {
    const next = quad.map((q, j) => (j === i ? clampPoint(p) : q)) as Quad;
    if (isValidQuad(next, image.width, image.height)) onChange(next);
  };

  function toImage(event: PointerEvent): Point {
    const box = frame.current!.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * image.width, y: ((event.clientY - box.top) / box.height) * image.height };
  }

  function down(event: PointerEvent, i: number) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    (event.target as HTMLElement).focus();
    drag.current = i;
  }

  function key(event: KeyboardEvent, i: number) {
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const dir = arrows[event.key];
    if (!dir) return;
    event.preventDefault();
    const step = (Math.max(image.width, image.height) / 200) * (event.shiftKey ? 10 : 1);
    setCorner(i, { x: quad[i]!.x + dir[0] * step, y: quad[i]!.y + dir[1] * step });
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const outline = quad.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={frame}
        className="relative mx-auto w-fit max-w-full touch-none select-none"
        onPointerMove={(e) => drag.current !== null && setCorner(drag.current, toImage(e))}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimizable asset */}
        <img src={src} alt="" draggable={false} className="block max-h-[60vh] w-auto max-w-full rounded-sm" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${image.width} ${image.height}`} preserveAspectRatio="none">
          {/* Shade outside the page: the whole photo minus the outline (even-odd). */}
          <path d={`M0 0H${image.width}V${image.height}H0Z M${outline.replace(/ /g, " L")}Z`} fillRule="evenodd" fill="black" fillOpacity="0.5" />
          <polygon points={outline} fill="none" stroke="black" strokeOpacity="0.5" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          <polygon points={outline} fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        {quad.map((p, i) => (
          <button
            key={names[i]}
            type="button"
            aria-label={t(`corners.${names[i]}`, { x: Math.round(p.x), y: Math.round(p.y) })}
            aria-describedby={hintId}
            onPointerDown={(e) => down(e, i)}
            onKeyDown={(e) => key(e, i)}
            className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-white bg-[var(--brand-solid)] shadow outline-none ring-brand ring-offset-2 focus-visible:ring-4"
            style={{ left: pct(p.x, image.width), top: pct(p.y, image.height) }}
          />
        ))}
      </div>
      <p id={hintId} className="text-center text-sm text-muted">
        {t("cornersHint")}
      </p>
    </div>
  );
}
