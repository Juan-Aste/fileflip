import { beforeEach, describe, expect, it, vi } from "vitest";

const officeToPdf = vi.fn();
vi.mock("@/lib/server/gotenberg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/gotenberg")>()),
  officeToPdf: (...args: unknown[]) => officeToPdf(...args),
}));

const logConversion = vi.fn();
vi.mock("@/lib/server/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/stats")>()),
  logConversion: (...args: unknown[]) => logConversion(...args),
}));

let currentPlan: "free" | "pro" = "free";
vi.mock("@/lib/server/plan", () => ({ requestPlan: async () => ({ plan: currentPlan, signedIn: currentPlan === "pro" }) }));

const { POST } = await import("./route");
const { GotenbergError } = await import("@/lib/server/gotenberg");

function request(file: Blob, name: string, to = "pdf") {
  const form = new FormData();
  form.append("file", file, name);
  form.append("to", to);
  return new Request("http://localhost/api/convert/document", { method: "POST", body: form });
}

const rtf = new Blob(["{\\rtf1\\ansi Hola}"]);

describe("POST /api/convert/document", () => {
  beforeEach(() => {
    officeToPdf.mockReset();
    logConversion.mockReset();
    currentPlan = "free";
  });

  it("converts a document and names the result after the upload", async () => {
    officeToPdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const res = await POST(request(rtf, "Carta ñandú.rtf"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("filename*=UTF-8''Carta%20%C3%B1and%C3%BA.pdf");
    // The service gets a neutral name with the detected extension.
    expect(officeToPdf.mock.calls[0][0].name).toBe("document.rtf");
  });

  it("rejects files whose content is not an office document", async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]);
    const res = await POST(request(png, "fake.docx"));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: "unsupportedFormat" });
    expect(officeToPdf).not.toHaveBeenCalled();
  });

  it("only converts office documents to PDF", async () => {
    const res = await POST(request(rtf, "a.rtf", "docx"));
    expect(res.status).toBe(415);
  });

  it("converts PDF to Word, and explains scanned PDFs", async () => {
    const { makePdf } = await import("../../../../../tests/helpers/pdf");
    const res = await POST(request(new Blob([(await makePdf([300])).slice()]), "scan.pdf", "docx"));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "pdfHasNoText" });
  });

  it("rejects files over the free limit", async () => {
    const big = new Blob([new Uint8Array(16 * 1024 * 1024)]);
    const res = await POST(request(big, "big.txt"));
    expect(res.status).toBe(413);
  });

  it("lets Pro users convert larger files", async () => {
    currentPlan = "pro";
    officeToPdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const big = new Blob(["a".repeat(16 * 1024 * 1024)]);
    const res = await POST(request(big, "big.txt"));
    expect(res.status).toBe(200);
  });

  it("reports service outages separately from bad documents", async () => {
    officeToPdf.mockRejectedValueOnce(new GotenbergError("unavailable", "down"));
    expect((await POST(request(rtf, "a.rtf"))).status).toBe(503);
    officeToPdf.mockRejectedValueOnce(new GotenbergError("failed", "corrupt"));
    expect((await POST(request(rtf, "a.rtf"))).status).toBe(422);
  });

  it("logs the duration and the error code, never the file name", async () => {
    officeToPdf.mockResolvedValueOnce(new TextEncoder().encode("%PDF-1.7"));
    await POST(request(rtf, "Secreto.rtf"));
    officeToPdf.mockRejectedValueOnce(new GotenbergError("unavailable", "down"));
    await POST(request(rtf, "Secreto.rtf"));
    const [ok, failed] = logConversion.mock.calls.map((c) => c[0]);
    expect(ok).toMatchObject({ from: "rtf", to: "pdf", engine: "server", success: true });
    expect(ok.durationMs).toBeGreaterThanOrEqual(0);
    expect(failed).toMatchObject({ success: false, errorCode: "serviceUnavailable" });
    expect(JSON.stringify(logConversion.mock.calls)).not.toContain("Secreto");
  });
});
