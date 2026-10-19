import type { LibHeif } from "libheif-js/libheif-wasm/libheif-bundle.mjs";
import type { RawImage } from "./pixels";

let lib: LibHeif | null = null;

/**
 * Decodes the primary image of a HEIC/HEIF file (iPhone photos) with libheif
 * compiled to WASM. Rotation/mirroring stored in the file is applied.
 * The ~2 MB module is loaded on first use only.
 */
export async function decodeHeic(buffer: ArrayBuffer): Promise<RawImage> {
  if (!lib) {
    const { default: factory } = await import("libheif-js/libheif-wasm/libheif-bundle.mjs");
    lib = factory();
  }
  const images = new lib.HeifDecoder().decode(new Uint8Array(buffer));
  if (!images.length) throw new Error("No image in HEIC file");
  try {
    const [primary] = images;
    const width = primary.get_width();
    const height = primary.get_height();
    return await new Promise<RawImage>((resolve, reject) => {
      primary.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (result) => (result ? resolve(result) : reject(new Error("HEIC decode failed"))),
      );
    });
  } finally {
    images.forEach((image) => image.free());
  }
}
