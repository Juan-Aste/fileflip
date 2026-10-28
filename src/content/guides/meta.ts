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
      pt: {
        slug: "como-converter-pdf-em-word",
        title: "Como converter PDF em Word editável (e o que fazer com tabelas, digitalizações e imagens)",
        description: "Converta um PDF em Word para editar: o que se mantém, o que muda e qual ferramenta usar se o PDF for digitalizado ou se você precisa das tabelas ou das imagens.",
      },
      fr: {
        slug: "comment-convertir-pdf-en-word",
        title: "Comment convertir un PDF en Word modifiable (et que faire des tableaux, des scans et des images)",
        description: "Convertissez un PDF en Word pour le modifier : ce qui est conservé, ce qui change et quel outil utiliser si le PDF est scanné ou si vous voulez ses tableaux ou images.",
      },
      zh: {
        slug: "how-to-convert-pdf-to-word",
        title: "如何把 PDF 转换为可编辑的 Word 文档（以及表格、扫描件和图片该怎么处理）",
        description: "把 PDF 转成 Word 进行编辑：哪些内容会保留、哪些会变化，以及 PDF 是扫描件或你需要的是其中的表格、图片时该用哪个工具。",
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
      pt: {
        slug: "jpg-png-webp-ou-avif-qual-usar",
        title: "JPG, PNG, WebP ou AVIF: qual usar em cada caso",
        description: "As diferenças entre JPG, PNG, WebP e AVIF, com tamanhos medidos numa foto e numa captura de tela: qual serve para fotos, logotipos, transparência e sites.",
      },
      fr: {
        slug: "jpg-png-webp-avif-quel-format-choisir",
        title: "JPG, PNG, WebP ou AVIF : quel format choisir",
        description: "Les différences entre JPG, PNG, WebP et AVIF, poids mesurés sur une photo et une capture d'écran : lequel pour les photos, les logos, la transparence et le web.",
      },
      zh: {
        slug: "jpg-vs-png-vs-webp-vs-avif",
        title: "JPG、PNG、WebP 还是 AVIF：该用哪一种",
        description: "JPG、PNG、WebP 和 AVIF 的区别，附一张照片和一张截图的实测文件大小：照片、标志、透明背景和网站分别适合用哪种格式。",
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
      pt: {
        slug: "como-diminuir-tamanho-de-pdf",
        title: "Como diminuir o tamanho de um PDF para enviar por e-mail ou WhatsApp",
        description: "O que deixa um PDF pesado e como reduzi-lo sem perder a legibilidade: níveis de compressão medidos, o que fazer se não diminuir e quanto ele deve pesar.",
      },
      fr: {
        slug: "comment-reduire-taille-pdf",
        title: "Comment réduire la taille d'un PDF pour l'envoyer par e-mail ou WhatsApp",
        description: "Ce qui alourdit un PDF et comment le réduire sans perdre en lisibilité : niveaux de compression mesurés, que faire s'il ne diminue pas et quel poids viser.",
      },
      zh: {
        slug: "how-to-reduce-pdf-file-size",
        title: "如何减小 PDF 文件大小，方便用邮件或微信发送",
        description: "PDF 为什么会这么大，以及如何在保持清晰可读的前提下把它变小：各压缩级别的实测结果、压不下去时怎么办，以及多大才合适。",
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
      pt: {
        slug: "como-converter-fotos-heic-do-iphone-para-jpg",
        title: "Como converter fotos HEIC do iPhone para JPG",
        description: "O que é HEIC, como converter as fotos do iPhone para JPG sem enviá-las à internet e como fazer o iPhone tirar ou transferir fotos num formato compatível.",
      },
      fr: {
        slug: "convertir-photos-heic-iphone-en-jpg",
        title: "Comment convertir les photos HEIC de l'iPhone en JPG",
        description: "Ce qu'est le HEIC, comment convertir les photos de l'iPhone en JPG sans les envoyer en ligne et comment régler l'iPhone pour avoir des photos compatibles.",
      },
      zh: {
        slug: "how-to-convert-iphone-heic-photos-to-jpg",
        title: "如何把 iPhone 的 HEIC 照片转换为 JPG",
        description: "HEIC 是什么、如何不上传照片就把 iPhone 照片转换为 JPG，以及如何让 iPhone 直接拍摄或导出兼容格式的照片。",
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
      pt: {
        slug: "como-passar-tabela-de-pdf-para-excel",
        title: "Como passar uma tabela de PDF para o Excel",
        description: "Passe a tabela de um extrato, uma nota fiscal ou uma lista de preços em PDF para o Excel com números de verdade: pré-visualização, vírgula decimal e PDFs digitalizados.",
      },
      fr: {
        slug: "convertir-tableau-pdf-en-excel",
        title: "Comment convertir un tableau PDF en Excel",
        description: "Passez le tableau d'un relevé, d'une facture ou d'une liste de prix en PDF dans Excel avec de vrais nombres : aperçu, séparateur décimal et PDF numérisés.",
      },
      zh: {
        slug: "how-to-convert-pdf-table-to-excel",
        title: "如何把 PDF 中的表格转换为 Excel",
        description: "把 PDF 格式的账单、发票或价目表中的表格提取到 Excel，得到可以计算的真正数字：预览、小数分隔符和扫描件的处理。",
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
      pt: {
        slug: "csv-ou-excel-diferencas-e-como-abrir-csv-com-acentos",
        title: "CSV ou Excel: diferenças e como abrir um CSV sem estragar os acentos",
        description: "O que diferencia um CSV de um arquivo do Excel, por que o Excel estraga os acentos ou põe tudo numa coluna, e como abrir e salvar um CSV sem perder dados.",
      },
      fr: {
        slug: "csv-ou-excel-ouvrir-un-csv-correctement",
        title: "CSV ou Excel : différences et comment ouvrir un CSV correctement",
        description: "Ce qui distingue un CSV d'un fichier Excel, pourquoi Excel abîme les accents ou met tout dans une colonne, et comment ouvrir et enregistrer un CSV sans perdre de données.",
      },
      zh: {
        slug: "csv-vs-excel-how-to-open-csv-correctly",
        title: "CSV 和 Excel 的区别，以及如何正确打开 CSV",
        description: "CSV 和 Excel 文件有什么不同，为什么 Excel 打开 CSV 会出现中文乱码或所有内容挤在一列，以及如何打开和保存 CSV 而不丢失数据。",
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
      pt: {
        slug: "como-transcrever-audio-para-texto",
        title: "Como transcrever um áudio ou mensagem de voz para texto de graça",
        description: "Transforme um áudio do WhatsApp, uma gravação ou um vídeo em texto com o Whisper no navegador, sem enviar o arquivo: modelos, velocidade, erros típicos e legendas.",
      },
      fr: {
        slug: "transcrire-audio-en-texte-gratuitement",
        title: "Comment transcrire gratuitement un audio ou un message vocal en texte",
        description: "Transformez un vocal WhatsApp, un enregistrement ou une vidéo en texte avec Whisper dans votre navigateur, sans rien envoyer : modèles, vitesse, erreurs et sous-titres.",
      },
      zh: {
        slug: "how-to-transcribe-audio-to-text",
        title: "如何免费把音频或语音消息转成文字",
        description: "在浏览器中用 Whisper 把录音、语音消息或视频转成文字，音频无需上传：模型选择、转写速度、常见错误和字幕导出。",
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
      pt: {
        slug: "como-fazer-o-computador-ler-texto-em-voz-alta",
        title: "Como fazer o computador ler um texto ou PDF em voz alta",
        description: "Os recursos de leitura em voz alta do Windows, Mac, iPhone e Android, e como ouvir um texto, um PDF ou um Word com a frase destacada e download em MP3.",
      },
      fr: {
        slug: "faire-lire-un-texte-a-voix-haute",
        title: "Comment faire lire un texte ou un PDF à voix haute par l'ordinateur",
        description: "Les fonctions de lecture à voix haute de Windows, Mac, iPhone et Android, et comment écouter un texte, un PDF ou un Word avec surlignage et téléchargement MP3.",
      },
      zh: {
        slug: "how-to-make-your-computer-read-text-aloud",
        title: "如何让电脑朗读文字或 PDF",
        description: "Windows、Mac、iPhone 和安卓自带的朗读功能，以及如何收听一段文字、一份 PDF 或 Word 文件，支持句子高亮和 MP3 下载。",
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
      pt: {
        slug: "como-assinar-pdf-sem-imprimir",
        title: "Como assinar um PDF sem imprimir",
        description: "Coloque a sua assinatura de próprio punho num PDF pelo computador ou celular, sem imprimir nem escanear, e entenda a diferença para uma assinatura digital.",
      },
      fr: {
        slug: "signer-un-pdf-sans-imprimer",
        title: "Comment signer un PDF sans l'imprimer",
        description: "Apposez votre signature manuscrite sur un PDF depuis un ordinateur ou un téléphone, sans imprimer ni scanner, et comprenez la différence avec une signature électronique.",
      },
      zh: {
        slug: "how-to-sign-a-pdf-without-printing-it",
        title: "如何不打印就签署 PDF",
        description: "在电脑或手机上把手写签名放到 PDF 上，无需打印或扫描，并了解它与使用证书的数字签名有什么区别。",
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
      pt: {
        slug: "o-que-e-pdf-a",
        title: "O que é PDF/A e quando ele é exigido",
        description: "O que é o formato PDF/A, quem o exige, qual versão escolher (1b, 2b ou 3b) e como converter um PDF para que ele não seja recusado.",
      },
      fr: {
        slug: "qu-est-ce-que-le-pdf-a",
        title: "Qu'est-ce que le PDF/A et quand faut-il l'utiliser",
        description: "Ce qu'est le format PDF/A, qui l'exige, quelle version choisir (1b, 2b ou 3b) et comment convertir un PDF pour qu'il ne soit pas refusé.",
      },
      zh: {
        slug: "what-is-pdf-a",
        title: "PDF/A 是什么，什么时候需要用它",
        description: "PDF/A 格式是什么、哪些机构要求使用它、该选哪个版本（1b、2b 还是 3b），以及如何转换 PDF 才不会被退回。",
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
