"use client";

import { useLocale, useTranslations } from "next-intl";
import { formats, formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { ConversionError } from "@/lib/convert-error";
import { formatBytes, formatDate } from "@/lib/format";
import { stripImageMetadata } from "@/lib/image/tools-client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

const info = tools["remove-exif"];
const extensions = info.inputs.flatMap((f) => formats[f].extensions);
type StripFormat = "jpg" | "png" | "webp" | "heic";

export default function RemoveMetadataTool() {
  const t = useTranslations("ImageTools");
  const tt = useTranslations("Tools.remove-exif");
  const locale = useLocale() as Locale;

  async function process(
    { files }: { files: File[] },
    { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void },
  ): Promise<ShellOutput[]> {
    const results = await runBatch(
      files,
      (file, job) => {
        const from = formatFromExtension(file.name) as StripFormat | undefined;
        if (!from || !info.inputs.includes(from)) throw new ConversionError("unsupportedFormat");
        return trackTool(
          "remove-exif",
          { from, to: from === "heic" ? "jpg" : from, files: [file] },
          () => stripImageMetadata({ input: file, from }, { signal: job.signal, onProgress: job.onProgress, timeoutMs: info.limits.timeoutMs }),
          (out) => out.buffer.byteLength,
        );
      },
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const file = files[i]!;
      if (result.status === "error") return { kind: "error", name: file.name, code: result.code };
      const out = result.value;
      const name = out.reencoded ? renameExtension(file.name, formats[out.format].extensions[0]!) : file.name;
      const { gps, camera, date, software, author } = out.summary;
      const found = [
        gps && t("foundGps", { latitude: gps.latitude.toFixed(5), longitude: gps.longitude.toFixed(5) }),
        camera && t("foundCamera", { camera }),
        date && t("foundDate", { date: formatDate(new Date(date), locale) }),
        software && t("foundSoftware", { software }),
        author && t("foundAuthor", { author }),
      ].filter(Boolean);
      const text =
        found.length > 0
          ? t("removedFound", { name, found: found.join(" · ") })
          : out.removedBytes > 0
            ? t("removedBytes", { name, size: formatBytes(out.removedBytes, locale) })
            : t("nothingFound", { name });
      return {
        kind: "file",
        name,
        blob: new Blob([out.buffer], { type: formats[out.format].mime }),
        message: { ok: true, text: out.reencoded ? `${text} ${t("heicReencoded")}` : text },
      };
    });
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes: info.limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-clean.zip"
      process={process}
    />
  );
}
