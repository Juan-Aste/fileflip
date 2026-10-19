import type { FormatId } from "@/config/formats";
import type { ToolId } from "@/config/tools";
import type { ImageOptions } from "@/lib/image/options";
import type { Locale } from "@/i18n/routing";

// Long-tail landing pages for concrete searches ("HEIC a JPG desde iPhone",
// "comprimir PDF para AFIP"...). Each one reuses an existing tool, adds
// useful text and an FAQ (also published as FAQPage structured data).
// To add a page, append an entry: it is picked up by the router and sitemap.
// Regional pages may exist in a single language.

export type LongtailWidget =
  | { kind: "converter"; from?: FormatId; to?: FormatId; options?: ImageOptions }
  | { kind: "tool"; tool: ToolId };

export interface LongtailPage {
  /** Stable id; `translations` point to ids of the same page in other languages. */
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  /** <title> and description for search results. */
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  widget: LongtailWidget;
  sections: { heading: string; body: string[] }[];
  faq: { q: string; a: string }[];
  translations?: Partial<Record<Locale, string>>;
}

export const longtailPages: LongtailPage[] = [
  {
    id: "heic-jpg-iphone-es",
    locale: "es",
    slug: "heic-a-jpg-desde-iphone",
    title: "Pasar fotos HEIC del iPhone a JPG",
    metaTitle: "HEIC a JPG desde iPhone: convierte tus fotos gratis",
    metaDescription:
      "Convierte las fotos HEIC de tu iPhone a JPG en segundos, sin subirlas a internet y sin instalar nada. Funciona en Windows, Android y Mac.",
    intro: [
      "Desde iOS 11, el iPhone guarda las fotos en formato HEIC: ocupan la mitad que un JPG, pero muchas computadoras con Windows, formularios web y trámites no las aceptan.",
      "Con esta herramienta las conviertes a JPG directamente en tu navegador. Tus fotos no se suben a ningún servidor, así que es privado y rápido incluso con decenas de fotos a la vez.",
    ],
    widget: { kind: "converter", from: "heic", to: "jpg", options: { quality: 90 } },
    sections: [
      {
        heading: "Cómo convertir varias fotos a la vez",
        body: [
          "Selecciona o arrastra todas las fotos HEIC juntas, elige JPG y haz clic en Convertir. Cuando terminen, usa “Descargar todo en ZIP” para bajarlas en un solo archivo.",
          "La rotación de la foto se respeta: si la sacaste en vertical, el JPG también queda vertical.",
        ],
      },
      {
        heading: "¿Y si quiero que el iPhone saque fotos en JPG?",
        body: [
          "En el iPhone ve a Ajustes → Cámara → Formatos y elige “Más compatible”. Desde ese momento las fotos nuevas se guardan en JPG (ocupan más espacio). Las que ya tienes en HEIC puedes convertirlas aquí.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Se pierde calidad al pasar de HEIC a JPG?",
        a: "La diferencia no se nota a simple vista: usamos una calidad JPG alta (90 de 100). Si necesitas el archivo más liviano, puedes bajar la calidad en Opciones.",
      },
      {
        q: "¿Mis fotos se suben a internet?",
        a: "No. La conversión ocurre en tu propio dispositivo, dentro del navegador. Las fotos nunca salen de tu computadora o teléfono.",
      },
      {
        q: "¿Funciona en Windows y Android?",
        a: "Sí, en cualquier navegador moderno: Chrome, Edge, Firefox o Safari, en Windows, Mac, Android o el mismo iPhone.",
      },
      {
        q: "¿Cuántas fotos puedo convertir?",
        a: "Gratis puedes convertir hasta 50 fotos por lote, sin límite de lotes. No hace falta crear una cuenta.",
      },
    ],
  },
];

export function longtailFromSlug(locale: Locale, slug: string): LongtailPage | undefined {
  return longtailPages.find((p) => p.locale === locale && p.slug === slug);
}

export function longtailById(id: string): LongtailPage | undefined {
  return longtailPages.find((p) => p.id === id);
}

/** Same page in another language, if it exists. */
export function longtailTranslation(page: LongtailPage, locale: Locale): LongtailPage | undefined {
  if (page.locale === locale) return page;
  const id = page.translations?.[locale];
  return id ? longtailById(id) : undefined;
}

/** FAQPage structured data (schema.org) for search engines. */
export function faqJsonLd(page: LongtailPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: page.locale,
    mainEntity: page.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
