/** Minimal ImageData shape, so pixel helpers also run outside the browser. */
export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Composites transparent pixels over a solid color (for formats without alpha, like JPG). */
export function flattenAlpha(
  image: RawImage,
  background: [number, number, number] = [255, 255, 255],
): RawImage {
  const out = new Uint8ClampedArray(image.data.length);
  const [br, bg, bb] = background;
  for (let i = 0; i < image.data.length; i += 4) {
    const a = image.data[i + 3] / 255;
    out[i] = image.data[i] * a + br * (1 - a);
    out[i + 1] = image.data[i + 1] * a + bg * (1 - a);
    out[i + 2] = image.data[i + 2] * a + bb * (1 - a);
    out[i + 3] = 255;
  }
  return { data: out, width: image.width, height: image.height };
}

export function hasTransparency(image: RawImage): boolean {
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] < 255) return true;
  }
  return false;
}
