import { describe, expect, it } from "vitest";
import { aboutJsonLd, aboutSections } from "./about";
import { locales } from "@/i18n/routing";

const load = async (l: string) => (await import(`../../messages/${l}.json`)).default;

describe("About page", () => {
  it("has every section, with the facts, in the 5 languages", async () => {
    for (const l of locales) {
      const m = await load(l);
      expect(m.Footer.about, l).toBeTruthy();
      for (const id of aboutSections) {
        expect(m.About.sections[id].heading, `${l} ${id}`).toBeTruthy();
        expect(m.About.sections[id].body.length, `${l} ${id}`).toBeGreaterThan(0);
      }
      const text = JSON.stringify(m.About);
      expect(text, l).toContain("Juan Pablo Aste");
      expect(text, l).toContain("Vicente López");
      expect(text, l).toContain("AGPL-3.0-or-later");
      expect(text, l).toContain("AdSense");
      expect(m.About.sections.contact.body.join(" "), l).toContain("{email}");
    }
  });

  it("AboutPage schema with the Organization and no street address", () => {
    const ld = aboutJsonLd({ base: "https://fileflect.com", locale: "en", name: "About", description: "d", email: "contact@fileflect.com", source: "" });
    expect(ld["@type"]).toBe("AboutPage");
    expect(ld.mainEntity["@type"]).toBe("Organization");
    expect(ld.mainEntity.founder.name).toBe("Juan Pablo Aste");
    expect(JSON.stringify(ld)).not.toMatch(/streetAddress|postalCode|telephone/);
    expect("sameAs" in ld.mainEntity).toBe(false);
    const withSource = aboutJsonLd({ base: "https://fileflect.com", locale: "es", name: "x", description: "d", email: "e", source: "https://github.com/x/y" });
    expect(withSource.mainEntity.sameAs).toEqual(["https://github.com/x/y"]);
  });
});
