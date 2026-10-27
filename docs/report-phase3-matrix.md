# Matriz de compatibilidad (generada)

Generada con `npx vite-node scripts/report/matrix.ts` desde el registro (`src/config/tools.ts`, `src/config/formats.ts`) y las pruebas de navegador (`tests/e2e`). No editar a mano.

## Totales

- Herramientas publicadas (estado `verified`): **83** + el conversor de formatos.
- Páginas de conversión entre formatos: **97**.
- Formatos de entrada distintos: **66**; de salida: **50**.
- Pares entrada → salida declarados (herramientas + conversor): **342**.
- Herramientas con prueba de navegador que abre su página y valida la salida: **83/83**.
- Dónde corren: 79 en el navegador, 4 en el servidor (Gotenberg).

Formatos de entrada: 3MF, 7Z, AAC, AIFF, ASS, AVIF, BIN, BMP, Base64, CSV, DAE, DXF, EPUB, Excel, Excel 97, FBX, FLAC, GIF, GLB, HEIC, HTML, ICO, JPG, JSON, M4A, MKV, MOV, MP3, MP4, Markdown, OBJ, ODP, ODS, ODT, OGG, OTF, PDF, PLY, PNG, PowerPoint, PowerPoint 97, RAR, RTF, SRT, SSA, STL, SVG, TAR, TAR.GZ, TIFF, TOML, TSV, TTF, TXT, VTT, WAV, WEBM, WEBP, WOFF, WOFF2, Word, Word 97, XML, YAML, ZIP, glTF.

Formatos de salida: AIFF, ASS, AVIF, BIN, BMP, Base64, CSV, EPUB, Excel, FLAC, GIF, GLB, HTML, ICO, JPG, JSON, M4A, MKV, MOV, MP3, MP4, Markdown, OBJ, ODS, OGG, OTF, PDF, PLY, PNG, SRT, SSA, STL, SVG, TAR, TAR.GZ, TIFF, TOML, TSV, TTF, TXT, VTT, WAV, WEBM, WEBP, WOFF, WOFF2, Word, XML, YAML, ZIP.

## Herramientas por categoría

### image (11)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `compress-image` (/es/comprimir-imagen) | JPG, PNG, WEBP, AVIF | JPG, PNG, WEBP, AVIF | navegador | @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, @jsquash/oxipng, gifenc | edge-files, failure-states, image-tools, open-states, unsupported |
| `resize-image` (/es/redimensionar-imagen) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF | navegador | canvas, @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, libheif-js, utif2, gifenc | image-tools |
| `rotate-image` (/es/rotar-imagen) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF | navegador | canvas, @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, libheif-js, utif2, gifenc | image-tools |
| `remove-exif` (/es/quitar-metadatos-exif) | JPG, PNG, WEBP, HEIC | JPG, PNG, WEBP | navegador | exifr, libheif-js, @jsquash/jpeg | image-tools |
| `crop-image` (/es/recortar-imagen) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF | navegador | own crop geometry, @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, libheif-js, utif2, gifenc | image-tools |
| `id-photo` (/es/foto-carnet) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG | navegador | own layout, canvas, @jsquash/jpeg, libheif-js, utif2 | image-tools, search |
| `remove-background` (/es/quitar-fondo) | JPG, PNG, WEBP, AVIF, GIF, BMP | PNG, JPG | navegador | onnxruntime-web, u2netp, canvas | bg-tools, search |
| `watermark-image` (/es/marca-de-agua-imagen) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF | navegador | canvas, @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, libheif-js, utif2, gifenc | image-tools |
| `add-text-to-image` (/es/agregar-texto-a-imagen) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF | navegador | canvas, @jsquash/jpeg, @jsquash/webp, @jsquash/avif, @jsquash/png, libheif-js, utif2, gifenc | image-tools |
| `favicon-generator` (/es/generador-de-favicon) | PNG, JPG, WEBP, AVIF, GIF, BMP, TIFF, HEIC, SVG | ICO, PNG | navegador | canvas, @jsquash/png, own ICO writer, libheif-js, utif2 | image-tools |
| `svg-converter` (/es/convertir-svg) | SVG | PNG, JPG, WEBP | navegador | canvas, @jsquash/png, @jsquash/jpeg, @jsquash/webp | image-tools |

