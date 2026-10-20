export type FaqItem = { q: string; a: string };

/** FAQPage structured data (schema.org) for search engines. */
export function faqPageJsonLd(locale: string, items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** JSON for a `<script type="application/ld+json">`; "<" is escaped to keep </script> out. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
