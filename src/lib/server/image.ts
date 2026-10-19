import "server-only";
import sharp, { type Sharp } from "sharp";
import type { FormatId } from "@/config/formats";
import { canConvertImageOnServer } from "@/config/server-capabilities";
import { encodeBmp } from "@/lib/image/bmp";
import { computeSize, type Resize } from "@/lib/image/dimensions";
import { encodeIco, icoSizes } from "@/lib/image/ico";
import { DEFAULT_QUALITY, type ImageOptions } from "@/lib/image/options";

export { canConvertImageOnServer } from "@/config/server-capabilities";

const MAX_INPUT_PIXELS = 100_000_000;

async function targetSize(input: Sharp, resize: Resize | undefined, vector: boolean) {
  const meta = await input.metadata();
  if (!meta.width || !meta.height) throw new Error("Unreadable image");
  return computeSize({ width: meta.width, height: meta.height }, resize ?? { mode: "none" }, { upscale: vector });
}

/** Converts an image in memory with libvips (sharp). Nothing touches disk. */
export async function convertImageOnServer(
  buffer: Buffer,
  from: FormatId,
  to: FormatId,
  { quality = DEFAULT_QUALITY, resize }: ImageOptions = {},
): Promise<Buffer> {
  if (!canConvertImageOnServer(from, to)) throw new Error(`Unsupported ${from} → ${to}`);
  const open = () => sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, density: from === "svg" ? 144 : undefined });
  const size = await targetSize(open(), resize, from === "svg");
  // .rotate() applies the EXIF orientation, as browsers do when decoding.
  // "cover" crops the center to the exact size; otherwise the ratio is already kept.
  const fit = resize?.mode === "cover" ? "cover" : "fill";
  const image = open().rotate().resize(size.width, size.height, { fit });

  switch (to) {
    case "jpg":
      return image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer();
    case "png":
      return image.png({ compressionLevel: 9 }).toBuffer();
    case "webp":
      return image.webp({ quality }).toBuffer();
    case "avif":
      return image.avif({ quality: Math.round(quality * 0.75) }).toBuffer();
    case "gif":
      return image.gif().toBuffer();
    case "tiff":
      return image.tiff({ compression: "lzw" }).toBuffer();
    case "bmp": {
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return Buffer.from(encodeBmp({ data: new Uint8ClampedArray(data), width: info.width, height: info.height }));
    }
    case "ico": {
      const side = Math.min(256, Math.max(size.width, size.height));
      const pngBuffer = await image.png().toBuffer();
      const entries = await Promise.all(
        icoSizes(side).map(async (s) => {
          const png = await sharp(pngBuffer)
            .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          return { size: s, png: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer };
        }),
      );
      return Buffer.from(encodeIco(entries));
    }
    default:
      throw new Error(`Unsupported output ${to}`);
  }
}
