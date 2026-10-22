/// <reference lib="webworker" />
import { convertModel } from "@/lib/model3d/convert";
import type { ModelInput, ModelTarget } from "@/lib/model3d/options";
import { exposeHandlers } from "@/lib/worker-rpc";

// 3D models: parsing and writing big meshes stays off the main thread, and three.js loads only here.
async function convert({ input, from, to }: { input: Blob; from: ModelInput; to: ModelTarget }, onProgress: (progress: number) => void) {
  const result = await convertModel(new Uint8Array(await input.arrayBuffer()), from, to, onProgress);
  return { result, transfer: [result.data.buffer] };
}

exposeHandlers({ convert });
