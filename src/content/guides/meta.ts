import type { ToolId } from "@/config/tools";
import { locales, type Locale } from "@/i18n/routing";

// Guides: long articles that explain a task step by step with our tools.
// This file holds only what menus, the sitemap and the language switcher need
// (slugs, titles, dates); the article bodies live in ./bodies and are loaded by
// the guide pages only. A guide is published in a language once it has a body
// and an entry in `versions` for it.

/** /es/guias, /en/guides... */
export const guidesSlugs: Record<Locale, string> = {
  es: "guias",
  en: "guides",
  pt: "guias",
  fr: "guides",
  zh: "guides",
};

export interface GuideVersion {
  slug: string;
  title: string;
  /** <meta name="description"> and the summary on the guides index. */
  description: string;
}

export interface GuideMeta {
  id: string;
  /** ISO dates (YYYY-MM-DD). */
  published: string;
  updated: string;
  /** Tools the guide uses, linked at its end. */
  tools: ToolId[];
  /** Other guides to suggest (shown when they exist in the same language). */
  related: string[];
  /** Publish HowTo structured data from the first numbered list. */
  howTo?: boolean;
  /** First screenshot, also the image of the Article structured data. */
  image?: string;
  versions: Partial<Record<Locale, GuideVersion>>;
}

/**
 * Every guide planned for the section. A link to one that is not published yet
 * in a language is rendered as plain text until it is.
 */
export const plannedGuideIds = [
  "pdf-to-word",
  "image-formats",
  "reduce-pdf-size",
  "heic-to-jpg",
  "pdf-table-to-excel",
  "csv-vs-excel",
  "transcribe-audio",
  "read-aloud",
  "sign-pdf",
  "pdf-a",
] as const;

export const guides: GuideMeta[] = [
  {
    id: "pdf-to-word",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["ocr-pdf", "pdf-to-excel", "extract-pdf-images", "edit-pdf", "pdf-to-text", "fill-pdf-form"],
    related: ["reduce-pdf-size", "pdf-table-to-excel", "sign-pdf"],
    howTo: true,
    image: "pdf-a-word-convertir",
    versions: {
      es: {
        slug: "como-pasar-pdf-a-word",
        title: "Cómo pasar un PDF a Word editable (y qué hacer con tablas, escaneos e imágenes)",
        description: "Pasa un PDF a Word para editarlo: qué se conserva, qué cambia y qué herramienta usar si el PDF es escaneado o lo que necesitas son las tablas o las imágenes.",
      },
    },
  },
  {
    id: "image-formats",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["compress-image", "resize-image", "remove-background", "svg-converter"],
    related: ["heic-to-jpg", "reduce-pdf-size"],
    howTo: true,
    image: "formatos-convertir",
    versions: {
      es: {
        slug: "jpg-png-webp-avif-cual-usar",
        title: "JPG, PNG, WebP o AVIF: cuál usar en cada caso",
        description: "Diferencias entre JPG, PNG, WebP y AVIF con pesos medidos en una foto y una captura: cuál conviene para fotos, logos, transparencias y páginas web.",
      },
    },
  },
  {
    id: "reduce-pdf-size",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["compress-pdf", "delete-pdf-pages", "split-pdf", "images-to-pdf", "compress-image", "scan-document"],
    related: ["pdf-to-word", "image-formats", "pdf-a"],
    howTo: true,
    image: "comprimir-pdf-resultado",
    versions: {
      es: {
        slug: "como-reducir-peso-pdf",
        title: "Cómo reducir el peso de un PDF para mandarlo por correo o WhatsApp",
        description: "Qué hace pesado a un PDF y cómo achicarlo sin que deje de leerse: niveles de compresión medidos, qué hacer si no se reduce y cuánto debería pesar.",
      },
    },
  },
];

export function guideById(id: string): GuideMeta | undefined {
  return guides.find((g) => g.id === id);
}

/** Guides published in a language, newest update first. */
export function guidesFor(locale: Locale): GuideMeta[] {
  return guides
    .filter((g) => g.versions[locale])
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id));
}

/** Languages with at least one guide: only those have a guides index. */
export const guideLocales: Locale[] = locales.filter((l) => guidesFor(l).length > 0);

export function guideFromSlug(locale: Locale, slug: string): GuideMeta | undefined {
  return guides.find((g) => g.versions[locale]?.slug === slug);
}

export function guidePath(guide: GuideMeta, locale: Locale): string | undefined {
  const version = guide.versions[locale];
  return version && `/${guidesSlugs[locale]}/${version.slug}`;
}
