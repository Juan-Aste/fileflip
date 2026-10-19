// WASM codecs (Squoosh via @jsquash). Each one is imported only when first
// needed, so a user converting to WEBP never downloads the AVIF encoder.
import type { FormatId } from "@/config/formats";
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
};
