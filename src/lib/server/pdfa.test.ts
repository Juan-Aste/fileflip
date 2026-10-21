// PDF → PDF/A against a real Gotenberg (GOTENBERG_URL). The output is checked
// independently: XMP identification, embedded fonts, output intent, same
// pages and text (pdf.js). With VERAPDF_DOCKER=1 the files also go through the
// veraPDF reference validator (docker image verapdf/cli, only used for tests).
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";
import { pdfaStandards, pdfToPdfA } from "./gotenberg";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));

async function pageTexts(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    texts.push(((await (await doc.getPage(n)).getTextContent()).items as { str?: string }[]).map((t) => t.str ?? "").join("").replace(/\s+/g, ""));
  }
  return texts;
}

/** Reads the pdfaid part and conformance from the XMP metadata stream. */
function pdfaId(doc: PDFDocument) {
  const metadata = doc.catalog.lookup(PDFName.of("Metadata"));
  const xmp = metadata instanceof PDFRawStream ? new TextDecoder().decode(metadata.contents) : "";
  const part = xmp.match(/pdfaid:part(?:>|=")(\d)/)?.[1];
  const conformance = xmp.match(/pdfaid:conformance(?:>|=")([AB])/i)?.[1];
  return `${part}${conformance?.toLowerCase()}`;
}

/** Every font descriptor carries its font program. */
function fontsEmbedded(doc: PDFDocument) {
  const descriptors = doc.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter((obj): obj is PDFDict => obj instanceof PDFDict && obj.lookup(PDFName.of("Type")) === PDFName.of("FontDescriptor"));
  return descriptors.length > 0 && descriptors.every((d) => ["FontFile", "FontFile2", "FontFile3"].some((k) => d.has(PDFName.of(k))));
}

describe.runIf(process.env.GOTENBERG_URL)("pdfToPdfA with Gotenberg", () => {
  const work = mkdtempSync(join(tmpdir(), "pdfa-"));
  afterAll(() => rmSync(work, { recursive: true, force: true }));

  it.each(pdfaStandards)("%s: identified, fonts embedded, output intent, same pages and text", async (standard) => {
    const input = fixture("document.pdf");
    const out = await pdfToPdfA(input, standard);
    const doc = await PDFDocument.load(out);
    expect(pdfaId(doc)).toBe(standard.slice(6).toLowerCase());
    expect(fontsEmbedded(doc)).toBe(true);
    expect(doc.catalog.lookup(PDFName.of("OutputIntents"))).toBeDefined();
    expect(doc.isEncrypted).toBe(false);
    expect(await pageTexts(out)).toEqual(await pageTexts(input));
    writeFileSync(join(work, `document-${standard.slice(6)}.pdf`), out);
  }, 60_000);

  it("keeps the photos of a PDF with images", async () => {
    const out = await pdfToPdfA(fixture("document-images.pdf"), "PDF/A-1b");
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect((Buffer.from(out).toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length).toBeGreaterThan(0);
    writeFileSync(join(work, "images-1b.pdf"), out);
  }, 60_000);

  it.runIf(process.env.VERAPDF_DOCKER === "1")("passes veraPDF", () => {
    chmodSync(work, 0o755);
    const report = execFileSync("docker", ["run", "--rm", "-v", `${work}:/data`, "verapdf/cli:latest", "--format", "text", "/data"], { encoding: "utf8" });
    const lines = report.split("\n").filter((l) => /^(PASS|FAIL)/.test(l));
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => l.startsWith("PASS"))).toBe(true);
  }, 120_000);
});
