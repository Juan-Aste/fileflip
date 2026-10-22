# Informe final de la fase 3 — Fileflect

Fecha: 2026-10-22. Rama `dev`. Este informe resume la fase 3 (cambio de nombre a Fileflect y ampliación del catálogo). El detalle tarea por tarea está en `PROGRESS.md`; la auditoría de partida, en `docs/audit.md`.

## 1. Resumen

- **82 herramientas publicadas y verificadas** (estado `verified` en el registro) + el conversor de formatos con **97 páginas de conversión**. Al empezar la fase había 7 (el conversor y 6 herramientas PDF).
- **66 formatos de entrada y 50 de salida**, **328 pares entrada → salida** declarados en el registro.
- **82 de 82** herramientas tienen al menos una prueba de navegador que abre su página, procesa un archivo real y valida el archivo de salida con un lector independiente; todas tienen además pruebas unitarias con archivos válidos y dañados.
- **78 corren en el navegador** (WASM/JS en workers, cargados solo al usar la herramienta) y **4 en el servidor** (Gotenberg: Markdown, HTML y EPUB → PDF, y PDF → PDF/A), además de la conversión de oficina → PDF que ya existía.
- 5 idiomas (es, en, pt, fr, zh) con introducción, límites y ≥ 3 preguntas frecuentes propias por herramienta; 1007 páginas en el sitemap.
- Rendimiento móvil ≥ 90 en las 29 páginas medidas, accesibilidad y SEO 100 (sección 6).

La meta orientativa era superar las 100 herramientas. Se priorizó calidad: 82 herramientas que funcionan de punta a punta, en lugar de completar el número con variantes casi idénticas (por ejemplo, una página por cada par de formatos de audio o de imagen ya cubiertos por un mismo conversor).

## 2. Catálogo por categoría

| Categoría | Herramientas | Ejemplos |
|---|---|---|
| Imágenes | 11 | comprimir (y a un peso exacto), redimensionar, recortar, rotar, quitar EXIF, marca de agua, agregar texto, favicon, SVG → PNG/JPG, foto carnet, escanear documento, quitar fondo |
| PDF | 18 | unir, dividir, rotar, ordenar, imágenes → PDF, comprimir, eliminar/extraer páginas, numerar, marca de agua, PDF → texto, recortar márgenes, firmar, proteger/quitar contraseña, extraer imágenes, PDF/A |
| Documentos | 5 | Markdown ↔ HTML, Markdown → PDF, HTML → PDF, hojas de cálculo XLSX ↔ CSV ↔ ODS |
| Datos | 8 | JSON ↔ CSV/TSV, YAML, TOML, XML |
| Desarrolladores | 9 | formateadores JSON/XML/YAML, Base64, URL, hashes, UUID, timestamps |
| Utilidades | 6 | QR (generar y leer), contraseñas, contador de palabras, colores, unidades |
| Subtítulos | 2 | SRT ↔ VTT ↔ ASS/SSA, desplazar tiempos y FPS |
| Fuentes | 1 | TTF/OTF ↔ WOFF/WOFF2 |
| Archivos comprimidos | 2 | crear ZIP/TAR/TAR.GZ; extraer ZIP, TAR, TAR.GZ, 7Z y RAR |
| OCR | 2 | imagen → texto; PDF escaneado → PDF buscable / texto |
| Libros electrónicos | 3 | EPUB → HTML/TXT, EPUB → PDF, HTML/Markdown → EPUB |
| Audio | 5 | convertir (WAV, MP3, FLAC, OGG/Opus, M4A/AAC, AIFF), recortar, ajustar, normalizar, unir |
| Video | 7 | convertir (MP4, WebM, MOV, MKV), extraer audio, comprimir, recortar, video → GIF, velocidad, unir |
| 3D | 2 | STL/OBJ/PLY/GLB/glTF/3MF/DAE/FBX → STL/OBJ/PLY/GLB con visor; imagen → litofanía |
| CAD | 1 | DXF → SVG/PNG/PDF |

La matriz completa (cada herramienta con sus entradas, salidas, motor, dónde corre y qué prueba de navegador la cubre, y la tabla de pares del conversor) está en **`docs/report-phase3-matrix.md`**, generada con `npx vite-node scripts/report/matrix.ts` desde el registro y los archivos de prueba.

## 3. Pruebas ejecutadas

| Suite | Resultado (2026-10-22) | Qué valida |
|---|---|---|
| Unitarias (Vitest) | 988 pasan, 8 saltadas | motores con archivos válidos, dañados y maliciosos; salida leída con lectores independientes (sharp, pdf-lib, pdf.js, fflate, Python `zipfile`, `tar`, LibreOffice si está); APIs; agregaciones de estadísticas con MongoDB en memoria |
| Navegador (Playwright, Chromium) | __E2E__ | cada herramienta: sube un fixture, ejecuta, descarga y valida la salida (dimensiones/tipo de imagen, páginas de PDF, duración/códec con ffprobe, texto con pdftotext, contenido de JSON/CSV/ZIP, geometría 3D); errores con archivos dañados; sin llamadas al servidor en herramientas del navegador |
| Accesibilidad (axe-core, en la suite de navegador) | 0 violaciones WCAG 2.1 A/AA | las 82 herramientas, portada, catálogo y 15 categorías en claro; muestra en oscuro y en en/pt/fr/zh; estados con resultado y error; recorrido con teclado |
| CI de GitHub | verde | lint, tests unitarios, build y `check:static` en `ubuntu-latest` |
| Lighthouse móvil | ver sección 6 | rendimiento, accesibilidad, SEO, CLS |

