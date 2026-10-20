import { describe, expect, it } from "vitest";
import { faqPageJsonLd, jsonLdString } from "./faq";

describe("faqPageJsonLd", () => {
  it("maps questions and answers to schema.org FAQPage", () => {
    const ld = faqPageJsonLd("es", [{ q: "¿Gratis?", a: "Sí." }]);
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "es",
      mainEntity: [
        { "@type": "Question", name: "¿Gratis?", acceptedAnswer: { "@type": "Answer", text: "Sí." } },
      ],
    });
  });

  it("escapes < so the JSON cannot close the script tag", () => {
    const s = jsonLdString(faqPageJsonLd("en", [{ q: "</script>", a: "x" }]));
    expect(s).not.toContain("</script>");
    expect(JSON.parse(s).mainEntity[0].name).toBe("</script>");
  });
});
