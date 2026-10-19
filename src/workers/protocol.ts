import type { FormatId } from "@/config/formats";
import type { ImageOptions } from "@/lib/image/options";

export interface ImageJob {
  id: number;
  buffer: ArrayBuffer;
  from: FormatId;
  to: FormatId;
  options: ImageOptions;
}

export type ImageWorkerMessage =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "done"; buffer: ArrayBuffer; width: number; height: number }
  | { id: number; type: "error"; message: string };