### pdf (18)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `merge-pdf` (/es/unir-pdf) | PDF | PDF | navegador | pdf-lib | edge-files, environments, failure-states, layout-shift, legal, open-states, pdf-tools, pro-switch, search-locale-states, search, security-headers, unsupported |
| `split-pdf` (/es/dividir-pdf) | PDF | PDF | navegador | pdf-lib, fflate | edge-files, pdf-tools |
| `rotate-pdf` (/es/rotar-pdf) | PDF | PDF | navegador | pdf-lib | pdf-tools |
| `organize-pdf` (/es/ordenar-pdf) | PDF | PDF | navegador | pdf-lib, pdfjs-dist | pdf-tools |
| `images-to-pdf` (/es/imagenes-a-pdf) | JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, HEIC, SVG | PDF | navegador | pdf-lib, @jsquash, libheif-js, utif2 | pdf-tools |
| `compress-pdf` (/es/comprimir-pdf) | PDF | PDF | navegador | pdf-lib, fflate, @jsquash/jpeg | edge-files, pdf-tools |
| `delete-pdf-pages` (/es/eliminar-paginas-pdf) | PDF | PDF | navegador | pdf-lib, pdf.js | pdf-tools |
| `extract-pdf-pages` (/es/extraer-paginas-pdf) | PDF | PDF | navegador | pdf-lib, pdf.js, fflate | pdf-tools |
| `pdf-page-numbers` (/es/numerar-paginas-pdf) | PDF | PDF | navegador | pdf-lib, canvas | pdf-tools |
| `pdf-watermark` (/es/marca-de-agua-pdf) | PDF | PDF | navegador | pdf-lib, canvas | pdf-tools |
| `pdf-to-text` (/es/pdf-a-texto) | PDF | TXT | navegador | pdf.js | edge-files, pdf-tools |
| `crop-pdf` (/es/recortar-pdf) | PDF | PDF | navegador | pdf.js, pdf-lib | pdf-tools |
| `sign-pdf` (/es/firmar-pdf) | PDF | PDF | navegador | pdf.js, pdf-lib, canvas | sign-pdf |
| `protect-pdf` (/es/proteger-pdf) | PDF | PDF | navegador | @neslinesli93/qpdf-wasm, pdf-lib | pdf-password |
| `unlock-pdf` (/es/quitar-contrasena-pdf) | PDF | PDF | navegador | @neslinesli93/qpdf-wasm, pdf-lib | pdf-password |
| `extract-pdf-images` (/es/extraer-imagenes-pdf) | PDF | JPG, PNG | navegador | pdf.js, pdf-lib, canvas, fflate | pdf-tools |
| `pdf-to-pdfa` (/es/pdf-a-pdfa) | PDF | PDF | servidor | Gotenberg (LibreOffice), pdf-lib | failure-states, gotenberg-tools |
| `scan-document` (/es/escanear-documento) | JPG, PNG, WEBP, AVIF, HEIC | PDF | navegador | own perspective and threshold, gifenc, @jsquash/jpeg, libheif-js, pdf-lib | scan-tools |

### document (5)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `markdown-to-html` (/es/markdown-a-html) | Markdown, TXT | HTML | navegador | marked, dompurify | edge-files-families, markup-tools, unsupported |
| `html-to-markdown` (/es/html-a-markdown) | HTML, TXT | Markdown | navegador | turndown, turndown-plugin-gfm | markup-tools |
| `markdown-to-pdf` (/es/markdown-a-pdf) | Markdown, TXT | PDF | servidor | marked, Gotenberg (Chromium) | edge-files-families, failure-states, gotenberg-tools |
| `html-to-pdf` (/es/html-a-pdf) | HTML, TXT | PDF | servidor | parse5, Gotenberg (Chromium) | gotenberg-tools |
| `spreadsheet-converter` (/es/convertir-hoja-de-calculo) | Excel, Excel 97, ODS, CSV, TSV | Excel, ODS, CSV | navegador | xlsx (SheetJS CE), papaparse, fflate | edge-files-families, sheet-tools, unsupported |

