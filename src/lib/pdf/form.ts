// Fill PDF forms (AcroForm): list the fields with their pages and boxes, set
// the values and optionally flatten them into the page. Runs in the PDF worker.
import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFString,
  PDFTextField,
  StandardFonts,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  translate,
  type PDFField,
  type PDFFont,
  type PDFForm,
  type PDFObject,
} from "pdf-lib";

export type FormFieldKind = "text" | "checkbox" | "radio" | "dropdown" | "list" | "signature";

export interface FormFieldInfo {
  name: string;
  /** The tooltip (/TU) the form's author wrote, if any: the best label. */
  label?: string;
  kind: FormFieldKind;
  readOnly: boolean;
  /** Text: current value. Checkbox: "true"/"". Radio: chosen option. Lists: chosen options. */
  value: string | string[];
  options?: string[];
  multiline?: boolean;
  maxLength?: number;
  multiselect?: boolean;
  /** A dropdown that also accepts typed text. */
  editable?: boolean;
  /** 0-based page of the first widget (where the field is shown). */
  page?: number;
  widgets: FormWidget[];
}

export interface FormWidget {
  page: number;
  /** Box in PDF points (x1, y1, x2, y2, origin bottom-left), border included. */
  rect: [number, number, number, number];
  /** Radio buttons: the option this button selects. */
  on?: string;
}

export interface FormInfo {
  fields: FormFieldInfo[];
  /** The form also (or only) has an XFA version, which pdf-lib can't fill. */
  xfa: boolean;
}

export type FormValues = Record<string, string | string[] | boolean>;

export interface FillResult {
  bytes: Uint8Array;
  /** Fields whose text the form's font can't draw (Chinese, emoji…): kept editable, not flattened. */
  unsupported: string[];
  /** False when flattening was asked but some field can't be drawn (see `unsupported`). */
  flattened: boolean;
}

/**
 * Opens the document and takes out its XFA version, if any (pdf-lib's
 * getForm() would drop it anyway, with a console warning): XFA readers would
 * otherwise keep showing the XFA data instead of the values we write.
 */
async function load(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  const xfa = !!acroForm?.has(PDFName.of("XFA"));
  if (xfa) acroForm!.delete(PDFName.of("XFA"));
  return { doc, form: doc.getForm(), xfa };
}

function tooltip(field: PDFField): string | undefined {
  const tu = field.acroField.dict.lookup(PDFName.of("TU"));
  const text = tu instanceof PDFString || tu instanceof PDFHexString ? tu.decodeText().trim() : "";
  return text || undefined;
}

function kindOf(field: PDFField): FormFieldKind | null {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "list";
  if (field instanceof PDFSignature) return "signature";
  return null; // push buttons
}

function widgetsOf(field: PDFField, doc: PDFDocument): FormWidget[] {
  const pages = doc.getPages();
  const list: FormWidget[] = [];
  // Radio buttons: the i-th widget selects the i-th option (/Opt, else its on-state name).
  const options = field instanceof PDFRadioGroup ? field.getOptions() : undefined;
  for (const [i, widget] of field.acroField.getWidgets().entries()) {
    let page = pages.findIndex((p) => p.ref === widget.P());
    // Many forms leave out /P: look for the widget in the pages' /Annots.
    if (page < 0) {
      const ref = doc.context.getObjectRef(widget.dict);
      page = ref ? pages.findIndex((p) => p.node.Annots()?.asArray().includes(ref)) : -1;
    }
    if (page < 0) continue;
    const { x, y, width, height } = widget.getRectangle();
    const on = options?.[i];
    list.push({ page, rect: [x, y, x + width, y + height], ...(on !== undefined && { on }) });
  }
  return list;
}

/** The fields of the form, in the document's order. */
export async function readForm(bytes: Uint8Array): Promise<FormInfo> {
  const { doc, form, xfa } = await load(bytes);
  const fields: FormFieldInfo[] = [];
  for (const field of form.getFields()) {
    const kind = kindOf(field);
    if (!kind) continue;
    const widgets = widgetsOf(field, doc);
    const info: FormFieldInfo = { name: field.getName(), label: tooltip(field), kind, readOnly: field.isReadOnly(), value: "", page: widgets[0]?.page, widgets };
    if (field instanceof PDFTextField) {
      info.value = field.getText() ?? "";
      info.multiline = field.isMultiline();
      info.maxLength = field.getMaxLength();
    } else if (field instanceof PDFCheckBox) {
      info.value = field.isChecked() ? "true" : "";
    } else if (field instanceof PDFRadioGroup) {
      info.options = field.getOptions();
      info.value = field.getSelected() ?? "";
    } else if (field instanceof PDFDropdown) {
      info.options = field.getOptions();
      info.value = field.getSelected();
      info.editable = field.isEditable();
      info.multiselect = field.isMultiselect();
    } else if (field instanceof PDFOptionList) {
      info.options = field.getOptions();
      info.value = field.getSelected();
      info.multiselect = field.isMultiselect();
    }
    fields.push(info);
  }
  return { fields, xfa };
}

const list = (value: string | string[] | boolean) => (Array.isArray(value) ? value : value === "" || typeof value === "boolean" ? [] : [value]);

