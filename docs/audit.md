# Auditoría de la fase 3 (tarea 3A.5)

Fecha: 2026-10-20. Reúne el inventario real (`docs/audit-inventory.md`, tareas 3A.1–3A.3), la comparación con la competencia (`docs/audit-competitors.md`, 3A.4) y la evaluación de motores y licencias (versiones y licencias consultadas con `npm view` el mismo día; se vuelven a revisar al instalar cada dependencia y se anotan en `docs/dependencies.md`).

**Leyenda**
- ¿Tenemos? / ¿Funciona?: ✅ sí, verificado con fixtures y lector independiente · ⚠️ parcial · ❌ no.
- Competencia: **F** fileflip.org · **I** iLovePDF · **C** CloudConvert · — ninguno de los tres lo destaca.
- Dónde: **N** navegador (worker, carga diferida) · **S** servidor.
- Dificultad: baja (≤ 2 tareas, JS puro o motor ya cargado) · media (motor nuevo liviano o interfaz con vista previa) · alta (motor WASM pesado, límites de memoria, licencia delicada).

## 1. Lo que ya existe (estado verificado)

| Herramienta / par | ¿Tenemos? | ¿Funciona? | Competencia | Dónde | Motor | Licencia | Notas |
|---|---|---|---|---|---|---|---|
| Conversor de imágenes: JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, HEIC, SVG → JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, PDF | ✅ | ✅ 88/88 | F, C | N (respaldo S) | @jsquash, gifenc, utif2, libheif-js, canvas, pdf-lib | Apache-2.0, MIT, LGPL-3.0 | Corruptos JPEG/PNG corregidos en 3A.3c |
| Respaldo de imágenes en el servidor (7 entradas × 8 salidas) | ✅ | ✅ 49/49 | C | S | sharp (libvips) | Apache-2.0 (libvips LGPL-3.0) | HEIC/BMP/ICO no se leen en el servidor (415 a propósito) |
| Redimensionar y calidad | ✅ | ✅ | F | N | mismo | — | Sin página propia de "redimensionar" ni de "comprimir imagen" |
| Unir, dividir, rotar, ordenar PDF | ✅ | ✅ | F, I | N | pdf-lib, pdf.js | MIT, Apache-2.0 | 12/12 casos + corruptos |
| Imágenes → PDF | ✅ | ✅ | F, I | N | pdf-lib | MIT | Colgado con PNG truncado corregido en 3A.3d |
| Comprimir PDF | ✅ | ✅ | F, I | N (respaldo S) | pdf.js + códecs | Apache-2.0 | Solo re-muestrea imágenes |
| PDF → JPG/PNG (ZIP) | ✅ | ✅ | F, I | N | pdf.js, fflate | Apache-2.0, MIT | |
| DOCX, DOC, ODT, RTF, TXT, XLSX, XLS, ODS, CSV, PPTX, ODP → PDF | ✅ | ✅ | F, I, C | S | Gotenberg (LibreOffice) | MIT (MPL-2.0) | PPT sin fixture (⚠️ no probado) |
| PDF → Word | ✅ | ⚠️ | F, I | S | pdf.js + docx | Apache-2.0, MIT | Solo texto; escaneados → OCR (prioridad 8) |
| Cola larga (DNI, SAT, AFIP, gov.br, WhatsApp, iPhone) | ✅ | ✅ | — | N | reutiliza las anteriores | — | Diferencial LatAm |

Conclusión del inventario: **no hay herramientas rotas** después de 3A.3c/3A.3d. Pendiente transversal (para 3B): un tiempo máximo por trabajo que termine el worker si una librería se cuelga.

## 2. Herramientas candidatas

### 2.1 Datos y desarrolladores (prioridad 1)

