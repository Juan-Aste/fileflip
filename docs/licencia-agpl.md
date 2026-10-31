# Auditoría de licencias para publicar Fileflect bajo AGPL-3.0-or-later

Tarea 11.5b (2026-10-29). Pregunta: ¿se puede distribuir el código de Fileflect bajo la **GNU Affero General Public License v3.0 o posterior** con las dependencias y recursos que tiene hoy? Fuentes: `src/content/credits.json` y `public/third-party-notices.txt` (generados por `npm run licenses` desde `package-lock.json` y `node_modules`), `scripts/licenses/embedded.mjs` (motores dentro de los WASM y binarios), `docs/dependencies.md` y una revisión de los archivos versionados (`git ls-files`).

## Conclusión

**Sí, es compatible.** Ninguna dependencia de producción ni recurso que se distribuye tiene una licencia incompatible con la AGPL-3.0-or-later (no hay GPL-2.0-only, licencias no comerciales, SSPL distribuida ni licencias con cláusulas que la AGPL prohíba). Hay cuatro casos que merecen una nota (más abajo): el modelo Supertonic 3 (OpenRAIL-M), las tipografías (OFL-1.1), MongoDB (SSPL, no se distribuye) y las herramientas GPL usadas solo en tests. Ninguno impide publicar.

Condiciones que hay que seguir cumpliendo:

1. Mantener la página de créditos y `public/third-party-notices.txt` (avisos y textos de licencia de las dependencias; `tests/licenses.test.ts` falla si se desactualizan).
2. Ofrecer el código fuente a los usuarios de la red (AGPL §13): `NEXT_PUBLIC_SOURCE_URL` muestra «Código fuente» en el footer y en créditos (tarea 11.5c), apuntando a la versión que corre en producción (rama `main`).
3. Mantener los avisos de copyright de terceros en los archivos portados (`src/lib/tts/supertonic.ts`, MIT de Supertone Inc.) y el aviso de modificación de la copia fp16 del modelo.
4. La marca «Fileflect» y el logo no se licencian bajo la AGPL (se aclara en el README).

## Dependencias npm de producción (250 paquetes, incluidas las transitivas)

| Licencia | Paquetes | ¿Compatible con AGPL-3.0-or-later? |
|---|---|---|
| MIT | 151 | Sí (permisiva) |
| Apache-2.0 | 33 (+1 «Apache-2.0 AND MIT») | Sí: compatible con la familia GPLv3 (no con GPLv2, que no aplica) |
| ISC | 21 | Sí |
| BSD-2-Clause / BSD-3-Clause | 15 / 14 | Sí |
| MPL-2.0 | 4 (mediabunny y sus codificadores) | Sí: ningún archivo lleva el Anexo B «Incompatible With Secondary Licenses» (revisado), así que la MPL permite combinarlos con la GPL/AGPL. Se distribuyen sin modificar |
| MPL-2.0 OR Apache-2.0 | dompurify | Sí (se usa bajo Apache-2.0) |
| LGPL-3.0 / LGPL-3.0-or-later | libheif-js, @img/sharp-libvips | Sí: la LGPLv3 permite combinarse con obras GPLv3/AGPLv3 |
| OFL-1.1 | 3 tipografías @fontsource | Sí como obra separada (ver casos dudosos) |
| 0BSD, MIT-0 | tslib, nodemailer | Sí |
| MIT AND Zlib | pako | Sí |
| BlueOak-1.0.0 | sax | Sí: permisiva, sin condiciones adicionales a mantener el aviso |
| CC-BY-4.0 | caniuse-lite (datos de compatibilidad que usa el build) | Sí: la FSF la considera compatible con la GPLv3 para datos; solo pide atribución (está en créditos) |

## Motores incluidos en WASM y binarios (31 entradas de `embedded.mjs`)

| Motor | Licencia | Compatible |
|---|---|---|
| LAME (MP3), FFmpeg (AAC nativo, sin `--enable-gpl`) | LGPL-2.0-or-later / LGPL-2.1-or-later | Sí (el «or later» permite la GPLv3) |
| libheif, libde265 | LGPL-3.0 | Sí |
| libvips, GLib, Pango, FriBidi, librsvg, libexif, proxy-libintl (servidor, dentro de sharp) | LGPL-2.1-or-later | Sí |
| cairo | LGPL-2.1 OR MPL-1.1 | Sí, bajo la LGPL-2.1 (su §3 permite pasar a la GPL v2 o posterior) |
| libFLAC, libwebp, libavif + libaom, Chromium (Gotenberg) | BSD | Sí |
| MozJPEG | IJG AND BSD-3-Clause AND Zlib | Sí (la FSF lista la IJG como compatible) |
| libarchive (build propio) | BSD-2-Clause, Zlib, bzip2-1.0.6, 0BSD | Sí |
| oxipng, google/woff2 + Brotli, Gotenberg | MIT | Sí |
| qpdf, Tesseract + Leptonica, modelos tessdata_best, U²-Net (u2netp) | Apache-2.0 (+ BSD-2) | Sí |
| Código de inferencia de Supertonic (portado) | MIT | Sí (se mantiene el aviso de copyright) |
| Whisper `tiny` y `base` | MIT | Sí |
| LibreOffice (dentro de Gotenberg, servicio aparte) | MPL-2.0 | Sí; además es un programa separado que se usa por HTTP, no se combina con nuestro código |
| Supertonic 3 (pesos del modelo) | BigScience OpenRAIL-M | Ver casos dudosos |
| MongoDB Server | SSPL-1.0 | No se distribuye; ver casos dudosos |
| FFmpeg n5.1.4 con `--enable-gpl` (`@ffmpeg/core` 0.12.10), con x264 y x265 | GPL-2.0-or-later | Sí: se usa bajo la GPL-3.0 (el «or later» lo permite), compatible con la AGPL-3.0; código fuente exacto y build enlazados en créditos (tarea 12.4a). LAME y FriBidi del mismo build: LGPL; el resto BSD/MIT/ISC/Zlib/FTL/WTFPL |

