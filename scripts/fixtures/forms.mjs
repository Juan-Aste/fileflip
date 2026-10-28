// PDF forms for "Fill PDF form" (tests/fixtures/form-*.pdf), written with
// pdf-lib: an AcroForm on two pages with every kind of field, and an XFA-only
// form (an XFA packet and no AcroForm fields, as LiveCycle Designer saves them).
// Run: node scripts/fixtures/forms.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";

const out = (name) => join(import.meta.dirname, "../../tests/fixtures", name);
const FIXED = new Date("2024-01-01T00:00:00Z");

async function blank() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(FIXED);
  doc.setModificationDate(FIXED);
  return doc;
}

async function acroform() {
  const doc = await blank();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  const label = (page, text, y) => page.drawText(text, { x: 50, y: y + 6, size: 11, font, color: rgb(0, 0, 0) });
  const tip = (field, text) => field.acroField.dict.set(PDFName.of("TU"), PDFString.of(text));

  const one = doc.addPage([595, 842]);
  one.drawText("Fileflect - Formulario de prueba", { x: 50, y: 780, size: 18, font });
  label(one, "Nombre:", 720);
  const name = form.createTextField("persona.nombre");
  tip(name, "Nombre completo");
  name.addToPage(one, { x: 160, y: 715, width: 300, height: 22 });
  label(one, "Codigo postal:", 680);
  const zip = form.createTextField("persona.cp");
  zip.setMaxLength(5);
  zip.addToPage(one, { x: 160, y: 675, width: 100, height: 22 });
  label(one, "Direccion:", 640);
  const address = form.createTextField("persona.direccion");
  address.enableMultiline();
  address.addToPage(one, { x: 160, y: 585, width: 300, height: 60 });
  // "Auto" font size, as most form designers save it.
  for (const da of [address.acroField, ...address.acroField.getWidgets()]) da.setDefaultAppearance("0 0 0 rg /Helvetica 0 Tf");
  label(one, "Folio:", 550);
  const folio = form.createTextField("folio");
  folio.setText("A-001");
  folio.enableReadOnly();
  folio.addToPage(one, { x: 160, y: 545, width: 100, height: 22 });
  label(one, "Acepto las condiciones", 500);
  const agree = form.createCheckBox("acepto");
  agree.addToPage(one, { x: 300, y: 500, width: 16, height: 16 });

  const two = doc.addPage([595, 842]);
  label(two, "Plan:", 760);
  const plan = form.createRadioGroup("plan");
  plan.addOptionToPage("Mensual", two, { x: 160, y: 760, width: 16, height: 16 });
  plan.addOptionToPage("Anual", two, { x: 260, y: 760, width: 16, height: 16 });
  two.drawText("Mensual", { x: 180, y: 764, size: 10, font });
  two.drawText("Anual", { x: 280, y: 764, size: 10, font });
  label(two, "Pais:", 710);
  const country = form.createDropdown("pais");
  country.addOptions(["Argentina", "Chile", "Espana", "Mexico", "Uruguay"]);
  tip(country, "Pais de residencia");
  country.addToPage(two, { x: 160, y: 705, width: 200, height: 22 });
  label(two, "Intereses:", 660);
  const interests = form.createOptionList("intereses");
  interests.addOptions(["PDF", "Imagenes", "Audio", "Video"]);
  interests.enableMultiselect();
  interests.addToPage(two, { x: 160, y: 590, width: 200, height: 76 });
  writeFileSync(out("form-sample.pdf"), await doc.save({ useObjectStreams: false, updateFieldAppearances: false }));
}

async function xfaOnly() {
  const doc = await blank();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Please wait... this form needs a reader that supports XFA.", { x: 50, y: 780, size: 12, font });
  const xfa = doc.context.flateStream(
    '<?xml version="1.0"?><xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"><template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="form1"><field name="nombre"/></subform></template></xdp:xdp>',
  );
  const acroForm = doc.context.obj({ Fields: [], XFA: doc.context.register(xfa) });
  doc.catalog.set(PDFName.of("AcroForm"), doc.context.register(acroForm));
  writeFileSync(out("form-xfa.pdf"), await doc.save({ useObjectStreams: false }));
}

await acroform();
await xfaOnly();
