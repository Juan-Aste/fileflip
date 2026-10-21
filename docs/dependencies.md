# Dependencias, motores y licencias

Regla de la fase 3: antes de agregar una dependencia se revisa su licencia y se anota aquí. Se prefieren MIT, Apache-2.0, BSD, ISC, MPL-2.0 o LGPL. **No se agregan dependencias GPL o AGPL sin aprobación del dueño** (se anotan en "Pendiente del dueño" de PROGRESS.md con una alternativa).

Licencias leídas del `package.json` de cada paquete instalado (2026-10-20).

## Producción (se distribuyen al navegador o corren en el servidor)

| Paquete | Versión | Licencia | Uso | Dónde |
|---|---|---|---|---|
| next | 15.5.28 | MIT | framework | S + N |
| react, react-dom | 19.1.0 | MIT | interfaz | S + N |
| next-intl | 4.14.9 | MIT | idiomas | S + N |
| next-auth | 5.0.0-beta.32 | ISC | login | S |
| @auth/mongodb-adapter | 3.11.3 | ISC | sesiones en MongoDB | S |
| mongodb | 6.21.0 | Apache-2.0 | driver | S |
| mongoose | 9.11.2 | MIT | modelos | S |
| nodemailer | 8.0.11 | MIT-0 | emails de login | S |
| server-only | 0.0.1 | MIT | guarda de módulos de servidor | S |
| lucide-react | 1.59.0 | ISC | íconos | N |
| @fontsource-variable/bricolage-grotesque, @fontsource-variable/figtree, @fontsource/bricolage-grotesque | 5.3.0 | OFL-1.1 | tipografías | N |
| @jsquash/jpeg, png, webp, avif | 1.6.0 / 3.1.1 / 1.5.0 / 2.1.1 | Apache-2.0 | códecs de imagen WASM | N (worker) |
| gifenc | 1.0.3 | MIT | codificador GIF | N (worker) |
| @jsquash/oxipng (+ wasm-feature-detect) | 2.3.0 / 1.9.0 | Apache-2.0 (oxipng: MIT) | optimización PNG sin pérdida en "Comprimir imagen"; se importa directo el build de un hilo (el multihilo necesita COOP/COEP) | N (worker de herramientas de imagen) |
| exifr | 7.1.3 | MIT | lee qué metadatos tiene una foto (GPS, cámara, fecha) para mostrar qué se quita; el borrado es propio | N (worker de herramientas de imagen) |
| utif2 | 4.1.0 | MIT | lector/escritor TIFF | N (worker) |
| libheif-js | 1.23.5 | LGPL-3.0 | lector HEIC/HEIF | N (worker, carga diferida, archivo aparte: cumple la LGPL al poder reemplazarse) |
| woff2-encoder | 2.0.0 | MIT (google/woff2 y Brotli: MIT) | comprimir y descomprimir WOFF2 (codificador de referencia de Google en WASM incrustado, ~1 MB) | N (worker de datos, import diferido: solo el conversor de fuentes) |
| xlsx (SheetJS CE) | 0.20.3 | Apache-2.0 | Lectura de XLSX/XLS/ODS y escritura de XLSX/ODS en "Convertir hoja de cálculo". Instalada desde el **tarball oficial** `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (la versión de npm, 0.18.5, está abandonada y tiene CVE-2023-30533 y CVE-2024-22363, corregidas desde 0.20.2) | N (worker de datos, import diferido) |
| parse5 | 8.0.1 | MIT | Parser HTML5 en el servidor: sanea el HTML de "HTML a PDF" antes de imprimirlo | N (solo servidor) |
| marked | 18.1.1 | MIT | Markdown (CommonMark + GFM) → HTML (en el navegador para Markdown → HTML; en el servidor para Markdown → PDF) | N (chunk de la herramienta, import diferido) |
| dompurify | 3.4.17 | MPL-2.0 OR Apache-2.0 (se usa bajo Apache-2.0) | sanea el HTML generado (sin scripts, eventos, formularios ni `javascript:`) | N (ídem) |
| turndown, turndown-plugin-gfm | 7.2.4 / 1.0.2 | MIT (dep. @mixmark-io/domino BSD-2-Clause, solo en Node: el build del navegador la excluye) | HTML → Markdown con tablas, tachado y listas de tareas | N (ídem) |
| pdf-lib | 1.17.1 | MIT | crear y editar PDF | N (worker) |
| @neslinesli93/qpdf-wasm | 0.3.0 | ISC (motor qpdf 12.2: Apache-2.0) | cifrar (AES-256) y descifrar PDF con contraseña; WASM de 1,3 MB que solo descargan "Proteger PDF" y "Quitar contraseña" | N (worker de PDF, import diferido) |
| pdfjs-dist | 6.4.299 | Apache-2.0 | leer y rasterizar PDF; decodificar las imágenes de "Extraer imágenes de PDF" | N + S |
| fflate | 0.8.3 | MIT | ZIP / DOCX | N + S |
| docx | 9.12.0 | MIT | PDF → Word | S |
| papaparse | 5.5.3 | MIT | leer y escribir CSV/TSV (JSON ↔ CSV) | N (worker de datos) |
| yaml | 2.9.1 | ISC | leer y escribir YAML (límite de alias contra "billion laughs") | N (worker de datos) |
| smol-toml | 1.9.0 | BSD-3-Clause | leer y escribir TOML | N (worker de datos) |
| fast-xml-parser | 5.11.2 | MIT | leer y escribir XML (sin entidades DTD) | N (worker de datos) |
| qrcode | 1.5.4 | MIT | generar códigos QR (matriz; SVG/PNG propios). Sus dependencias pngjs/yargs solo las usa la versión de Node/CLI | N (chunk de la herramienta) |
| jsqr | 1.4.0 | Apache-2.0 | leer códigos QR en imágenes | N (worker de QR) |
| hash-wasm | 4.12.0 | MIT | MD5, SHA-1, SHA-256 y SHA-512 por bloques (WASM incrustado) | N (worker de datos) |
| sharp | 0.35.5 | Apache-2.0 | respaldo de imágenes | S |
| └ @img/sharp-libvips-* | 1.3.4 | LGPL-3.0-or-later | libvips precompilada (biblioteca dinámica, sin modificar) | S |

## Servicios externos propios (no son paquetes npm)

| Servicio | Licencia | Uso |
|---|---|---|
| veraPDF (imagen Docker `verapdf/cli`, solo tests) | GPL-3.0+ / MPL-2.0 (doble licencia) | validador de referencia de PDF/A en `src/lib/server/pdfa.test.ts` con `VERAPDF_DOCKER=1`; no se distribuye ni se ejecuta en producción |
| Gotenberg 8 (imagen Docker) | MIT | API HTTP de conversión de oficina; corre como servicio aparte en la red privada |
| └ LibreOffice | MPL-2.0 | motor dentro de Gotenberg (oficina → PDF y PDF → PDF/A) |
| └ Chromium | BSD-3-Clause (y otras) | motor HTML → PDF dentro de Gotenberg (Markdown → PDF y HTML → PDF; sin JavaScript ni red) |
| MongoDB 7 | SSPL (servidor, no se distribuye) | base de datos (Railway o Atlas) |

## Desarrollo (no se distribuyen)

| Paquete | Versión | Licencia |
|---|---|---|
| typescript | 5.9.3 | Apache-2.0 |
| eslint, eslint-config-next, @eslint/eslintrc | 9.39.5 / 15.5.28 / 3.3.7 | MIT |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | MIT |
| vitest | 3.2.7 | MIT |
| mongodb-memory-server | 11.3.0 | MIT |
| playwright-core, @playwright/test | 1.56.0 | Apache-2.0 |
| @next/bundle-analyzer | 15.5.4 | MIT |
| @formatjs/icu-messageformat-parser | 3.5.21 | MIT |
| @types/* (incluido @types/papaparse) | — | MIT |
| fontkit (lector de fuentes independiente en los tests; deps brotli, restructure, unicode-* … MIT) | 2.0.4 | MIT |
| opentype.js (genera el fixture `font.otf`) | 2.0.0 | MIT |
| jsdom, @types/jsdom (DOM de los tests de Markdown/HTML y lector independiente en los de navegador) | 29.1.1 | MIT |
| @types/turndown | 5.0.6 | MIT |

## Candidatas evaluadas para la fase 3 (todavía no instaladas)

Ver `docs/audit.md`. Resumen de licencias (`npm view`, 2026-10-20):

| Paquete | Licencia | Estado |
|---|---|---|
| hash-wasm, qrcode, marked, turndown, three, dxf-parser, exifr, wawoff2, libarchive.js, onnxruntime-web, exceljs | MIT | aceptable |
| @zip.js/zip.js | BSD-3-Clause | aceptable |
| epubjs | BSD-2-Clause | aceptable |
| jsqr, tesseract.js, @mediapipe/tasks-vision, SheetJS CE (tarball oficial 0.20.x) | Apache-2.0 | aceptable |
| @neslinesli93/qpdf-wasm, libraw-wasm | ISC (motores qpdf Apache-2.0, LibRaw LGPL-2.1/CDDL) | aceptable |
| mediabunny | MPL-2.0 | aceptable (copyleft por archivo) |
| dompurify | MPL-2.0 o Apache-2.0 | aceptable |
| jszip | MIT o GPL-3.0 (a elección) | aceptable bajo MIT; preferir fflate (ya instalado) |
| fonteditor-core | MIT (el registro no informa el campo; confirmar el archivo LICENSE al instalar) | a confirmar |
| occt-import-js | LGPL-2.1 | aceptable si hiciera falta STEP/IGES (no planificado) |
| 7z-wasm | 7-Zip LGPL + restricción unRAR | evitar; usar libarchive.js |
| **@ffmpeg/core** | **GPL-2.0-or-later** | **no sin aprobación del dueño** |
| **@imgly/background-removal** | **AGPL-3.0** (ver su LICENSE.md) | **no sin aprobación del dueño** |
| Calibre (MOBI/AZW) | GPL-3.0 | no sin aprobación |
| LibreDWG (DWG) | GPL-3.0 | no sin aprobación |