| Herramienta / par | ¿Tenemos? | Competencia | Dónde | Motor propuesto | Licencia | Dificultad | Riesgos | Tests necesarios |
|---|---|---|---|---|---|---|---|---|
| JSON ↔ CSV / TSV | ❌ | F (parcial), C | N | papaparse 5.7 | MIT | baja | objetos anidados (aplanar con `a.b`), CSV con `;` (Excel en es/pt) | ida y vuelta con fixture; comillas, saltos de línea, BOM, delimitador detectado |
| JSON ↔ XML | ❌ | C | N | fast-xml-parser 5 | MIT | baja | XXE / entidades: el parser no resuelve entidades externas; desactivar `processEntities` y limitar profundidad | XML con DOCTYPE + entidad externa → no se expande; ida y vuelta |
| JSON ↔ YAML | ❌ | C | N | js-yaml 5 | MIT | baja | "billion laughs" con anclas/alias → límite de alias y de tamaño de salida | anclas, multi-documento, YAML inválido con línea del error |
| JSON ↔ TOML | ❌ | — | N | smol-toml 1.9 | BSD-3-Clause | baja | fechas TOML ↔ JSON (como string ISO) | fechas, tablas anidadas, TOML inválido |
| Formateador / validador JSON, XML, YAML | ❌ | F (JSON) | N | los mismos | — | baja | archivos grandes en el hilo principal → worker | sangría, minificar, error con línea y columna |
| Base64 (texto y archivos) | ❌ | F | N | `atob`/`btoa` + `TextEncoder`, `FileReader` | — | baja | UTF-8 (no usar `btoa` directo), data URL | ida y vuelta de texto con acentos/chino y de un PNG (bytes idénticos) |
| Codificar / decodificar URL | ❌ | F | N | `encodeURIComponent` | — | baja | `%` inválido → error claro | casos con espacios, `+`, emoji |
| Hashes MD5, SHA-1, SHA-256, SHA-512 (texto y archivos) | ❌ | F | N | hash-wasm 4.12 (streaming, también MD5) | MIT | baja | archivos grandes: leer por bloques | vectores conocidos (RFC/NIST) y hash de un fixture contra `crypto` de Node |
| UUID v4 / v7 | ❌ | — | N | `crypto.randomUUID` + v7 propio | — | baja | — | formato y versión, unicidad en lote |
| Conversor de timestamps (Unix s/ms ↔ fecha, zonas) | ❌ | — | N | `Intl.DateTimeFormat` | — | baja | zonas horarias y DST | casos fijos con zona |
| Formateador SQL | ❌ | F | N | sql-formatter (MIT, a verificar) | MIT | baja | — | dialectos básicos |

### 2.2 Utilidades (prioridad 2)

| Herramienta | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| Generador de QR (texto, URL, Wi-Fi, vCard) PNG/SVG | ❌ | F | N | qrcode 1.5 | MIT | baja | capacidad máxima por nivel de corrección | decodificar la salida con jsQR y comparar el texto |
| Lector de QR desde imagen | ❌ | — | N | jsQR 1.4 | Apache-2.0 | baja | imágenes grandes → reducir antes | fixture con QR generado por script |
| Generador de contraseñas | ❌ | F | N | `crypto.getRandomValues` | — | baja | sesgo de módulo (usar rechazo) | longitud, clases de caracteres, sin sesgo grosero |
| Selector y conversor de colores (HEX, RGB, HSL, OKLCH, contraste AA) | ❌ | F | N | propio | — | baja | — | conversiones conocidas |
| Conversor de unidades (longitud, masa, temperatura, datos, área, volumen) | ❌ | F | N | tablas propias | — | baja | redondeo | casos conocidos |
| Contador de palabras/caracteres + mayúsculas/minúsculas | ❌ | F | N | `Intl.Segmenter` | — | baja | chino (sin espacios) → contar con `Intl.Segmenter` | textos en los 5 idiomas |

### 2.3 Subtítulos (prioridad 3)

