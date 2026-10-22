"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formats } from "@/config/formats";
import { tools } from "@/config/tools";
import { readEpubFile } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";

type Target = "html" | "txt";
const targets: Target[] = ["html", "txt"];

// The page assembly (DOMPurify) loads when the tool runs; the EPUB is unpacked in the data worker.
const renderer = () => import("@/lib/ebook/render");

/** EPUB → one HTML page or plain text (see lib/ebook). */
export default function EpubConverterTool() {
  const t = useTranslations("EbookTool");
  const tt = useTranslations("Tools.epub-converter");
  const [target, setTarget] = useState<Target>("html");
  const [images, setImages] = useState(true);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["epub"], multiple: true, maxFileBytes: tools["epub-converter"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName={target === "html" ? "fileflect-html.zip" : "fileflect-text.zip"}
      options={
        <div className="flex flex-col gap-3">
          <ChoiceGroup legend={t("target")} value={target} onChange={setTarget} options={targets.map((f) => ({ value: f, label: t(`targets.${f}`) }))} />
          {target === "html" && <Checkbox checked={images} onChange={setImages} label={t("images")} />}
          <p className="text-sm text-muted">{t(target === "html" ? "htmlNote" : "textNote")}</p>
        </div>
      }
      process={async ({ files }, { signal, onProgress }) => {
        const results = await runBatch(
          files,
          (file, job) =>
            trackTool(
              "epub-converter",
              { from: "epub", to: target, files: [file] },
              async () => {
                const book = await readEpubFile(file, { signal: job.signal });
                const render = await renderer();
                return target === "html" ? render.epubToHtml(book, { images, contentsLabel: t("contents") }) : render.epubToText(book);
              },
              (out) => out.length,
            ),
          { signal, onProgress },
        );
        return results.map((result, i): ShellOutput => {
          const name = renameExtension(files[i]!.name, target === "html" ? "html" : "txt");
          if (result.status === "error") return { kind: "error", name: files[i]!.name, code: result.code };
          return {
            kind: "file",
            name,
            blob: new Blob([result.value], { type: `${formats[target].mime};charset=utf-8` }),
            ...(target === "txt" ? { preview: result.value } : {}),
          };
        });
      }}
    />
  );
}