Las pruebas que dependen de servicios opcionales se saltan si no están: Gotenberg (`GOTENBERG_URL`), EPUBCheck (`EPUBCHECK_JAR`) y veraPDF (`VERAPDF_DOCKER=1`). En ejecuciones anteriores de esta fase se corrieron con Gotenberg 8 y veraPDF reales (ver PROGRESS 3C.25b–3C.27). El CI de GitHub corre las unitarias; las de navegador se corren en cada tarea en el entorno de desarrollo.

## 4. Limitaciones conocidas

- **Memoria del navegador**: audio y video hasta 500 MB (200 MB sin Pro en video) y 2 h; modelos 3D hasta 200 MB con límite de triángulos; archivos comprimidos hasta 500 MB con límites de expansión. Los límites reales se muestran en cada página.
- **Códecs según el navegador**: la conversión de video usa WebCodecs; Firefox y algunos Android no codifican H.264, y Chromium sin códecs propietarios no decodifica AAC. La interfaz detecta qué se puede hacer y lo avisa.
- **Quitar fondo**: modelo pequeño (u2netp, máscara de 320 × 320): bordes suaves en pelo y pelaje; sin pincel de retoque.
- **Foto carnet**: medidas habituales por país, sin fuente oficial verificada; la página pide confirmarlas con la oficina.
- **OCR**: calidad de Tesseract; en fotos torcidas o con poca luz baja mucho. El PDF buscable tiene límite de páginas.
- **Herramientas de servidor** (Markdown/HTML/EPUB → PDF, PDF/A, oficina → PDF): necesitan Gotenberg desplegado; sin él muestran "servicio no disponible".
- **CLS**: 0 en 28/29 páginas; la categoría PDF dio 0,014 en 1 de 3 corridas (fila de pastillas al cargar la fuente).
- axe revisa el estado inicial y el final de las herramientas; los diálogos intermedios se cubren con pruebas de teclado de cada herramienta.

## 5. Descartado o pendiente, y por qué

| Funcionalidad | Motivo | Tipo |
|---|---|---|
| AVI, WMV, FLV, 3GP y otros formatos heredados de video/audio | solo con `@ffmpeg/core` publicado, que es GPL-2.0-or-later | licencia (decisión del dueño) |
| Quitar fondo con @imgly/background-removal (mejor calidad) | AGPL-3.0; se usó u2netp (Apache-2.0) | licencia |
| MOBI / AZW | solo Calibre (GPL-3.0, pesado) | licencia y costo |
| DWG | formato cerrado; LibreDWG GPL-3.0 u ODA comercial | licencia |
| PDF → Excel / PowerPoint | no hay motor libre de detección de tablas con calidad aceptable | técnico |
| Video en el servidor | costo de CPU en Railway; el navegador cubre los formatos modernos | costo |
| RAW de cámaras (CR2, NEF, ARW, DNG) | no se llegó a planificar: dificultad alta (WASM de 1–2 MB, memoria con RAW de 50 MB). Candidato evaluado en la auditoría: libraw-wasm (ISC; LibRaw LGPL-2.1/CDDL), viable como mejora futura | pendiente (técnico) |
| ISNet (quitar fondo de alta calidad) | 44–176 MB de modelo; mejora posible como opción | costo |
| Presets de foto carnet por país validados | sin fuentes oficiales fiables | información |

## 6. Rendimiento

`docs/perf/2026-10-22-phase3-final.md` (Lighthouse 12.8.2, móvil, mediana de 3, 29 páginas):

- Rendimiento 88–97 en la tanda larga; la única por debajo de 90 (Convertir DXF, 88) dio 93–96 en 5 corridas aisladas (mediana 96): meta ≥ 90 cumplida.
- Accesibilidad 100 y SEO 100 en todas; CLS 0 en 28/29.
- JS inicial 150–184 KB por página (al cierre de la fase 2: 142–149 KB). Ninguna librería de conversión entra en la carga inicial: cada motor (pdf.js, libheif, códecs, tesseract, onnxruntime, three.js, libarchive, mediabunny, qpdf, SheetJS…) se descarga solo al usar su herramienta.
- Historial: `docs/perf/2026-10-21-3B-final.md`, `2026-10-21-3C10.md`, `2026-10-21-3C23.md`, `2026-10-22-3C34.md`.

## 7. Dependencias, motores y licencias

Lista completa con versiones en `docs/dependencies.md`. Todas MIT, Apache-2.0, BSD, ISC, MPL-2.0 (mediabunny, dompurify bajo Apache-2.0) o LGPL (libheif-js, LAME y el codificador AAC de FFmpeg en WASM, libvips de sharp), cargadas como archivos aparte y sin modificar. **Ninguna GPL ni AGPL.** Motores principales:

