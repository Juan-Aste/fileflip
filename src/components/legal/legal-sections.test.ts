import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { legalSections } from "./LegalPage";

const legal = (locale: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../../messages", `${locale}.json`), "utf8")).Legal;
const text = (sections: ReturnType<typeof legalSections>) => JSON.stringify(sections);

describe.each(locales)("legal texts (%s)", (locale) => {
  const { terms, privacy } = legal(locale);

  it("name the person responsible and the contact address", () => {
    for (const doc of [text(legalSections(terms, "terms", false)), text(legalSections(privacy, "privacy", false))]) {
      expect(doc).toContain("Juan Pablo Aste");
      expect(doc).toContain("Vicente López");
      expect(doc).toContain("contact@fileflect.com");
    }
  });

  it("have no internal notes or draft notices", () => {
    expect(JSON.stringify(legal(locale))).not.toMatch(
      /\[(revisar|decidir|definir|consultar)|borrador|BORRADOR|draft|rascunho|brouillon|草稿|TODO/i,
    );
  });

  it("show the Pro sections only with Pro on, and the free service with it off", () => {
    const off = legalSections(terms, "terms", false);
    const on = legalSections(terms, "terms", true);
    expect(off.map((s) => s.heading)).toContain(terms.freeService.heading);
    for (const s of terms.proSections) expect(off.map((x) => x.heading)).not.toContain(s.heading);
    expect(on.map((s) => s.heading)).not.toContain(terms.freeService.heading);
    for (const s of terms.proSections) expect(on.map((x) => x.heading)).toContain(s.heading);
    // Without Pro neither document mentions it or the payment processor.
    for (const doc of [text(off), text(legalSections(privacy, "privacy", false))]) {
      expect(doc).not.toMatch(/\bPro\b|Mercado Pago/);
    }
    expect(text(legalSections(privacy, "privacy", true))).toContain("Mercado Pago");
  });

  it("keep the AAIP notice", () => {
    const legend = legalSections(privacy, "privacy", false).find((s) => s.legend)?.legend;
    expect(legend?.text).toMatch(/25[.,]326/);
    expect(legend?.text).toMatch(
      /Agencia de Acceso a la Información Pública|AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA/,
    );
  });
});
