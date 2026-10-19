// WASM codecs (Squoosh via @jsquash). Each one is imported only when first
// needed, so a user converting to WEBP never downloads the AVIF encoder.
import type { FormatId } from "@/config/formats";
import { encodeBmp } from "./bmp";
import { fitSquare } from "./canvas";
import { encodeIco, icoSizes } from "./ico";
import { DEFAULT_QUALITY, type EncodeOptions } from "./options";
import { flattenAlpha, type RawImage } from "./pixels";

type Encoder = (image: RawImage, options: EncodeOptions) => Promise<ArrayBuffer>;
type Decoder = (buffer: ArrayBuffer) => Promise<RawImage>;

const toImageData = (image: RawImage) =>
  new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);

export const encoders: Partial<Record<FormatId, Encoder>> = {
  jpg: async (image, { quality = DEFAULT_QUALITY }) => {
    const { default: encode } = await import("@jsquash/jpeg/encode");
    return encode(toImageData(flattenAlpha(image)), { quality });
  },
  png: async (image) => {
    const { default: encode } = await import("@jsquash/png/encode");
    return encode(toImageData(image));
  },
  webp: async (image, { quality = DEFAULT_QUALITY }) => {
    const { default: encode } = await import("@jsquash/webp/encode");
    return encode(toImageData(image), { quality });
  },
  avif: async (image, { quality = DEFAULT_QUALITY }) => {
    const { default: encode } = await import("@jsquash/avif/encode");
    // AVIF quality runs lower than JPG for the same visual result.
    return encode(toImageData(image), { quality: Math.round(quality * 0.75), speed: 7 });
  },
  gif: async (image) => {
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    // 256-color palette; fully transparent pixels map to a transparent index.
    const palette = quantize(image.data, 256, { format: "rgba4444", oneBitAlpha: true });
    const index = applyPalette(image.data, palette, "rgba4444");
    const transparentIndex = palette.findIndex((c) => c[3] === 0);
    const gif = GIFEncoder();
    gif.writeFrame(index, image.width, image.height, {
      palette,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
    });
    gif.finish();
    return gif.bytes().slice().buffer;
  },
  bmp: async (image) => encodeBmp(image),
  tiff: async (image) => {
    const UTIF = await import("utif2");
    return UTIF.encodeImage(new Uint8Array(image.data), image.width, image.height);
  },
  ico: async (image) => {
    const { default: encodePng } = await import("@jsquash/png/encode");
    const side = Math.min(256, Math.max(image.width, image.height));
    const entries = [];
    for (const size of icoSizes(side)) {
      const square = await fitSquare(image, size);
      entries.push({ size, png: await encodePng(toImageData(square)) });
    }
    return encodeIco(entries);
  },
};

/** WASM decoders, used when the browser cannot decode a format natively. */
export const decoders: Partial<Record<FormatId, Decoder>> = {
  jpg: async (buffer) => (await import("@jsquash/jpeg/decode")).default(buffer),
  png: async (buffer) => (await import("@jsquash/png/decode")).default(buffer),
  webp: async (buffer) => (await import("@jsquash/webp/decode")).default(buffer),
  avif: async (buffer) => {
    const image = await (await import("@jsquash/avif/decode")).default(buffer);
    if (!image) throw new Error("AVIF decode failed");
    return image;
  },
  // Only Safari decodes TIFF natively.
  tiff: async (buffer) => {
    const UTIF = await import("utif2");
    const [ifd] = UTIF.decode(buffer);
    if (!ifd) throw new Error("Empty TIFF");
    UTIF.decodeImage(buffer, ifd);
    const width = Number(ifd.width);
    const height = Number(ifd.height);
    return { width, height, data: new Uint8ClampedArray(UTIF.toRGBA8(ifd)) };
  },
};
