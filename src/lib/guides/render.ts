import { Marked, type Token, type Tokens } from "marked";
import { conversionPages, conversionSlug } from "@/config/conversion-pages";
import { availableTools, tools, type ToolId } from "@/config/tools";
import type { Locale } from "@/i18n/routing";
import { guideById, guidePath, plannedGuideIds } from "@/content/guides/meta";
import images from "@/content/guides/images.json";

// Guide bodies are Markdown written by us. Besides normal links and images
// they use three internal schemes, checked by the tests:
//   [text](tool:compress-pdf)  → that tool's page in the guide's language
//   [text](conv:pdf-docx)      → a conversion page (from-to)
//   [text](guide:heic-to-jpg)  → another guide (plain text while it is only planned)
//   ![alt](shot:name "caption") → /guides/name.<locale>.webp (or name.webp, the Spanish
//                                  one) with its size from images.json

export interface GuideHeading {
  id: string;
  text: string;
}

export interface RenderedGuide {
  html: string;
  /** Level-2 headings, for the table of contents. */
  toc: GuideHeading[];
  /** Items of the first numbered list (HowTo steps), as plain text. */
  steps: string[];
  /** Screenshots used, in order. */
  shots: string[];
  /** Words (characters for Chinese) of the text, for the length rules. */
  words: number;
}

type ImageInfo = { width: number; height: number };
const imageInfo = images as Record<string, ImageInfo>;

export const shotSrc = (name: string) => `/guides/${name}.webp`;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "Paso 1: elegir el archivo" → "paso-1-elegir-el-archivo"; "" for text without Latin letters. */
export function headingId(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Where an internal link points, or undefined when it does not exist in that language. */
export function resolveGuideHref(href: string, locale: Locale): string | undefined {
  const colon = href.indexOf(":");
  const scheme = href.slice(0, colon);
  const value = href.slice(colon + 1);
  if (scheme === "tool") {
    const id = value as ToolId;
    return availableTools.includes(id) ? `/${locale}/${tools[id].slugs[locale]}` : undefined;
  }
  if (scheme === "conv") {
    const conversion = conversionPages.find((c) => `${c.from}-${c.to}` === value);
    return conversion && `/${locale}/${conversionSlug(conversion, locale)}`;
  }
  if (scheme === "guide") {
    const guide = guideById(value);
    const path = guide && guidePath(guide, locale);
    return path && `/${locale}${path}`;
  }
  return href;
}

const plain = (tokens: Token[]): string =>
  tokens
    .map((t) => ("tokens" in t && t.tokens ? plain(t.tokens) : "text" in t ? t.text : ""))
    .join("");

function countWords(text: string, locale: Locale): number {
  if (locale === "zh") return (text.match(/[㐀-鿿]/g) ?? []).length;
  return text.split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w)).length;
}

export function renderGuide(markdown: string, locale: Locale): RenderedGuide {
  const toc: GuideHeading[] = [];
  const shots: string[] = [];
  const used = new Set<string>();
  const marked = new Marked({ gfm: true, async: false });
  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const text = plain(tokens);
        let id = headingId(text) || `section-${toc.length + 1}`;
        while (used.has(id)) id += "-2";
        used.add(id);
        if (depth === 2) toc.push({ id, text });
        // The page title is the only h1; the body starts at h2.
        const level = Math.max(depth, 2);
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const target = resolveGuideHref(href, locale);
        const planned = href.startsWith("guide:") && (plannedGuideIds as readonly string[]).includes(href.slice(6));
        if (!target && planned) return inner;
        if (!target) throw new Error(`Guide link without a page in ${locale}: ${href}`);
        const external = /^https?:/i.test(target);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        const rel = external ? ` rel="noopener noreferrer"` : "";
        return `<a href="${escapeHtml(target)}"${titleAttr}${rel}>${inner}</a>`;
      },
      image({ href, title, text }: Tokens.Image) {
        // The shot taken in the guide's language ("name.en"), else the Spanish one.
        const base = href.replace(/^shot:/, "");
        const name = imageInfo[`${base}.${locale}`] ? `${base}.${locale}` : base;
        const info = imageInfo[name];
        if (!href.startsWith("shot:") || !info) throw new Error(`Unknown guide screenshot: ${href}`);
        // The first one may be near the top: load it eagerly.
        const loading = shots.length === 0 ? "eager" : "lazy";
        shots.push(name);
        const img = `<img src="${shotSrc(name)}" alt="${escapeHtml(text)}" width="${info.width}" height="${info.height}" loading="${loading}" decoding="async">`;
        return title ? `<figure>${img}<figcaption>${escapeHtml(title)}</figcaption></figure>` : img;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        // Bodies are plain Markdown: raw HTML is shown as text.
        return escapeHtml(text);
      },
    },
  });
  const tokens = marked.lexer(markdown);
  const list = tokens.find((t): t is Tokens.List => t.type === "list" && t.ordered);
  const steps = list ? list.items.map((item) => plain(item.tokens).replace(/\s+/g, " ").trim()) : [];
  const words = countWords(
    tokens.map((t) => ("tokens" in t && t.tokens ? plain(t.tokens) : "items" in t ? (t as Tokens.List).items.map((i) => plain(i.tokens)).join(" ") : "text" in t ? t.text : "")).join(" "),
    locale,
  );
  // Block images become figures: unwrap them from their paragraph.
  const html = (marked.parser(tokens) as string).replace(/<p>(<figure>[\s\S]*?<\/figure>)<\/p>/g, "$1");
  return { html, toc, steps, shots, words };
}
