import { beforeEach, describe, expect, it, vi } from "vitest";

const officeToPdf = vi.fn();
vi.mock("@/lib/server/gotenberg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/gotenberg")>()),
  officeToPdf: (...args: unknown[]) => officeToPdf(...args),
}));

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
  beforeEach(() => officeToPdf.mockReset());

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

  it("only converts to PDF", async () => {
    const res = await POST(request(rtf, "a.rtf", "docx"));
    expect(res.status).toBe(415);
  });

  it("rejects files over the free limit", async () => {
    const big = new Blob([new Uint8Array(16 * 1024 * 1024)]);
    const res = await POST(request(big, "big.txt"));
    expect(res.status).toBe(413);
  });

  it("reports service outages separately from bad documents", async () => {
    officeToPdf.mockRejectedValueOnce(new GotenbergError("unavailable", "down"));
    expect((await POST(request(rtf, "a.rtf"))).status).toBe(503);
    officeToPdf.mockRejectedValueOnce(new GotenbergError("failed", "corrupt"));
    expect((await POST(request(rtf, "a.rtf"))).status).toBe(422);
  });
});
