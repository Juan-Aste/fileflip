/// <reference lib="webworker" />
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import { encoders } from "@/lib/image/codecs";
import { decodeImage } from "@/lib/image/decode";
import { detectFakeTransparency, removeFakeTransparency } from "@/lib/image/fake-transparency";
import { FAKE_BG_MAX_PIXELS, FAKE_BG_QUALITY, type FakeBgOutput } from "@/lib/image/fake-bg-shared";
import { isDamagedImage } from "@/lib/image/integrity";
import type { RawImage } from "@/lib/image/pixels";
import { exposeHandlers } from "@/lib/worker-rpc";

// "Fake transparency" (a checkerboard drawn into the pixels) off the main
// thread: detect it when a picture is added, and turn it into real alpha on
// demand. Started on first use (src/lib/image/fake-bg-client.ts).

async function decode(input: Blob, from: FormatId): Promise<RawImage> {
  const buffer = await input.arrayBuffer();
  if (isDamagedImage(new Uint8Array(buffer), from)) throw new ConversionError("fileDamaged");
  let image: RawImage;
  try {
    image = await decodeImage(buffer, from);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  if (image.width * image.height > FAKE_BG_MAX_PIXELS) throw new ConversionError("imageTooLarge");
  return image;
}

export interface DetectResult {
  found: boolean;
  /** Cell size of the checkerboard, in pixels. */
  cell?: number;
}

async function detect({ input, from }: { input: Blob; from: FormatId }) {
  const found = detectFakeTransparency(await decode(input, from));
  const result: DetectResult = found ? { found: true, cell: found.checker.cell } : { found: false };
  return { result };
}

export interface RemoveResult {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

async function remove({ input, from, to }: { input: Blob; from: FormatId; to: FakeBgOutput }, onProgress: (p: number) => void) {
  const image = await decode(input, from);
  onProgress(0.3);
  const found = detectFakeTransparency(image);
  if (!found) throw new ConversionError("invalidRequest");
  const out = removeFakeTransparency(image, found);
  onProgress(0.6);
  const buffer = await encoders[to]!(out, { quality: FAKE_BG_QUALITY });
  onProgress(1);
  const result: RemoveResult = { buffer, width: out.width, height: out.height };
  return { result, transfer: [buffer] };
}

exposeHandlers({ detect, remove });