| Herramienta / par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| SRT ↔ VTT ↔ ASS/SSA, desplazar tiempos, ajustar FPS | ❌ | C | N | parser propio (formatos simples) + ass-compiler 0.1 para ASS | MIT | baja | estilos ASS que no existen en SRT (se pierden, avisarlo); codificación (Latin-1 → detectar) | ida y vuelta con fixtures; desplazamiento negativo que no baje de 0 |

### 2.4 Fuentes (prioridad 4)

| Par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| TTF/OTF ↔ WOFF, TTF/OTF ↔ WOFF2 | ❌ | C | N | fonteditor-core 2.6 (TTF/WOFF) + wawoff2 2.0 (WOFF2, brotli WASM) | MIT (fonteditor-core: confirmar archivo LICENSE al instalar) | media | fuentes con licencia que no permite conversión → aviso de responsabilidad del usuario; fixture: fuente propia generada o una OFL | tablas `head`/`name` intactas tras ida y vuelta; cantidad de glifos |

### 2.5 Más imágenes (prioridad 5)

| Herramienta / par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| **Comprimir imagen** (página propia, niveles, antes/después, lotes) | ⚠️ (dentro del conversor) | F, C | N | códecs actuales | — | baja | — | salida más chica y mismas dimensiones |
| **Comprimir a un peso objetivo** (p. ej. ≤ 200 KB para un trámite) | ❌ | — | N | búsqueda binaria de calidad (+ escala si no alcanza) | — | baja | objetivo imposible → reducir dimensiones y avisarlo | salida ≤ objetivo para varios objetivos |
| Redimensionar (página propia, píxeles/porcentaje, presets de redes) | ⚠️ | F | N | actual | — | baja | — | dimensiones |
| Recortar (con proporciones fijas) | ❌ | F | N | canvas + códecs actuales | — | media | interfaz táctil accesible (teclado) | dimensiones del recorte |
| Rotar / voltear | ❌ | — | N | canvas | — | baja | orientación EXIF (aplicarla antes) | dimensiones intercambiadas, píxel de esquina |
| Marca de agua (texto o imagen) y agregar texto | ❌ | F | N | canvas (OffscreenCanvas en worker) | — | media | fuentes en worker (usar las del sitio) | píxeles cambiados en la zona esperada |
| Quitar metadatos EXIF/GPS | ❌ | — | N | re-codificación (JPEG/PNG/WEBP) y lector exifr para mostrar qué se quita | MIT | baja | perder la orientación: aplicarla antes de quitar | salida sin EXIF (exifr devuelve vacío), dimensiones correctas |
| Favicon/ICO desde imagen (paquete 16–512 + ICO multi-tamaño + manifest) | ⚠️ (solo ICO) | F | N | codificador ICO actual + fflate | — | baja | — | ICO con 3+ tamaños, ZIP con PNG |
| HEIF (además de HEIC) | ⚠️ | C | N | libheif-js (ya instalado) | LGPL-3.0 | baja | AVIF dentro de HEIF | fixture HEIF (no hay codificador libre a mano: se genera con libheif si está disponible o se omite) |
| RAW (CR2, NEF, ARW, DNG) → JPG/PNG | ❌ | C | N | libraw-wasm 1.6 (ISC; LibRaw LGPL-2.1/CDDL) | ISC + LGPL-2.1 | alta | WASM grande (~1–2 MB), memoria con RAW de 50 MB; fixtures sin derechos (DNG generado) | dimensiones de un DNG generado; corrupto |
| SVG → PNG/JPG (página propia) / PNG → SVG (vectorizar) | ⚠️ / ❌ | F (SVG→PNG) | N | canvas / (vectorizar: imagetracerjs, Unlicense) | — | baja / media | SVG con scripts o recursos externos: rasterizar en `<img>` (sin scripts) | dimensiones; SVG con `<script>` no lo ejecuta |
| Quitar fondo | ❌ | F | N | **@imgly/background-removal es AGPL → no sin aprobación**. Alternativa: @mediapipe/tasks-vision (Apache-2.0) con el modelo de segmentación de personas, o onnxruntime-web (MIT) + un modelo Apache-2.0 (u2netp) | Apache-2.0 / MIT | alta | modelo de 4–40 MB descargado a pedido; calidad limitada a personas con MediaPipe | máscara no vacía en un fixture sintético; tiempos |

