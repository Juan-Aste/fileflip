"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { buttonSecondary } from "@/components/ui/styles";

interface Props {
  color: string;
  /** Called with true once something is drawn, false when cleared. */
  onChange: (hasInk: boolean) => void;
  /** Receives the canvas so the parent can export it. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const WIDTH = 900;
const HEIGHT = 300;

/** A pad to draw a signature with a mouse, finger or pen (pointer events). */
export default function SignaturePad({ color, onChange, canvasRef }: Props) {
  const t = useTranslations("SignPdf");
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
  }, [canvasRef]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-label={t("padLabel")}
        role="img"
        className="aspect-[3/1] w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-border-strong bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = point(e);
          const ctx = e.currentTarget.getContext("2d")!;
          ctx.fillStyle = colorRef.current;
          ctx.beginPath();
          ctx.arc(drawing.current.x, drawing.current.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          onChange(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const next = point(e);
          ctx.strokeStyle = colorRef.current;
          ctx.beginPath();
          ctx.moveTo(drawing.current.x, drawing.current.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          drawing.current = next;
        }}
        onPointerUp={() => (drawing.current = null)}
        onPointerCancel={() => (drawing.current = null)}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{t("padHint")}</span>
        <button
          type="button"
          className={buttonSecondary}
          onClick={() => {
            const canvas = canvasRef.current;
            canvas?.getContext("2d")!.clearRect(0, 0, WIDTH, HEIGHT);
            onChange(false);
          }}
        >
          {t("clear")}
        </button>
      </div>
    </div>
  );
}
