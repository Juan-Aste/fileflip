// Reads an EPUB (2 or 3) in the data worker: the ZIP goes through the hostile
// archive reader (size and entry caps, safe paths, CRC checks), then the OCF
// container and the OPF package are parsed with fast-xml-parser without DTD
// entities (a package declaring any is refused: XXE, "billion laughs").
// Chapters come back as text, in spine order, for the page to sanitize.

import { XMLParser } from "fast-xml-parser";
import { detectArchive, extractArchive, safePath, type ExtractLimits } from "@/lib/archive/extract";
import { ConversionError } from "@/lib/convert-error";
import { decodeText } from "@/lib/data/text";
import { detectFormat } from "@/lib/detect";

/** The whole book is unpacked in memory, then the page builds one HTML file from it. */
export const EPUB_LIMITS: ExtractLimits = { maxBytes: 300 * 1024 * 1024, maxEntries: 5000 };

export interface EpubChapter {
  /** Path inside the EPUB (resolved, safe). */
  path: string;
  html: string;
}

export interface EpubImage {
  path: string;
  mime: string;
  data: Uint8Array;
}

export interface EpubBook {
  title: string;
  creators: string[];
  language: string;
  chapters: EpubChapter[];
  /** Images in the manifest whose content matches their type. */
  images: EpubImage[];
}

const damaged = () => new ConversionError("fileDamaged");

// Font obfuscation (IDPF and Adobe) only scrambles embedded fonts; anything else in encryption.xml is DRM.
const FONT_OBFUSCATION = new Set(["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"]);
const CHAPTER_TYPES = new Set(["application/xhtml+xml", "text/html"]);
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  trimValues: true,
  isArray: (name) => ["rootfile", "item", "itemref", "title", "creator", "language", "EncryptedData"].includes(name),
});

type Node = Record<string, unknown>;
const asNode = (value: unknown): Node => (value && typeof value === "object" && !Array.isArray(value) ? (value as Node) : {});
const values = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined ? [] : [value]);
const asList = (value: unknown): Node[] => values(value).map(asNode);
const textOf = (value: unknown): string =>
  (typeof value === "string" ? value : typeof asNode(value)["#text"] === "string" ? (asNode(value)["#text"] as string) : "").trim();

function parseXml(bytes: Uint8Array | undefined): Node {
  if (!bytes) throw damaged();
  const xml = decodeText(bytes);
  if (/<!ENTITY/i.test(xml)) throw damaged();
  try {
    return asNode(parser.parse(xml));
  } catch {
    throw damaged();
  }
}

/** "Text/chapter%201.xhtml#x" relative to "OEBPS/content.opf" → "OEBPS/Text/chapter 1.xhtml" (null if it leaves the book). */
export function resolveHref(from: string, href: string): string | null {
  const bare = href.replace(/[?#].*$/, "");
  if (!bare || /^[a-z][a-z0-9+.-]*:/i.test(bare)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    decoded = bare;
  }
  const segments = decoded.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return null;
      segments.pop();
    } else segments.push(segment);
  }
  return segments.length ? safePath(segments.join("/")) : null;
}

export function readEpub(bytes: Uint8Array): EpubBook {
  if (detectArchive(bytes) !== "zip") throw new ConversionError("unsupportedFormat");
  const { files } = extractArchive(bytes, "book.epub", EPUB_LIMITS);
  const entries = new Map(files.map((f) => [f.path, f.data]));
  // DRM (Adobe ADEPT, Readium LCP, Apple FairPlay...): the content can't be read.
  if (entries.has("META-INF/rights.xml") || entries.has("META-INF/license.lcpl") || entries.has("META-INF/sinf.xml")) throw new ConversionError("ebookDrm");
  if (entries.has("META-INF/encryption.xml")) {
    const encryption = asNode(parseXml(entries.get("META-INF/encryption.xml")).encryption);
    const algorithms = asList(encryption.EncryptedData).map((d) => String(asNode(d.EncryptionMethod)["@Algorithm"] ?? ""));
    if (algorithms.some((a) => !FONT_OBFUSCATION.has(a))) throw new ConversionError("ebookDrm");
  }

  const container = asNode(asNode(parseXml(entries.get("META-INF/container.xml")).container).rootfiles);
  const rootfile = asList(container.rootfile).find((r) => !r["@media-type"] || r["@media-type"] === "application/oebps-package+xml");
  const opfPath = rootfile && typeof rootfile["@full-path"] === "string" ? resolveHref("", rootfile["@full-path"]) : null;
  if (!opfPath) throw damaged();
  const pkg = asNode(parseXml(entries.get(opfPath)).package);
  const metadata = asNode(pkg.metadata);

  const manifest = new Map<string, { path: string; type: string }>();
  for (const item of asList(asNode(pkg.manifest).item)) {
    const id = item["@id"];
    const href = item["@href"];
    const path = typeof href === "string" ? resolveHref(opfPath, href) : null;
    if (typeof id === "string" && path) manifest.set(id, { path, type: String(item["@media-type"] ?? "").toLowerCase() });
  }

  const chapters: EpubChapter[] = [];
  const seen = new Set<string>();
  for (const ref of asList(asNode(pkg.spine).itemref)) {
    const item = manifest.get(String(ref["@idref"] ?? ""));
    if (!item || !CHAPTER_TYPES.has(item.type) || seen.has(item.path)) continue;
    const data = entries.get(item.path);
    if (!data) continue;
    seen.add(item.path);
    chapters.push({ path: item.path, html: decodeText(data) });
  }
  if (chapters.length === 0) throw damaged();

  const images: EpubImage[] = [];
  for (const { path, type } of manifest.values()) {
    const data = entries.get(path);
    if (!data || !type.startsWith("image/")) continue;
    // The real type comes from the content; a mislabeled or broken file is left out.
    const format = detectFormat(data.subarray(0, 4096), path);
    const mime = format ? IMAGE_TYPES[format] : undefined;
    if (mime) images.push({ path, mime, data });
  }

  const titles = values(metadata.title).map(textOf).filter(Boolean);
  return {
    title: titles[0] ?? "",
    creators: values(metadata.creator).map(textOf).filter(Boolean),
    language: values(metadata.language).map(textOf).find(Boolean) ?? "",
    chapters,
    images,
  };
}