## Recursos propios versionados

- **Logo e íconos** (`public/logo.svg`, `public/icon-*.png`, `src/app/icon.svg`, `src/app/apple-icon.png`): propios. Quedan fuera de la AGPL como marca (aclarado en el README). Los íconos de la interfaz son de lucide-react (ISC).
- **Fixtures de tests** (`tests/fixtures/`): sintéticos o generados por nuestros scripts (ver `tests/fixtures/README.md`); sin contenido de terceros ni datos personales. Los audios `speech-*.ogg` se generaron con espeak-ng (GPL-3.0) y los `speech-ai-*` con Supertonic: la salida de un programa no queda cubierta por la licencia del programa, así que son datos propios.
- **Capturas de las guías y de docs** (`public/guides/`, `docs/screenshots/`): capturas de nuestro propio sitio.
- **Muestras de voz** (`public/tts-samples/`): salida del modelo Supertonic 3 con frases propias. La OpenRAIL-M no reclama derechos sobre la salida (art. 6); se mantiene la indicación de que es voz generada por IA.
- **Textos de licencias** (`public/licenses/`, `scripts/licenses/texts/`): textos oficiales, se distribuyen sin cambios.

## Casos dudosos (revisados)

### Supertonic 3 (BigScience OpenRAIL-M)
La OpenRAIL-M no es una licencia de software libre (tiene restricciones de uso, Anexo A) y no es compatible con la AGPL **si se combinara en el mismo programa**. Pero los pesos **no son parte del programa ni del código fuente correspondiente**: son datos que el navegador descarga en tiempo de ejecución desde Hugging Face (o desde nuestra copia en R2), no se versionan en el repo y no se compilan con el código. Para la AGPL son una obra separada distribuida, a lo sumo, como «agregado» (§5, último párrafo), y cada uno conserva su licencia. Lo que hay que mantener:
- No versionar los ONNX en el repo (hoy no están; `scripts/models/sync-r2.mjs` los descarga y convierte en la PC del dueño).
- Las restricciones de uso de los Términos deben referirse **al modelo**, no al código de Fileflect (hoy dicen «no puedes usar el modelo…»: correcto). La AGPL §7/§10 prohíbe agregar restricciones al código, no a una obra separada.
- La copia fp16 servida desde R2 es una «modificación» del modelo: se marca como tal en créditos y en `NOTICE.txt` del bucket, y se sirve con la copia de la licencia (art. 4 de la OpenRAIL-M).

Conclusión: compatible tal como está hoy.

### Tipografías OFL-1.1 (Bricolage Grotesque, Figtree)
La OFL no es compatible con la GPL para mezclar el código, pero permite expresamente distribuir las fuentes junto con cualquier software. Se usan como archivos aparte (paquetes @fontsource), sin modificar: es un agregado y cada una conserva su licencia. Si algún día se modifica una fuente, debe cambiar de nombre (Reserved Font Name) y seguir bajo OFL.

### MongoDB (SSPL-1.0)
Es la base de datos, un servidor aparte (Railway o Atlas). No se distribuye ni se incluye en el repo; el sitio usa el driver `mongodb` (Apache-2.0). La SSPL solo obliga a quien ofrece MongoDB **como servicio**, que no es el caso. Sin efecto sobre la licencia de Fileflect.

### Herramientas GPL solo de tests (veraPDF, ffmpeg del sistema, espeak-ng)
Se ejecutan como programas separados en la máquina de desarrollo (Docker o el sistema) y no se distribuyen. No afectan. Por lo mismo, las dependencias de desarrollo (`devDependencies`: TypeScript, ESLint, Vitest, Playwright, axe-core MPL-2.0, lightningcss MPL-2.0, etc.) no se distribuyen con el sitio y todas son permisivas.

## Cambios que habilita la fase 12

Con el proyecto bajo AGPL-3.0-or-later se pueden agregar dependencias GPL-2.0-or-later, GPL-3.0 y AGPL-3.0 (por ejemplo `@ffmpeg/core` o `@imgly/background-removal`). **Hecho en la tarea 12.1 (2026-10-31)**: `chooseLicense` (`scripts/licenses/production.mjs`) acepta esas licencias (`COMPATIBLE_COPYLEFT`) y rechaza GPL-2.0-only, GPL-1.0, las no comerciales, SSPL y BUSL (`FORBIDDEN_LICENSE`); `npm run licenses` y `tests/licenses.test.ts` exigen que cada componente GPL/AGPL tenga una entrada `gpl: true` en `scripts/licenses/embedded.mjs` con su código fuente exacto y cómo se compila, que se muestra en la página de créditos («Componentes bajo GPL y AGPL»). Texto de la AGPL-3.0 en `/licenses/AGPL-3.0.txt`.
