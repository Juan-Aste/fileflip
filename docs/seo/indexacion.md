# Qué páginas indexa Google (fase 19.2)

AdSense rechazó el sitio el 2026-11-07 por «Contenido de poco valor». Search Console tenía 991 páginas indexadas, unas 570 de ellas páginas de conversión hechas con la misma plantilla (97 conversiones × 5 idiomas, más las herramientas casi iguales). Para que Google y AdSense vean sobre todo páginas con contenido propio, solo quedan **indexadas** las conversiones que la gente busca de verdad; el resto sigue funcionando igual para quien llega, pero con `<meta name="robots" content="noindex, follow">`, canonical a sí misma y fuera del sitemap.

La fuente de verdad está en `src/config/indexing.ts` (`indexedConversionPairs`, `noindexTools`, `isIndexedCategory`). Los tests (`src/config/indexing.test.ts`, `tests/e2e/seo-urls.spec.ts`) comprueban que el sitemap lista solo las indexables y todas ellas, y que las otras llevan la meta correcta.

## Criterio

No tenemos datos propios de búsqueda (0 impresiones en Search Console) ni acceso a herramientas de volumen pagas, así que el criterio es de sentido común, apoyado en lo que se ve públicamente (las sugerencias de los buscadores y los sitios que compiten por esas búsquedas):

1. **Se indexa** una conversión si cumple al menos una:
   - es un problema cotidiano y frecuente: fotos HEIC del iPhone, imágenes WEBP/AVIF bajadas de la web, PDF ↔ imagen, Office → PDF, PDF → Word;
   - es un par clásico entre formatos comunes (JPG, PNG, GIF, BMP, TIFF, WEBP) en la dirección que la gente necesita (por ejemplo BMP → JPG sí, JPG → BMP no);
   - es un caso de uso concreto: íconos (PNG/JPG → ICO, ICO → PNG), SVG → PNG/JPG/PDF para usar un logo, TIFF → PDF para escaneos.
2. **No se indexa** una conversión si casi nadie la busca o no tiene un uso claro (GIF → BMP, ICO → TIFF, AVIF → ICO, HEIC → GIF, WEBP → TIFF…), aunque funcione bien.
3. **Herramientas**: todas tienen texto propio y siguen indexadas, salvo las casi iguales a otra y con muy poca demanda propia: JSON → TOML, TOML → JSON, Excel → ODS y ODS → Excel (el conversor de hojas de cálculo y JSON ↔ YAML cubren esa necesidad).
4. **Categorías**: se indexan las que tienen al menos 3 herramientas o conversiones. Las de 1 o 2 (subtítulos, fuentes, archivos comprimidos, OCR, 3D y CAD) son casi la misma página que la herramienta y pasan a `noindex, follow`.
5. Las conversiones a MP3/MP4, GIF desde video, CSV ↔ Excel, Excel → CSV, PDF → Excel y PDF → PowerPoint son **herramientas** (no páginas de plantilla) y siguen indexadas. Las páginas long tail de formatos viejos (AVI, WMV, FLV, MPG → MP4; WMA, AMR → MP3) ya tienen texto propio por formato y siguen indexadas.

## Conversiones indexadas (38 por idioma)

| Grupo | Conversiones |
|---|---|
| Fotos del teléfono y de la web | HEIC → JPG, HEIC → PNG, HEIC → PDF, WEBP → JPG, WEBP → PNG, AVIF → JPG, AVIF → PNG |
| Formatos de imagen comunes | JPG → PNG, PNG → JPG, JPG → WEBP, PNG → WEBP, JPG → AVIF, GIF → PNG, GIF → JPG, BMP → JPG, BMP → PNG, TIFF → JPG, TIFF → PDF |
| Íconos y vectores | PNG → ICO, JPG → ICO, ICO → PNG, SVG → PNG, SVG → JPG, SVG → PDF |
| Imágenes y PDF | JPG → PDF, PNG → PDF, PDF → JPG, PDF → PNG |
| Documentos de oficina | PDF → Word, Word → PDF, DOC → PDF, Excel → PDF, XLS → PDF, PowerPoint → PDF, PPT → PDF, ODT → PDF, RTF → PDF, TXT → PDF |

Las otras 59 conversiones (por idioma) quedan `noindex, follow`.

## Totales por idioma (2026-11-07)

| | Antes | Indexadas | `noindex, follow` |
|---|---|---|---|
| Páginas de conversión | 97 | 38 | 59 |
| Herramientas | 103 | 99 | 4 |
| Categorías | 15 | 9 | 6 |

En los 5 idiomas: 69 páginas menos en el sitemap por idioma (345 en total). El resto de las páginas (portada, todas las herramientas, guías, long tail, legales, créditos, contacto) no cambia.

## Cómo cambiarlo

- Para indexar una conversión más: agregar el par a `indexedConversionPairs` **y** escribirle su texto propio (fase 19.2b).
- Una página que pasa a `noindex` no cambia de URL: sigue respondiendo 200 y enlazada desde el sitio (por eso `follow`).
