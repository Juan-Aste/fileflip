import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readEpub } from "@/lib/ebook/epub";

// The route runs in Node (undici's Request and FormData); only the browser half of the tool needs a DOM.
const { window } = new JSDOM("");
Object.assign(globalThis, { window, DOMParser: window.DOMParser });
const { epubToHtml } = await import("@/lib/ebook/render");

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

vi.mock("@/lib/server/plan", () => ({ requestPlan: async () => ({ plan: "free", signedIn: true }) }));

const { POST } = await import("./route");

function request(body: string, name: string) {
  const form = new FormData();
  form.append("file", new Blob([body]), name);
  form.append("to", "pdf");
  form.append("options", JSON.stringify({ pageSize: "a4" }));
  return new Request("http://localhost/api/convert/epub", { method: "POST", body: form });
}

describe("POST /api/convert/epub", () => {
  beforeEach(() => {
    htmlToPdf.mockReset();
    logConversion.mockReset();
  });

  it("prints the page the browser assembled, sanitized again: anchors, ids and embedded images survive", async () => {
    htmlToPdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const book = readEpub(new Uint8Array(readFileSync(join(__dirname, "../../../../../tests/fixtures/book.epub"))));
    const page = epubToHtml(book, { images: true, contentsLabel: "Contenido" });
    // A tampered upload: the server must not trust the browser's sanitizing.
    const res = await POST(request(page.replace("</body>", '<img src="https://evil.test/x.png"><script>1</script></body>'), "book.html"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("book.pdf");
    const html = htmlToPdf.mock.calls[0][0] as string;
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<style"));
    expect(html).toContain("size:A4");
    expect(html).toContain('href="#c2-llegada"');
    expect(html).toContain('id="c2-llegada"');
    expect(html.match(/src="data:image\/png;base64,/g)).toHaveLength(2);
    expect(html).toContain("break-before:page");
    expect(html).not.toMatch(/<script|evil\.test/);
    expect(logConversion).toHaveBeenCalledWith(expect.objectContaining({ tool: "epub-to-pdf", from: "epub", to: "pdf", success: true }));
  });

  it("refuses binary uploads without calling Gotenberg", async () => {
    const res = await POST(request("\u0000\u0001PK\u0003\u0004", "book.html"));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(htmlToPdf).not.toHaveBeenCalled();
  });
});
