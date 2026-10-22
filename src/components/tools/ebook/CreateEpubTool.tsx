"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { tools } from "@/config/tools";
import { decodeText } from "@/lib/data/text";
import { trackTool } from "@/lib/stats-client";
import ToolShell from "../shell/ToolShell";

const languages = ["es", "en", "pt", "fr", "zh"] as const;
// The book's table of contents is in the book's language, not the page's.
const contents: Record<(typeof languages)[number], string> = { es: "Contenido", en: "Contents", pt: "Sumário", fr: "Sommaire", zh: "目录" };
const isHtml = (name: string) => /\.html?$/i.test(name);
// marked, DOMPurify and fflate load when the tool runs, not with the page.
const engines = () => Promise.all([import("@/lib/ebook/build"), import("@/lib/markup/markdown")]);

/** "Mi libro: 2ª edición" → "Mi libro_ 2ª edición.epub" (no characters file systems refuse). */
const fileName = (title: string) => `${title.replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, "_").trim().slice(0, 100) || "ebook"}.epub`;

/** HTML or Markdown files (or pasted Markdown) → one EPUB 3, built on the page (see lib/ebook/build.ts). */
export default function CreateEpubTool() {
  const t = useTranslations("EbookTool");
  const d = useTranslations("DataTools");
  const tt = useTranslations("Tools.create-epub");
  const locale = useLocale();
  const titleId = useId();
  const authorId = useId();
  const languageId = useId();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState<(typeof languages)[number]>(languages.includes(locale as never) ? (locale as (typeof languages)[number]) : "es");

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["md", "markdown", "txt", "html", "htm"],
        multiple: true,
        maxFileBytes: tools["create-epub"].limits.maxFileBytes,
        paste: { label: d("paste", { format: "Markdown" }), placeholder: "# Capítulo 1\n\nHabía una vez…\n\n# Capítulo 2\n\n…" },
      }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={titleId} className="text-sm font-medium">
                {t("title")}
              </label>
              <input id={titleId} type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={t("titlePlaceholder")} className={`h-10 ${field}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={authorId} className="text-sm font-medium">
                {t("author")}
              </label>
              <input id={authorId} type="text" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} className={`h-10 ${field}`} />
            </div>
          </div>
          <label htmlFor={languageId} className="flex flex-col gap-1 text-sm font-medium sm:max-w-60">
            {t("language")}
            <select id={languageId} value={language} onChange={(e) => setLanguage(e.target.value as (typeof languages)[number])} className="rounded-lg border border-border bg-background px-3 py-2">
              {languages.map((l) => (
                <option key={l} value={l}>
                  {t(`languages.${l}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">{t("createNote")}</p>
        </div>
      }
      process={async ({ files, text }, { onProgress }) => {
        const inputs = files.length > 0 ? files : [new File([text], "ebook.md", { type: "text/markdown" })];
        const bytes = await trackTool(
          "create-epub",
          { from: isHtml(inputs[0]!.name) ? "html" : "md", to: "epub", files: inputs },
          async () => {
            const [{ buildEpub }, { markdownToHtml }] = await engines();
            const sources = await Promise.all(
              inputs.map(async (file) => {
                const content = decodeText(new Uint8Array(await file.arrayBuffer()));
                return { name: file.name, html: isHtml(file.name) ? content : markdownToHtml(content, { fullDocument: false }) };
              }),
            );
            return buildEpub(sources, { title, author, language, contentsLabel: contents[language] });
          },
          (out) => out.length,
        );
        onProgress(1);
        const name = fileName(title.trim() || inputs[0]!.name.replace(/\.[^.]+$/, ""));
        return [{ kind: "file", name, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/epub+zip" }) }];
      }}
    />
  );
}
