import "server-only";
import { parse, serialize, type DefaultTreeAdapterMap } from "parse5";
import { PRINT_CSP, pageRule, type PageSize } from "./markdown-pdf";

// User HTML → an inert page for Gotenberg's Chromium to print. Everything
// that can run code, navigate or make a request is removed (scripts, event
// handlers, meta refresh, base, link, frames, objects, URLs other than inline
// data: images), and the same Content-Security-Policy as Markdown → PDF goes
// first in <head>. Inline <style> is kept: the CSP blocks its url()/@import.

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type ParentNode = DefaultTreeAdapterMap["parentNode"];

export class HtmlTooComplexError extends Error {
  constructor() {
    super("HTML nesting is too deep");
    this.name = "HtmlTooComplexError";
  }
}

/** Chromium itself stops nesting at 512; deeper input is crafted, and parse5 slows down quadratically on it. */
const MAX_DEPTH = 1000;

/** Removed with everything inside them. */
const DROPPED = new Set([
  "script", "noscript", "template", "iframe", "frame", "frameset", "object", "embed", "applet", "portal", "fencedframe",
  "base", "link", "meta", "audio", "video", "source", "track", "canvas",
  // SVG animations can set an href (a request) without any script.
  "animate", "set", "animatemotion", "animatetransform", "discard",
]);
/** Elements whose end tag may be left out (they don't nest without limit). */
const OPTIONAL_END = new Set(["p", "li", "dt", "dd", "tr", "td", "th", "option", "optgroup", "thead", "tbody", "tfoot", "colgroup", "caption", "rb", "rt", "rp", "html", "head", "body"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "param", "keygen"]);

const DATA_IMAGE = /^\s*data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const SAFE_LINK = /^\s*(?:https?:|mailto:|#)/i;
/** Attributes that hold a URL (any of them could make Chromium fetch or navigate). */
const URL_ATTRS = new Set([
  "src", "href", "xlink:href", "srcset", "imagesrcset", "poster", "background", "action", "formaction", "data", "ping",
  "cite", "longdesc", "manifest", "codebase", "lowsrc", "dynsrc", "icon", "profile", "archive", "classid", "usemap",
]);

/** Cheap estimate of the nesting depth before parsing, so crafted input never reaches the parser. */
function roughDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)[^>]*?(\/?)>/g)) {
    const name = match[2].toLowerCase();
    if (VOID.has(name) || OPTIONAL_END.has(name) || match[3]) continue;
    depth = match[1] ? Math.max(0, depth - 1) : depth + 1;
    if (depth > max) max = depth;
  }
  return max;
}

function cleanAttributes(element: Element) {
  element.attrs = element.attrs.filter(({ name, value }) => {
    const attr = name.toLowerCase();
    if (attr.startsWith("on") || attr === "http-equiv" || attr === "srcdoc") return false;
    if (!URL_ATTRS.has(attr)) return true;
    if (attr === "href" && (element.tagName === "a" || element.tagName === "area")) return SAFE_LINK.test(value);
    if (attr === "src" && element.tagName === "img") return DATA_IMAGE.test(value);
    return false;
  });
}

const isElement = (node: Node): node is Element => "tagName" in node;

/** Walks the tree without recursion, dropping unsafe elements and attributes. */
function sanitize(root: ParentNode) {
  const stack: { node: ParentNode; depth: number }[] = [{ node: root, depth: 0 }];
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (depth > MAX_DEPTH) throw new HtmlTooComplexError();
    node.childNodes = node.childNodes.filter((child) => {
      if ("data" in child && child.nodeName === "#comment") return false;
      if (!isElement(child)) return true;
      if (DROPPED.has(child.tagName.toLowerCase())) return false;
      cleanAttributes(child);
      stack.push({ node: child, depth: depth + 1 });
      return true;
    });
  }
}

function element(tagName: string, attrs: Record<string, string>, parentNode: ParentNode, text?: string): Element {
  const el: Element = {
    nodeName: tagName,
    tagName,
    attrs: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    namespaceURI: "http://www.w3.org/1999/xhtml" as Element["namespaceURI"],
    childNodes: [],
    parentNode,
  };
  if (text !== undefined) el.childNodes.push({ nodeName: "#text", value: text, parentNode: el });
  return el;
}

/** A complete, inert HTML page ready to print; the document's own @page rule wins over the chosen size. */
export function htmlToPrintHtml(html: string, { pageSize }: { pageSize: PageSize }): string {
  const source = html.replace(/^﻿/, "");
  if (roughDepth(source) > MAX_DEPTH) throw new HtmlTooComplexError();
  const doc = parse(source);
  sanitize(doc);
  const root = doc.childNodes.find(isElement)!;
  const head = root.childNodes.find((n): n is Element => isElement(n) && n.tagName === "head")!;
  head.childNodes.unshift(
    element("meta", { charset: "utf-8" }, head),
    element("meta", { "http-equiv": "Content-Security-Policy", content: PRINT_CSP }, head),
    element("style", {}, head, `${pageRule(pageSize)}\nhtml{-webkit-print-color-adjust:exact;print-color-adjust:exact}`),
  );
  return serialize(doc);
}
