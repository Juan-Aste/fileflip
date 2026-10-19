import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { makePdf } from "../../../tests/helpers/pdf";
import { PdfHasNoTextError, pdfToDocx } from "./pdf-to-docx";

async function textPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([595, 842]);
  p1.drawText("Informe mensual", { x: 50, y: 780, size: 22, font });
  p1.drawText("Este es el primer parrafo del documento,", { x: 50, y: 740, size: 11, font });
  p1.drawText("que sigue en una segunda linea.", { x: 50, y: 726, size: 11, font });
  const p2 = doc.addPage([595, 842]);
  p2.drawText("Segunda pagina.", { x: 50, y: 780, size: 11, font });
  return doc.save();
}

describe("pdfToDocx", () => {
  it("builds a Word document with headings, paragraphs and page breaks", async () => {
    const docx = await pdfToDocx(await textPdf());
    const xml = strFromU8(unzipSync(new Uint8Array(docx))["word/document.xml"]);
    expect(xml).toContain("Informe mensual");
    expect(xml).toContain("Este es el primer parrafo del documento, que sigue en una segunda linea.");
    expect(xml).toContain("Segunda pagina.");
    expect(xml).toContain('w:type="page"');
    expect(xml).toContain("Heading2");
    // A4 in twips.
    expect(xml).toContain('w:w="11900"');
  });

  it("refuses scanned PDFs without text", async () => {
    await expect(pdfToDocx(await makePdf([300]))).rejects.toBeInstanceOf(PdfHasNoTextError);
  });
});
