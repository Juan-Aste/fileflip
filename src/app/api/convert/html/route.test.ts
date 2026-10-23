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

function request(body: string, name: string) {
  const form = new FormData();
  form.append("file", new Blob([body]), name);
  form.append("to", "pdf");
  form.append("options", JSON.stringify({ pageSize: "letter" }));
  return new Request("http://localhost/api/convert/html", { method: "POST", body: form });
}

describe("POST /api/convert/html", () => {
  beforeEach(() => {
    htmlToPdf.mockReset();
    logConversion.mockReset();
  });

  it("prints the sanitized page", async () => {
    htmlToPdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const res = await POST(request('<title>Factura</title><p onclick="x()">Total</p><script>alert(1)</script>', "factura.html"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("factura.pdf");
    const html = htmlToPdf.mock.calls[0][0] as string;
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("size:letter");
    expect(html).toContain("<p>Total</p>");
    expect(html).not.toMatch(/<script|onclick/);
    expect(logConversion).toHaveBeenCalledWith(expect.objectContaining({ tool: "html-to-pdf", from: "html", to: "pdf", success: true }));
  });

  it("refuses crafted deep nesting without calling Gotenberg", async () => {
    const res = await POST(request("<div>".repeat(3000), "deep.html"));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "fileDamaged" });
    expect(htmlToPdf).not.toHaveBeenCalled();
    // The browser reports it (fileDamaged is not a server-logged code).
    expect(logConversion).not.toHaveBeenCalled();
  });
});