function setValue(field: PDFField, value: string | string[] | boolean) {
  if (field instanceof PDFTextField) {
    const text = String(Array.isArray(value) ? value.join("\n") : value);
    const max = field.getMaxLength();
    field.setText(max !== undefined ? [...text].slice(0, max).join("") : text);
  } else if (field instanceof PDFCheckBox) {
    if (value === true || value === "true") field.check();
    else field.uncheck();
  } else if (field instanceof PDFRadioGroup) {
    const option = list(value)[0];
    if (option && field.getOptions().includes(option)) field.select(option);
    else field.clear();
  } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    const options = field.getOptions();
    const editable = field instanceof PDFDropdown && field.isEditable();
    const chosen = list(value).filter((v) => editable || options.includes(v));
    const multi = field.isMultiselect();
    if (chosen.length === 0) field.clear();
    else field.select(multi ? chosen : chosen[0]!);
  }
}

/**
 * "Auto" font size (0 in /DA) on a multiline field: pdf-lib picks the size
 * that fills the box with the first word (huge, and the rest cut off). Use
 * what fits every line instead, at most 12 pt, as Acrobat does.
 */
function fitMultiline(field: PDFTextField) {
  const sizeIn = (da: string | undefined) => (da ? Number(/([\d.]+)\s+Tf/.exec(da)?.[1] ?? 0) : undefined);
  const lines = Math.max(1, (field.getText() ?? "").split("\n").length);
  for (const widget of field.acroField.getWidgets()) {
    // The widget's /DA wins over the field's.
    const own = widget.getDefaultAppearance();
    const da = own ?? field.acroField.getDefaultAppearance();
    if (!da || sizeIn(da)! > 0) continue;
    const size = Math.max(6, Math.min(12, Math.floor((widget.getRectangle().height - 4) / (lines * 1.2))));
    const fixed = /[\d.]+\s+Tf/.test(da) ? da.replace(/[\d.]+\s+Tf/, `${size} Tf`) : `${da} /Helv ${size} Tf`;
    if (own) widget.setDefaultAppearance(fixed);
    else field.acroField.setDefaultAppearance(fixed);
  }
}

/**
 * Sets the values (by field name; others keep theirs), draws every changed
 * field with its own appearance and, if asked, flattens the form into the pages.
 * An XFA version is dropped, otherwise XFA readers would show its old data.
 */
export async function fillForm(bytes: Uint8Array, values: FormValues, { flatten = false } = {}): Promise<FillResult> {
  const { doc, form } = await load(bytes);
  let font: PDFFont | undefined;
  const unsupported: string[] = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    if (!(name in values) || field.isReadOnly()) continue;
    setValue(field, values[name]!);
    if (field instanceof PDFTextField && field.isMultiline()) fitMultiline(field);
    if (!(field instanceof PDFTextField || field instanceof PDFDropdown || field instanceof PDFOptionList)) continue;
    // Appearances are drawn with Helvetica, which only knows Western characters.
    font ??= await doc.embedFont(StandardFonts.Helvetica);
    try {
      field.updateAppearances(font);
    } catch {
      unsupported.push(name);
    }
  }
  if (unsupported.length) {
    // Readers redraw the fields we couldn't (Acrobat, Chrome, Firefox and Preview do).
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), doc.context.obj(true));
  }
  let flattened = false;
  if (flatten && !unsupported.length) {
    // Fields we didn't touch may have no appearance yet (some generators leave it to the reader).
    form.updateFieldAppearances((font ??= await doc.embedFont(StandardFonts.Helvetica)));
    // An empty signature box has nothing to draw: it just goes away.
    for (const field of form.getFields()) {
      if (field.acroField.getWidgets().some((w) => !w.getAppearances())) form.removeField(field);
    }
    flattenForm(doc, form);
    flattened = true;
  }
  return { bytes: await doc.save({ updateFieldAppearances: false }), unsupported, flattened };
}

/**
 * Draws every widget's appearance into its page and removes the form. Like
 * pdf-lib's flatten(), which leaves the widgets of nested fields ("persona.nombre")
 * in the pages' /Annots pointing to deleted objects: poppler then reports a
 * broken file. Nothing is deleted here; the unused objects are just unreferenced.
 */
function flattenForm(doc: PDFDocument, form: PDFForm) {
  const pages = doc.getPages();
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const ref = doc.context.getObjectRef(widget.dict);
      const page = pages.find((p) => p.ref === widget.P()) ?? (ref ? pages.find((p) => p.node.Annots()?.asArray().includes(ref)) : undefined);
      if (!page) continue;
      if (ref) page.node.removeAnnot(ref);
      let appearance: PDFObject | undefined = widget.getNormalAppearance();
      // Checkboxes and radios: one appearance per state.
      if (appearance instanceof PDFDict) appearance = appearance.get(widget.getAppearanceState() ?? PDFName.of("Off")) ?? appearance.get(PDFName.of("Off"));
      if (!(appearance instanceof PDFRef)) continue;
      const { x, y } = widget.getRectangle();
      const name = page.node.newXObject("FlatWidget", appearance);
      page.pushOperators(pushGraphicsState(), translate(x, y), drawObject(name), popGraphicsState());
    }
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
}
