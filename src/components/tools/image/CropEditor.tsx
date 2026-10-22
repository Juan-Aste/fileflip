"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { moveRect, resizeCorner, setField, type Corner, type Rect, type Size } from "@/lib/image/crop-rect";

interface Props {
  /** Preview URL (may be smaller than the image: coordinates are in image pixels). */
  src: string;
  image: Size;
  rect: Rect;
  ratio: number | null;
  onChange: (rect: Rect) => void;
  /** Drawn inside the box instead of the rule-of-thirds grid (e.g. a face outline). */
  guide?: ReactNode;
}

const corners: Corner[] = ["nw", "ne", "sw", "se"];
const cornerClass: Record<Corner, string> = {
  nw: "-left-2 -top-2 cursor-nwse-resize",
  ne: "-right-2 -top-2 cursor-nesw-resize",
  sw: "-left-2 -bottom-2 cursor-nesw-resize",
  se: "-right-2 -bottom-2 cursor-nwse-resize",
};

/**
 * Crop rectangle over the preview: drag it to move, drag a corner to resize.
 * From the keyboard, arrows move it and Shift + arrows resize it; the number
 * fields below set exact pixels.
 */
export default function CropEditor({ src, image, rect, ratio, onChange, guide }: Props) {
  const t = useTranslations("ImageTools");
  const hintId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "move" | Corner; x: number; y: number; start: Rect } | null>(null);

  /** Image pixels per screen pixel. */
  const scale = () => image.width / (frame.current?.getBoundingClientRect().width || image.width);

  function down(event: PointerEvent, kind: "move" | Corner) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { kind, x: event.clientX, y: event.clientY, start: rect };
  }

  function move(event: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const s = scale();
    const dx = (event.clientX - d.x) * s;
    const dy = (event.clientY - d.y) * s;
    onChange(d.kind === "move" ? moveRect(d.start, dx, dy, image) : resizeCorner(d.start, d.kind, dx, dy, ratio, image));
  }

  function key(event: KeyboardEvent) {
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const dir = arrows[event.key];
    if (!dir) return;
    event.preventDefault();
    // 1 % of the image per press, at least one pixel.
    const step = Math.max(1, Math.round(Math.max(image.width, image.height) / 100));
    const [dx, dy] = [dir[0] * step, dir[1] * step];
    onChange(event.shiftKey ? resizeCorner(rect, "se", dx, dy, ratio, image) : moveRect(rect, dx, dy, image));
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frame}
        className="relative mx-auto w-fit max-w-full touch-none select-none"
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimizable asset */}
        <img src={src} alt="" draggable={false} className="block max-h-[60vh] w-auto max-w-full rounded-sm" />
        {/* Shade outside the box (four strips, so the corner handles are never clipped). */}
        {[
          { left: 0, top: 0, width: "100%", height: pct(rect.y, image.height) },
          { left: 0, top: pct(rect.y + rect.height, image.height), width: "100%", bottom: 0 },
          { left: 0, top: pct(rect.y, image.height), width: pct(rect.x, image.width), height: pct(rect.height, image.height) },
          { left: pct(rect.x + rect.width, image.width), right: 0, top: pct(rect.y, image.height), height: pct(rect.height, image.height) },
        ].map((style, i) => (
          <div key={i} aria-hidden="true" className="pointer-events-none absolute bg-black/55" style={style} />
        ))}
        <div
          role="group"
          tabIndex={0}
          aria-label={t("cropArea", { width: rect.width, height: rect.height, x: rect.x, y: rect.y })}
          aria-describedby={hintId}
          onKeyDown={key}
          onPointerDown={(e) => down(e, "move")}
          className="absolute cursor-move border-2 border-white outline-none ring-brand ring-offset-2 ring-offset-surface focus-visible:ring-4"
          style={{
            left: pct(rect.x, image.width),
            top: pct(rect.y, image.height),
            width: pct(rect.width, image.width),
            height: pct(rect.height, image.height),
          }}
        >
          {guide ?? (
            // Rule-of-thirds guides.
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="border border-white/25" />
              ))}
            </div>
          )}
          {corners.map((c) => (
            <div
              key={c}
              aria-hidden="true"
              onPointerDown={(e) => down(e, c)}
              className={`absolute h-4 w-4 rounded-sm border-2 border-brand bg-white ${cornerClass[c]}`}
            />
          ))}
        </div>
      </div>
      <p id={hintId} className="text-center text-sm text-muted">
        {t("cropKeyboardHint")}
      </p>
      <div className="flex flex-wrap gap-3">
        {(["x", "y", "width", "height"] as const).map((f) => (
          <NumberBox
            key={f}
            label={t(`crop.${f}`)}
            value={rect[f]}
            onCommit={(v) => onChange(setField(rect, f, v, ratio, image))}
          />
        ))}
      </div>
    </div>
  );
}

/** Integer field applied on blur or Enter, so typing "120" doesn't stop at "1". */
function NumberBox({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = () => {
    if (draft !== null && draft.trim() !== "") onCommit(Number(draft.replace(",", ".")));
    setDraft(null);
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className={`h-10 w-24 tabular-nums ${field}`}
      />
    </div>
  );
}