### 2.6 Más PDF (prioridad 6)

| Herramienta | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| Eliminar páginas / extraer páginas | ⚠️ (dividir con rangos) | F, I | N | pdf-lib (ya cargado) | MIT | baja | — | cantidad y orden de páginas |
| Numerar páginas | ❌ | F, I | N | pdf-lib | MIT | baja | páginas rotadas (posición), fuentes estándar sin acentos raros | texto extraído con pdf.js contiene "1", "2"… en cada página |
| Marca de agua (texto/imagen) | ❌ | F, I | N | pdf-lib | MIT | baja | rotación de página | texto de la marca extraíble en todas las páginas |
| Extraer imágenes | ❌ | I | N | pdf.js (operadores de imagen) | Apache-2.0 | media | imágenes en formatos raros (JBIG2, CCITT) → se rasterizan | cantidad y dimensiones de imágenes de un PDF generado |
| PDF → texto / HTML | ⚠️ (solo dentro de PDF→Word, servidor) | F, I | N | pdf.js `getTextContent` | Apache-2.0 | baja | escaneados sin texto → sugerir OCR | texto de `document.pdf` |
| Proteger con contraseña / quitar contraseña | ❌ | F, I | N | @neslinesli93/qpdf-wasm 0.3 (ISC; qpdf Apache-2.0) | ISC + Apache-2.0 | media | WASM ~1,5 MB; quitar contraseña **solo con la contraseña** (no se rompen PDF ajenos) | abrir la salida protegida con pdf.js usando la contraseña; sin contraseña falla |
| Firmar dibujando la firma | ❌ | I | N | pdf-lib + canvas | MIT | media | no es firma digital certificada: decirlo claramente | imagen de firma presente en la página elegida |
| Recortar márgenes de PDF | ❌ | I | N | pdf-lib (CropBox) | MIT | baja | — | CropBox de la salida |
| PDF/A | ❌ | F, I | S | Gotenberg (`pdfa`) | MIT | baja | validez real de PDF/A depende de LibreOffice; sin validador libre en el proyecto | metadatos XMP con `pdfaid:part` |
| PDF → Excel / PowerPoint | ❌ | F, I | S | — | — | alta | calidad pobre sin un motor de tablas; **se descarta por ahora** | — |

### 2.7 Documentos y oficina (prioridad 7)

| Par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| DOC, DOCX, ODT, RTF, TXT → PDF | ✅ | F, I, C | S | Gotenberg | MIT | — | — | ya existen |
| HTML → PDF | ❌ | I, C | S | Gotenberg (Chromium) | MIT | media | **SSRF**: HTML con recursos remotos → Gotenberg con red restringida / sin URLs externas | HTML local con imagen incrustada |
| Markdown → PDF | ❌ | F, C | N + S | marked 18 (MIT) → HTML saneado (dompurify) → Gotenberg | MIT, MPL-2.0/Apache-2.0 | baja | HTML crudo dentro del Markdown: sanear | PDF con el texto de los títulos |
| Markdown ↔ HTML | ❌ | C | N | marked + turndown 7 | MIT | baja | XSS en la vista previa: sanear siempre | ida y vuelta de títulos, listas y enlaces |
| XLS, XLSX, ODS, CSV → PDF | ✅ | F, C | S | Gotenberg | MIT | — | — | ya existen |
| PPT, PPTX, ODP → PDF | ✅ (PPT sin probar) | F, C | S | Gotenberg | MIT | baja | fixture PPT grande (~450 KB): generarlo en el test | PPT generado en el test |
| XLSX ↔ CSV ↔ ODS en el navegador | ❌ | F (Excel↔CSV), C | N | SheetJS CE 0.20.x (Apache-2.0) **desde el tarball oficial** (el `xlsx` de npm quedó en 0.18.5 con vulnerabilidades conocidas); alternativa exceljs (MIT, sin ODS) | Apache-2.0 | media | prototype pollution/ReDoS en versiones viejas; hojas enormes → límite de celdas | valores de celdas tras ida y vuelta; varias hojas (elegir hoja) |

