"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import type { ArchiveFormat, ArchiveOptions } from "@/lib/archive/create";
import { createArchiveFile } from "@/lib/data/client";
import { formatBytes } from "@/lib/format";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";

const formats: ArchiveFormat[] = ["zip", "tar", "tgz"];
const extension: Record<ArchiveFormat, string> = { zip: "zip", tar: "tar", tgz: "tar.gz" };
const mime: Record<ArchiveFormat, string> = { zip: "application/zip", tar: "application/x-tar", tgz: "application/gzip" };
const levels = ["0", "6", "9"] as const;
const MAX_NAME_LENGTH = 100;

/** The archive's file name: what the user typed, without separators or a repeated extension. */
function archiveName(typed: string, format: ArchiveFormat): string {
  const base =
    typed
      .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, "_")
      .replace(/\.(zip|tar|tgz|tar\.gz|gz)$/i, "")
      .trim() || "archive";
  return `${base}.${extension[format]}`;
}

/** Several files → one ZIP, TAR or TAR.GZ, built in the data worker. */
export default function CreateArchiveTool() {
  const t = useTranslations("ArchiveTool");
  const tt = useTranslations("Tools.create-archive");
  const locale = useLocale() as Locale;
  const nameId = useId();
  const [format, setFormat] = useState<ArchiveFormat>("zip");
  const [level, setLevel] = useState<(typeof levels)[number]>("6");
  const [name, setName] = useState("");
  const limit = tools["create-archive"].limits.maxFileBytes!;

  return (
    <ToolShell
      input={{ kind: "files", extensions: [], multiple: true, allowEmpty: true, maxFileBytes: limit }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("format")} value={format} onChange={setFormat} options={formats.map((f) => ({ value: f, label: t(`formats.${f}`) }))} />
          {format !== "tar" && (
            <ChoiceGroup
              legend={t("level")}
              value={level}
              onChange={setLevel}
              options={levels.map((l) => ({ value: l, label: t(`levels.${l}`) }))}
            />
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-sm font-medium">
              {t("name")}
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="archive"
              spellCheck={false}
              className={`h-10 ${field}`}
            />
          </div>
          <p className="text-sm text-muted">{t(`notes.${format}`, { size: formatBytes(limit, locale) })}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const options: ArchiveOptions = { format, level: Number(level) as ArchiveOptions["level"] };
        const bytes = await trackTool(
          "create-archive",
          { from: "bin", to: format, files },
          () => createArchiveFile(files, options, { signal, onProgress }),
          (out) => out.length,
        );
        onProgress(1);
        return [{ kind: "file", name: archiveName(name, format), blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime[format] }) }];
      }}
    />
  );
}
