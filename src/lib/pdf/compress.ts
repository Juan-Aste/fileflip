// PDF compression by re-encoding embedded photos: the usual reason a PDF is
// heavy is a few full-resolution camera images. Text and vectors are kept.
import { unzlibSync } from "fflate";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, type PDFObject } from "pdf-lib";

export type CompressionLevel = "low" | "recommended" | "strong";

export const compressionSettings: Record<CompressionLevel, { maxSide: number; quality: number }> = {
  low: { maxSide: 2400, quality: 80 },
  recommended: { maxSide: 1600, quality: 65 },
  strong: { maxSide: 1100, quality: 45 },
};

export type SourceImage =
  | { kind: "jpeg"; bytes: Uint8Array; gray: boolean }
  | { kind: "raw"; data: Uint8Array; width: number; height: number; gray: boolean };

/** Re-encodes an image as JPEG within `maxSide`; null to keep the original. */
export type Recompressor = (
  image: SourceImage,
  settings: { maxSide: number; quality: number },
) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>;

const name = (dict: PDFDict, key: string) => {
  const value = dict.get(PDFName.of(key));
  return value instanceof PDFName ? value.asString() : undefined;
};
const num = (dict: PDFDict, key: string) => {
  const value = dict.get(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : undefined;
};

/** Number of color components, or null for color spaces we don't touch (CMYK, Indexed, Lab...). */
function components(doc: PDFDocument, colorSpace: PDFObject | undefined): 1 | 3 | null {
  const cs = colorSpace ? doc.context.lookup(colorSpace) : undefined;
  if (cs instanceof PDFName) {
    if (cs.asString() === "/DeviceRGB") return 3;
    if (cs.asString() === "/DeviceGray") return 1;
    return null;
  }
  if (cs instanceof PDFArray && cs.size() === 2 && cs.lookup(0)?.toString() === "/ICCBased") {
    const profile = cs.lookup(1);
    const n = profile instanceof PDFRawStream ? num(profile.dict, "N") : undefined;
    return n === 3 ? 3 : n === 1 ? 1 : null;
  }
  return null;
}

/** Extracts an image we can safely re-encode, or null to leave it alone. */
export function sourceImage(doc: PDFDocument, stream: PDFRawStream): SourceImage | null {
  const dict = stream.dict;
  if (name(dict, "Subtype") !== "/Image") return null;
  if (dict.get(PDFName.of("ImageMask")) || dict.get(PDFName.of("Decode"))) return null;
  const comps = components(doc, dict.get(PDFName.of("ColorSpace")));
  if (!comps || num(dict, "BitsPerComponent") !== 8) return null;
  const width = num(dict, "Width");
  const height = num(dict, "Height");
  if (!width || !height) return null;

  let filter = dict.get(PDFName.of("Filter"));
  if (filter instanceof PDFArray && filter.size() === 1) filter = filter.get(0);
  const filterName = filter instanceof PDFName ? filter.asString() : undefined;

  if (filterName === "/DCTDecode") return { kind: "jpeg", bytes: stream.contents, gray: comps === 1 };
  // Flate without predictors: plain pixel rows.
  if (filterName === "/FlateDecode" && !dict.get(PDFName.of("DecodeParms"))) {
    const data = unzlibSync(stream.contents);
    if (data.length !== width * height * comps) return null;
    return { kind: "raw", data, width, height, gray: comps === 1 };
  }
  return null;
}

export interface CompressResult {
  bytes: Uint8Array;
  imagesRecompressed: number;
}

export async function compressPdf(
  input: Uint8Array,
  level: CompressionLevel,
  recompress: Recompressor,
  onProgress?: (progress: number) => void,
): Promise<CompressResult> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
  const settings = compressionSettings[level];
  const streams = doc.context
    .enumerateIndirectObjects()
    .filter(([, obj]) => obj instanceof PDFRawStream && name(obj.dict, "Subtype") === "/Image");

  let imagesRecompressed = 0;
  for (const [i, [ref, obj]] of streams.entries()) {
    const stream = obj as PDFRawStream;
    try {
      const source = sourceImage(doc, stream);
      const out = source && (await recompress(source, settings));
      // Only swap when it is clearly smaller.
      if (out && out.bytes.length < stream.contents.length * 0.9) {
        const dict = stream.dict.clone(doc.context);
        dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
        dict.set(PDFName.of("Width"), PDFNumber.of(out.width));
        dict.set(PDFName.of("Height"), PDFNumber.of(out.height));
        dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
        dict.delete(PDFName.of("DecodeParms"));
        if (source.gray) dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceGray"));
        doc.context.assign(ref, PDFRawStream.of(dict, out.bytes));
        imagesRecompressed++;
      }
    } catch (error) {
      // A broken or exotic image is left untouched; the rest still compresses.
      console.warn("Skipping image", ref.toString(), error);
    }
    onProgress?.((i + 1) / (streams.length || 1));
  }

  const bytes = await doc.save({ useObjectStreams: true });
  // Never hand back something bigger than what the user gave us.
  return bytes.length < input.length ? { bytes, imagesRecompressed } : { bytes: input, imagesRecompressed: 0 };
}