### 2.8 OCR (prioridad 8)

| Herramienta | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| Imagen → texto | ❌ | F, I | N | tesseract.js 7 (Apache-2.0), datos de idioma (Apache-2.0) servidos desde nuestro dominio, solo el idioma pedido | Apache-2.0 | media | ~4–15 MB por idioma; memoria; no usar el CDN de terceros por defecto (los archivos van en `public/` o se descargan una vez y se cachean) | texto reconocido de un fixture generado con texto conocido (tolerancia) |
| PDF escaneado → PDF con texto buscable / texto | ❌ | I | N | tesseract.js (salida PDF) + pdf.js para rasterizar | Apache-2.0 | alta | tiempo por página; límite de páginas | la salida tiene capa de texto (pdf.js la extrae) |

### 2.9 Archivos comprimidos (prioridad 9)

| Herramienta / par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| Crear ZIP | ⚠️ (solo para descargas) | F, C | N | fflate (ya instalado) | MIT | baja | — | ZIP con los archivos idénticos (hash) |
| Crear TAR / TAR.GZ | ❌ | C | N | escritor TAR propio (formato simple) + fflate gzip | MIT | baja | nombres largos (ustar/pax) | leer la salida con `tar` del sistema en el test |
| Extraer ZIP, TAR, TAR.GZ | ❌ | C | N | fflate + lector TAR propio | MIT | baja | **zip bomb** (límite de tamaño descomprimido y de cantidad de entradas, contado en streaming), **zip slip** (normalizar rutas, descartar `..` y absolutas), symlinks (no seguir) | fixtures con `../evil`, ruta absoluta, bomba pequeña (alta razón) → rechazados |
| Extraer 7Z y RAR (solo lectura) | ❌ | C | N | libarchive.js 2.0 (MIT; libarchive BSD-2, su lector RAR es propio y libre) | MIT / BSD | media | WASM ~1 MB; mismas protecciones; RAR5 cifrado no | fixtures 7Z (generado con `7z` si está; si no, se omite con aviso) |

### 2.10 Libros electrónicos (prioridad 10)

| Par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| EPUB → HTML / TXT | ❌ | C | N | fflate + parser XML (fast-xml-parser) + dompurify | MIT | media | XHTML con scripts → sanear; XXE en OPF | texto de capítulos de un EPUB generado |
| EPUB → PDF | ❌ | C | S | EPUB → HTML (N) → Gotenberg | MIT | media | imágenes internas | páginas > 0 y texto |
| HTML / Markdown → EPUB | ❌ | C | N | generador EPUB propio (OPF + XHTML, fflate) | MIT | media | validez EPUB (mimetype sin comprimir primero) | estructura y `mimetype` correcto |
| MOBI / AZW | ❌ | C | — | Calibre (GPL-3.0) | GPL | — | **no viable sin aprobación** (Calibre GPL y pesado) → "Pendiente del dueño" | — |

### 2.11 Audio (prioridad 11) y 2.12 Video (prioridad 12)

