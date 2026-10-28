// PDFs with tables for "PDF to Excel" (tests/fixtures/table-*.pdf), written
// with pdf-lib and the standard Helvetica font: each cell is its own text run,
// as word processors and invoicing systems write them. Numbers are right-aligned.
// Run: node scripts/fixtures/tables.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const out = (name) => join(import.meta.dirname, "../../tests/fixtures", name);

/**
 * Draws a table: `columns` are [x, width, align]; a null cell is left empty.
 * Returns the y below the table.
 */
function table(page, font, { top, columns, rows, size = 10, rowHeight = 18, lines = true }) {
  let y = top;
  for (const [i, row] of rows.entries()) {
    const bold = i === 0;
    row.forEach((cell, c) => {
      if (cell === null) return;
      const [x, width, align] = columns[c];
      const w = font.widthOfTextAtSize(cell, size);
      const at = align === "right" ? x + width - 4 - w : x + 4;
      page.drawText(cell, { x: at, y, size, font, color: bold ? rgb(0, 0, 0.4) : rgb(0, 0, 0) });
    });
    if (lines) page.drawLine({ start: { x: columns[0][0], y: y - 5 }, end: { x: columns.at(-1)[0] + columns.at(-1)[1], y: y - 5 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
    y -= rowHeight;
  }
  return y;
}

async function simple() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(new Date("2024-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2024-01-01T00:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Fileflect - Price list", { x: 50, y: 780, size: 18, font });
  page.drawText("Synthetic data for automated tests.", { x: 50, y: 755, size: 10, font });
  const y = table(page, font, {
    top: 710,
    columns: [[50, 70, "left"], [120, 200, "left"], [320, 80, "right"], [400, 60, "right"], [460, 85, "right"]],
    rows: [
      ["Code", "Product", "Price", "Qty", "Total"],
      ["007", "Coffee beans", "3.25", "2", "6.50"],
      ["A-12", "Green tea", "9.50", "1", "9.50"],
      ["B-3", "Dark chocolate", "1,250.75", "10", "12,507.50"],
      ["C-44", "Café con leche", "0.10", "120", "12.00"],
    ],
  });
  page.drawText("Prices in US dollars. Thank you for your purchase.", { x: 50, y: y - 30, size: 10, font });
  writeFileSync(out("table-simple.pdf"), await doc.save({ useObjectStreams: false }));
}

async function pages() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(new Date("2024-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2024-01-01T00:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const columns = [[50, 90, "left"], [140, 200, "left"], [340, 100, "right"], [440, 100, "right"]];
  const header = ["Fecha", "Concepto", "Débito", "Crédito"];
  const data = [
    [["02/01/2024", "Saldo inicial", null, "1.500,00"], ["05/01/2024", "Supermercado", "84,35", null], ["09/01/2024", "Transferencia recibida", null, "12.000,50"], ["15/01/2024", "Farmacia", "1.234,56", null]],
    [["20/01/2024", "Luz", "8.765,40", null], ["22/01/2024", "Reintegro", null, "15,00"], ["28/01/2024", "Comisión", "0,99", null]],
  ];
  for (const [i, rows] of data.entries()) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Extracto de cuenta - página ${i + 1} de ${data.length}`, { x: 50, y: 790, size: 14, font });
    table(page, font, { top: 740, columns, rows: [header, ...rows] });
    page.drawText(`Página ${i + 1}`, { x: 280, y: 40, size: 9, font });
  }
  writeFileSync(out("table-pages.pdf"), await doc.save({ useObjectStreams: false }));
}

async function two() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(new Date("2024-01-01T00:00:00Z"));
  doc.setModificationDate(new Date("2024-01-01T00:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Informe trimestral", { x: 50, y: 790, size: 16, font });
  page.drawText("Ventas por región", { x: 50, y: 750, size: 12, font });
  let y = table(page, font, {
    top: 720,
    lines: false,
    columns: [[50, 150, "left"], [200, 90, "right"], [290, 90, "right"], [380, 90, "right"]],
    rows: [["Región", "Enero", "Febrero", "Marzo"], ["Norte", "1 250,5", "980", "1 100"], ["Sur", "860", null, "905,25"], ["Centro", "2 010", "1 990,75", "2 300"]],
  });
  page.drawText("El mes de febrero no tiene datos para la región Sur porque cerró la sucursal.", { x: 50, y: y - 20, size: 10, font });
  page.drawText("Personal", { x: 50, y: y - 70, size: 12, font });
  table(page, font, {
    top: y - 100,
    lines: false,
    columns: [[50, 150, "left"], [200, 120, "left"], [320, 60, "right"]],
    rows: [["Nombre", "Área", "Años"], ["Ana Pérez", "Ventas", "4"], ["Luis Gómez", "Logística", "12"]],
  });
  writeFileSync(out("table-two.pdf"), await doc.save({ useObjectStreams: false }));
}

await simple();
await pages();
await two();
