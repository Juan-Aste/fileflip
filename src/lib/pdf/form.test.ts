// Fixtures written by scripts/fixtures/forms.mjs. Filled forms are read back with
// independent readers: pdf.js (field values, as browsers show them) and poppler
// (pdfinfo for the form type, pdftotext for flattened values).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fillForm, readForm } from "./form";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const dir = mkdtempSync(join(tmpdir(), "form-pdf-"));
let n = 0;
const write = (bytes: Uint8Array) => {
  const path = join(dir, `f${n++}.pdf`);
  writeFileSync(path, bytes);
  return path;
};
const pdftotext = (bytes: Uint8Array, page: number) => execFileSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", write(bytes), "-"], { encoding: "utf8" });
const formType = (bytes: Uint8Array) => /^Form:\s+(.+)$/m.exec(execFileSync("pdfinfo", [write(bytes)], { encoding: "utf8" }))?.[1];

/** Field name → value as pdf.js reads it from the widgets (checkboxes: "Yes"/"Off"). */
async function pdfjsValues(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const values: Record<string, unknown> = {};
  for (let i = 1; i <= doc.numPages; i++) {
    for (const a of await (await doc.getPage(i)).getAnnotations()) if (a.fieldName) values[a.fieldName] ??= a.fieldValue;
  }
  await doc.loadingTask.destroy();
  return values;
}

describe("readForm", () => {
  it("lists every kind of field with its page, box, label and limits", async () => {
    const { fields, xfa } = await readForm(fixture("form-sample.pdf"));
    expect(xfa).toBe(false);
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    expect(fields.map((f) => f.name)).toEqual(["persona.nombre", "persona.cp", "persona.direccion", "folio", "acepto", "plan", "pais", "intereses"]);
    expect(byName["persona.nombre"]).toMatchObject({ kind: "text", label: "Nombre completo", page: 0, multiline: false });
    // The widget box, border included.
    expect(byName["persona.nombre"]!.widgets).toEqual([{ page: 0, rect: [159.5, 714.5, 460.5, 737.5] }]);
    expect(byName["persona.cp"]).toMatchObject({ kind: "text", maxLength: 5 });
    expect(byName["persona.direccion"]).toMatchObject({ multiline: true });
    expect(byName.folio).toMatchObject({ readOnly: true, value: "A-001" });
    expect(byName.acepto).toMatchObject({ kind: "checkbox", value: "", page: 0 });
    expect(byName.plan).toMatchObject({ kind: "radio", options: ["Mensual", "Anual"], page: 1 });
    expect(byName.plan!.widgets.map((w) => w.on)).toEqual(["Mensual", "Anual"]);
    expect(byName.pais).toMatchObject({ kind: "dropdown", label: "Pais de residencia", options: ["Argentina", "Chile", "Espana", "Mexico", "Uruguay"], value: [] });
    expect(byName.intereses).toMatchObject({ kind: "list", multiselect: true, page: 1 });
  });

  it("tells an XFA-only form (no AcroForm fields)", async () => {
    expect(await readForm(fixture("form-xfa.pdf"))).toEqual({ fields: [], xfa: true });
  });

  it("finds no fields in an ordinary PDF", async () => {
    expect((await readForm(fixture("document.pdf"))).fields).toEqual([]);
  });
});

describe("fillForm", () => {
  const values = {
    "persona.nombre": "Ana Pérez",
    "persona.cp": "1234567",
    "persona.direccion": "Calle Falsa 123\nSpringfield",
    folio: "B-999",
    acepto: true,
    plan: "Anual",
    pais: "Chile",
    intereses: ["PDF", "Audio"],
  };

  it("keeps the form editable with the new values", async () => {
    const { bytes, unsupported, flattened } = await fillForm(fixture("form-sample.pdf"), values);
    expect(unsupported).toEqual([]);
    expect(flattened).toBe(false);
    expect(formType(bytes)).toBe("AcroForm");
    expect(await pdfjsValues(bytes)).toMatchObject({
      "persona.nombre": "Ana Pérez",
      // Cut to the field's maximum length.
      "persona.cp": "12345",
      "persona.direccion": "Calle Falsa 123\nSpringfield",
      // Read-only fields keep their value.
      folio: "A-001",
      acepto: "Yes",
      plan: "Anual",
      pais: ["Chile"],
      intereses: ["PDF", "Audio"],
    });
  });

  it("flattens the values into the pages", async () => {
    const { bytes, flattened } = await fillForm(fixture("form-sample.pdf"), values, { flatten: true });
    expect(flattened).toBe(true);
    // No widgets left: the values are page content now.
    expect(await pdfjsValues(bytes)).toEqual({});
    const one = pdftotext(bytes, 1);
    expect(one).toMatch(/Nombre:\s+Ana Pérez/);
    expect(one).toMatch(/Calle Falsa 123[\s\S]*Springfield/);
    expect(one).toContain("A-001");
    expect(pdftotext(bytes, 2)).toMatch(/Pais:\s+Chile/);
    expect((await PDFDocument.load(bytes)).getForm().getFields()).toEqual([]);
    // pdf-lib's own flatten() left dangling widgets here: poppler said "Invalid XRef entry".
    expect(spawnSync("pdfinfo", [write(bytes)], { encoding: "utf8" }).stderr).toBe("");
  });

  it("keeps fields the standard font can't draw editable instead of flattening", async () => {
    const { bytes, unsupported, flattened } = await fillForm(fixture("form-sample.pdf"), { "persona.nombre": "王小明" }, { flatten: true });
    expect(unsupported).toEqual(["persona.nombre"]);
    expect(flattened).toBe(false);
    expect((await pdfjsValues(bytes))["persona.nombre"]).toBe("王小明");
  });

  it("drops the XFA version so readers show the AcroForm values", async () => {
    const { bytes } = await fillForm(fixture("form-xfa.pdf"), {});
    expect(formType(bytes)).not.toBe("XFA");
  });
});
