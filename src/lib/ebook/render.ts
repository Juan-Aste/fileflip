// EPUB → one HTML page or plain text, on the page (DOMPurify needs a DOM).
// Chapters are parsed as HTML with DOMParser, which is inert (no scripts, no
// requests) and never expands DTD entities; links between chapters become
// anchors in the single page, images are embedded as data: URLs, and the
// result is sanitized and pinned down by a CSP that forbids any request.
import DOMPurify from "dompurify";
import { resolveHref, type EpubBook } from "./epub";

export interface EpubHtmlOptions {
  /** Embed the book's images (data: URLs) instead of leaving them out. */
  images: boolean;
  /** Heading of the table of contents, in the reader's language. */
  contentsLabel: string;
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const VOID = "area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr";
const SELF_CLOSING = new RegExp(`<(?!(?:${VOID})\\b)([a-zA-Z][\\w:.-]*)(\\s[^<>]*?)?\\s*/>`, "g");

/** XHTML → markup the HTML parser reads the same way: no XML declaration or DOCTYPE, no "<a id='x'/>" left open. */
export function xhtmlForHtmlParser(xhtml: string): string {
  return xhtml
    .replace(/^﻿/, "")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, "")
    .replace(SELF_CLOSING, "<$1$2></$1>");
}

const parseChapter = (html: string) => new DOMParser().parseFromString(xhtmlForHtmlParser(html), "text/html");

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const PAGE_CSS = `body{max-width:42rem;margin:2rem auto;padding:0 1rem;font:18px/1.65 Georgia,"Times New Roman",serif;color:#1f2328;background:#fff}
header.book{text-align:center;margin-bottom:2.5rem}header.book p{color:#59636e}nav.toc{margin:0 0 3rem}
section.chapter{margin-top:3rem;padding-top:2rem;border-top:1px solid #d0d7de}section.chapter:first-of-type{border-top:0}
img,svg{max-width:100%;height:auto}table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:.3rem .6rem}
pre,code{font-family:ui-monospace,monospace;font-size:.85em}pre{overflow:auto}blockquote{margin-left:0;padding-left:1rem;border-left:4px solid #d0d7de}
@media (prefers-color-scheme:dark){body{color:#e6edf3;background:#0d1117}header.book p{color:#9198a1}section.chapter,th,td{border-color:#30363d}}
@media print{body{max-width:none;margin:0;padding:0;font-size:12pt;color:#000;background:#fff}section.chapter{break-before:page;border-top:0;margin-top:0;padding-top:0}img{break-inside:avoid}h1,h2,h3{break-after:avoid}}`;

// Nothing in the page may make a request: images are data: URLs and styles are inline.
const CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'";

const purifyConfig = {
  USE_PROFILES: { html: true, svg: true },
  FORBID_TAGS: ["style", "link", "form", "button", "textarea", "select", "input", "audio", "video", "source", "track", "picture", "foreignObject"],
  FORBID_ATTR: ["srcset"],
  ADD_DATA_URI_TAGS: ["image"],
};

