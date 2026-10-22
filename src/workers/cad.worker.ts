/// <reference lib="webworker" />
import { convertDxf, type DxfRequest } from "@/lib/cad/convert";
import { exposeHandlers } from "@/lib/worker-rpc";

// CAD drawings: parsing and flattening big DXF files stays off the main thread, and dxf-parser loads only here.
async function convert({ input, request }: { input: Blob; request: DxfRequest }) {
  const result = convertDxf(new Uint8Array(await input.arrayBuffer()), request);
  return { result, transfer: [result.data.buffer] };
}

exposeHandlers({ convert });
