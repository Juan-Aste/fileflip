"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Before/after comparison: both pictures in the same box, "before" clipped
 * from the right as the slider moves. The slider is a native range input
 * (keyboard, touch and screen readers) under the picture; the picture itself
 * can also be dragged or tapped to move the split. `pixelated` shows an
 * enlarged "before" with its real pixels (AI upscaling) instead of smoothed.
 */
export default function BeforeAfter({ before, after, alt, pixelated = false }: { before: string; after: string; alt: string; pixelated?: boolean }) {
  const t = useTranslations("ToolUi");
  const [split, setSplit] = useState(50);

  function fromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width > 0) setSplit(Math.round(Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100))));
  }

  return (
    <figure className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <div
        className="relative w-full touch-pan-y select-none overflow-hidden rounded-lg border border-border bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons > 0 && fromPointer(e)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs */}
        <img src={after} alt={alt} draggable={false} className="block max-h-96 w-full object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs */}
        <img
          src={before}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${pixelated ? "[image-rendering:pixelated]" : ""}`}
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" style={{ left: `${split}%` }} />
        <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 rounded bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
          {t("before")}
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 rounded bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
          {t("after")}
        </span>
      </div>
      <label className="flex items-center gap-3 text-sm text-muted">
        <span className="shrink-0">{t("before")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          aria-label={t("compare")}
          aria-valuetext={t("compareValue", { before: split, after: 100 - split })}
          className="h-11 w-full cursor-pointer accent-[var(--brand-solid)]"
        />
        <span className="shrink-0">{t("after")}</span>
      </label>
    </figure>
  );
}
