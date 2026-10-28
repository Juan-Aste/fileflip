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
      en: {
        slug: "how-to-convert-pdf-to-word",
        title: "How to convert a PDF to an editable Word document (and what to do with tables, scans and images)",
        description: "Convert a PDF to Word to edit it: what is kept, what changes and which tool to use if the PDF is scanned or what you need are its tables or images.",
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
      en: {
        slug: "jpg-vs-png-vs-webp-vs-avif",
        title: "JPG, PNG, WebP or AVIF: which one to use",
        description: "The differences between JPG, PNG, WebP and AVIF, with sizes measured on a photo and a screenshot: which suits photos, logos, transparency and websites.",
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
      en: {
        slug: "how-to-reduce-pdf-file-size",
        title: "How to reduce a PDF's size to send it by email or WhatsApp",
        description: "What makes a PDF heavy and how to shrink it while keeping it readable: measured compression levels, what to do if it won't shrink and how small it should be.",
      },
    },
  },
  {
    id: "heic-to-jpg",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["images-to-pdf", "compress-image", "remove-exif", "resize-image"],
    related: ["image-formats", "reduce-pdf-size"],
    howTo: true,
    image: "heic-convertir",
    versions: {
      es: {
        slug: "como-pasar-fotos-heic-iphone-a-jpg",
        title: "Cómo pasar fotos HEIC del iPhone a JPG",
        description: "Qué es HEIC, cómo convertir las fotos del iPhone a JPG sin subirlas a internet y cómo hacer que el iPhone saque o pase las fotos en un formato compatible.",
      },
      en: {
        slug: "how-to-convert-iphone-heic-photos-to-jpg",
        title: "How to convert iPhone HEIC photos to JPG",
        description: "What HEIC is, how to convert iPhone photos to JPG without uploading them and how to make the iPhone take or transfer photos in a compatible format.",
      },
    },
  },
  {
    id: "pdf-table-to-excel",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["pdf-to-excel", "ocr-pdf", "merge-excel", "excel-to-csv"],
    related: ["csv-vs-excel", "pdf-to-word"],
    howTo: true,
    image: "pdf-excel-vista-previa",
    versions: {
      es: {
        slug: "como-pasar-tabla-pdf-a-excel",
        title: "Cómo pasar una tabla de un PDF a Excel",
        description: "Extrae la tabla de un extracto, una factura o una lista de precios en PDF a Excel con números de verdad: vista previa, coma decimal y PDF escaneados.",
      },
      en: {
        slug: "how-to-convert-pdf-table-to-excel",
        title: "How to convert a table from a PDF to Excel",
        description: "Extract the table from a statement, an invoice or a price list in PDF to Excel with real numbers: preview, decimal separators and scanned PDFs.",
      },
    },
  },
  {
    id: "csv-vs-excel",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["csv-to-excel", "excel-to-csv", "merge-excel", "excel-to-json"],
    related: ["pdf-table-to-excel"],
    howTo: true,
    image: "excel-csv-opciones",
    versions: {
      es: {
        slug: "csv-o-excel-diferencias-abrir-csv-con-acentos",
        title: "CSV o Excel: diferencias y cómo abrir un CSV con acentos",
        description: "Qué diferencia a un CSV de un Excel, por qué Excel muestra mal los acentos o pone todo en una columna, y cómo abrir y guardar un CSV sin perder datos.",
      },
      en: {
        slug: "csv-vs-excel-how-to-open-csv-correctly",
        title: "CSV vs Excel: differences and how to open a CSV correctly",
        description: "What sets a CSV apart from an Excel file, why Excel garbles accents or puts everything in one column, and how to open and save a CSV without losing data.",
      },
    },
  },
  {
    id: "transcribe-audio",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["audio-to-text", "trim-audio", "subtitle-sync", "text-to-speech"],
    related: ["read-aloud"],
    howTo: true,
    image: "transcribir-resultado",
    versions: {
      es: {
        slug: "como-transcribir-audio-o-nota-de-voz-a-texto",
        title: "Cómo transcribir un audio o una nota de voz a texto gratis",
        description: "Pasa a texto una nota de voz de WhatsApp, una grabación o un video con Whisper en tu navegador, sin subir el audio: modelos, velocidad, errores típicos y subtítulos.",
      },
      en: {
        slug: "how-to-transcribe-audio-to-text",
        title: "How to transcribe audio or a voice message to text for free",
        description: "Turn a WhatsApp voice message, a recording or a video into text with Whisper in your browser, without uploading it: models, speed, typical errors and subtitles.",
      },
    },
  },
  {
    id: "read-aloud",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["text-to-speech", "ocr-pdf", "audio-to-text"],
    related: ["transcribe-audio", "pdf-to-word"],
    howTo: true,
    image: "leer-en-voz-alta",
    versions: {
      es: {
        slug: "como-hacer-que-la-computadora-lea-un-texto-o-pdf",
        title: "Cómo hacer que la computadora te lea un texto o un PDF",
        description: "Las funciones de lectura en voz alta de Windows, Mac, iPhone y Android, y cómo escuchar un texto, un PDF o un Word con resaltado y descarga en MP3.",
      },
      en: {
        slug: "how-to-make-your-computer-read-text-aloud",
        title: "How to make your computer read a text or a PDF aloud",
        description: "The read-aloud features of Windows, Mac, iPhone and Android, and how to listen to a text, a PDF or a Word file with highlighting and MP3 download.",
      },
    },
  },
  {
    id: "sign-pdf",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["sign-pdf", "edit-pdf", "fill-pdf-form", "protect-pdf"],
    related: ["pdf-a", "reduce-pdf-size", "pdf-to-word"],
    howTo: true,
    image: "firmar-pdf-colocar",
    versions: {
      es: {
        slug: "como-firmar-un-pdf-sin-imprimirlo",
        title: "Cómo firmar un PDF sin imprimirlo",
        description: "Pon tu firma manuscrita en un PDF desde la computadora o el celular, sin imprimir ni escanear, y entiende en qué se diferencia de una firma digital.",
      },
      en: {
        slug: "how-to-sign-a-pdf-without-printing-it",
        title: "How to sign a PDF without printing it",
        description: "Put your handwritten signature on a PDF from a computer or a phone, without printing or scanning, and understand how it differs from a digital signature.",
      },
    },
  },
  {
    id: "pdf-a",
    published: "2026-10-28",
    updated: "2026-10-28",
    tools: ["pdf-to-pdfa", "unlock-pdf", "compress-pdf", "merge-pdf"],
    related: ["sign-pdf", "reduce-pdf-size"],
    howTo: true,
    image: "pdfa-opciones",
    versions: {
      es: {
        slug: "que-es-pdf-a-y-cuando-lo-piden",
        title: "Qué es PDF/A y cuándo lo piden en un trámite",
        description: "Qué es el formato PDF/A, quién lo exige, qué versión elegir (1b, 2b o 3b) y cómo convertir un PDF sin que lo rechacen.",
      },
      en: {
        slug: "what-is-pdf-a",
        title: "What PDF/A is and when you need it",
        description: "What the PDF/A format is, who requires it, which version to choose (1b, 2b or 3b) and how to convert a PDF so it isn't rejected.",
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