/** The whole book as one sanitized HTML page with a table of contents. */
export function epubToHtml(book: EpubBook, { images, contentsLabel }: EpubHtmlOptions): string {
  const chapterIndex = new Map(book.chapters.map((c, i) => [c.path, i]));
  const imageData = new Map(book.images.map((image) => [image.path, image]));
  const dataUrls = new Map<string, string>();
  const dataUrl = (path: string | null) => {
    const image = path ? imageData.get(path) : undefined;
    if (!images || !image) return null;
    if (!dataUrls.has(image.path)) dataUrls.set(image.path, `data:${image.mime};base64,${base64(image.data)}`);
    return dataUrls.get(image.path)!;
  };

  const toc: string[] = [];
  const sections = book.chapters.map((chapter, i) => {
    const doc = parseChapter(chapter.html);
    const body = doc.body;
    body.querySelectorAll("script, style, link, meta, base, noscript, template, iframe, object, embed").forEach((el) => el.remove());

    // Cover pages wrap the picture in an SVG <image>: a plain <img> sizes better and survives sanitizing.
    body.querySelectorAll("svg").forEach((svg) => {
      const only = svg.children.length === 1 && svg.children[0]!.localName === "image" ? svg.children[0]! : null;
      if (!only) return;
      const img = doc.createElement("img");
      img.setAttribute("src", only.getAttribute("href") ?? only.getAttribute("xlink:href") ?? "");
      img.setAttribute("alt", "");
      svg.replaceWith(img);
    });

    body.querySelectorAll("[id]").forEach((el) => el.setAttribute("id", `c${i}-${el.getAttribute("id")}`));
    body.querySelectorAll("a[name]:not([id])").forEach((el) => el.setAttribute("id", `c${i}-${el.getAttribute("name")}`));

    body.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href")!.trim();
      if (/^(https?:|mailto:)/i.test(href)) return;
      const fragment = href.includes("#") ? href.slice(href.indexOf("#") + 1) : "";
      const target = href.startsWith("#") ? i : chapterIndex.get(resolveHref(chapter.path, href) ?? "");
      if (target === undefined) a.removeAttribute("href");
      else a.setAttribute("href", fragment ? `#c${target}-${fragment}` : `#c${target}`);
    });

    body.querySelectorAll("img").forEach((img) => {
      const src = dataUrl(resolveHref(chapter.path, img.getAttribute("src") ?? ""));
      if (src) img.setAttribute("src", src);
      else img.replaceWith(doc.createTextNode(img.getAttribute("alt") ?? ""));
    });
    body.querySelectorAll("image").forEach((image) => {
      const src = dataUrl(resolveHref(chapter.path, image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? ""));
      image.removeAttribute("xlink:href");
      if (src) image.setAttribute("href", src);
      else image.remove();
    });

    const heading = body.querySelector("h1, h2, h3")?.textContent?.replace(/\s+/g, " ").trim();
    if (heading) toc.push(`<li><a href="#c${i}">${escapeHtml(heading)}</a></li>`);
    const content = DOMPurify.sanitize(body.innerHTML, purifyConfig);
    return `<section class="chapter" id="c${i}">\n${content}\n</section>`;
  });

  const title = book.title || "Ebook";
  const lang = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/.test(book.language) ? ` lang="${book.language}"` : "";
  const authors = book.creators.length ? `\n<p>${escapeHtml(book.creators.join(", "))}</p>` : "";
  const nav = toc.length > 1 ? `<nav class="toc">\n<h2>${escapeHtml(contentsLabel)}</h2>\n<ol>\n${toc.join("\n")}\n</ol>\n</nav>\n` : "";
  return `<!doctype html>
<html${lang}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${PAGE_CSS}
</style>
</head>
<body>
<header class="book">
<h1>${escapeHtml(title)}</h1>${authors}
</header>
${nav}${sections.join("\n")}
</body>
</html>
`;
}

const SKIP = new Set(["script", "style", "noscript", "template", "head", "title"]);
const BLOCK = new Set([
  "p", "div", "section", "article", "header", "footer", "aside", "nav", "main", "blockquote", "pre", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "dl", "dt", "dd", "table", "hr", "address", "body",
]);

function textOfNode(node: Node, out: string[], pre = false) {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    out.push(pre ? text : text.replace(/[ \t\n\r\f]+/g, " "));
    return;
  }
  if (node.nodeType !== 1) return;
  const name = (node as Element).localName;
  if (SKIP.has(name)) return;
  if (name === "br") return void out.push("\n");
  if (name === "img") return void out.push((node as Element).getAttribute("alt") ?? "");
  const block = BLOCK.has(name);
  if (block) out.push("\n\n");
  if (name === "li") out.push("\n- ");
  if (name === "tr") out.push("\n");
  for (const child of Array.from(node.childNodes)) textOfNode(child, out, pre || name === "pre");
  if (name === "td" || name === "th") out.push("\t");
  if (block) out.push("\n\n");
}

/** Plain text of a chapter: paragraphs separated by a blank line, list items with "- ", table cells by tabs. */
export function chapterText(html: string): string {
  const out: string[] = [];
  textOfNode(parseChapter(html).body, out);
  return out
    .join("")
    .split("\n")
    .map((line) => line.replace(/^ +/, "").replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The whole book as UTF-8 text: title, authors, then each chapter. */
export function epubToText(book: EpubBook): string {
  const head = [book.title, book.creators.join(", ")].filter(Boolean).join("\n");
  const chapters = book.chapters.map((c) => chapterText(c.html)).filter(Boolean);
  return `${[head, ...chapters].filter(Boolean).join("\n\n\n")}\n`;
}
