import type { Engine } from "./formats";
import type { Locale } from "@/i18n/routing";

// Standalone tools (PDF operations...), each with its own page and a
// translated slug per language: /es/unir-pdf, /en/merge-pdf, ...

export const toolIds = [
  "merge-pdf",
  "split-pdf",
  "rotate-pdf",
  "organize-pdf",
  "images-to-pdf",
  "compress-pdf",
] as const;

export type ToolId = (typeof toolIds)[number];

export interface ToolInfo {
  id: ToolId;
  engine: Engine;
  icon: string;
  slugs: Record<Locale, string>;
}

export const tools: Record<ToolId, ToolInfo> = {
  "merge-pdf": {
    id: "merge-pdf",
    engine: "browser",
    icon: "🧩",
    slugs: { es: "unir-pdf", en: "merge-pdf", pt: "juntar-pdf", fr: "fusionner-pdf", zh: "merge-pdf" },
  },
  "split-pdf": {
    id: "split-pdf",
    engine: "browser",
    icon: "✂️",
    slugs: { es: "dividir-pdf", en: "split-pdf", pt: "dividir-pdf", fr: "diviser-pdf", zh: "split-pdf" },
  },
  "rotate-pdf": {
    id: "rotate-pdf",
    engine: "browser",
    icon: "🔄",
    slugs: { es: "rotar-pdf", en: "rotate-pdf", pt: "girar-pdf", fr: "pivoter-pdf", zh: "rotate-pdf" },
  },
  "organize-pdf": {
    id: "organize-pdf",
    engine: "browser",
    icon: "🗂️",
    slugs: { es: "ordenar-pdf", en: "organize-pdf", pt: "organizar-pdf", fr: "organiser-pdf", zh: "organize-pdf" },
  },
  "images-to-pdf": {
    id: "images-to-pdf",
    engine: "browser",
    icon: "🖼️",
    slugs: { es: "imagenes-a-pdf", en: "images-to-pdf", pt: "imagens-para-pdf", fr: "images-en-pdf", zh: "images-to-pdf" },
  },
  "compress-pdf": {
    id: "compress-pdf",
    engine: "browser",
    icon: "🗜️",
    slugs: { es: "comprimir-pdf", en: "compress-pdf", pt: "comprimir-pdf", fr: "compresser-pdf", zh: "compress-pdf" },
  },
};

/** Tools with a working implementation (pages for the rest are not generated yet). */
export const availableTools: readonly ToolId[] = ["merge-pdf", "split-pdf", "rotate-pdf"];

export function toolFromSlug(locale: Locale, slug: string): ToolInfo | undefined {
  return Object.values(tools).find((t) => t.slugs[locale] === slug);
}
