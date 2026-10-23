// Shared helpers for the browser tests: a page with the conversion API
// blocked (browser tools must not need it), fixture uploads, running a tool
// until it downloads or shows an error, and independent validators for the
// output (they never use the app's own code).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export { expect };

export const fixturePath = (name: string) => join(__dirname, "..", "fixtures", name);

interface Fixtures {
  /** URLs of /api/convert requests the page tried (they are aborted). */
  serverCalls: string[];
}

/**
 * `page` with the conversion API blocked and uncaught page errors failing
 * the test.
 */
export const test = base.extend<Fixtures>({
  serverCalls: async ({ context }, provide) => {
    const calls: string[] = [];
    await context.route("**/api/convert/**", (route) => {
      calls.push(route.request().url());
      return route.abort();
    });
    // Stats beacons are fire-and-forget; keep them out of the server logs.
    await context.route("**/api/stats", (route) => route.fulfill({ status: 204 }));
    await context.route("**/api/visit", (route) => route.fulfill({ status: 204 }));
    await provide(calls);
  },
  page: async ({ page, serverCalls }, provide) => {
    void serverCalls;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await provide(page);
    expect(errors, "uncaught errors on the page").toEqual([]);
  },
});

/** Opens a page and picks fixtures in its first file input, waiting for format detection. */
export async function openWithFiles(page: Page, path: string, files: readonly string[]) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files.map(fixturePath));
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 15_000 });
}

/** Next.js adds an empty role="alert" route announcer outside <main>. */
export const toolAlert = (page: Page) => page.locator("main [role=alert]");

export type RunResult = { error: string } | { error?: undefined; buf: Buffer; name: string };

/**
 * Clicks the action button and waits for a download link (inside `scope`)
 * or an error; returns the downloaded file or the error text.
 */
export async function runTool(
  page: Page,
  action: string,
  { scope = page.locator("main"), error = toolAlert(page) }: { scope?: Locator; error?: Locator } = {},
): Promise<RunResult> {
  await page.getByRole("button", { name: action, exact: true }).click();
  return waitForResult(page, scope.locator("a[download]").first(), error.first());
}

export async function waitForResult(page: Page, link: Locator, error: Locator, timeout = 45_000): Promise<RunResult> {
  await Promise.race([link.waitFor({ timeout }), error.waitFor({ timeout })]);
  if (!(await link.count()) || !(await link.isVisible())) return { error: (await error.innerText()).trim() };
  const name = (await link.getAttribute("download")) ?? "";
  try {
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15_000 }), link.click()]);
    return { buf: readFileSync((await download.path())!), name: download.suggestedFilename() };
  } catch {
    // Under parallel load Chromium sometimes never reports a blob download;
    // read the same bytes from the link so the output is still checked.
    test.info().annotations.push({ type: "download", description: "read from the link's blob URL" });
    const base64 = await link.evaluate(async (a: HTMLAnchorElement) => {
      const bytes = new Uint8Array(await (await fetch(a.href)).arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    });
    return { buf: Buffer.from(base64, "base64"), name };
  }
}

/** Fails with the tool's error message when it did not produce a file. */
export function fileOf(result: RunResult) {
  if (result.error !== undefined) throw new Error(`expected a file, got error: ${result.error}`);
  return result;
}

// ---- Independent validators ----

export interface PdfInfo {
  pages: number;
  rotations: number[];
  /** Distinct page sizes in points, "W×H". */
  sizes: string[];
  /** The "page N of M" label of each page of the fixtures, or "?". */
  labels: string[];
  images: number;
}

export async function inspectPdf(buf: Buffer): Promise<PdfInfo> {
  const doc = await PDFDocument.load(buf);
  const pages = doc.getPages();
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const js = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const labels: string[] = [];
  for (let i = 1; i <= js.numPages; i++) {
    const items = (await (await js.getPage(i)).getTextContent()).items as { str?: string }[];
    labels.push(items.map((t) => t.str ?? "").join(" ").match(/page (\d+ of \d+)/)?.[1] ?? "?");
  }
  return {
    pages: pages.length,
    rotations: pages.map((p) => p.getRotation().angle),
    sizes: [...new Set(pages.map((p) => p.getSize()).map(({ width, height }) => `${Math.round(width)}×${Math.round(height)}`))],
    labels,
    images: (buf.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length,
  };
}

export interface ImageInfo {
  format: string;
  width: number;
  height: number;
  pages?: number;
  entries?: number;
}

/** Format and dimensions of an image (or PDF) file, decoding the pixels. */
export async function inspectImage(buf: Buffer): Promise<ImageInfo> {
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return { format: "bmp", width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) };
  }
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const count = buf.readUInt16LE(4);
    let best = { width: 0, height: 0 };
    for (let i = 0; i < count; i++) {
      const e = 6 + i * 16;
      const width = buf[e] || 256;
      const height = buf[e + 1] || 256;
      const data = buf.subarray(buf.readUInt32LE(e + 12), buf.readUInt32LE(e + 12) + buf.readUInt32LE(e + 8));
      // Each PNG entry must decode.
      if (data[0] === 0x89) await sharp(data).raw().toBuffer();
      if (width > best.width) best = { width, height };
    }
    return { format: "ico", entries: count, ...best };
  }
  if (buf.subarray(0, 4).toString() === "%PDF") {
    const doc = await PDFDocument.load(buf);
    const { width, height } = doc.getPages()[0].getSize();
    return { format: "pdf", pages: doc.getPageCount(), width: Math.round(width), height: Math.round(height) };
  }
  const meta = await sharp(buf, { animated: true }).metadata();
  await sharp(buf).raw().toBuffer();
  const names: Record<string, string> = { jpeg: "jpg", heif: meta.compression === "av1" ? "avif" : "heic" };
  return { format: names[meta.format!] ?? meta.format!, width: meta.width!, height: meta.pageHeight ?? meta.height! };
}

/** ZIP entries sorted by name. */
export function unzipEntries(buf: Buffer): { name: string; data: Buffer }[] {
  return Object.entries(unzipSync(new Uint8Array(buf)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => ({ name, data: Buffer.from(data) }));
}

/** UTF-8 text without a BOM. */
export const readText = (buf: Buffer) => buf.toString("utf8").replace(/^﻿/, "");
export const readJson = (buf: Buffer): unknown => JSON.parse(readText(buf));

/** Minimal RFC 4180 reader (quotes, escaped quotes, newlines in fields), independent of the app. */
export function readCsv(buf: Buffer, delimiter = ","): string[][] {
  const text = readText(buf);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  return rows;
}