### data (8)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `json-to-csv` (/es/json-a-csv) | JSON | CSV, TSV | navegador | papaparse | data-tools, unsupported |
| `csv-to-json` (/es/csv-a-json) | CSV, TSV | JSON | navegador | papaparse | data-tools, edge-files-families |
| `json-to-yaml` (/es/json-a-yaml) | JSON | YAML | navegador | yaml | data-tools |
| `yaml-to-json` (/es/yaml-a-json) | YAML | JSON | navegador | yaml | data-tools |
| `json-to-toml` (/es/json-a-toml) | JSON | TOML | navegador | smol-toml | data-tools |
| `toml-to-json` (/es/toml-a-json) | TOML | JSON | navegador | smol-toml | data-tools |
| `json-to-xml` (/es/json-a-xml) | JSON | XML | navegador | fast-xml-parser | data-tools |
| `xml-to-json` (/es/xml-a-json) | XML | JSON | navegador | fast-xml-parser | data-tools |

### developer (9)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `json-formatter` (/es/formatear-json) | JSON | JSON | navegador | native JSON | data-tools, edge-files-families |
| `xml-formatter` (/es/formatear-xml) | XML | XML | navegador | fast-xml-parser | data-tools |
| `yaml-formatter` (/es/formatear-yaml) | YAML | YAML | navegador | yaml | data-tools |
| `base64-encode` (/es/codificar-base64) | BIN, TXT | Base64 | navegador | native btoa | data-tools |
| `base64-decode` (/es/decodificar-base64) | Base64, TXT | BIN | navegador | native atob | data-tools |
| `url-encode` (/es/codificar-url) | TXT | TXT | navegador | native encodeURIComponent | data-tools |
| `hash-generator` (/es/generador-hash) | BIN, TXT | TXT | navegador | hash-wasm | data-tools, edge-files-families |
| `uuid-generator` (/es/generador-uuid) |  | TXT | navegador | native crypto.getRandomValues | data-tools |
| `timestamp-converter` (/es/convertir-timestamp) | TXT | CSV | navegador | native Intl | data-tools |

### utility (6)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `qr-generator` (/es/generador-codigo-qr) |  | PNG, SVG | navegador | qrcode | qr-tools |
| `qr-reader` (/es/leer-codigo-qr) | PNG, JPG, WEBP, GIF, BMP, AVIF | TXT | navegador | jsqr | qr-tools |
| `password-generator` (/es/generador-de-contrasenas) |  | TXT | navegador | native crypto.getRandomValues | text-tools |
| `word-counter` (/es/contador-de-palabras) | TXT | TXT | navegador | native Intl.Segmenter | text-tools |
| `color-converter` (/es/conversor-de-colores) | TXT | TXT | navegador | own OKLab/WCAG math | utility-tools |
| `unit-converter` (/es/conversor-de-unidades) | TXT | TXT | navegador | own unit tables | utility-tools |

### subtitle (2)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `subtitle-converter` (/es/convertir-subtitulos) | SRT, VTT, ASS, SSA | SRT, VTT, ASS, SSA | navegador | own SRT/VTT/ASS parser | subtitle-tools |
| `subtitle-sync` (/es/sincronizar-subtitulos) | SRT, VTT, ASS, SSA | SRT, VTT, ASS, SSA | navegador | own SRT/VTT/ASS parser | subtitle-tools |

### font (1)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `font-converter` (/es/convertir-fuentes) | TTF, OTF, WOFF, WOFF2 | TTF, OTF, WOFF, WOFF2 | navegador | woff2-encoder, fflate | font-tools |

