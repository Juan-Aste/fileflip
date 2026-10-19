import { afterEach, describe, expect, it, vi } from "vitest";
import { GotenbergError, officeToPdf } from "./gotenberg";

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
