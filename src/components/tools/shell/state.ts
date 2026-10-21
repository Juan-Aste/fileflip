// State of the generic tool UI (ToolShell), kept pure so it can be tested
// without a DOM: input checks, the run lifecycle and the result summary.

import type { ApiErrorCode } from "@/lib/api-errors";

export interface ShellInputLimits {
  /** Lower-case extensions without the dot, e.g. ["json", "csv"]. Empty = any. */
  extensions: readonly string[];
  maxFiles: number;
  maxFileBytes: number;
}

export type RejectReason = "unsupportedFormat" | "fileTooLarge" | "tooManyFiles";

export interface InputCheck<F extends { name: string; size: number }> {
  accepted: F[];
  rejected: { file: F; reason: RejectReason }[];
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * Splits picked files into accepted and rejected (wrong extension, too
 * large, or beyond the batch size counting the ones already chosen). The
 * extension is only a first filter: processors still check the content.
 */
export function checkInputs<F extends { name: string; size: number }>(
  files: readonly F[],
  limits: ShellInputLimits,
  alreadyChosen = 0,
): InputCheck<F> {
  const result: InputCheck<F> = { accepted: [], rejected: [] };
  for (const file of files) {
    if (limits.extensions.length > 0 && !limits.extensions.includes(extensionOf(file.name))) {
      result.rejected.push({ file, reason: "unsupportedFormat" });
    } else if (file.size > limits.maxFileBytes) {
      result.rejected.push({ file, reason: "fileTooLarge" });
    } else if (alreadyChosen + result.accepted.length >= limits.maxFiles) {
      result.rejected.push({ file, reason: "tooManyFiles" });
    } else {
      result.accepted.push(file);
    }
  }
  return result;
}

/** Where a text input is wrong (1-based), for syntax errors. */
export interface ErrorPosition {
  line: number;
  column: number;
}

/** One output of a run: a file to download, or the error of one input. */
export type ShellOutput =
  | {
      kind: "file";
      name: string;
      blob: Blob;
      /** Text outputs shown in the page (with a copy button) besides the download. */
      preview?: string;
      /** A verdict shown with the result, e.g. whether a checksum matches. */
      message?: { ok: boolean; text: string };
    }
  | { kind: "error"; name: string; code: ApiErrorCode; position?: ErrorPosition };

export type ShellState =
  | { status: "idle" }
  | { status: "processing"; progress: number }
  | { status: "done"; outputs: ShellOutput[] }
  | { status: "error"; code: ApiErrorCode; position?: ErrorPosition };

export type ShellAction =
  | { type: "start" }
  | { type: "progress"; progress: number }
  | { type: "finish"; outputs: ShellOutput[] }
  | { type: "fail"; code: ApiErrorCode }
  | { type: "reset" };

export const initialShellState: ShellState = { status: "idle" };

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case "start":
      return state.status === "processing" ? state : { status: "processing", progress: 0 };
    case "progress":
      // Late progress events after the run ended are ignored; progress never goes back.
      if (state.status !== "processing") return state;
      return { status: "processing", progress: Math.max(state.progress, Math.min(1, Math.max(0, action.progress))) };
    case "finish":
      if (state.status !== "processing") return state;
      // A run where every input failed with the same error reads better as one message.
      if (action.outputs.length > 0 && action.outputs.every((o) => o.kind === "error")) {
        const codes = new Set(action.outputs.map((o) => (o.kind === "error" ? o.code : null)));
        const only = action.outputs.length === 1 ? action.outputs[0] : undefined;
        const position = only?.kind === "error" ? only.position : undefined;
        if (codes.size === 1) return { status: "error", code: [...codes][0]!, ...(position ? { position } : {}) };
      }
      if (action.outputs.length === 0) return { status: "error", code: "conversionFailed" };
      return { status: "done", outputs: action.outputs };
    case "fail":
      return state.status === "processing" ? { status: "error", code: action.code } : state;
    case "reset":
      return initialShellState;
  }
}

export function outputFiles(state: ShellState): { name: string; blob: Blob }[] {
  if (state.status !== "done") return [];
  return state.outputs.flatMap((o) => (o.kind === "file" ? [{ name: o.name, blob: o.blob }] : []));
}

/** Replaces the extension, or adds one: "data.json" + "csv" → "data.csv". */
export function renameExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name || "file"}.${extension}`;
}
