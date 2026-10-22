import type { Locale } from "@/i18n/routing";
import { conversionPages } from "./conversion-pages";
import type { Conversion } from "./formats";
import { conversionCategory, toolCategories, toolsInCategory, type ToolCategory, type ToolInfo } from "./tools";

// Catalog pages: "all tools" (/es/herramientas) and one page per category
// (/es/herramientas-pdf, /en/pdf-tools, ...). A category only gets a page
// when it has published tools or conversion pages.

export const allToolsSlugs: Record<Locale, string> = {
  es: "herramientas",
  en: "tools",
  pt: "ferramentas",
  fr: "outils",
  zh: "tools",
};

const es: Record<ToolCategory, string> = {
  image: "herramientas-de-imagen",
  pdf: "herramientas-pdf",
  document: "herramientas-de-documentos",
  data: "herramientas-de-datos",
  developer: "herramientas-para-desarrolladores",
  utility: "utilidades",
  subtitle: "herramientas-de-subtitulos",
  font: "herramientas-de-fuentes",
  archive: "archivos-comprimidos",
  ocr: "herramientas-ocr",
  ebook: "herramientas-de-libros-electronicos",
  audio: "herramientas-de-audio",
  video: "herramientas-de-video",
  "3d": "herramientas-3d",
  cad: "herramientas-cad",
};

const en: Record<ToolCategory, string> = {
  image: "image-tools",
  pdf: "pdf-tools",
  document: "document-tools",
  data: "data-tools",
  developer: "developer-tools",
  utility: "utilities",
  subtitle: "subtitle-tools",
  font: "font-tools",
  archive: "archive-tools",
  ocr: "ocr-tools",
  ebook: "ebook-tools",
  audio: "audio-tools",
  video: "video-tools",
  "3d": "3d-tools",
  cad: "cad-tools",
};

const pt: Record<ToolCategory, string> = {
  image: "ferramentas-de-imagem",
  pdf: "ferramentas-pdf",
  document: "ferramentas-de-documentos",
  data: "ferramentas-de-dados",
  developer: "ferramentas-para-desenvolvedores",
  utility: "utilitarios",
  subtitle: "ferramentas-de-legendas",
  font: "ferramentas-de-fontes",
  archive: "arquivos-compactados",
  ocr: "ferramentas-ocr",
  ebook: "ferramentas-de-ebooks",
  audio: "ferramentas-de-audio",
  video: "ferramentas-de-video",
  "3d": "ferramentas-3d",
  cad: "ferramentas-cad",
};

const fr: Record<ToolCategory, string> = {
  image: "outils-image",
  pdf: "outils-pdf",
  document: "outils-documents",
  data: "outils-donnees",
  developer: "outils-developpeurs",
  utility: "utilitaires",
  subtitle: "outils-sous-titres",
  font: "outils-polices",
  archive: "outils-archives",
  ocr: "outils-ocr",
  ebook: "outils-livres-numeriques",
  audio: "outils-audio",
  video: "outils-video",
  "3d": "outils-3d",
  cad: "outils-cao",
};

const slugsByLocale: Record<Locale, Record<ToolCategory, string>> = { es, en, pt, fr, zh: en };

export function categorySlug(category: ToolCategory, locale: Locale): string {
  return slugsByLocale[locale][category];
}

export interface CategoryEntries {
  tools: ToolInfo[];
  conversions: Conversion[];
}

export function categoryEntries(category: ToolCategory): CategoryEntries {
  return {
    tools: toolsInCategory(category),
    conversions: conversionPages.filter((c) => conversionCategory(c) === category),
  };
}

/** Categories with at least one published tool or conversion page, in catalog order. */
export const publishedCategories: readonly ToolCategory[] = toolCategories.filter((c) => {
  const e = categoryEntries(c);
  return e.tools.length + e.conversions.length > 0;
});

export function categoryFromSlug(locale: Locale, slug: string): ToolCategory | undefined {
  return publishedCategories.find((c) => categorySlug(c, locale) === slug);
}
