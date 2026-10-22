"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { runBatch } from "@/lib/jobs";
import { createOcrSession, prepareOcrImage, type OcrSession } from "@/lib/ocr/client";
import { ocrLanguages, type OcrLanguage } from "@/lib/ocr/text";
import { trackTool } from "@/lib/stats-client";
import { detectFileFormat } from "@/lib/detect";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { withTimeout } from "./timeout";
import type { ShellOutput } from "../shell/state";

const extensions = ["jpg", "jpeg", "jfif", "png", "webp", "bmp", "gif", "tif", "tiff", "heic", "heif", "avif"];
/** Below this mean confidence the result gets a "check the text" warning. */
const LOW_CONFIDENCE = 60;
const baseName = (name: string) => name.replace(/\.[^.]+$/, "") || "image";

/** Images → text with tesseract.js on the device (lib/ocr/client.ts). */
export default function ImageToTextTool() {
  const t = useTranslations("OcrTool");
  const tt = useTranslations("Tools.image-to-text");
  const locale = useLocale();
  const [language, setLanguage] = useState<OcrLanguage>((ocrLanguages as readonly string[]).includes(locale) ? (locale as OcrLanguage) : "en");
  const { timeoutMs, maxFileBytes } = tools["image-to-text"].limits;

  return (
    <ToolShell
      input={{ kind: "files", extensions, multiple: true, maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-ocr.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup legend={t("language")} value={language} onChange={setLanguage} options={ocrLanguages.map((l) => ({ value: l, label: t(`languages.${l}`) }))} />
          <p className="text-sm text-muted">{t("note")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        // One engine for the whole batch; a cancelled or timed-out image stops it, so the next one starts a new one.
        let session: OcrSession | null = null;
        try {
          const results = await runBatch(
            files,
            async (file, job) => {
              const from = (await detectFileFormat(file)) ?? "png";
              return trackTool(
                "image-to-text",
                { from, to: "txt", files: [file] },
                async () => {
                  const limit = withTimeout(job.signal ?? signal, timeoutMs);
                  try {
                    const image = await prepareOcrImage(file);
                    session ??= await createOcrSession(language, limit.signal);
                    const result = await session.recognize(image, { signal: limit.signal, onProgress: job.onProgress });
                    if (!result.text) throw new ConversionError("ocrNoText");
                    return result;
                  } catch (error) {
                    if (limit.signal.aborted) session = null;
                    throw error;
                  } finally {
                    limit.done();
                  }
                },
                (out) => out.text.length,
              );
            },
            { signal, onProgress },
          );
          const used = new Set<string>();
          return results.map((result, i): ShellOutput => {
            const name = files[i]!.name;
            if (result.status === "error") return { kind: "error", name, code: result.code };
            const { text, confidence } = result.value;
            // scan.png and scan.tiff both become scan.txt: keep them apart.
            let output = `${baseName(name)}.txt`;
            for (let n = 2; used.has(output); n++) output = `${baseName(name)}-${n}.txt`;
            used.add(output);
            return {
              kind: "file",
              name: output,
              blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
              preview: text,
              ...(confidence < LOW_CONFIDENCE ? { message: { ok: false, text: t("lowConfidence", { confidence }) } } : {}),
            };
          });
        } finally {
          await (session as OcrSession | null)?.terminate().catch(() => {});
        }
      }}
    />
  );
}
