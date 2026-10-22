import "server-only";

// Client for Gotenberg (LibreOffice and Chromium over HTTP), which runs as a separate
// Railway service reachable over the private network (see DEPLOY.md).

export class GotenbergError extends Error {
  constructor(
    readonly reason: "unavailable" | "failed" | "timeout",
    message: string,
  ) {
    super(message);
    this.name = "GotenbergError";
  }
}

/**
 * Slightly longer than Gotenberg's own `--api-timeout=90s` (docker-compose,
 * DEPLOY.md), so a slow LibreOffice job ends with Gotenberg's error and
 * Gotenberg never keeps working on a request we already dropped.
 */
export function gotenbergTimeoutMs() {
  const fromEnv = Number(process.env.GOTENBERG_TIMEOUT_MS);
  return fromEnv > 0 ? fromEnv : 95_000;
}

function baseUrl() {
  const url = process.env.GOTENBERG_URL;
  if (!url) throw new GotenbergError("unavailable", "GOTENBERG_URL is not set");
  return url.replace(/\/+$/, "");
}

interface RequestOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Converts an office document to PDF with LibreOffice. The file name's
 * extension tells LibreOffice which import filter to use.
 */
export async function officeToPdf(file: { name: string; bytes: Uint8Array }, options: RequestOptions = {}): Promise<Uint8Array> {
  const form = new FormData();
  form.append("files", new Blob([file.bytes as Uint8Array<ArrayBuffer>]), file.name);
  return convert("/forms/libreoffice/convert", form, options);
}

/**
 * Prints an HTML page to PDF with Chromium. The page must be self-contained
 * and inert (see markdown-pdf.ts): Gotenberg runs with JavaScript disabled
 * and every network address denied, and the page's CSP blocks requests too.
 * Its CSS `@page` rule sets the paper size and margins.
 */
export async function htmlToPdf(html: string, options: RequestOptions = {}): Promise<Uint8Array> {
  const form = new FormData();
  form.append("files", new Blob([html], { type: "text/html" }), "index.html");
  form.append("preferCssPageSize", "true");
  form.append("printBackground", "true");
  // Every resource is inline: don't wait for network activity that never comes.
  form.append("skipNetworkIdleEvent", "true");
  return convert("/forms/chromium/convert/html", form, options);
}

export const pdfaStandards = ["PDF/A-1b", "PDF/A-2b", "PDF/A-3b"] as const;
export type PdfaStandard = (typeof pdfaStandards)[number];

/** Rewrites a PDF as archival PDF/A (LibreOffice engine: fonts embedded, color profile, XMP metadata). */
export async function pdfToPdfA(bytes: Uint8Array, standard: PdfaStandard, options: RequestOptions = {}): Promise<Uint8Array> {
  const form = new FormData();
  form.append("files", new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), "document.pdf");
  form.append("pdfa", standard);
  return convert("/forms/pdfengines/convert", form, options);
}

async function convert(
  route: string,
  form: FormData,
  { timeoutMs = gotenbergTimeoutMs(), fetchImpl = fetch }: RequestOptions,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl()}${route}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof GotenbergError) throw error;
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new GotenbergError(timedOut ? "timeout" : "unavailable", String(error));
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // 4xx: the engine could not read the document; 5xx/503: service trouble.
    throw new GotenbergError(response.status >= 500 ? "unavailable" : "failed", `${response.status} ${detail}`.trim());
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function gotenbergHealthy(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${baseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
