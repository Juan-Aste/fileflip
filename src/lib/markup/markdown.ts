// Markdown ↔ HTML. Runs on the page (DOMPurify and turndown need a DOM; the
// parsing is inert: DOMParser never runs scripts or loads resources).
// Imported lazily by the two tools only.
import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { ConversionError } from "@/lib/convert-error";

export interface MarkdownToHtmlOptions {
  /** A complete page (doctype, charset, title, readable styles) instead of a fragment. */
  fullDocument: boolean;
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Readable defaults for the standalone page; light and dark.
const PAGE_CSS = `body{max-width:46rem;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif;color:#1f2328;background:#fff}
pre,code{font-family:ui-monospace,monospace;font-size:.9em}pre{padding:1rem;overflow:auto;background:#f6f8fa;border-radius:6px}
table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:.4rem .7rem}img{max-width:100%}blockquote{margin:0;padding-left:1rem;border-left:4px solid #d0d7de;color:#59636e}
@media (prefers-color-scheme:dark){body{color:#e6edf3;background:#0d1117}pre{background:#161b22}th,td{border-color:#30363d}}`;

/** Sanitized HTML: no scripts, event handlers, iframes, forms, buttons or javascript: links (task-list checkboxes stay). */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "form", "button", "textarea", "select"] });
}

/** Markdown (CommonMark + GitHub tables, task lists, strikethrough) → sanitized HTML. */
export function markdownToHtml(markdown: string, { fullDocument }: MarkdownToHtmlOptions): string {
  const body = sanitizeHtml(marked.parse(markdown.replace(/^\uFEFF/, ""), { gfm: true, async: false }) as string);
  if (!fullDocument) return body;
  const title = new DOMParser().parseFromString(body, "text/html").querySelector("h1")?.textContent?.trim() || "Document";
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title)}</title>\n<style>\n${PAGE_CSS}\n</style>\n</head>\n<body>\n${body}</body>\n</html>\n`;
}

/** HTML → Markdown (GitHub flavor: tables, strikethrough, task lists); scripts, styles and forms are dropped. */
export function htmlToMarkdown(html: string): string {
  const service = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
  service.use(gfm);
  service.remove(["script", "style", "noscript", "iframe", "object", "embed", "form", "head", "template"]);
  // Parsed as a document first so a full page's <head> (title, meta) stays out of the text.
  const body = new DOMParser().parseFromString(html.replace(/^\uFEFF/, ""), "text/html").body;
  const markdown = service.turndown(body).trim();
  if (!markdown) throw new ConversionError("invalidData");
  return `${markdown}\n`;
}