### archive (2)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `create-archive` (/es/crear-zip) | BIN | ZIP, TAR, TAR.GZ | navegador | fflate | archive-tools, edge-files-families |
| `extract-archive` (/es/extraer-zip) | ZIP, TAR, TAR.GZ, 7Z, RAR | BIN | navegador | fflate, libarchive 3.8 (own WASM build), libarchive-wasm (wrapper) | archive-tools, early-pick, edge-files-families, failure-states, open-states, unsupported |

### ocr (2)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `image-to-text` (/es/imagen-a-texto) | JPG, PNG, WEBP, BMP, GIF, TIFF, HEIC, AVIF | TXT | navegador | tesseract.js, tessdata_best (int) | edge-files-families, failure-states, ocr-tools, security-headers, unsupported |
| `ocr-pdf` (/es/ocr-pdf) | PDF | PDF, TXT | navegador | pdf.js, tesseract.js, pdf-lib | edge-files-families, ocr-tools |

### ebook (3)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `epub-converter` (/es/convertir-epub) | EPUB | HTML, TXT | navegador | fflate, fast-xml-parser, dompurify | ebook-tools, edge-files-families, unsupported |
| `epub-to-pdf` (/es/epub-a-pdf) | EPUB | PDF | servidor | fflate, fast-xml-parser, dompurify, parse5, Gotenberg (Chromium) | failure-states, gotenberg-tools, pro-switch |
| `create-epub` (/es/crear-epub) | Markdown, HTML, TXT | EPUB | navegador | marked, dompurify, fflate | ebook-tools |

### audio (6)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `audio-converter` (/es/convertir-audio) | MP3, WAV, FLAC, OGG, M4A, AAC, WEBM, AIFF | MP3, WAV, FLAC, OGG, M4A, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), AIFF reader/writer (own) | audio-tools, edge-files-families, failure-states, pro-switch, unsupported |
| `trim-audio` (/es/recortar-audio) | MP3, WAV, FLAC, OGG, M4A, AAC, WEBM, AIFF | MP3, WAV, FLAC, OGG, M4A, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), own fades and AIFF reader/writer | audio-tools |
| `adjust-audio` (/es/ajustar-audio) | MP3, WAV, FLAC, OGG, M4A, AAC, WEBM, AIFF | MP3, WAV, FLAC, OGG, M4A, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), AIFF reader/writer (own) | audio-tools |
| `normalize-audio` (/es/normalizar-audio) | MP3, WAV, FLAC, OGG, M4A, AAC, WEBM, AIFF | MP3, WAV, FLAC, OGG, M4A, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), own level meter and gain | audio-tools |
| `join-audio` (/es/unir-audio) | MP3, WAV, FLAC, OGG, M4A, AAC, WEBM, AIFF | MP3, WAV, FLAC, OGG, M4A, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), AIFF reader/writer (own) | audio-tools |
| `text-to-speech` (/es/leer-texto-en-voz-alta) | TXT, Markdown, HTML, PDF, Word, EPUB, JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC, AVIF | MP3 | navegador | Web Speech API, Supertonic 3 (OpenRAIL-M), onnxruntime-web, pdfjs-dist, tesseract.js, fflate, marked, mediabunny, @mediabunny/mp3-encoder (LAME) | layout-shift, tts-ai, tts-tools |

