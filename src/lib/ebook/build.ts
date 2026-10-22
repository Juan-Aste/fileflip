// HTML or Markdown → EPUB 3 (with an NCX for EPUB 2 readers), on the page
// (DOMPurify and XMLSerializer need a DOM). Each input is sanitized, split
// into chapters at its top-level <h1>s and serialized as well-formed XHTML;
// images embedded as data: URLs become files of the book, anything remote or
// relative is left out (a book must not fetch from the internet). The ZIP
// starts with an uncompressed "mimetype" entry, as the OCF spec requires.
import DOMPurify from "dompurify";
import { zipSync, type Zippable } from "fflate";
import { ConversionError } from "@/lib/convert-error";
import { detectFormat } from "@/lib/detect";

export interface EpubSource {
  /** File name (used as the chapter title when the content has no heading). */
  name: string;
  /** HTML (Markdown is converted by the caller). */
  html: string;
}

export interface EpubMetadata {
  title: string;
  author: string;
  /** BCP 47 language tag (es, en, pt-BR...). */
  language: string;
  /** Heading of the table of contents, in the book's language. */
  contentsLabel: string;
  /** Fixed in tests; a random urn:uuid otherwise. */
  identifier?: string;
  modified?: Date;
}

const XHTML = "http://www.w3.org/1999/xhtml";
const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" } as const;
type ImageExt = keyof typeof IMAGE_TYPES;

const escapeXml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "");

const purifyConfig = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "link", "form", "button", "textarea", "select", "audio", "video", "source", "track", "picture", "iframe"],
  FORBID_ATTR: ["srcset"],
};

// EPUB 3 content is HTML5: presentational attributes and elements are invalid (EPUBCheck RSC-005).
const OBSOLETE_ATTRIBUTES = ["align", "valign", "bgcolor", "border", "cellpadding", "cellspacing", "frame", "rules", "hspace", "vspace", "nowrap", "clear", "color", "face", "compact", "char", "charoff", "axis", "summary", "background", "noshade", "language", "name"];
const SIZED = new Set(["img", "video", "canvas", "iframe", "embed", "object", "input", "source"]);
const RENAMED: Record<string, string> = { center: "div", font: "span", big: "span", strike: "s", tt: "code", acronym: "abbr", dir: "ul", marquee: "span", blink: "span" };

/** Rewrites HTML4 leftovers as HTML5: align → text-align, obsolete elements renamed, the rest dropped. */
function modernize(root: Element) {
  root.querySelectorAll("a[name]:not([id])").forEach((a) => a.setAttribute("id", a.getAttribute("name")!));
  for (const [from, to] of Object.entries(RENAMED)) {
    root.querySelectorAll(from).forEach((old) => {
      const el = root.ownerDocument.createElement(to);
      for (const attr of Array.from(old.attributes)) el.setAttribute(attr.name, attr.value);
      if (from === "center") el.setAttribute("style", `text-align:center;${el.getAttribute("style") ?? ""}`);
      el.append(...Array.from(old.childNodes));
      old.replaceWith(el);
    });
  }
  root.querySelectorAll("*").forEach((el) => {
    const align = el.getAttribute("align");
    if (align && /^(left|right|center|justify)$/i.test(align) && el.localName !== "img") {
      el.setAttribute("style", `text-align:${align.toLowerCase()};${el.getAttribute("style") ?? ""}`);
    }
    for (const attr of OBSOLETE_ATTRIBUTES) if (!(attr === "name" && el.localName === "meta")) el.removeAttribute(attr);
    if (!SIZED.has(el.localName)) {
      el.removeAttribute("width");
      el.removeAttribute("height");
    }
    if (el.localName === "ol" || el.localName === "ul" || el.localName === "li") {
      if (el.localName !== "ol") el.removeAttribute("type");
    }
  });
}

interface Chapter {
  title: string;
  nodes: Node[];
}

