"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools, type ToolId } from "@/config/tools";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { convertOnServer } from "@/lib/server-client";
import { reportConversion } from "@/lib/stats-client";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const pageSizes = ["a4", "letter"] as const;

interface PrintTool {
  id: Extract<ToolId, "markdown-to-pdf" | "html-to-pdf">;
  endpoint: string;
  extensions: readonly string[];
  /** Format name shown in the paste label. */
  format: string;
  pastedName: string;
  placeholder: string;
  /** MarkupTools message explaining what is kept. */
  note: "pdfNote" | "htmlPdfNote";
}

/**
 * Text → PDF on our server (the page is printed by Gotenberg's Chromium).
 * The server logs each conversion; the browser only reports failures the
 * server never saw (rejected uploads, network errors).
 */
function PrintToPdfTool({ id, endpoint, extensions, format, pastedName, placeholder, note }: PrintTool) {
  const tool = tools[id];
  const t = useTranslations("DataTools");
  const tm = useTranslations("MarkupTools");
  const tt = useTranslations(`Tools.${id}`);
  const [pageSize, setPageSize] = useState<(typeof pageSizes)[number]>("a4");
  return (
    <ToolShell
      engine="server"
      input={{
        kind: "files",
        extensions,
        multiple: true,
        maxFileBytes: tool.limits.maxFileBytes,
        paste: { label: t("paste", { format }), placeholder },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-pdf.zip"
      options={
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium sm:max-w-60">
            {tm("pageSize")}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as (typeof pageSizes)[number])}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {tm(`pageSize_${size}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">{tm(note)}</p>
        </div>
      }
      process={async ({ files, text }, { signal, onProgress }) => {
        const inputs = files.length > 0 ? files : [new File([text], pastedName, { type: "text/plain" })];
        const results = await runBatch(
          inputs,
          async (file, job) => {
            try {
              return await convertOnServer(endpoint, file, "pdf", { pageSize }, job.onProgress, job.signal);
            } catch (error) {
              if (!(error instanceof ConversionError && (error.loggedByServer || error.code === "jobCancelled"))) {
                reportConversion({ from: tool.inputs[0], to: "pdf", size: file.size, success: false, tool: tool.id, engine: "server", errorCode: errorCode(error) });
              }
              throw error;
            }
          },
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = renameExtension(inputs[i].name, "pdf");
          return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
        });
      }}
    />
  );
}

export function MarkdownToPdfTool() {
  return (
    <PrintToPdfTool
      id="markdown-to-pdf"
      endpoint="/api/convert/markdown"
      extensions={["md", "markdown", "txt"]}
      format="Markdown"
      pastedName="document.md"
      placeholder={"# Título\n\nTexto con **negrita**, una tabla y una lista."}
      note="pdfNote"
    />
  );
}

export function HtmlToPdfTool() {
  return (
    <PrintToPdfTool
      id="html-to-pdf"
      endpoint="/api/convert/html"
      extensions={["html", "htm", "txt"]}
      format="HTML"
      pastedName="page.html"
      placeholder={"<h1>Título</h1>\n<p>Texto con <strong>negrita</strong>.</p>"}
      note="htmlPdfNote"
    />
  );
}
