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

Pendiente.
