// Text or logo drawn over an image (watermark, add text). Sizes are relative
// to the image, so the same spec gives the same look on the small editing
// preview (main thread) and on the full image (worker).

export type OverlayPosition = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export const overlayPositions: readonly OverlayPosition[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];

export type OverlayFont = "sans" | "serif" | "mono";

export interface TextOverlay {
  kind: "text";
  content: string;
  font: OverlayFont;
  bold: boolean;
  /** #rrggbb */
  color: string;
  /** A thin contrasting outline, readable on any background. */
  outline: boolean;
  /** A translucent box behind the text. */
  background: boolean;
}

export interface LogoOverlay {
  kind: "logo";
}

export interface OverlaySpec {
  item: TextOverlay | LogoOverlay;
  /** Text: letter height as % of the image's shorter side. Logo: width as % of the image width. */
  size: number;
  /** 0–1 */
  opacity: number;
  /** One place, or repeated diagonally over the whole image. */
  position: OverlayPosition | "tile";
}

export const MAX_OVERLAY_TEXT = 500;

export interface Placement {
  /** Center of the item. */
  x: number;
  y: number;
  /** Radians. */
  angle: number;
}

/** Tiles are tilted like a classic "SAMPLE" stamp. */
export const TILE_ANGLE = -Math.PI / 6;

/** Distance from the edges: 3 % of the shorter side. */
export const overlayMargin = (width: number, height: number) => Math.round(Math.min(width, height) * 0.03);

/** Where to draw an item of the given size (its centers). */
export function overlayPlacements(
  image: { width: number; height: number },
  item: { width: number; height: number },
  position: OverlaySpec["position"],
): Placement[] {
  if (position === "tile") {
    // A grid wider than the image, rotated as a whole: no gaps at the corners.
    // At least 5 % of the image apart, so tiny items can't make millions of tiles.
    const minStep = Math.min(image.width, image.height) * 0.05;
    const stepX = Math.max(item.width * 1.6, minStep);
    const stepY = Math.max(item.height * 3, minStep);
    const reach = Math.hypot(image.width, image.height) / 2 + Math.max(stepX, stepY);
    const cx = image.width / 2;
    const cy = image.height / 2;
    const cos = Math.cos(TILE_ANGLE);
    const sin = Math.sin(TILE_ANGLE);
    const out: Placement[] = [];
    for (let row = -Math.ceil(reach / stepY); row <= Math.ceil(reach / stepY); row++) {
      // Every other row is shifted half a step, like bricks.
      const shift = row % 2 === 0 ? 0 : stepX / 2;
      for (let col = -Math.ceil(reach / stepX); col <= Math.ceil(reach / stepX); col++) {
        const gx = col * stepX + shift;
        const gy = row * stepY;
        const x = cx + gx * cos - gy * sin;
        const y = cy + gx * sin + gy * cos;
        const pad = Math.max(item.width, item.height);
        if (x < -pad || y < -pad || x > image.width + pad || y > image.height + pad) continue;
        out.push({ x, y, angle: TILE_ANGLE });
      }
    }
    return out;
  }
  const margin = overlayMargin(image.width, image.height);
  const col = position[1] === "l" ? 0 : position[1] === "c" ? 1 : 2;
  const row = position[0] === "t" ? 0 : position[0] === "m" ? 1 : 2;
  const x = [margin + item.width / 2, image.width / 2, image.width - margin - item.width / 2][col]!;
  const y = [margin + item.height / 2, image.height / 2, image.height - margin - item.height / 2][row]!;
  return [{ x, y, angle: 0 }];
}

const families: Record<OverlayFont, string> = {
  sans: "system-ui, Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
};

/** Perceived lightness of a #rrggbb color, 0–1. */
function lightness(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws the overlay on a context that already holds the image. `logo` is
 * required for logo overlays.
 */
export function drawOverlay(ctx: Context, width: number, height: number, spec: OverlaySpec, logo?: CanvasImageSource & { width: number; height: number }) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, spec.opacity));
  if (spec.item.kind === "logo") {
    if (!logo) throw new Error("Missing logo");
    const w = Math.max(1, (width * spec.size) / 100);
    const h = (w * logo.height) / logo.width;
    for (const p of overlayPlacements({ width, height }, { width: w, height: h }, spec.position)) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.drawImage(logo, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
    return;
  }
  const text = spec.item;
  const lines = text.content.slice(0, MAX_OVERLAY_TEXT).split(/\r?\n/);
  const fontSize = Math.max(4, (Math.min(width, height) * spec.size) / 100);
  ctx.font = `${text.bold ? "700" : "400"} ${fontSize}px ${families[text.font]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = fontSize * 1.25;
  const pad = text.background ? fontSize * 0.4 : 0;
  const blockWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const blockHeight = lines.length * lineHeight + pad * 2;
  const dark = lightness(text.color) < 0.5;
  for (const p of overlayPlacements({ width, height }, { width: blockWidth, height: blockHeight }, spec.position)) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (text.background) {
      ctx.fillStyle = dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
      ctx.fillRect(-blockWidth / 2, -blockHeight / 2, blockWidth, blockHeight);
    }
    lines.forEach((line, i) => {
      const y = -blockHeight / 2 + pad + lineHeight * (i + 0.5);
      if (text.outline) {
        ctx.lineWidth = Math.max(1, fontSize / 10);
        ctx.lineJoin = "round";
        ctx.strokeStyle = dark ? "#ffffff" : "#000000";
        ctx.strokeText(line, 0, y);
      }
      ctx.fillStyle = text.color;
      ctx.fillText(line, 0, y);
    });
  }
  ctx.restore();
}
