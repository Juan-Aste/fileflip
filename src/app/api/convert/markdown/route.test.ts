import { beforeEach, describe, expect, it, vi } from "vitest";

const htmlToPdf = vi.fn();
vi.mock("@/lib/server/gotenberg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/gotenberg")>()),
  htmlToPdf: (...args: unknown[]) => htmlToPdf(...args),
}));

const logConversion = vi.fn();
vi.mock("@/lib/server/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/stats")>()),
  logConversion: (...args: unknown[]) => logConversion(...args),
}));

vi.mock("@/lib/server/plan", () => ({ requestPlan: async () => ({ plan: "free", signedIn: true, userId: "test-user" }) }));

const { POST } = await import("./route");
const { GotenbergError } = await import("@/lib/server/gotenberg");

function request(file: Blob, name: string, options: unknown = { pageSize: "a4" }, to = "pdf") {
  const form = new FormData();
  form.append("file", file, name);
  form.append("to", to);
  form.append("options", typeof options === "string" ? options : JSON.stringify(options));
  return new Request("http://localhost/api/convert/markdown", { method: "POST", body: form });
}

const markdown = new Blob(["# Título\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>alert(1)</script>"]);
const pdfBytes = new TextEncoder().encode("%PDF-1.7");

describe("POST /api/convert/markdown", () => {
  beforeEach(() => {
    htmlToPdf.mockReset();
    logConversion.mockReset();
  });

  it("prints the rendered Markdown and names the PDF after the upload", async () => {
    htmlToPdf.mockResolvedValue(pdfBytes);
    const res = await POST(request(markdown, "Notas ñ.md", { pageSize: "letter" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("filename*=UTF-8''Notas%20%C3%B1.pdf");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdfBytes);
    const html = htmlToPdf.mock.calls[0][0] as string;
    expect(html).toContain("<title>Título</title>");
    expect(html).toContain("<table>");
    expect(html).toContain("size:letter");
    expect(html).not.toContain("<script");
    expect(logConversion).toHaveBeenCalledWith(expect.objectContaining({ tool: "markdown-to-pdf", from: "md", to: "pdf", engine: "server", success: true, outputSize: 8 }));
  });

  it("decodes Windows-1252 text and ignores unknown page sizes", async () => {
    htmlToPdf.mockResolvedValue(pdfBytes);
    const res = await POST(request(new Blob([new Uint8Array([0x23, 0x20, 0x43, 0x61, 0x66, 0xe9])]), "a.md", { pageSize: "../a3" }));
    expect(res.status).toBe(200);
    const html = htmlToPdf.mock.calls[0][0] as string;
    expect(html).toContain("<h1>Café</h1>");
    expect(html).toContain("size:A4");
  });

  it("rejects binary files, other outputs, bad options and files over the tool's limit", async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]);
    expect((await POST(request(png, "fake.md"))).status).toBe(415);
    expect((await POST(request(markdown, "a.md", {}, "docx"))).status).toBe(415);
    expect(await (await POST(request(markdown, "a.md", "{nope"))).json()).toEqual({ error: "invalidRequest" });
    const big = new Blob(["a".repeat(5 * 1024 * 1024 + 1)]);
    expect(await (await POST(request(big, "big.md"))).json()).toEqual({ error: "fileTooLarge" });
    expect(htmlToPdf).not.toHaveBeenCalled();
    expect(logConversion).not.toHaveBeenCalled();
  });

  it("reports service trouble and failed prints, and logs them", async () => {
    htmlToPdf.mockRejectedValueOnce(new GotenbergError("unavailable", "down"));
    const down = await POST(request(markdown, "a.md"));
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({ error: "serviceUnavailable" });
    htmlToPdf.mockRejectedValueOnce(new GotenbergError("failed", "400"));
    expect(await (await POST(request(markdown, "a.md"))).json()).toEqual({ error: "conversionFailed" });
    expect(logConversion.mock.calls.map(([e]) => e.errorCode)).toEqual(["serviceUnavailable", "conversionFailed"]);
  });
});
