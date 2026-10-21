import "server-only";
import { Marked, type Tokens } from "marked";

// Markdown → a self-contained HTML page for Gotenberg's Chromium to print.
// The page must never make Chromium fetch anything (SSRF against our private
// network or the internet): raw HTML in the Markdown is reduced to its text,
// only data: images are kept, and a Content-Security-Policy that comes first
// in <head> blocks every request and every script. Gotenberg is also started
// with JavaScript disabled and private/public IPs denied (DEPLOY.md).

export const pageSizes = ["a4", "letter"] as const;
export type PageSize = (typeof pageSizes)[number];

export interface PrintOptions {
  pageSize: PageSize;
}

const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Text of a raw HTML snippet: comments and tags removed, the rest escaped (entities stay as written). */
const htmlToText = (html: string) =>
  html
    .replace(/<!--[\s\S]*?(-->|$)/g, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, " ")
    .replace(/[<>"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Images embedded in the Markdown itself; anything else would be a network request. */
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
/** Links are only written into the PDF (never followed while printing). */
const SAFE_LINK = /^(?:https?:|mailto:|#)/i;

function createMarked() {
  const marked = new Marked({ gfm: true, async: false });
  marked.use({
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return htmlToText(text);
      },
      image({ href, title, text }: Tokens.Image) {
        if (!DATA_IMAGE.test(href)) return text ? `<span class="missing-image">[${escapeHtml(text)}]</span>` : "";
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<img src="${escapeHtml(href.replace(/\s+/g, ""))}" alt="${escapeHtml(text)}"${titleAttr}>`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        if (!SAFE_LINK.test(href)) return inner;
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href)}"${titleAttr}>${inner}</a>`;
      },
    },
  });
  return marked;
}

const PAGE_CSS = (size: PageSize) => `@page{size:${size === "letter" ? "letter" : "A4"};margin:18mm 16mm}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:11pt/1.55 "Noto Sans","Liberation Sans","DejaVu Sans",Arial,sans-serif;color:#1f2328;overflow-wrap:anywhere}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.4em 0 .5em;break-after:avoid}h1{font-size:1.9em}h2{font-size:1.45em;border-bottom:1px solid #d0d7de;padding-bottom:.2em}h3{font-size:1.2em}
h1:first-child,h2:first-child,h3:first-child{margin-top:0}
p,ul,ol,table,pre,blockquote{margin:0 0 .8em}
a{color:#0b57d0}
pre,code{font-family:"Noto Sans Mono","Liberation Mono","DejaVu Sans Mono",monospace;font-size:.9em}
code{background:#f3f4f6;padding:.1em .3em;border-radius:3px}
pre{padding:.8em 1em;background:#f6f8fa;border-radius:6px;white-space:pre-wrap;break-inside:avoid}pre code{background:none;padding:0}
table{border-collapse:collapse;break-inside:auto}tr{break-inside:avoid}th,td{border:1px solid #d0d7de;padding:.35em .6em;text-align:left}th{background:#f6f8fa}
blockquote{padding-left:1em;border-left:4px solid #d0d7de;color:#59636e}
img{max-width:100%}hr{border:0;border-top:1px solid #d0d7de}
.missing-image{color:#59636e;font-style:italic}
li>input[type=checkbox]{margin:0 .4em 0 0}`;

/** Plain text of the first level-1 heading, for the PDF title. */
function firstHeading(tokens: ReturnType<Marked["lexer"]>): string | undefined {
  const heading = tokens.find((t): t is Tokens.Heading => t.type === "heading" && t.depth === 1);
  if (!heading) return undefined;
  const plain = (list: Tokens.Generic[]): string =>
    list.map((t) => (t.tokens ? plain(t.tokens as Tokens.Generic[]) : t.type === "html" ? "" : (t.text ?? ""))).join("");
  return plain(heading.tokens as Tokens.Generic[]).replace(/\s+/g, " ").trim() || undefined;
}

/** A complete, inert HTML page ready to print. */
export function markdownToPrintHtml(markdown: string, { pageSize }: PrintOptions): string {
  const marked = createMarked();
  const tokens = marked.lexer(markdown.replace(/^﻿/, ""));
  const title = firstHeading(tokens) ?? "Document";
  const body = marked.parser(tokens);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(title)}</title>
<style>
${PAGE_CSS(pageSize)}
</style>
</head>
<body>
${body}</body>
</html>
`;
}
