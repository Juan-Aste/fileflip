# Informe de la fase 10

Fecha: 2026-10-28. Rama `dev`. Fase pedida por el dueño el 2026-10-28: paquete Excel, utilidades de texto, editar y rellenar PDF, PDF a PowerPoint, transcripción de audio y video, guías y verificación final. El detalle tarea por tarea está en `PROGRESS.md`; el informe de catálogo anterior, en `docs/report-phase3.md`.

## 1. Catálogo

- **101 herramientas publicadas** (83 al empezar la fase; 18 nuevas) + el conversor de formatos con **97 páginas de conversión**. Todas procesan archivos reales y tienen pruebas que validan la salida con lectores independientes.
- Todas las nuevas funcionan **en el navegador** (el archivo no sale del dispositivo) y lo dicen en la página.

| Bloque | Herramienta | URL (es) | Validación de la salida en los tests |
|---|---|---|---|
| 10A Excel | Excel a CSV | `/es/excel-a-csv` | CSV leído byte a byte (separador, BOM) |
| | CSV a Excel | `/es/csv-a-excel` | XLSX leído con openpyxl / LibreOffice |
| | XLS a XLSX | `/es/xls-a-xlsx` | LibreOffice |
| | Excel a ODS | `/es/excel-a-ods` | LibreOffice |
| | ODS a Excel | `/es/ods-a-excel` | LibreOffice |
| | Excel a JSON | `/es/excel-a-json` | JSON parseado (tipos, fechas ISO) |
| | JSON a Excel | `/es/json-a-excel` | openpyxl / XML del archivo |
| | PDF a Excel | `/es/pdf-a-excel` | XLSX leído con un lector independiente, PDFs de ejemplo propios |
| | Unir Excel | `/es/unir-excel` | LibreOffice |
| | Separar hojas | `/es/separar-hojas-excel` | ZIP y cada libro con LibreOffice |
| 10B Texto | Mayúsculas y minúsculas | `/es/convertir-mayusculas-minusculas` | texto esperado por idioma |
| | Comparar textos | `/es/comparar-textos` | diferencias y parche `.diff` |
| | Quitar líneas duplicadas | `/es/quitar-lineas-duplicadas` | texto esperado |
| | Generador lorem ipsum | `/es/generador-lorem-ipsum` | cantidad de párrafos, frases y palabras |
| 10C PDF | Editar PDF | `/es/editar-pdf` | poppler (`pdftotext`, `pdfinfo`) y pdf.js |
| | Rellenar formulario PDF | `/es/rellenar-formulario-pdf` | pdf.js y poppler, aplanado |
| | PDF a PowerPoint | `/es/pdf-a-powerpoint` | LibreOffice abre el PPTX (una diapositiva por página) |
| 10D Audio | Transcribir audio a texto | `/es/transcribir-audio-a-texto` | modelo real; SRT/VTT leídos por ffmpeg |

## 2. Guías

- Sección nueva: `/es/guias`, `/en/guides`, `/pt/guias`, `/fr/guides`, `/zh/guides`, con índice, footer, sitemap, breadcrumbs, tabla de contenidos, autor «Equipo de Fileflect», fechas, JSON-LD Article/HowTo/BreadcrumbList y anuncios solo en la columna lateral y al final del artículo.
- **10 guías en 5 idiomas (50 páginas)**, de 865 a 1266 palabras (1620–1782 caracteres en chino), con capturas reales de cada idioma tomadas con Playwright (`scripts/guides/screenshots.mjs`). Los datos citados (pesos de imagen, compresión de PDF, velocidad de la transcripción) se midieron con nuestras herramientas.

## 3. Modelos de transcripción

| Modelo | Descarga | PC (min de audio por min) | Celular gama media estimado |
|---|---|---|---|
| Rápido (Whisper `tiny`, 8 bits) | 43 MB | 3,8 | 0,9 |
| Preciso (Whisper `base`, 8 bits) | 79 MB | 2,3 | 0,5 |

Límite: 30 minutos de audio. Pesos desde Hugging Face con commit y SHA-256 fijos, guardados en la Cache API. Detalle en `docs/transcripcion.md`.

## 4. Dependencias nuevas

- `diff` (jsdiff) 9.0.0, BSD-3-Clause (Comparar textos).
- Modelos Whisper `tiny` y `base` (MIT, OpenAI; ONNX de onnx-community), descargados al usarlos.
- Nada más: PDF a PowerPoint arma el PPTX con fflate (sin pptxgenjs) y la transcripción usa el onnxruntime-web existente (sin `@huggingface/transformers`, ver `docs/transcripcion.md`). `npm run licenses` pasa; sin GPL/AGPL ni licencias no comerciales.

## 5. Verificación final (10F.1)

Pendiente: se completa en la tarea 10F.1.

## 6. Despliegue

- Sin variables, servicios ni cambios de CSP nuevos en Railway. La CSP no define `connect-src`; si algún día se agrega, incluir `https://huggingface.co` y `https://*.hf.co` (voz IA y transcripción).
- Archivos públicos nuevos: `public/guides/*.webp` (capturas de las guías).
- Política de privacidad: Hugging Face figura ahora también para la transcripción (el audio no se envía).

## 7. Pendientes conocidos

- El lector de CSV no decodifica GBK: los CSV guardados por Excel en chino se ven mal en CSV a Excel (la guía en chino lo explica y propone importar desde Excel con la página de códigos 936).
- Algunos nombres de menús de sistemas operativos en las guías traducidas (pt, fr, zh) no se pudieron comprobar en un dispositivo real; donde había dudas se describió el paso en lugar de citar el menú.
