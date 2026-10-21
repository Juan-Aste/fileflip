"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { tools } from "@/config/tools";
import { decodeText } from "@/lib/data/text";
import Checkbox from "../Checkbox";
import ToolShell from "../shell/ToolShell";
import { runTextTool } from "../data/textTool";

// marked, DOMPurify and turndown (~100 KB) load when the tool runs, not with the page.
const markup = () => import("@/lib/markup/markdown");
const textOf = async (input: Blob | string) => (typeof input === "string" ? input : decodeText(new Uint8Array(await input.arrayBuffer())));

export function MarkdownToHtmlTool() {
  const t = useTranslations("DataTools");
  const tm = useTranslations("MarkupTools");
  const tt = useTranslations("Tools.markdown-to-html");
  const [fullDocument, setFullDocument] = useState(true);
  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["md", "markdown", "txt"],
        multiple: true,
        maxFileBytes: tools["markdown-to-html"].limits.maxFileBytes,
        paste: { label: t("paste", { format: "Markdown" }), placeholder: "# Título\n\nTexto con **negrita** y una [web](https://example.com)." },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-html.zip"
      options={
        <div className="flex flex-col gap-3">
          <Checkbox checked={fullDocument} onChange={setFullDocument} label={tm("fullDocument")} />
          <p className="text-sm text-muted">{tm("sanitizeNote")}</p>
        </div>
      }
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "markdown-to-html",
          from: () => "md",
          to: "html",
          pastedName: "document.md",
          convert: async (source) => (await markup()).markdownToHtml(await textOf(source), { fullDocument }),
        })
      }
    />
  );
}

export function HtmlToMarkdownTool() {
  const t = useTranslations("DataTools");
  const tm = useTranslations("MarkupTools");
  const tt = useTranslations("Tools.html-to-markdown");
  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["html", "htm", "txt"],
        multiple: true,
        maxFileBytes: tools["html-to-markdown"].limits.maxFileBytes,
        paste: { label: t("paste", { format: "HTML" }), placeholder: "<h1>Título</h1>\n<p>Texto con <strong>negrita</strong>.</p>" },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-markdown.zip"
      options={<p className="text-sm text-muted">{tm("htmlNote")}</p>}
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "html-to-markdown",
          from: () => "html",
          to: "md",
          pastedName: "page.html",
          convert: async (source) => (await markup()).htmlToMarkdown(await textOf(source)),
        })
      }
    />
  );
}
