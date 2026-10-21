// Audit inventory (task 3A.2): every server conversion, end to end through the
// API routes with the real fixtures, checking the OUTPUT file with an
// independent reader (sharp, pdf-lib, fflate) — not just the status code.
//
// Office → PDF needs LibreOffice: the Gotenberg client is replaced by a local
// `soffice --convert-to pdf` (the same engine Gotenberg runs). Those cases are
// skipped when LibreOffice is not installed. SOFFICE names another binary,
// e.g. a wrapper running the soffice of the Gotenberg image.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { afterAll, describe, expect, it, vi } from "vitest";
import { detectFormat } from "@/lib/detect";
import { serverImageInputs, serverImageOutputs } from "@/config/server-capabilities";

const soffice = [process.env.SOFFICE, "soffice", "libreoffice"].filter((bin): bin is string => !!bin).find((bin) => {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
const work = mkdtempSync(join(tmpdir(), "inventory-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

vi.mock("@/lib/server/gotenberg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/gotenberg")>()),
  officeToPdf: async ({ name, bytes }: { name: string; bytes: Uint8Array }) => {
    const dir = mkdtempSync(join(work, "job-"));
    writeFileSync(join(dir, name), bytes);
    execFileSync(soffice!, [`-env:UserInstallation=file://${join(work, "profile")}`, "--headless", "--convert-to", "pdf", "--outdir", dir, join(dir, name)], {
      stdio: "ignore",
      timeout: 120_000,
    });
    return new Uint8Array(readFileSync(join(dir, name.replace(/\.[^.]+$/, ".pdf"))));
  },
}));
vi.mock("@/lib/server/stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/stats")>()),
  logConversion: async () => {},
}));
// Signed in: skips the per-IP rate limit, which this many requests would hit.
vi.mock("@/lib/server/plan", () => ({ requestPlan: async () => ({ plan: "free", signedIn: true }) }));

const { POST: convertImage } = await import("@/app/api/convert/image/route");
const { POST: convertDocument } = await import("@/app/api/convert/document/route");

const fixture = (name: string) => readFileSync(join(__dirname, "..", "fixtures", name));
const fixtureFor: Record<string, string> = {
  jpg: "image.jpg",
  png: "image.png",
  webp: "image.webp",
  avif: "image.avif",
  gif: "image.gif",
  tiff: "image.tiff",
  svg: "image.svg",
};

function post(handler: (r: Request) => Promise<Response>, bytes: Uint8Array, name: string, to: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.append("file", new Blob([bytes.slice()]), name);
  form.append("to", to);
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return handler(new Request("http://localhost/api/convert", { method: "POST", body: form }));
}

/** Width/height of a BMP or of the largest ICO entry, read from the headers. */
function headerSize(bytes: Uint8Array, format: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (format === "bmp") return [view.getInt32(18, true), Math.abs(view.getInt32(22, true))];
  const count = view.getUint16(4, true);
  const sizes = Array.from({ length: count }, (_, n) => bytes[6 + 16 * n] || 256);
  return [Math.max(...sizes), Math.max(...sizes)];
}

