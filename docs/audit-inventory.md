# Inventario real de lo existente (fase 3, auditoría)

Resultado de probar cada herramienta y par de formatos actual con los fixtures de `tests/fixtures/` (ver su README). Leyenda: ✅ funciona y la salida se validó con un lector independiente · ⚠️ funciona con limitaciones · ❌ falla · — no aplica.

## Servidor (tarea 3A.2)

Tests: `tests/inventory/server.test.ts` (72 casos). Pasan los archivos reales por las rutas `/api/convert/image` y `/api/convert/document` y validan el archivo de salida con sharp (formato y dimensiones), con los encabezados BMP/ICO, con pdf-lib (cantidad de páginas) o descomprimiendo el DOCX (texto de cada página). La conversión de oficina usa LibreOffice local en lugar de Gotenberg (es el mismo motor); sin LibreOffice esos casos se saltan.

### Imágenes (respaldo con sharp/libvips)

| Entrada \ Salida | JPG | PNG | WEBP | AVIF | GIF | TIFF | BMP | ICO |
|---|---|---|---|---|---|---|---|---|
| JPG | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PNG | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WEBP | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| AVIF | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| GIF | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| TIFF | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| SVG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

- 49 pares ✅ (dimensiones 160×120; SVG se rasteriza a 144 ppp → 320×240). Redimensionado por porcentaje verificado (PNG → WEBP al 50 % = 80×60).
- HEIC, BMP e ICO **no** se leen en el servidor (libvips precompilado sin HEVC ni BMP/ICO): la API responde 415 y esos formatos solo se convierten en el navegador. Es el comportamiento esperado y documentado en `server-capabilities.ts`.
- Errores: PNG truncado, PNG con basura y JPG truncado → 422 `conversionFailed`; texto con extensión `.jpg` y archivo vacío → 415 `unsupportedFormat`. Respuestas JSON con el código de error (traducido en el cliente).

### Documentos → PDF (Gotenberg / LibreOffice)

| Entrada | Resultado |
|---|---|
| DOCX, DOC, ODT, RTF, TXT | ✅ PDF de 1 página |
| XLSX, XLS, ODS, CSV | ✅ PDF de 1 página |
| PPTX, ODP | ✅ PDF de 2 páginas (una por diapositiva) |
| PPT | ⚠️ sin fixture (LibreOffice exporta ~450 KB); mismo filtro de importación que PPTX, no probado |

- Un archivo aleatorio llamado `.docx` → 415 (la detección por contenido no lo acepta y nunca llega a LibreOffice).
- Tiempo por documento con LibreOffice local: 0,7–1,3 s (en frío, perfil nuevo).

### PDF → Word (pdf.js + docx)

- ✅ `document.pdf` (3 páginas) → DOCX con el texto de las 3 páginas.
- ✅ PDF truncado y PDF con basura → error JSON (4xx) en vez de un DOCX vacío.
- ⚠️ Limitación conocida (ya avisada en la interfaz): solo texto; columnas, tablas e imágenes se simplifican. PDF escaneados → 422 `pdfHasNoText` (se resolverá con OCR, prioridad 8).

## Navegador (tarea 3A.3)

Script: `node scripts/audit/browser.mjs [--json salida.json] [--only jpg,png]` contra un `next start`. Con Playwright (Chromium del entorno) sube cada fixture al conversor de la portada (`/es`), elige cada salida ofrecida, descarga el resultado y lo valida con lectores independientes del código de la app: sharp (formato, dimensiones y que los píxeles decodifiquen), encabezados BMP/ICO (y cada PNG dentro del ICO), pdf-lib (páginas y tamaño) y fflate (ZIP de PDF → imágenes). **Las peticiones a `/api/convert/**` se bloquean**, así que todo lo que figura ✅ se hizo de verdad en el navegador.

### Conversor de imágenes (3A.3a)

| Entrada \ Salida | JPG | PNG | WEBP | AVIF | GIF | BMP | TIFF | ICO | PDF |
|---|---|---|---|---|---|---|---|---|---|
| JPG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PNG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WEBP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AVIF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GIF | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| BMP | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| TIFF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| ICO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| HEIC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SVG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

- 86 pares de imágenes + PDF → JPG y PDF → PNG = **88/88 ✅**, todos sin tocar el servidor. Las dimensiones de salida coinciden con la entrada (160×120; HEIC 120×80; el ICO de entrada se lee en su tamaño mayor, 64×64). "—": recodificar al mismo formato solo se ofrece en JPG/PNG/WEBP/AVIF (donde comprime), a propósito.
- ICO de salida: ícono cuadrado con varios tamaños (16–128 px según la imagen; la imagen se encaja con relleno transparente), cada uno decodifica. Es lo esperado para un favicon.
- Imagen → PDF: 1 página del tamaño de la imagen en puntos.
- PDF → JPG/PNG (`document.pdf`, 3 páginas): ZIP con 3 imágenes de 1239×1754 (A4 a 150 ppp).
- Tiempo (Chromium sin GPU, 4 núcleos): mediana 0,12 s por imagen; AVIF 0,4 s (0,85 s desde HEIC); PDF de 3 páginas → imágenes 0,9 s. Sin errores de JavaScript en la página.

**Archivos corruptos**

| Archivo | Resultado |
|---|---|
| `empty.png` | ✅ "Formato no compatible" al detectar (no se ofrece convertir) |
| `truncated.pdf`, `garbage.pdf` → JPG | ✅ "No se pudo convertir este archivo." en el navegador |
| `text-as.jpg` | ✅ se detecta como TXT por contenido y se ofrece TXT → PDF (servidor), correcto |
| `truncated.png`, `garbage.png` | ⚠️ el navegador falla y **reintenta en el servidor** (sube el archivo roto); el servidor responde 422 y se muestra "No se pudo convertir" (en la auditoría, con el servidor bloqueado, "servicio no disponible"). Funciona, pero sube un archivo que nunca se va a poder convertir → tarea 3A.3c |
| `truncated.jpg` | ❌ **se convierte sin aviso**: el decodificador JPEG del navegador tolera el corte y devuelve una imagen con la parte faltante en gris. El servidor (sharp) sí lo rechaza → tarea 3A.3c |

### Herramientas PDF (3A.3b)

Pendiente.
