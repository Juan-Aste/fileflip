import type { Locale } from "@/i18n/routing";

/** Order of the sections of the About page (messages: About.sections). */
export const aboutSections = ["who", "why", "privacy", "source", "funding", "contact"] as const;

/**
 * AboutPage + Organization structured data (schema.org) for the About page.
 * Only facts already published in the Terms: the person responsible and the
 * city, no street address.
 */
export function aboutJsonLd({
  base,
  locale,
  name,
  description,
  email,
  source,
}: {
  base: string;
  locale: Locale;
  name: string;
  description: string;
  email: string;
  source: string;
}) {
  const organization = {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: "Fileflect",
    url: base,
    logo: { "@type": "ImageObject", url: `${base}/icon.svg` },
    email,
    founder: {
      "@type": "Person",
      name: "Juan Pablo Aste",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Vicente López",
        addressRegion: "Buenos Aires",
        addressCountry: "AR",
      },
    },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email },
    ...(source ? { sameAs: [source] } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name,
    description,
    inLanguage: locale,
    url: `${base}/${locale}/about`,
    mainEntity: organization,
    publisher: { "@id": organization["@id"] },
  };
}
