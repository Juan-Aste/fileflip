import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { protectPdf, type Qpdf } from "@/lib/pdf/password";

const pdfToPdfA = vi.fn();
vi.mock("@/lib/server/gotenberg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/gotenberg")>()),
  pdfToPdfA: (...args: unknown[]) => pdfToPdfA(...args),
}));

const logConversion = vi.fn();
vi.mock("@/lib/server/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/stats")>()),
  logConversion: (...args: unknown[]) => logConversion(...args),
}));

vi.mock("@/lib/server/plan", () => ({ requestPlan: async () => ({ plan: "free", signedIn: true, userId: "test-user" }) }));

const { POST } = await import("./route");
const { GotenbergError } = await import("@/lib/server/gotenberg");

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../../../tests/fixtures", name)));

function request(bytes: Uint8Array, name: string, options: unknown = {}) {
  const form = new FormData();
  form.append("file", new Blob([bytes as Uint8Array<ArrayBuffer>]), name);
  form.append("to", "pdf");
  form.append("options", JSON.stringify(options));
  return new Request("http://localhost/api/convert/pdfa", { method: "POST", body: form });
}

describe("POST /api/convert/pdfa", () => {
  beforeEach(() => {
    pdfToPdfA.mockReset();
    logConversion.mockReset();
  });

  it("converts with the chosen standard (2b by default) and keeps the original's name apart", async () => {
    pdfToPdfA.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const res = await POST(request(fixture("document.pdf"), "Acta ñ.pdf", { standard: "PDF/A-1b" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("Acta%20%C3%B1-pdfa.pdf");
    expect(pdfToPdfA.mock.calls[0][1]).toBe("PDF/A-1b");
    await POST(request(fixture("document.pdf"), "a.pdf", { standard: "PDF/A-4" }));
    expect(pdfToPdfA.mock.calls[1][1]).toBe("PDF/A-2b");
    expect(logConversion).toHaveBeenCalledWith(expect.objectContaining({ tool: "pdf-to-pdfa", success: true }));
  });

  it("explains damaged and encrypted PDFs without calling Gotenberg", async () => {
    expect(await (await POST(request(fixture("corrupt/truncated.pdf"), "t.pdf"))).json()).toEqual({ error: "fileDamaged" });
    const nodeRequire = createRequire(import.meta.url);
    const qpdfJs = nodeRequire.resolve("@neslinesli93/qpdf-wasm");
    const load = async () =>
      (nodeRequire(qpdfJs) as (o: object) => Promise<Qpdf>)({ locateFile: () => join(dirname(qpdfJs), "qpdf.wasm"), print: () => {}, printErr: () => {} });
    const locked = await protectPdf(fixture("document.pdf"), "clave", { print: true, copy: true, modify: true }, load);
    expect(await (await POST(request(locked, "locked.pdf"))).json()).toEqual({ error: "pdfAlreadyProtected" });
    expect((await POST(request(fixture("document.docx"), "fake.pdf"))).status).toBe(415);
    expect(pdfToPdfA).not.toHaveBeenCalled();
    expect(logConversion).not.toHaveBeenCalled();
  });

  it("maps Gotenberg failures", async () => {
    pdfToPdfA.mockRejectedValueOnce(new GotenbergError("unavailable", "down"));
    expect(await (await POST(request(fixture("document.pdf"), "a.pdf"))).json()).toEqual({ error: "serviceUnavailable" });
    pdfToPdfA.mockRejectedValueOnce(new GotenbergError("failed", "400"));
    expect(await (await POST(request(fixture("document.pdf"), "a.pdf"))).json()).toEqual({ error: "conversionFailed" });
  });
});