describe("server image conversions (sharp)", () => {
  const pairs = serverImageInputs.flatMap((from) => serverImageOutputs.filter((to) => to !== from).map((to) => [from, to] as const));

  it.each(pairs)("%s → %s", async (from, to) => {
    const res = await post(convertImage, fixture(fixtureFor[from]), fixtureFor[from], to);
    expect(res.status).toBe(200);
    const out = new Uint8Array(await res.arrayBuffer());
    expect(detectFormat(out, `out.${to}`)).toBe(to);
    if (to === "bmp" || to === "ico") {
      const [w, h] = headerSize(out, to);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      if (to === "bmp") expect([w, h]).toEqual(from === "svg" ? [320, 240] : [160, 120]);
    } else {
      const meta = await sharp(out).metadata();
      // SVG is rasterized at 144 dpi (2×).
      expect([meta.width, meta.height]).toEqual(from === "svg" ? [320, 240] : [160, 120]);
    }
  });

  it("resizes with the options sent by the client", async () => {
    const res = await post(convertImage, fixture("image.png"), "image.png", "webp", {
      options: JSON.stringify({ quality: 70, resize: { mode: "percent", percent: 50 } }),
    });
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 80, 60]);
  });

  it("refuses inputs sharp cannot read (HEIC, BMP, ICO)", async () => {
    for (const name of ["photo.heic", "image.bmp", "image.ico"]) {
      expect((await post(convertImage, fixture(name), name, "png")).status, name).toBe(415);
    }
  });

  it.each([
    ["corrupt/truncated.png", 422],
    ["corrupt/garbage.png", 422],
    ["corrupt/truncated.jpg", 422],
    ["corrupt/text-as.jpg", 415],
    ["corrupt/empty.png", 415],
  ])("%s fails with HTTP %i", async (name, status) => {
    const res = await post(convertImage, fixture(name), name.split("/")[1], "webp");
    expect(res.status).toBe(status);
    expect(await res.json()).toHaveProperty("error");
  });
});

describe.skipIf(!soffice)("server office → PDF (LibreOffice)", () => {
  it.each([
    ["document.docx", 1],
    ["document.doc", 1],
    ["document.odt", 1],
    ["document.rtf", 1],
    ["text.txt", 1],
    ["table.csv", 1],
    ["spreadsheet.xlsx", 1],
    ["spreadsheet.xls", 1],
    ["spreadsheet.ods", 1],
    ["slides.pptx", 2],
    ["slides.odp", 2],
  ])("%s → PDF with %i page(s)", { timeout: 120_000 }, async (name, pages) => {
    const res = await post(convertDocument, fixture(name), name, "pdf");
    expect(res.status).toBe(200);
    const pdf = await PDFDocument.load(new Uint8Array(await res.arrayBuffer()));
    expect(pdf.getPageCount()).toBe(pages);
  });

  // A PowerPoint 97-2003 file is ~450 KB, too big to keep in the fixtures:
  // it is made here from slides.pptx with the same LibreOffice.
  it("PPT (made from slides.pptx) → PDF with the 2 slides and their text", { timeout: 180_000 }, async () => {
    const dir = mkdtempSync(join(work, "ppt-"));
    writeFileSync(join(dir, "slides.pptx"), fixture("slides.pptx"));
    execFileSync(soffice!, [`-env:UserInstallation=file://${join(work, "profile")}`, "--headless", "--convert-to", "ppt", "--outdir", dir, join(dir, "slides.pptx")], {
      stdio: "ignore",
      timeout: 120_000,
    });
    const ppt = new Uint8Array(readFileSync(join(dir, "slides.ppt")));
    // OLE2 container, not the OOXML zip.
    expect([...ppt.subarray(0, 4)]).toEqual([0xd0, 0xcf, 0x11, 0xe0]);
    const res = await post(convertDocument, ppt, "slides.ppt", "pdf");
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await getDocument({ data: bytes, verbosity: 0 }).promise;
    const text = ((await (await doc.getPage(1)).getTextContent()).items as { str?: string }[]).map((t) => t.str ?? "").join(" ");
    expect(text).toContain("Fileflect slide 1");
  });
});

describe("server PDF → Word", () => {
  it("extracts the text of every page into a DOCX", async () => {
    const res = await post(convertDocument, fixture("document.pdf"), "document.pdf", "docx");
    expect(res.status).toBe(200);
    const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const xml = strFromU8(zip["word/document.xml"]);
    for (const n of [1, 2, 3]) expect(xml).toContain(`Fileflect sample page ${n} of 3`);
  });

  it.each(["corrupt/truncated.pdf", "corrupt/garbage.pdf"])("%s fails with a clear error", async (name) => {
    const res = await post(convertDocument, fixture(name), name.split("/")[1], "docx");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await res.json()).toHaveProperty("error");
  });

  it("rejects a random file named .docx", async () => {
    const res = await post(convertDocument, fixture("corrupt/random-as.docx"), "random-as.docx", "pdf");
    expect(res.status).toBe(415);
  });
});