| Herramienta | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| Audio: MP3, WAV, FLAC, AAC/M4A, OGG/Opus, AIFF; recortar, unir, bitrate, frecuencia, canales, normalizar | ❌ | F, C | N | **Opción A**: @ffmpeg/core 0.12 → **GPL-2.0-or-later** (requiere aprobación). **Opción B (propuesta)**: mediabunny 1.x (MPL-2.0) sobre WebCodecs del navegador + codificadores WASM libres donde WebCodecs no llega (MP3: lamejs LGPL / wasm-media-encoders; WAV/AIFF propios; FLAC: decodificar con WebCodecs/AudioContext) | MPL-2.0 / LGPL | alta | soporte de WebCodecs desigual (Safari/Firefox), AAC no codifica en todos los navegadores → mostrar solo salidas que el navegador del usuario puede generar (detección) | duración, canales, frecuencia y códec de la salida (ffprobe del sistema en el test, si está) |
| Video: MP4, MOV, MKV, WebM (AVI, WMV, FLV, 3GP solo con ffmpeg); comprimir, recortar, resolución, velocidad, extraer audio, video → GIF, unir | ❌ | F, C | N | igual que audio: mediabunny + WebCodecs (H.264/VP8/VP9/AV1 según el navegador); video → GIF con gifenc (ya instalado) | MPL-2.0 | alta | memoria del navegador (límite de tamaño y duración claros), AVI/WMV/FLV/3GP sin WebCodecs → solo con ffmpeg (GPL) | duración y dimensiones con ffprobe; GIF con cantidad de cuadros |
| Video en el servidor | ❌ | C | S | ffmpeg del sistema | LGPL/GPL según build | alta | costo de CPU en Railway; **por defecto no** | — |

Decisión propuesta: **no usar el @ffmpeg/core publicado (GPL)**. Ir por WebCodecs + mediabunny (MPL-2.0, archivo por archivo, compatible) y pedir al dueño aprobación solo si quiere los formatos heredados (AVI, WMV, FLV, 3GP), anotándolo en "Pendiente del dueño". WebCodecs no necesita COOP/COEP ni multihilo.

### 2.13 Modelos 3D (prioridad 13)

| Par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| STL, OBJ, PLY, GLB/glTF ↔ STL, OBJ, PLY, GLB/glTF + visor | ❌ | F (visor STL, OBJ→STL), C | N | three.js 0.186 (cargadores y exportadores STL, OBJ, PLY, GLTF) | MIT | media | three es grande (~600 KB): solo en la página 3D; mallas enormes → límite de vértices | cantidad de triángulos y caja envolvente tras la conversión (leída con otro cargador) |
| 3MF / COLLADA | ❌ | C | N | three: cargadores 3MF y COLLADA (**solo entrada**: no hay exportadores) | MIT | media | no anunciar salida | — |
| FBX (solo entrada) | ❌ | C | N | FBXLoader de three | MIT | media | FBX binarios nuevos parcialmente soportados | fixture FBX libre (si no se puede generar, no se anuncia) |
| Imagen → litofanía (STL) | ❌ | F | N | propio (alturas desde luminancia) | — | media | — | cantidad de triángulos esperada |

### 2.14 CAD (prioridad 14)

| Par | ¿Tenemos? | Competencia | Dónde | Motor | Licencia | Dificultad | Riesgos | Tests |
|---|---|---|---|---|---|---|---|---|
| DXF → SVG / PNG / PDF + visor | ❌ | F, C | N | dxf-parser 1.1 (MIT) + render propio a SVG (líneas, polilíneas, arcos, círculos, texto) → PNG por canvas, PDF por pdf-lib | MIT | media | entidades no soportadas (spline, hatch) → avisar cuáles se omitieron | elementos SVG esperados de un DXF generado |
| DWG → cualquier cosa | ❌ | F | — | LibreDWG (GPL-3.0) u ODA (comercial) | GPL / comercial | — | **no viable**: formato cerrado; los motores libres son GPL → anotado como descartado | — |

## 3. Ideas propias (poco cubiertas, foco LatAm)

