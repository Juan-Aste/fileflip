"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import type { ApiErrorCode } from "@/lib/api-errors";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { defaultQuad, type Quad, type ScanMode } from "@/lib/image/scan";
import { previewImageFile, scanToPdf } from "@/lib/image/tools-client";
import { trackTool } from "@/lib/stats-client";
import type { ScanPaper } from "@/workers/image-tools.worker";
import ChoiceGroup from "../ChoiceGroup";
import ToolAlert from "../ToolAlert";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import CornerEditor from "./CornerEditor";

const info = tools["scan-document"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
const modes: ScanMode[] = ["bw", "gray", "color"];
const papers: ScanPaper[] = ["a4", "letter", "fit"];

/** Longest side of the preview the corners are placed on. */
const PREVIEW_SIDE = 1600;

type Page =
  | { file: File; status: "loading" }
  | { file: File; status: "ready"; url: string; image: { width: number; height: number }; quad: Quad }
  | { file: File; status: "error"; code: ApiErrorCode };

/** Photos of paper pages → one PDF: corners set by hand on each photo, perspective straightened, cleaned to black and white. */
export default function ScanDocumentTool() {
  const t = useTranslations("ScanDocumentTool");
  const tt = useTranslations("Tools.scan-document");
  const te = useTranslations("ApiErrors");
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<ScanMode>("bw");
  const [paper, setPaper] = useState<ScanPaper>("a4");

  // Object URLs of the previews, by file: kept while the file is in the list.
  const urls = useRef(new Map<File, string>());
  useEffect(() => {
    const map = urls.current;
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Previews (one at a time, in the image worker) of files not loaded yet; loaded pages keep their corners.
  useEffect(() => {
    for (const [file, url] of urls.current) {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
        urls.current.delete(file);
      }
    }
    setPages((old) => files.map((file) => old.find((p) => p.file === file && p.status !== "error") ?? { file, status: "loading" }));
    setSelected((s) => Math.min(s, Math.max(0, files.length - 1)));
    const abort = new AbortController();
    (async () => {
      for (const file of files) {
        if (abort.signal.aborted) return;
        if (urls.current.has(file)) continue;
        const from = formatFromExtension(file.name);
        try {
          if (!from) throw new ConversionError("unsupportedFormat");
          const p = await previewImageFile({ input: file, from, maxSide: PREVIEW_SIDE }, { signal: abort.signal });
          if (abort.signal.aborted) return;
          const url = URL.createObjectURL(p.blob);
          urls.current.set(file, url);
          const image = { width: p.width, height: p.height };
          setPages((all) => all.map((pg) => (pg.file === file ? { file, status: "ready", url, image, quad: defaultQuad(image.width, image.height) } : pg)));
        } catch (error) {
          if (!abort.signal.aborted) setPages((all) => all.map((pg) => (pg.file === file ? { file, status: "error", code: errorCode(error) } : pg)));
        }
      }
    })();
    return () => abort.abort();
  }, [files]);

  const current = pages[selected];
  const allReady = pages.length > 0 && pages.every((p) => p.status === "ready");

  async function process(signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    const ready = pages.filter((p): p is Extract<Page, { status: "ready" }> => p.status === "ready");
    if (!ready.length || ready.length !== pages.length) throw new ConversionError("invalidRequest");
    const input = ready.map((p) => ({ input: p.file, from: formatFromExtension(p.file.name)!, quad: p.quad }));
    const out = await trackTool(
      "scan-document",
      { from: input[0]!.from, to: "pdf", files: ready.map((p) => p.file) },
      () => scanToPdf({ pages: input, mode, paper }, { signal, onProgress, timeoutMs: info.limits.timeoutMs }),
      (o) => o.buffer.byteLength,
    );
    return [
      {
        kind: "file",
        name: renameExtension(ready[0]!.file.name, "pdf"),
        blob: new Blob([out.buffer], { type: "application/pdf" }),
        message: { ok: true, text: t("done", { pages: out.pages }) },
      },
    ];
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes, ready: allReady }}
      actionLabel={tt("action")}
      onFilesChange={setFiles}
      process={(_, { signal, onProgress }) => process(signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("mode")} value={mode} onChange={setMode} options={modes.map((m) => ({ value: m, label: t(`modes.${m}`) }))} />
          <ChoiceGroup legend={t("paper")} value={paper} onChange={setPaper} options={papers.map((p) => ({ value: p, label: t(`papers.${p}`) }))} />
          {pages.length > 1 && (
            <div role="group" aria-label={t("pages")} className="flex flex-wrap gap-2">
              {pages.map((p, i) => (
                <button
                  key={`${p.file.name}-${i}`}
                  type="button"
                  aria-pressed={i === selected}
                  onClick={() => setSelected(i)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${i === selected ? "border-brand bg-brand/10 font-medium" : "border-border"} ${p.status === "error" ? "text-red-700 dark:text-red-400" : ""}`}
                >
                  {t("page", { n: i + 1 })}
                </button>
              ))}
            </div>
          )}
          {current?.status === "loading" && <p className="text-sm text-muted">{t("loading")}</p>}
          {current?.status === "error" && <ToolAlert>{`${current.file.name}: ${te(current.code)}`}</ToolAlert>}
          {current?.status === "ready" && (
            <>
              <p className="text-sm">{t("hint")}</p>
              <CornerEditor
                key={`${current.file.name}-${selected}`}
                src={current.url}
                image={current.image}
                quad={current.quad}
                onChange={(quad) => setPages((all) => all.map((p, i) => (i === selected && p.status === "ready" ? { ...p, quad } : p)))}
              />
            </>
          )}
        </div>
      }
    />
  );
}