- Imágenes: @jsquash (MozJPEG, libwebp, libavif, oxipng), libheif-js, utif2, gifenc, exifr; sharp en el servidor.
- PDF: pdf-lib, pdf.js, qpdf (WASM); Gotenberg (LibreOffice/Chromium) en el servidor.
- Datos/documentos: papaparse, yaml, smol-toml, fast-xml-parser, marked, turndown, DOMPurify, parse5, SheetJS CE, docx.
- Archivos comprimidos: fflate, **libarchive 3.8.10 compilado por nosotros** (`scripts/libarchive/build.sh`, reproducible).
- OCR: tesseract.js con datos de idioma servidos desde nuestro dominio.
- Audio/video: mediabunny + WebCodecs, LAME, libFLAC, AAC de FFmpeg (LGPL, sin `--enable-gpl`).
- 3D/CAD: three.js, linkedom (DOM mínimo en el worker), dxf-parser.
- Quitar fondo: onnxruntime-web + modelo u2netp (Apache-2.0) servido desde nuestro dominio.

## 8. Seguridad

- **Ningún archivo va a servicios de terceros.** Modelos, datos de OCR y WASM se sirven desde nuestro dominio (verificado en las pruebas de navegador de OCR y quitar fondo).
- Límites por herramienta (tamaño, páginas, lote, celdas, triángulos, duración) y **tiempo máximo por trabajo** que termina el worker; cancelación con `AbortSignal`; liberación de object URLs.
- Archivos comprimidos: protección contra **zip bombs** (tamaño y cantidad de entradas en streaming), **zip slip**, enlaces simbólicos y archivos cifrados; fixtures maliciosos generados por script.
- XML/EPUB/SVG: sin resolución de entidades (pruebas de **XXE** y "billion laughs"); SVG rasterizado como imagen (un `<script>` no se ejecuta); HTML del usuario saneado con DOMPurify en el navegador y con parse5 en el servidor antes de Gotenberg, con CSP sin red (**prueba de SSRF**).
- Detección de archivos dañados o truncados (JPEG/PNG, PDF, ZIP, audio/video) con mensajes claros en lugar de salidas corruptas.
- Contraseñas de PDF procesadas solo en el navegador; generadores (contraseñas, UUID) sin sesgo con `crypto.getRandomValues`.
- Sin COOP/COEP en el sitio: todos los WASM usan builds de un hilo, así AdSense y el login no se ven afectados.

## 9. Diseño, accesibilidad y SEO

- Marca Fileflect: logo, favicon, íconos de app e imágenes Open Graph nuevos (`docs/design.md`).
- Registro único (`src/config/tools.ts`) del que salen páginas, sitemap, buscador, categorías, enlaces relacionados, pie de página y panel de admin; solo publica herramientas verificadas.
- Buscador accesible (`Ctrl/⌘ K`, `/`, combobox ARIA, sin cargar motores), 15 páginas de categoría y "Todas las herramientas" con slugs traducidos; portada con buscador visible, herramientas populares y categorías.
- Enlaces internos generados del registro: cada herramienta recibe enlaces de otras; las páginas de conversión enlazan herramientas para sus formatos.
- Plantilla de herramienta con "qué hace", límites reales, preguntas frecuentes (FAQ schema) y `SoftwareApplication`.
- Auditoría axe-core en las 82 herramientas y recorrido con teclado; capturas 360/1280 claro/oscuro en `docs/screenshots/`.
- Panel de admin: uso y errores por herramienta y por categoría, con exportación CSV.

## 10. Lo que debe decidir o configurar el dueño

Además de lo de las fases 1 y 2 (ver "Pendiente del dueño" en `PROGRESS.md`):

1. **Nombre Fileflect**: verificar dominio, marca y redes; actualizar `NEXT_PUBLIC_SITE_URL` y `EMAIL_FROM`; opcionalmente renombrar el repo y el servicio de Railway.
2. **Licencias**: decidir si se aprueba `@ffmpeg/core` (GPL) para formatos de video heredados, @imgly/background-removal (AGPL), y si MOBI/DWG quedan descartados. Sin aprobación, el producto queda como está.
3. **Página de créditos/licencias** con enlaces al código fuente de los componentes LGPL (LAME, FFmpeg AAC, libheif, libvips); LAME pide un enlace a lame.sourceforge.io.
4. **Gotenberg en Railway**: actualizar el *Custom Start Command* con las 3 opciones de Chromium de `DEPLOY.md` (segunda capa contra SSRF).
5. **Build**: `npm ci` descarga SheetJS desde `cdn.sheetjs.com` (fijado por hash): Railway necesita acceso a ese dominio al construir.
6. **Foto carnet**: si se quieren presets por país, validar cada medida con el organismo oficial.
7. Publicar: mergear `dev` en `main` cuando se quiera desplegar; el modelo de quitar fondo (4,6 MB) y los datos de OCR van en `public/` y suman al tamaño de la imagen.
