import { afterEach, describe, expect, it, vi } from "vitest";
import { GotenbergError, htmlToPdf, officeToPdf, pdfToPdfA } from "./gotenberg";

const file = { name: "report.docx", bytes: new Uint8Array([1, 2, 3]) };

describe("officeToPdf", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("posts the file to the LibreOffice route and returns the PDF", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://gotenberg.internal:3000/");
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("http://gotenberg.internal:3000/forms/libreoffice/convert");
      const sent = (init?.body as FormData).get("files") as File;
      expect(sent.name).toBe("report.docx");
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    });
    const pdf = await officeToPdf(file, { fetchImpl: fetchImpl as typeof fetch });
    expect([...pdf]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("fails clearly when not configured", async () => {
    vi.stubEnv("GOTENBERG_URL", "");
    await expect(officeToPdf(file)).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("maps HTTP errors to failure reasons", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://g");
    const respond = (status: number) => (async () => new Response("nope", { status })) as typeof fetch;
    await expect(officeToPdf(file, { fetchImpl: respond(400) })).rejects.toMatchObject({ reason: "failed" });
    await expect(officeToPdf(file, { fetchImpl: respond(503) })).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("reports network errors and timeouts", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://g");
    const refused = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(officeToPdf(file, { fetchImpl: refused })).rejects.toBeInstanceOf(GotenbergError);
    const slow = ((_: unknown, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)))) as typeof fetch;
    await expect(officeToPdf(file, { fetchImpl: slow, timeoutMs: 10 })).rejects.toMatchObject({ reason: "timeout" });
  });
});

describe("htmlToPdf", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("posts the page as index.html to the Chromium route, using its CSS page size", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://g");
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("http://g/forms/chromium/convert/html");
      const form = init?.body as FormData;
      const page = form.get("files") as File;
      expect(page.name).toBe("index.html");
      expect(await page.text()).toBe("<p>hola</p>");
      expect(form.get("preferCssPageSize")).toBe("true");
      return new Response(new Uint8Array([0x25, 0x50]));
    });
    expect([...(await htmlToPdf("<p>hola</p>", { fetchImpl: fetchImpl as typeof fetch }))]).toEqual([0x25, 0x50]);
  });

  it("maps errors like the LibreOffice route", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://g");
    const respond = (status: number) => (async () => new Response("nope", { status })) as typeof fetch;
    await expect(htmlToPdf("x", { fetchImpl: respond(400) })).rejects.toMatchObject({ reason: "failed" });
    await expect(htmlToPdf("x", { fetchImpl: respond(503) })).rejects.toMatchObject({ reason: "unavailable" });
  });
});

describe("pdfToPdfA", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("posts the PDF and the standard to the PDF engines route", async () => {
    vi.stubEnv("GOTENBERG_URL", "http://g");
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("http://g/forms/pdfengines/convert");
      const form = init?.body as FormData;
      expect((form.get("files") as File).name).toBe("document.pdf");
      expect(form.get("pdfa")).toBe("PDF/A-3b");
      return new Response(new Uint8Array([0x25]));
    });
    expect([...(await pdfToPdfA(new Uint8Array([1]), "PDF/A-3b", { fetchImpl: fetchImpl as typeof fetch }))]).toEqual([0x25]);
  });
});
