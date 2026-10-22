// Base64 of any bytes (files or UTF-8 text) and back, plus URL encoding.
// Works in chunks so a large file never goes through one huge
// String.fromCharCode call (which overflows the stack).

import { ConversionError } from "@/lib/convert-error";
import { invalidData } from "./json";

/** Multiple of 3 bytes, so the base64 of each chunk can simply be concatenated. */
const ENCODE_CHUNK = 3 * 0x8000;
/** Multiple of 4 characters, for the same reason when decoding. */
const DECODE_CHUNK = 4 * 0x8000;

export interface EncodeOptions {
  /** Breaks lines every 76 characters, as MIME (email) expects. */
  wrap: boolean;
  /** Writes a data URL (data:<mime>;base64,...) instead of bare base64. */
  dataUrlMime?: string;
}

export function encodeBase64(bytes: Uint8Array, options: EncodeOptions): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += ENCODE_CHUNK) {
    const chunk = bytes.subarray(i, i + ENCODE_CHUNK);
    let binary = "";
    for (let j = 0; j < chunk.length; j += 0x8000) binary += String.fromCharCode(...chunk.subarray(j, j + 0x8000));
    parts.push(btoa(binary));
  }
  let text = parts.join("");
  if (options.dataUrlMime !== undefined) return `data:${options.dataUrlMime || "application/octet-stream"};base64,${text}`;
  if (options.wrap) text = text.replace(/.{76}(?=.)/g, "$&\n");
  return text;
}

export interface Decoded {
  bytes: Uint8Array;
  /** The media type a data URL declared, if any. */
  mime?: string;
}

const DATA_URL = /^data:([\w.+-]+\/[\w.+-]+)?((?:;[\w-]+=[^;,]*)*);base64,/i;

/**
 * Decodes base64 or a base64 data URL. Accepts line breaks and spaces, the
 * URL-safe alphabet (- and _) and missing padding; anything else is invalid.
 */
export function decodeBase64(input: string): Decoded {
  let text = input.trim();
  let mime: string | undefined;
  const match = DATA_URL.exec(text);
  if (match) {
    mime = match[1]?.toLowerCase();
    text = text.slice(match[0].length);
  }
  text = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw invalidData();
  text = text.replace(/=+$/, "");
  if (text.length % 4 === 1) throw invalidData();
  text += "=".repeat((4 - (text.length % 4)) % 4);
  const out = new Uint8Array((text.length / 4) * 3 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0));
  let offset = 0;
  for (let i = 0; i < text.length; i += DECODE_CHUNK) {
    const binary = atob(text.slice(i, i + DECODE_CHUNK));
    for (let j = 0; j < binary.length; j++) out[offset++] = binary.charCodeAt(j);
  }
  return { bytes: out, mime };
}

/** The bytes as text when they are valid UTF-8 without control characters (other than tabs and line breaks). */
export function asReadableText(bytes: Uint8Array): string | null {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ? null : text;
}

export type UrlScope = "component" | "url";

/** Percent-encodes text: a value (every reserved character) or a whole URL (keeps :/?#&=). */
export function urlEncode(text: string, scope: UrlScope): string {
  try {
    return scope === "component" ? encodeURIComponent(text) : encodeURI(text);
  } catch {
    // Lone surrogates can't be encoded as UTF-8.
    throw invalidData();
  }
}

/** Decodes percent-encoding; `plusIsSpace` for form data (a+b → "a b"). */
export function urlDecode(text: string, plusIsSpace: boolean): string {
  try {
    return decodeURIComponent(plusIsSpace ? text.replace(/\+/g, " ") : text);
  } catch {
    throw new ConversionError("invalidData");
  }
}