### video (7)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `video-converter` (/es/convertir-video) | MP4, MOV, MKV, WEBM | MP4, WEBM, MOV, MKV | navegador | mediabunny, @mediabunny/aac-encoder (FFmpeg AAC) | edge-files-families, unsupported, video-tools |
| `extract-audio` (/es/extraer-audio-de-video) | MP4, MOV, MKV, WEBM | M4A, MP3, OGG, FLAC, WAV, AIFF | navegador | mediabunny, @mediabunny/mp3-encoder (LAME), @mediabunny/flac-encoder (libFLAC), @mediabunny/aac-encoder (FFmpeg AAC), AIFF writer (own) | video-tools |
| `compress-video` (/es/comprimir-video) | MP4, MOV, MKV, WEBM | MP4, WEBM | navegador | mediabunny, @mediabunny/aac-encoder (FFmpeg AAC) | video-tools |
| `trim-video` (/es/recortar-video) | MP4, MOV, MKV, WEBM | MP4, MOV, MKV, WEBM | navegador | mediabunny, @mediabunny/aac-encoder (FFmpeg AAC) | video-tools |
| `video-to-gif` (/es/video-a-gif) | MP4, MOV, MKV, WEBM | GIF | navegador | mediabunny, gifenc | unsupported, video-tools |
| `video-speed` (/es/cambiar-velocidad-video) | MP4, MOV, MKV, WEBM | MP4, MOV, MKV, WEBM | navegador | mediabunny, @mediabunny/aac-encoder (FFmpeg AAC) | video-tools |
| `join-videos` (/es/unir-videos) | MP4, MOV, MKV, WEBM | MP4, WEBM | navegador | mediabunny, @mediabunny/aac-encoder (FFmpeg AAC) | video-tools |

### 3d (2)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `model-converter` (/es/convertir-modelo-3d) | STL, OBJ, PLY, GLB, glTF, 3MF, DAE, FBX | STL, OBJ, PLY, GLB | navegador | three | edge-files-families, model-tools, unsupported |
| `image-to-lithophane` (/es/imagen-a-litofania) | JPG, PNG, WEBP, GIF, BMP, AVIF | STL | navegador | native canvas, own STL writer | model-tools |

### cad (1)

| Herramienta | Entradas | Salidas | Dónde | Motor | Prueba de navegador |
|---|---|---|---|---|---|
| `dxf-converter` (/es/convertir-dxf) | DXF | SVG, PNG, PDF | navegador | dxf-parser, own geometry and SVG writer, OffscreenCanvas, pdf-lib | cad-tools, edge-files-families, unsupported |

## Conversor de formatos (pares)

Imágenes y PDF → imagen en el navegador (`converter.spec.ts` y `scripts/audit`), documentos de oficina → PDF y PDF → Word en el servidor (`src/lib/server/*.test.ts`, inventario 3A.2).

| Desde \ a | JPG | PNG | WEBP | AVIF | GIF | BMP | TIFF | ICO | PDF | Word |
|---|---|---|---|---|---|---|---|---|---|---|
| JPG | N | N | N | N | N | N | N | N | N |  |
| PNG | N | N | N | N | N | N | N | N | N |  |
| WEBP | N | N | N | N | N | N | N | N | N |  |
| AVIF | N | N | N | N | N | N | N | N | N |  |
| GIF | N | N | N | N |  | N | N | N | N |  |
| BMP | N | N | N | N | N |  | N | N | N |  |
| TIFF | N | N | N | N | N | N |  | N | N |  |
| ICO | N | N | N | N | N | N | N |  | N |  |
| HEIC | N | N | N | N | N | N | N | N | N |  |
| SVG | N | N | N | N | N | N | N | N | N |  |
| PDF | N | N |  |  |  |  |  |  |  | S |
| Word |  |  |  |  |  |  |  |  | S |  |
| Word 97 |  |  |  |  |  |  |  |  | S |  |
| Excel |  |  |  |  |  |  |  |  | S |  |
| Excel 97 |  |  |  |  |  |  |  |  | S |  |
| CSV |  |  |  |  |  |  |  |  | S |  |
| PowerPoint |  |  |  |  |  |  |  |  | S |  |
| PowerPoint 97 |  |  |  |  |  |  |  |  | S |  |
| ODT |  |  |  |  |  |  |  |  | S |  |
| ODS |  |  |  |  |  |  |  |  | S |  |
| ODP |  |  |  |  |  |  |  |  | S |  |
| RTF |  |  |  |  |  |  |  |  | S |  |
| TXT |  |  |  |  |  |  |  |  | S |  |

N = navegador, S = servidor.
