"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CheckCircle2, Copy, Download, FileText, RotateCcw, X, XCircle } from "lucide-react";
import AdSlot from "@/components/ads/AdSlot";
import Dropzone from "@/components/converter/Dropzone";
import { useSessionInfo } from "@/components/session/SessionInfo";
import { buttonPrimary, buttonSecondary, card, field } from "@/components/ui/styles";
import type { Engine } from "@/config/formats";
import { limits } from "@/config/limits";
import type { Locale } from "@/i18n/routing";
import type { ApiErrorCode } from "@/lib/api-errors";
import { errorCode } from "@/lib/convert-error";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { createUrlRegistry } from "@/lib/jobs";
import { zipBlobs } from "@/lib/zip";
import PrimaryButton from "../PrimaryButton";
import ProgressBar from "../ProgressBar";
import ToolAlert from "../ToolAlert";
import {
  checkInputs,
  initialShellState,
  outputFiles,
  shellReducer,
  type ErrorPosition,
  type RejectReason,
  type ShellOutput,
} from "./state";

export type ShellInput =
  | {
      kind: "files";
      /** Lower-case extensions without the dot; the processor still checks the content. */
      extensions: readonly string[];
      multiple: boolean;
      /** Lower than the plan's limits when the tool needs it (memory, pages...). */
      maxFiles?: number;
      maxFileBytes?: number;
      /** Also lets the user paste the content instead of picking a file. */
      paste?: { label: string; placeholder?: string };
      /** False while the tool is still preparing the picked files (e.g. a preview) or its options are invalid. */
      ready?: boolean;
    }
  | { kind: "text"; label: string; placeholder?: string; maxLength?: number }
  /** Generators: only options, nothing to pick or paste; `ready` is false while required options are empty. */
  | { kind: "none"; ready?: boolean };

export interface ShellContext {
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

interface Props {
  input: ShellInput;
  actionLabel: string;
  /** Tool options shown above the action button. */
  options?: ReactNode;
  process: (input: { files: File[]; text: string }, context: ShellContext) => Promise<ShellOutput[]>;
  /** Name of the ZIP offered when there are several outputs. */
  zipName?: string;
  /** Called with the picked files whenever they change (tools that edit a file before running). */
  onFilesChange?: (files: File[]) => void;
  /** Tools that upload to our server get the plan's server limits. */
  engine?: Engine;
}

interface Picked {
  id: number;
  file: File;
}

let nextId = 0;

/** Pasted text up to this length; bigger content goes through a file. */
const MAX_PASTE_CHARS = 5_000_000;
/** The in-page preview of a text output stops here (the download has everything). */
const PREVIEW_CHARS = 100_000;

/**
 * Generic tool UI: file or text input, options, run with progress and
 * cancel, then the outputs with individual downloads or one ZIP. Limits shown
 * to the user are the ones enforced (plan limits, or the tool's own).
 */
export default function ToolShell({ input, actionLabel, options, process, zipName = "fileflect.zip", onFilesChange, engine = "browser" }: Props) {
  const t = useTranslations("ToolUi");
  const tc = useTranslations("Common");
  const tconv = useTranslations("Converter");
  const te = useTranslations("ApiErrors");
  const locale = useLocale() as Locale;
  const { plan } = useSessionInfo();
  const [state, dispatch] = useReducer(shellReducer, initialShellState);
  const [files, setFiles] = useState<Picked[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: RejectReason }[]>([]);
  const [text, setText] = useState("");
  const controller = useRef<AbortController | null>(null);
  const [urls] = useState(() => createUrlRegistry());

  const errorText = (code: ApiErrorCode, position?: ErrorPosition) =>
    position ? `${te(code)} ${t("errorAt", { line: position.line, column: position.column })}` : te(code);

  const planLimits = limits[plan];
  const planBatch = engine === "server" ? planLimits.serverMaxBatch : planLimits.browserMaxBatch;
  const planFileBytes = engine === "server" ? planLimits.serverMaxFileBytes : planLimits.browserMaxFileBytes;
  const maxFiles = input.kind === "files" ? (input.multiple ? Math.min(input.maxFiles ?? Infinity, planBatch) : 1) : 0;
  const maxFileBytes = input.kind === "files" ? Math.min(input.maxFileBytes ?? Infinity, planFileBytes) : 0;

  const filesListener = useRef(onFilesChange);
  useEffect(() => {
    filesListener.current = onFilesChange;
  });
  useEffect(() => filesListener.current?.(files.map((f) => f.file)), [files]);

  // Leaving the page stops the work and frees the result URLs.
  useEffect(() => () => {
    controller.current?.abort();
    urls.revokeAll();
  }, [urls]);

  // One object URL per output, created once when the run ends.
  const links = useMemo(
    () => (state.status === "done" ? state.outputs.map((o) => (o.kind === "file" ? urls.create(o.blob) : "")) : []),
    [state, urls],
  );

  function pick(picked: File[]) {
    if (input.kind !== "files") return;
    const already = input.multiple ? files.length : 0;
    const check = checkInputs(picked, { extensions: input.extensions, maxFiles, maxFileBytes }, already);
    const added = check.accepted.map((file) => ({ id: nextId++, file }));
    setFiles((prev) => (input.multiple ? [...prev, ...added] : added.length ? added : prev));
    setRejected(check.rejected.map((r) => ({ name: r.file.name, reason: r.reason })));
  }

  async function run() {
    const abort = new AbortController();
    controller.current = abort;
    dispatch({ type: "start" });
    try {
      const outputs = await process(
        // A picked file wins over pasted text (the paste box hides once a file is chosen).
        { files: files.map((f) => f.file), text: files.length > 0 ? "" : text },
        { signal: abort.signal, onProgress: (progress) => dispatch({ type: "progress", progress }) },
      );
      if (abort.signal.aborted) return;
      dispatch({ type: "finish", outputs });
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error(error);
      dispatch({ type: "fail", code: errorCode(error) });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "fail", code: "jobCancelled" });
  }

