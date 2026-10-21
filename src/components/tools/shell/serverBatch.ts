import type { FormatId } from "@/config/formats";
import type { ToolId } from "@/config/tools";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { convertOnServer } from "@/lib/server-client";
import { reportConversion } from "@/lib/stats-client";
import type { ShellContext } from "./ToolShell";
import type { ShellOutput } from "./state";

interface ServerBatch {
  tool: ToolId;
  endpoint: string;
  from: FormatId;
  to: FormatId;
  options: Record<string, unknown>;
  outputName: (inputName: string) => string;
}

/**
 * Uploads each input to a conversion endpoint, one at a time, with progress
 * and cancellation. The server logs each conversion; the browser only reports
 * failures the server never saw (rejected uploads, network errors).
 */
export async function runServerBatch(
  inputs: readonly File[],
  { signal, onProgress }: ShellContext,
  { tool, endpoint, from, to, options, outputName }: ServerBatch,
): Promise<ShellOutput[]> {
  const results = await runBatch(
    inputs,
    async (file, job) => {
      try {
        return await convertOnServer(endpoint, file, to, options, job.onProgress, job.signal);
      } catch (error) {
        if (!(error instanceof ConversionError && (error.loggedByServer || error.code === "jobCancelled"))) {
          reportConversion({ from, to, size: file.size, success: false, tool, engine: "server", errorCode: errorCode(error) });
        }
        throw error;
      }
    },
    { signal, onProgress },
  );
  return results.map((result, i): ShellOutput => {
    const name = outputName(inputs[i].name);
    return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
  });
}
