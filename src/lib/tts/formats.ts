// Plain text of the document formats the read-aloud tool accepts, on the
// page (DOMParser is inert: no scripts run, nothing is fetched). PDF and
// images need pdf.js and tesseract and live in extract.ts.
import { marked } from "marked";
import { extractArchive, type ExtractLimits } from "@/lib/archive/extract";
import { ConversionError } from "@/lib/convert-error";
import { decodeText } from "@/lib/data/text";
import { readEpub } from "@/lib/ebook/epub";
import { chapterText } from "@/lib/ebook/render";
import { normalizeText, stripBullets } from "./text";

export interface DocumentText {
  text: string;
  /** The document's own title, when it has one (used to name the MP3). */
  title?: string;
}

/** A Word file is read whole into memory: refuse what would inflate past 200 MB. */
const DOCX_LIMITS: ExtractLimits = { maxBytes: 200 * 1024 * 1024, maxEntries: 5000 };

const clean = (text: string) => normalizeText(stripBullets(text));
const titleOf = (title: string | null | undefined) => title?.replace(/\s+/g, " ").trim() || undefined;

export function htmlText(html: string): DocumentText {
  const doc = new DOMParser().parseFromString(html.replace(/^﻿/, ""), "text/html");
  return { text: clean(chapterText(html)), title: titleOf(doc.querySelector("title")?.textContent ?? doc.querySelector("h1")?.textContent) };
}

export function markdownText(markdown: string): DocumentText {
  const html = marked.parse(markdown.replace(/^﻿/, ""), { gfm: true, async: false }) as string;
  return htmlText(html);
}

// WordprocessingML: paragraphs (w:p) hold runs whose text is in w:t, with
// w:tab and w:br/w:cr inside. Deleted text (w:del) and field codes are skipped.
const SKIP_DOCX = new Set(["del", "instrText", "delText", "fldData", "rPr", "pPr"]);

function docxNodeText(node: Element, out: string[]) {
  for (const child of Array.from(node.children)) {
    const name = child.localName;
    if (SKIP_DOCX.has(name)) continue;
    if (name === "t") out.push(child.textContent ?? "");
    else if (name === "tab") out.push(" ");
    else if (name === "br" || name === "cr") out.push("\n");
    else if (name === "p") {
      docxNodeText(child, out);
      out.push("\n\n");
    } else if (name === "tc") {
      docxNodeText(child, out);
      out.push(" ");
    } else docxNodeText(child, out);
  }
}

const parseXml = (bytes: Uint8Array) => {
  const source = decodeText(bytes);
  // A DTD in a Word part is never legitimate: refuse it rather than expand entities.
  if (/<!DOCTYPE/i.test(source)) throw new ConversionError("xmlEntitiesBlocked");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new ConversionError("fileDamaged");
  return doc;
};

export function docxText(bytes: Uint8Array): DocumentText {
  let files;
  try {
    files = extractArchive(bytes, "document.docx", DOCX_LIMITS).files;
  } catch (error) {
    throw error instanceof ConversionError && error.code === "archiveTooLarge" ? error : new ConversionError("fileDamaged");
  }
  const part = (path: string) => files.find((f) => f.path === path)?.data;
  const body = part("word/document.xml");
  if (!body) throw new ConversionError("fileDamaged");
  const xml = parseXml(body);
  const out: string[] = [];
  docxNodeText(xml.documentElement, out);
  const core = part("docProps/core.xml");
  let title: string | undefined;
  if (core) {
    try {
      title = titleOf(parseXml(core).getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")[0]?.textContent);
    } catch {
      title = undefined;
    }
  }
  return { text: clean(out.join("")), title };
}

export function epubText(bytes: Uint8Array): DocumentText {
  const book = readEpub(bytes);
  const chapters = book.chapters.map((c) => chapterText(c.html)).filter(Boolean);
  return { text: clean(chapters.join("\n\n")), title: titleOf(book.title) };
}

export const plainText = (bytes: Uint8Array): DocumentText => ({ text: normalizeText(decodeText(bytes)) });