  function reset() {
    urls.revokeAll();
    setFiles([]);
    setRejected([]);
    setText("");
    dispatch({ type: "reset" });
  }

  if (state.status === "done") {
    const downloads = outputFiles(state);
    return (
      <>
        <div className={`${card} flex animate-rise flex-col gap-4 p-4 sm:p-6`}>
          <p role="status" className="flex items-center gap-2 font-display text-xl font-bold">
            <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-success" />
            {t("result")}
          </p>
          <ul className="flex flex-col gap-2">
            {state.outputs.map((output, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm ${
                  output.kind === "error" ? "border-danger/30 bg-danger-soft/60" : "border-border"
                }`}
              >
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate font-medium">{output.name}</span>
                {output.kind === "file" ? (
                  <>
                    <span className="shrink-0 text-muted tabular-nums">{formatBytes(output.blob.size, locale)}</span>
                    <a
                      href={links[i]}
                      download={output.name}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-semibold text-brand hover:bg-brand-soft"
                    >
                      <Download aria-hidden="true" className="h-4 w-4" />
                      {tc("download")}
                      <span className="sr-only">{output.name}</span>
                    </a>
                  </>
                ) : (
                  <span className="shrink-0 text-danger">{errorText(output.code, output.position)}</span>
                )}
              </li>
            ))}
          </ul>
          {state.outputs.map((output, i) =>
            output.kind === "file" && output.message ? (
              <p
                key={i}
                className={`flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${
                  output.message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}
              >
                {output.message.ok ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                {output.message.text}
              </p>
            ) : null,
          )}
          {state.outputs.length === 1 && state.outputs[0]!.kind === "file" && state.outputs[0]!.blob.type.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimizable asset
            <img
              src={links[0]}
              alt={state.outputs[0]!.name}
              className="mx-auto max-h-72 w-auto max-w-full rounded-lg border border-border bg-white object-contain"
            />
          )}
          {state.outputs.length === 1 && state.outputs[0]!.kind === "file" && state.outputs[0]!.preview !== undefined && (
            <TextPreview text={state.outputs[0]!.preview} />
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {downloads.length > 1 && (
              <button
                type="button"
                className={`${buttonPrimary} w-full sm:w-auto`}
                onClick={async () => saveBlob(await zipBlobs(downloads), zipName)}
              >
                <Download aria-hidden="true" className="h-5 w-5" />
                {tconv("downloadAll", { count: downloads.length })}
              </button>
            )}
            <button type="button" onClick={reset} className={`${buttonSecondary} w-full sm:w-auto`}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {t("startOver")}
            </button>
          </div>
        </div>
        <AdSlot placement="result" className="mt-8" />
      </>
    );
  }

  const processing = state.status === "processing";
  const hasText = text.trim().length > 0;
  const hasInput =
    input.kind === "files"
      ? input.ready !== false && (files.length > 0 || (!!input.paste && hasText))
      : input.kind === "text" ? hasText : input.ready !== false;

  return (
    <div className="flex flex-col gap-4">
      {input.kind === "files" ? (
        <>
          <Dropzone
            onFiles={pick}
            compact={files.length > 0}
            accept={input.extensions.map((e) => `.${e}`).join(",") || undefined}
            multiple={input.multiple}
          />
          <p className="text-sm text-muted">
            {input.multiple
              ? t("limitsMultiple", { count: maxFiles, size: formatBytes(maxFileBytes, locale) })
              : t("limitsSingle", { size: formatBytes(maxFileBytes, locale) })}
          </p>
        </>
      ) : input.kind === "text" ? (
        <TextInput label={input.label} placeholder={input.placeholder} maxLength={input.maxLength} value={text} onChange={setText} />
      ) : null}
      {input.kind === "files" && input.paste && files.length === 0 && (
        <TextInput
          label={input.paste.label}
          placeholder={input.paste.placeholder}
          maxLength={MAX_PASTE_CHARS}
          value={text}
          onChange={setText}
        />
      )}
      {rejected.length > 0 && (
        <ToolAlert>
          {rejected.map((r) => `${r.name}: ${te(r.reason)}`).join(" · ")}
        </ToolAlert>
      )}
      {(hasInput || files.length > 0 || hasText || input.kind === "none" || state.status === "error") && (
        <div className={`${card} flex flex-col gap-4 p-4 sm:p-6`}>
          {files.length > 0 && (
            <ul className="flex flex-col gap-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-medium">{f.file.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">{formatBytes(f.file.size, locale)}</span>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}
                    aria-label={tconv("remove", { name: f.file.name })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {options}
          {processing && <ProgressBar value={state.progress} label={t("working")} />}
          {state.status === "error" && <ToolAlert>{errorText(state.code, state.position)}</ToolAlert>}
          <div className="flex flex-wrap gap-3">
            <PrimaryButton onClick={run} disabled={processing || !hasInput}>
              {processing ? t("working") : actionLabel}
            </PrimaryButton>
            {processing && (
              <button type="button" onClick={cancel} className={buttonSecondary}>
                {t("cancel")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextInput({
  label,
  placeholder,
  maxLength,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={8}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={`${field} py-2 font-mono text-sm font-normal`}
      />
    </label>
  );
}

/** Read-only view of a text result with a copy button. */
function TextPreview({ text }: { text: string }) {
  const t = useTranslations("ToolUi");
  const [copied, setCopied] = useState(false);
  const shown = text.length > PREVIEW_CHARS ? text.slice(0, PREVIEW_CHARS) : text;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, insecure context): the download still works.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id="tool-preview" className="text-sm font-semibold">
          {t("preview")}
        </span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft">
          {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
      </div>
      <textarea
        readOnly
        aria-labelledby="tool-preview"
        value={shown}
        rows={10}
        spellCheck={false}
        className={`${field} py-2 font-mono text-sm`}
      />
      {shown.length < text.length && <p className="text-sm text-muted">{t("previewTruncated")}</p>}
    </div>
  );
}