const STYLE = `body{font-family:serif;line-height:1.5;margin:0 5%}h1,h2,h3{font-family:sans-serif;line-height:1.2}
img{max-width:100%}table{border-collapse:collapse}th,td{border:1px solid #999;padding:.2em .5em}pre{white-space:pre-wrap}
blockquote{margin-left:1em;padding-left:1em;border-left:3px solid #999}`;

function decodeDataUrl(src: string): { ext: ImageExt; data: Uint8Array } | null {
  const match = /^data:image\/[a-z+.-]+;base64,([a-z0-9+/=\s]+)$/i.exec(src.trim());
  if (!match) return null;
  let binary: string;
  try {
    binary = atob(match[1]!.replace(/\s+/g, ""));
  } catch {
    return null;
  }
  const data = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  // The real type comes from the bytes: SVG (it can carry scripts) and anything else are left out.
  const format = detectFormat(data.subarray(0, 4096));
  return format && format in IMAGE_TYPES ? { ext: format as ImageExt, data } : null;
}

const baseTitle = (name: string) => name.replace(/\.(md|markdown|html?|txt)$/i, "").trim();
const headingText = (nodes: Node[]) => {
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    const heading = /^h[1-3]$/.test(el.localName) ? el : el.querySelector("h1, h2, h3");
    const text = heading?.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return "";
};

/** A sanitized input split into chapters at its top-level <h1> elements. */
function chaptersOf(source: EpubSource): Chapter[] {
  const clean = DOMPurify.sanitize(source.html.replace(/^﻿/, ""), purifyConfig);
  const body = new DOMParser().parseFromString(`<!doctype html><body>${clean}`, "text/html").body;
  modernize(body);
  // Headings get GitHub-style ids ("Segunda parte" → "segunda-parte"), so Markdown's [link](#segunda-parte) lands.
  const ids = new Set(Array.from(body.querySelectorAll("[id]"), (el) => el.id));
  body.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (heading.id) return;
    const slug = (heading.textContent ?? "").trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-") || "section";
    let id = slug;
    for (let n = 1; ids.has(id); n++) id = `${slug}-${n}`;
    ids.add(id);
    heading.id = id;
  });
  const groups: Node[][] = [[]];
  for (const node of Array.from(body.childNodes)) {
    const startsChapter = node.nodeType === 1 && (node as Element).localName === "h1";
    if (startsChapter && groups.at(-1)!.some((n) => n.nodeType === 1 || n.textContent?.trim())) groups.push([]);
    groups.at(-1)!.push(node);
  }
  return groups
    .filter((nodes) => nodes.some((n) => n.nodeType === 1 || n.textContent?.trim()))
    .map((nodes) => ({ title: headingText(nodes) || baseTitle(source.name), nodes }));
}

