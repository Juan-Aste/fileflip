"use client";

import { useTranslations } from "next-intl";
import { formatFromExtension, formats, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { extractArchiveFile } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const extensions = ["zip", "tar", "tgz", "gz", "7z", "rar"];
const archiveBase = (name: string) => name.replace(/\.(zip|tar|tgz|tar\.gz|gz|7z|rar)$/i, "") || "archive";
const sourceFormat = (name: string): FormatId => {
  const ext = /\.(zip|tar|7z|rar)$/i.exec(name)?.[1]?.toLowerCase();
  return (ext ?? "tgz") as FormatId;
};
const mimeOf = (path: string) => {
  const format = formatFromExtension(path);
  return format ? formats[format].mime : "application/octet-stream";
};

/** ZIP, TAR, TAR.GZ, GZ, 7Z and RAR → the files inside, in the data worker (see lib/archive/extract.ts). */
export default function ExtractArchiveTool() {
  const t = useTranslations("ArchiveTool");
  const tt = useTranslations("Tools.extract-archive");

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: tools["extract-archive"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-extracted.zip"
      options={<p className="text-sm text-muted">{t("extractNote")}</p>}
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "extract-archive",
              { from: sourceFormat(file.name), to: "bin", files: [file] },
              async () => {
                const result = await extractArchiveFile(file, { signal: job.signal });
                if (result.files.length === 0) throw new ConversionError("archiveEmpty");
                return result;
              },
              (out) => out.files.reduce((sum, f) => sum + f.data.length, 0),
            ),
          { signal, onProgress },
        );
        // Several archives: each one's files go in a folder named after it.
        const prefix = (i: number) => (files.length > 1 ? `${archiveBase(files[i]!.name)}/` : "");
        return results.flatMap((result, i): ShellOutput[] => {
          if (result.status === "error") return [{ kind: "error", name: files[i]!.name, code: result.code }];
          const { files: extracted, skipped } = result.value;
          return extracted.map((f, j) => ({
            kind: "file",
            name: `${prefix(i)}${f.path}`,
            blob: new Blob([f.data as Uint8Array<ArrayBuffer>], { type: mimeOf(f.path) }),
            ...(j === 0 && skipped > 0 ? { message: { ok: true, text: t("skipped", { count: skipped }) } } : {}),
          }));
        });
      }}
    />
  );
}