1. **Comprimir a un peso exacto** (imagen y PDF): "que pese menos de 200 KB / 1 MB / 2 MB", con presets de trámites comunes (AFIP/ARCA, SAT, gov.br, SII, DIAN, RENIEC). Barato con los códecs actuales.
2. **Foto carnet por país**: tamaños oficiales (DNI y pasaporte AR, CPF/RG BR, INE MX, CL, CO, PE, UY), recorte con guía de rostro (sin IA: guía superpuesta), fondo blanco opcional (solo si hay quitar fondo con licencia aceptable), hoja de impresión 10×15 con varias copias.
3. **Firmar PDF dibujando** (o subiendo una foto de la firma), colocarla con arrastrar, aclarando que no es firma digital certificada.
4. **PDF para WhatsApp/correo**: unir + comprimir a peso objetivo en un solo paso.
5. **Escanear documento desde el celular** (foto → recorte de perspectiva → PDF en B/N): media, con canvas; útil en LatAm donde se mandan fotos de documentos.

## 4. Descartado o pendiente del dueño

| Funcionalidad | Motivo |
|---|---|
| Quitar fondo con @imgly/background-removal | AGPL → requiere aprobación. Alternativa propuesta: MediaPipe (Apache-2.0, solo personas) u onnxruntime-web + modelo Apache-2.0 |
| @ffmpeg/core publicado (AVI, WMV, FLV, 3GP) | GPL-2.0-or-later → requiere aprobación. Alternativa: WebCodecs + mediabunny (MPL-2.0) para MP4/WebM/MOV/MKV y audio común |
| MOBI / AZW | Solo Calibre (GPL-3.0, pesado) |
| DWG | Formato cerrado; LibreDWG GPL-3.0, ODA comercial |
| PDF → Excel / PowerPoint | Sin motor libre de detección de tablas con calidad aceptable |
| Video en el servidor | Costo de CPU en Railway; por defecto solo navegador |

## 5. Lista priorizada (lo que va al plan)

1. **3B Base del catálogo**: registro único de herramientas → buscador, categorías, páginas, sitemap; motor de trabajos genérico (cola, progreso, cancelación, tiempo máximo, ZIP); infraestructura de tests de navegador.
2. **Datos y desarrolladores** (11 herramientas, baja).
3. **Utilidades** (6, baja).
4. **Comprimir imagen + peso objetivo + redimensionar** con página propia (baja, muy buscadas) — se adelanta dentro de "más imágenes" por su relación valor/costo.
5. **Subtítulos** (baja).
6. **Más PDF**: eliminar/extraer páginas, numerar, marca de agua, PDF → texto, recortar, firmar; luego proteger/quitar contraseña (qpdf-wasm) y extraer imágenes.
7. **Más imágenes**: rotar/voltear, recortar, marca de agua/texto, quitar EXIF, favicon, SVG → PNG con página propia, HEIF; RAW al final.
8. **Fuentes** (media).
9. **Documentos**: Markdown ↔ HTML, Markdown → PDF, HTML → PDF (con red restringida), PPT con fixture, XLSX ↔ CSV ↔ ODS.
10. **Archivos comprimidos**: crear ZIP/TAR, extraer ZIP/TAR con protecciones; 7Z/RAR con libarchive.js.
11. **OCR** (media/alta).
12. **Libros electrónicos**: EPUB → HTML/TXT/PDF, HTML/Markdown → EPUB.
13. **3D** con three.js; **CAD** DXF.
14. **Audio y video** con WebCodecs + mediabunny (alta; detección de capacidades del navegador).
15. **Quitar fondo** (solo con licencia aceptable) y **foto carnet por país**.

Conteo orientativo si todo sale: ~25 existentes (contando pares de conversión con página) + ~11 + 6 + 3 + 3 + 9 + 8 + 2 + 6 + 5 + 2 + 4 + 6 + 2 + ~15 audio/video ≈ **100+ herramientas** verificadas.
