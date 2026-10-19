/// <reference lib="webworker" />
import { mergePdfs } from "@/lib/pdf/ops";
import { exposeHandlers } from "@/lib/worker-rpc";

exposeHandlers({
  merge: async (files: Uint8Array[], onProgress) => {
    const result = await mergePdfs(files, onProgress);
    return { result, transfer: [result.buffer] };
  },
});
