import type { FormatId } from "@/config/formats";
import { formats } from "@/config/formats";
import type { ToolId } from "@/config/tools";
import { TextPositionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import type { JobOptions } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import type { ShellContext } from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

interface TextToolRun {
  tool: ToolId;
  /** Input format of a picked file (by name) or of pasted text. */
  from: (file: File | null) => FormatId;
  to: FormatId;
  /** Name of the output for pasted text. */
  pastedName: string;
  /** Output name from the input's; by default the extension changes to the output format's. */
  outputName?: (inputName: string) => string;
  convert: (input: Blob | string, job: JobOptions) => Promise<string>;
}

/**
 * Runs a text-to-text data tool over the picked files (or the pasted text):
 * one output per input, each with its own error, a preview of the text and
 * its use reported to the stats.
 */
export async function runTextTool(
  { files, text }: { files: File[]; text: string },
  { signal, onProgress }: ShellContext,
  { tool, from, to, pastedName, outputName, convert }: TextToolRun,
): Promise<ShellOutput[]> {
  const inputs: (File | null)[] = files.length > 0 ? files : [null];
  const extension = formats[to].extensions[0]!;
  const results = await runBatch(
    inputs,
    (file, job) => {
      const source = file ?? new Blob([text], { type: "text/plain" });
      return trackTool(
        tool,
        { from: from(file), to, files: [source] },
        () => convert(file ?? text, { signal: job.signal, onProgress: job.onProgress }),
        (out) => out.length,
      );
    },
    { signal, onProgress },
  );
  return results.map((result, i): ShellOutput => {
    const inputName = inputs[i]?.name ?? pastedName;
    const name = outputName ? outputName(inputName) : renameExtension(inputName, extension);
    if (result.status === "error") {
      const position = result.error instanceof TextPositionError ? result.error.position : undefined;
      return { kind: "error", name, code: result.code, ...(position ? { position } : {}) };
    }
    return {
      kind: "file",
      name,
      blob: new Blob([result.value], { type: `${formats[to].mime};charset=utf-8` }),
      preview: result.value.replace(/^﻿/, ""),
    };
  });
}
