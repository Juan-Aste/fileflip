"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { ConversionError, errorCode } from "@/lib/convert-error";
import { readEpubFile } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import { convertOnServer } from "@/lib/server-client";
import { reportConversion } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const pageSizes = ["a4", "letter"] as const;
const renderer = () => import("@/lib/ebook/render");

/**
 * EPUB → PDF: the book is read and assembled into one page in the browser
 * (as in the EPUB converter), then printed on our server by Gotenberg's Chromium.
 */
export default function EpubToPdfTool() {
  const t = useTranslations("EbookTool");
  const tm = useTranslations("MarkupTools");
  const tt = useTranslations("Tools.epub-to-pdf");
  const [pageSize, setPageSize] = useState<(typeof pageSizes)[number]>("a4");
  const [images, setImages] = useState(true);

  return (
    <ToolShell
      engine="server"
      input={{ kind: "files", extensions: ["epub"], multiple: true, maxFileBytes: tools["epub-to-pdf"].limits.maxFileBytes }}
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
          <Checkbox checked={images} onChange={setImages} label={t("images")} />
          <p className="text-sm text-muted">{t("pdfNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          async (file, job) => {
            try {
              const book = await readEpubFile(file, { signal: job.signal });
              const html = (await renderer()).epubToHtml(book, { images, contentsLabel: t("contents") });
              const page = new File([html], renameExtension(file.name, "html"), { type: "text/html" });
              return await convertOnServer("/api/convert/epub", page, "pdf", { pageSize }, job.onProgress, job.signal);
            } catch (error) {
              // The server logs what it printed or failed to print; the rest (DRM, damaged book, upload refused) is reported here.
              if (!(error instanceof ConversionError && (error.loggedByServer || error.code === "jobCancelled"))) {
                reportConversion({ from: "epub", to: "pdf", size: file.size, success: false, tool: "epub-to-pdf", engine: "server", errorCode: errorCode(error) });
              }
              throw error;
            }
          },
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = renameExtension(files[i]!.name, "pdf");
          return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
        });
      }}
    />
  );
}
