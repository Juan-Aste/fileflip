// What the user marked on a photo (in original pixels), and the same marks
// at the scale of the reduced copy GrabCut works on.
import type { Rect, Stroke } from "./grabcut";
import type { PaintStroke } from "./paint";

/** GrabCut's inputs (rectangle and keep/remove marks) and the erase/restore strokes painted over its cut. */
export type Edit = { rect: Rect; strokes: readonly Stroke[]; paint: readonly PaintStroke[] };

/** The first rectangle: the photo minus a 5 % margin, so there is a result at once. */
export function initialRect({ width, height }: { width: number; height: number }): Rect {
  const mx = Math.round(width * 0.05);
  const my = Math.round(height * 0.05);
  return { x: mx, y: my, width: Math.max(1, width - 2 * mx), height: Math.max(1, height - 2 * my) };
}

export function scaleEdit({ rect, strokes }: Pick<Edit, "rect" | "strokes">, s: number): { rect: Rect; strokes: Stroke[] } {
  return {
    rect: { x: rect.x * s, y: rect.y * s, width: rect.width * s, height: rect.height * s },
    strokes: strokes.map((k) => ({ kind: k.kind, radius: k.radius * s, points: k.points.map(([x, y]) => [x * s, y * s] as [number, number]) })),
  };
}