const xhtmlPage = (title: string, language: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="${XHTML}" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
${body}
</html>
`;

export function isLanguageTag(tag: string): boolean {
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(tag);
}

/** The EPUB file. Throws "invalidData" when no input has any content. */
export function buildEpub(sources: readonly EpubSource[], meta: EpubMetadata): Uint8Array {
  const language = isLanguageTag(meta.language) ? meta.language : "und";
  const perSource = sources.map(chaptersOf);
  const chapters = perSource.flat();
  if (chapters.length === 0) throw new ConversionError("invalidData");
  const title = meta.title.trim() || chapters[0]!.title || "Ebook";
  const author = meta.author.trim();
  const fileOf = (index: number) => `chapter-${index + 1}.xhtml`;

  const images = new Map<string, { path: string; ext: ImageExt; data: Uint8Array }>();
  const serializer = new XMLSerializer();
  const pages: string[] = [];
  let index = 0;
  for (const sourceChapters of perSource) {
    // Anchors (#id) of one input may now live in another of its chapters.
    const anchorFile = new Map<string, string>();
    sourceChapters.forEach((chapter, i) =>
      chapter.nodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        for (const target of [el, ...Array.from(el.querySelectorAll("[id]"))]) {
          const id = target.getAttribute("id");
          if (id && !anchorFile.has(id)) anchorFile.set(id, fileOf(index + i));
        }
      }),
    );
    for (const chapter of sourceChapters) {
      const doc = chapter.nodes[0]!.ownerDocument!;
      const body = doc.createElementNS(XHTML, "body");
      chapter.nodes.forEach((node) => body.appendChild(node));
      body.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href")!.trim();
        if (/^(https?:|mailto:)/i.test(href)) return;
        const file = href.startsWith("#") ? anchorFile.get(href.slice(1)) : undefined;
        if (file) a.setAttribute("href", `${file}${href}`);
        else a.removeAttribute("href");
      });
      body.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") ?? "";
        let image = images.get(src);
        if (!image) {
          const decoded = decodeDataUrl(src);
          if (decoded) {
            image = { path: `images/image-${images.size + 1}.${decoded.ext}`, ...decoded };
            images.set(src, image);
          }
        }
        if (!image) return void img.replaceWith(doc.createTextNode(img.getAttribute("alt") ?? ""));
        img.setAttribute("src", image.path);
        img.setAttribute("alt", img.getAttribute("alt") ?? "");
      });
      const markup = serializer.serializeToString(body).replace(/^<body xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/, "<body");
      pages.push(xhtmlPage(chapter.title, language, markup));
      index++;
    }
  }

  const identifier = meta.identifier ?? `urn:uuid:${crypto.randomUUID()}`;
  const modified = (meta.modified ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const navItems = chapters.map((c, i) => `<li><a href="${fileOf(i)}">${escapeXml(c.title)}</a></li>`).join("\n");
  const nav = xhtmlPage(
    meta.contentsLabel,
    language,
    `<body>\n<nav epub:type="toc" id="toc">\n<h1>${escapeXml(meta.contentsLabel)}</h1>\n<ol>\n${navItems}\n</ol>\n</nav>\n</body>`,
  );
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${escapeXml(identifier)}"/></head>
<docTitle><text>${escapeXml(title)}</text></docTitle>
<navMap>
${chapters.map((c, i) => `<navPoint id="nav-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(c.title)}</text></navLabel><content src="${fileOf(i)}"/></navPoint>`).join("\n")}
</navMap>
</ncx>
`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">${escapeXml(identifier)}</dc:identifier>
<dc:title>${escapeXml(title)}</dc:title>
${author ? `<dc:creator>${escapeXml(author)}</dc:creator>\n` : ""}<dc:language>${language}</dc:language>
<meta property="dcterms:modified">${modified}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="style" href="style.css" media-type="text/css"/>
${pages.map((_, i) => `<item id="chapter-${i + 1}" href="${fileOf(i)}" media-type="application/xhtml+xml"/>`).join("\n")}
${[...images.values()].map((image, i) => `<item id="image-${i + 1}" href="${image.path}" media-type="${IMAGE_TYPES[image.ext]}"/>`).join("\n")}
</manifest>
<spine toc="ncx">
${pages.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`).join("\n")}
</spine>
</package>
`;
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`;

  const text = (value: string) => new TextEncoder().encode(value);
  // Insertion order is ZIP order: "mimetype" first and stored, as the OCF spec requires.
  const files: Zippable = {
    mimetype: [text("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": text(container),
    "OEBPS/content.opf": text(opf),
    "OEBPS/nav.xhtml": text(nav),
    "OEBPS/toc.ncx": text(ncx),
    "OEBPS/style.css": text(STYLE),
  };
  pages.forEach((page, i) => (files[`OEBPS/${fileOf(i)}`] = text(page)));
  for (const image of images.values()) files[`OEBPS/${image.path}`] = [image.data, { level: 0 }];
  return zipSync(files, { level: 9 });
}
