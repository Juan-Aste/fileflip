import type { FormatId } from "@/config/formats";
import type { ToolId } from "@/config/tools";
import type { ImageOptions } from "@/lib/image/options";
import type { Locale } from "@/i18n/routing";
import { faqPageJsonLd } from "@/lib/faq";

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
    translations: { pt: "heic-jpg-iphone-pt" },
  },
  {
    id: "heic-jpg-iphone-pt",
    locale: "pt",
    slug: "heic-para-jpg-do-iphone",
    title: "Converter fotos HEIC do iPhone para JPG",
    metaTitle: "HEIC para JPG do iPhone: converta suas fotos grátis",
    metaDescription:
      "Converta as fotos HEIC do seu iPhone para JPG em segundos, sem enviar nada para a internet e sem instalar programas. Funciona no Windows, Android e Mac.",
    intro: [
      "Desde o iOS 11, o iPhone salva as fotos em HEIC: elas ocupam metade do espaço de um JPG, mas muitos computadores com Windows, sites e formulários não aceitam esse formato.",
      "Aqui você converte para JPG direto no navegador. As fotos não são enviadas para nenhum servidor, então é privado e rápido, mesmo com dezenas de fotos de uma vez.",
    ],
    widget: { kind: "converter", from: "heic", to: "jpg", options: { quality: 90 } },
    sections: [
      {
        heading: "Como converter várias fotos de uma vez",
        body: [
          "Selecione ou arraste todas as fotos HEIC juntas, escolha JPG e clique em Converter. No final, use “Baixar tudo em ZIP” para salvar tudo em um único arquivo.",
          "A orientação da foto é mantida: se você tirou na vertical, o JPG também fica na vertical.",
        ],
      },
      {
        heading: "E se eu quiser que o iPhone tire fotos em JPG?",
        body: [
          "No iPhone, vá em Ajustes → Câmera → Formatos e escolha “Mais Compatível”. A partir daí as fotos novas são salvas em JPG (ocupando mais espaço). As que já estão em HEIC você pode converter aqui.",
        ],
      },
    ],
    faq: [
      {
        q: "Perco qualidade ao converter HEIC para JPG?",
        a: "A diferença não aparece a olho nu: usamos qualidade JPG alta (90 de 100). Se precisar de um arquivo mais leve, diminua a qualidade em Opções.",
      },
      {
        q: "Minhas fotos são enviadas para a internet?",
        a: "Não. A conversão acontece no seu próprio aparelho, dentro do navegador. As fotos nunca saem do seu computador ou celular.",
      },
      {
        q: "Funciona no Windows e no Android?",
        a: "Sim, em qualquer navegador moderno: Chrome, Edge, Firefox ou Safari, no Windows, Mac, Android ou no próprio iPhone.",
      },
    ],
    translations: { es: "heic-jpg-iphone-es" },
  },
  {
    id: "pdf-afip-es",
    locale: "es",
    slug: "comprimir-pdf-para-afip",
    title: "Comprimir un PDF para subirlo a AFIP (ARCA)",
    metaTitle: "Comprimir PDF para AFIP / ARCA: reduce el peso gratis",
    metaDescription:
      "Achica tus PDF para subirlos a AFIP (ARCA) y otros trámites online sin errores de tamaño. Gratis, sin registro y sin subir tus documentos a ningún servidor.",
    intro: [
      "Muchos formularios de AFIP —hoy ARCA— y de otros organismos rechazan archivos pesados. Lo más común es un PDF escaneado con el celular o con un escáner a máxima resolución: unas pocas páginas pueden pesar decenas de MB.",
      "Esta herramienta reduce el peso recomprimiendo las imágenes del PDF dentro de tu navegador. Tus documentos (DNI, recibos, constancias) nunca salen de tu computadora.",
    ],
    widget: { kind: "tool", tool: "compress-pdf" },
    sections: [
      {
        heading: "¿Qué nivel de compresión elegir?",
        body: [
          "Empieza con “Recomendada”: mantiene el texto legible y suele reducir mucho un escaneo. Si el archivo todavía supera el límite que indica el formulario, prueba “Fuerte”.",
          "Si el PDF es solo texto (por ejemplo, generado por un sistema y no escaneado), normalmente ya es liviano y no se puede reducir mucho más.",
        ],
      },
      {
        heading: "Consejos para que el archivo pese poco desde el principio",
        body: [
          "Al escanear, elige 150 o 200 DPI en lugar de 300 o 600, y escala de grises si el documento no necesita color. Si tienes varias fotos de un documento, únelas con Imágenes a PDF y después comprímelo.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cuánto puede pesar el PDF para AFIP?",
        a: "Depende de cada trámite: el formulario indica el tamaño máximo permitido. Comprime el archivo y verifica que el tamaño final (lo mostramos al terminar) esté por debajo de ese límite.",
      },
      {
        q: "¿El PDF comprimido sigue siendo válido?",
        a: "Sí. Solo se recomprimen las imágenes; el texto, las páginas y el orden quedan iguales.",
      },
      {
        q: "¿Es seguro subir documentos personales?",
        a: "Aquí no se sube nada: la compresión se hace en tu propio dispositivo, dentro del navegador.",
      },
    ],
  },
  {
    id: "foto-dni-es",
    locale: "es",
    slug: "foto-tamano-dni",
    title: "Foto tamaño DNI o carnet (4×4 cm)",
    metaTitle: "Foto tamaño DNI / carnet 4x4: recórtala gratis online",
    metaDescription:
      "Recorta tu foto al tamaño carnet de 4×4 cm (472×472 píxeles a 300 DPI) para formularios, credenciales y trámites online. Gratis y sin subir tu foto.",
    intro: [
      "Muchos formularios, credenciales y trámites online piden subir o imprimir una “foto tamaño DNI” o tipo carnet, en general cuadrada de 4×4 cm.",
      "Sube tu foto y la recortamos desde el centro a 472×472 píxeles, que equivalen a 4×4 cm impresos a 300 DPI. Todo pasa en tu navegador: tu foto no se envía a ningún servidor.",
    ],
    widget: {
      kind: "converter",
      to: "jpg",
      options: { quality: 92, resize: { mode: "cover", width: 472, height: 472 } },
    },
    sections: [
      {
        heading: "Cómo sacar una buena foto tipo carnet",
        body: [
          "Usa un fondo liso y claro, luz de frente (sin sombras en la cara), mirada a la cámara y el rostro centrado. Deja algo de espacio sobre la cabeza: el recorte se hace desde el centro de la imagen.",
          "Si el trámite pide otra medida, abre Opciones y cambia el ancho y el alto en píxeles. Por ejemplo, 3×4 cm a 300 DPI son 354×472 píxeles.",
        ],
      },
      {
        heading: "¿Sirve para el DNI argentino?",
        body: [
          "Para tramitar el DNI en Argentina la foto te la sacan en el momento, en el registro civil o en el centro de documentación. Esta herramienta es útil para todo lo demás que pide una foto tipo carnet: formularios, credenciales, carnés de club o de estudiante, y trámites online.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cuántos píxeles es una foto de 4×4 cm?",
        a: "472×472 píxeles a 300 DPI, la resolución habitual de impresión. Es el tamaño que viene preconfigurado.",
      },
      {
        q: "¿Puedo imprimirla?",
        a: "Sí. Descarga el JPG e imprímelo a 300 DPI (o “tamaño real”) para que mida 4×4 cm.",
      },
      {
        q: "¿Mi foto se sube a internet?",
        a: "No. El recorte y la conversión se hacen en tu dispositivo, dentro del navegador.",
      },
    ],
  },
  {
    id: "pdf-whatsapp-es",
    locale: "es",
    slug: "reducir-pdf-para-whatsapp",
    title: "Reducir el peso de un PDF para enviarlo por WhatsApp",
    metaTitle: "Reducir peso de PDF para WhatsApp: comprímelo gratis",
    metaDescription:
      "Haz tus PDF más livianos para enviarlos por WhatsApp más rápido y gastando menos datos. Gratis, sin registro y sin subir tus archivos.",
    intro: [
      "WhatsApp acepta documentos grandes, pero un PDF pesado tarda en enviarse, consume tus datos móviles y los de quien lo recibe, y a veces ni se descarga con mala señal.",
      "Comprime tu PDF aquí antes de mandarlo: reducimos las imágenes que contiene sin tocar el texto, directamente en tu navegador.",
    ],
    widget: { kind: "tool", tool: "compress-pdf" },
    sections: [
      {
        heading: "Desde el celular también funciona",
        body: [
          "Abre esta página en el navegador del teléfono, elige el PDF desde Archivos o Descargas, comprímelo y compártelo por WhatsApp desde la carpeta de descargas.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Cuánto se reduce un PDF?",
        a: "Depende del contenido. Un escaneo o un PDF con fotos se puede reducir mucho; un PDF solo de texto ya es liviano y casi no cambia.",
      },
      {
        q: "¿Se ve peor el documento?",
        a: "Con el nivel “Recomendada” el texto sigue nítido. Si necesitas más calidad, elige “Baja”; si necesitas el archivo más liviano posible, “Fuerte”.",
      },
      {
        q: "¿Mi PDF se sube a algún servidor?",
        a: "No. La compresión se hace en tu propio dispositivo.",
      },
    ],
  },
  {
    id: "foto-sat-es",
    locale: "es",
    slug: "convertir-foto-para-el-sat",
    title: "Convertir una foto a JPG liviano para el SAT",
    metaTitle: "Convertir foto para el SAT: JPG liviano gratis online",
    metaDescription:
      "Convierte fotos del celular (HEIC, PNG, WEBP) a JPG liviano para subirlas al SAT y otros trámites en México. Gratis, sin registro y sin subir tus archivos.",
    intro: [
      "Algunos trámites del SAT y de otros portales de gobierno en México piden documentos o fotos en JPG y con un peso máximo. Las fotos del celular suelen estar en HEIC o pesar varios MB.",
      "Aquí las conviertes a un JPG más liviano (máximo 1600 píxeles de lado, calidad 80), que conserva el texto legible. Todo ocurre en tu navegador.",
    ],
    widget: {
      kind: "converter",
      to: "jpg",
      options: { quality: 80, resize: { mode: "fit", width: 1600, height: 1600 } },
    },
    sections: [
      {
        heading: "¿Te piden PDF en lugar de JPG?",
        body: [
          "Si el trámite pide PDF, usa Imágenes a PDF para juntar las fotos de tu documento en un solo archivo, y Comprimir PDF si todavía pesa demasiado.",
        ],
      },
    ],
    faq: [
      {
        q: "¿Qué tamaño de archivo acepta el SAT?",
        a: "Varía según el trámite; el portal indica el formato y el peso máximo. Si el JPG sigue siendo grande, baja la calidad o el tamaño en Opciones.",
      },
      {
        q: "¿Puedo convertir fotos del iPhone?",
        a: "Sí, las fotos HEIC del iPhone se convierten a JPG sin problema.",
      },
      {
        q: "¿Mis documentos se suben a internet?",
        a: "No. La conversión ocurre en tu dispositivo, dentro del navegador.",
      },
    ],
  },
  {
    id: "pdf-govbr-pt",
    locale: "pt",
    slug: "pdf-para-gov-br",
    title: "Transformar fotos de documentos em PDF para o gov.br",
    metaTitle: "PDF para o gov.br: junte fotos de documentos em um PDF",
    metaDescription:
      "Junte as fotos do seu RG, CNH ou comprovantes em um único PDF para enviar no gov.br e em outros serviços públicos. Grátis, sem cadastro e sem enviar arquivos.",
    intro: [
      "Muitos serviços do gov.br pedem documentos em PDF. Se você só tem fotos tiradas com o celular (frente e verso do RG, comprovante de residência...), dá para juntar tudo em um único PDF aqui.",
      "Tudo acontece no seu navegador: suas fotos e documentos nunca são enviados para um servidor.",
    ],
    widget: { kind: "tool", tool: "images-to-pdf" },
    sections: [
      {
        heading: "Passo a passo",
        body: [
          "1. Selecione as fotos na ordem certa (dá para reordenar com as setas). 2. Escolha o tamanho A4. 3. Clique em Criar PDF e baixe o arquivo.",
          "Se o serviço tiver limite de tamanho e o PDF ficar grande, use Comprimir PDF depois.",
        ],
      },
      {
        heading: "Dicas para a foto do documento",
        body: [
          "Fotografe com boa luz, sem flash e sobre um fundo escuro e liso, enquadrando só o documento. Assim o texto fica legível e o arquivo, mais leve.",
        ],
      },
    ],
    faq: [
      {
        q: "Posso usar fotos do iPhone (HEIC)?",
        a: "Sim. As fotos HEIC são convertidas automaticamente antes de montar o PDF.",
      },
      {
        q: "Qual o tamanho máximo aceito pelo gov.br?",
        a: "Depende de cada serviço; a página de envio informa o limite. Se precisar, reduza o arquivo com a ferramenta Comprimir PDF.",
      },
      {
        q: "Meus documentos são enviados para a internet?",
        a: "Não. O PDF é criado no seu próprio aparelho, dentro do navegador.",
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
  return faqPageJsonLd(page.locale, page.faq);
}
