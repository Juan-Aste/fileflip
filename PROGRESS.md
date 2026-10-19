# PROGRESS — Bitácora de FileFlip

## 2026-10-19 — Sesión 1 (primera ejecución)

**Qué se hizo**
- El repositorio estaba vacío. Se creó `main` con un README mínimo y la rama `dev` a partir de ella.
- Se creó PLAN.md con la especificación y las tareas por hitos (base + i18n → imágenes en navegador → PDF en navegador → documentos en servidor → cuentas/suscripción → publicidad → SEO cola larga → deploy).
- Se crearon `.env.example`, `docker-compose.yml` (MongoDB 7 + Gotenberg 8) y `.gitignore`.

**Decisiones**
- El repo en GitHub ya se llama `Juan-Aste/fileflip` (la sesión lo accede con el nombre antiguo `image-saas`, que redirige).
- Estructura prevista: `src/` con App Router en `src/app/[locale]/`, mensajes en `messages/`.

**Problemas**
- **No se pudo hacer el scaffolding (tarea 0.3)**: en este entorno de ejecución el registro de npm (`registry.npmjs.org`) no resuelve DNS y el proxy de salida lo rechaza (403). Sin acceso a npm no se puede ejecutar `create-next-app` ni instalar dependencias, ni verificar `npm run lint`/`npm run build`. Para no subir código sin verificar, solo se subieron documentos y configuración.

**Qué sigue**
- Tarea 0.3: scaffolding con create-next-app (cuando haya acceso a npm), luego 0.4 y 0.5.

## 2026-10-19 — Sesión 2 (tarea 0.3)

**Qué se hizo**
- Scaffolding de Next.js escrito a mano replicando la salida de create-next-app: `package.json` (Next 15.5.4, React 19.1, Tailwind 4, ESLint 9 con `eslint-config-next`, TypeScript 5.9), `tsconfig.json` con alias `@/*`, `next.config.ts` con `output: "standalone"`, `postcss.config.mjs`, `eslint.config.mjs`, `src/app/{layout,page}.tsx` y `globals.css` provisorios.
- Workflow de GitHub Actions `.github/workflows/ci.yml` (push a dev/main, PR y manual): install → lint → test (si existe) → build, y sube el `package-lock.json` generado como artefacto.
- CI verde en el commit 155963f: lint y build pasan.

**Decisiones**
- El registro de npm sigue bloqueado en el entorno de la tarea programada (DNS no resuelve y el proxy de salida devuelve 403). En vez de bloquear el proyecto, **la verificación de lint/build/tests se hace en GitHub Actions**: se hace push a dev y se revisa el resultado del run con las herramientas de GitHub. No cambia el stack.
- `npm run lint` usa `eslint .` directamente (no `next lint`, que está deprecado).
- El layout raíz y la portada son provisorios; en el Hito 1 pasan a `app/[locale]/` con next-intl.
- Sin lockfile por ahora (no se puede generar localmente); se agregó la tarea 0.6 para commitearlo.

**Qué sigue**
- 0.4: estructura de carpetas y conexión Mongoose con caché (agregando `mongoose` al package.json).
- 0.5: Vitest.

**Problemas**
- Sin acceso local a npm no se puede ejecutar nada antes del push; cada sesión depende del CI para validar. Si el CI falla, hay que corregir o revertir en la misma sesión.

## 2026-10-19 — Sesión 3 (verificación local + tareas 0.4, 0.5, 0.6)

**Qué se hizo**
- Ahora hay acceso a npm en el entorno. Se verificó localmente el scaffolding escrito a mano (sesión 2): `npm install`, `npm run lint` y `npm run build` pasan.
- **Seguridad:** `npm audit` marcaba vulnerabilidades críticas en Next 15.5.4 (RCE en el protocolo flight de RSC, entre otras). Se actualizó a `next@15.5.28` y `eslint-config-next@15.5.28` (versiones fijas). Queda un aviso de `postcss` empaquetado dentro de Next, que solo se usa en build.
- 0.4: carpetas `src/{lib,components,workers,config,models}` y `src/lib/db.ts` (Mongoose 9 con caché de conexión en `globalThis`, reintenta si la conexión falla).
- 0.5: Vitest (`vitest.config.ts` con alias `@`), scripts `npm test` / `npm run test:watch`, tests de la caché de conexión (con `mongoose.connect` simulado).
- 0.6: `package-lock.json` commiteado; el CI usa `npm ci` con caché de npm y ya no sube el lockfile como artefacto.

**Decisiones**
- Vitest 3.2 en lugar de 4: con npm 10.9 `npm install` de vitest 4 falla con `Cannot read properties of null (reading 'edgesOut')` (bug de Arborist con sus peers opcionales). No cambia el stack; se puede subir a 4 más adelante.
- Next se mantiene en la rama 15.x (parcheada) para no mezclar la migración a 16 con el trabajo de i18n.

**Qué sigue**
- Hito 1, tarea 1.1: next-intl (routing, request, middleware con detección de idioma y cookie, rutas `app/[locale]/`).

**Problemas**
- Ninguno pendiente. Se puede quitar del "Pendiente del dueño" lo de habilitar npm (ya funciona).

## 2026-10-19 — Sesión 4 (tarea 1.1: next-intl)

**Qué se hizo**
- Se instaló `next-intl` 4.14 y se configuró con el plugin en `next.config.ts`.
- `src/i18n/routing.ts` (es por defecto, en, pt, fr, zh; prefijo siempre presente; detección de idioma activada), `navigation.ts` (Link/redirect/usePathname/useRouter con idioma) y `request.ts` (carga `messages/<locale>.json`).
- `src/middleware.ts`: sin prefijo redirige según la cookie `NEXT_LOCALE` y luego `Accept-Language`; la cookie dura un año (next-intl usa cookie de sesión por defecto). Excluye `/api`, `/_next` y archivos con extensión.
- Las páginas pasan a `src/app/[locale]/` (layout con `lang` correcto, metadatos traducidos, `generateStaticParams` para los 5 idiomas, `notFound()` para idiomas inválidos). Se eliminaron el layout y la portada provisorios de la raíz.
- `messages/*.json` mínimos (solo metadatos y título/tagline) para que el build funcione; la tarea 1.2 los completa.
- Tests (`src/i18n/routing.test.ts`): redirección por Accept-Language, respaldo a español, prioridad de la cookie y duración de la cookie. Vitest necesita `server.deps.inline: ["next-intl"]` porque next-intl importa `next/server` sin extensión.
- Verificado: lint, typecheck, tests (7) y build pasan; prueba manual con `next start`: `/` con `Accept-Language: en-US` → 307 a `/en`, `/pt` renderiza con `<html lang="pt">`.

**Decisiones**
- Los slugs traducidos (`pathnames` de next-intl) se agregan en la tarea 7.1, cuando existan las páginas de conversión.

**Qué sigue**
- 1.2: completar `messages/{es,en,pt,fr,zh}.json` con los textos base y test de paridad de claves.

**Problemas**
- Ninguno.

## 2026-10-19 — Sesión 5 (tarea 1.2: mensajes)

**Qué se hizo**
- `messages/{es,en,pt,fr,zh}.json` con los textos base: metadatos, comunes, header y navegación, selector de idioma, tema, footer, portada (titular + 4 ventajas) y errores.
- `tests/messages.test.ts`: verifica que todos los idiomas tengan exactamente las mismas claves que `es`, que no haya textos vacíos y que los marcadores ICU (`{year}`, etc.) coincidan.

**Decisiones**
- El español pasa a ser neutro con tuteo ("Convierte", "Inténtalo") en lugar del voseo rioplatense, porque el público es toda Latinoamérica (México es el mercado más grande). Las páginas de cola larga regionales pueden usar el registro local.

**Qué sigue**
- 1.3: layout con header, selector de idioma, footer y modo claro/oscuro.

## 2026-10-19 — Sesión 5 (tarea 1.3: layout)

**Qué se hizo**
- Header fijo con logo, navegación, selector de idioma (`<select>` con nombres nativos, `localeNames` en `routing.ts`; usa `router.replace` de next-intl con los params actuales, así mantiene la página) y botón de tema (claro → oscuro → sistema, guardado en `localStorage`).
- Modo oscuro por clase `.dark` (variante personalizada de Tailwind 4) con un script en `<head>` que aplica el tema antes de pintar, para evitar el parpadeo. Paleta con variables CSS (`background`, `surface`, `muted`, `border`, `brand`...).
- Footer, enlace "Saltar al contenido", página 404 traducida (`[locale]/not-found.tsx` + `[...rest]` para rutas desconocidas).
- Verificado con `next start`: `/zh` muestra el selector con 中文 seleccionado; `/es/nope` devuelve 404 con el texto en español.

**Decisiones**
- Los enlaces del footer a privacidad/términos/contacto/precios se agregan cuando existan esas páginas (5.6 y 7.5), para no enlazar a 404.

**Qué sigue**
- 1.4: portada con el mensaje central de privacidad y velocidad.

## 2026-10-19 — Sesión 5 (tarea 1.4: portada)

**Qué se hizo**
- Portada con insignia "Tus archivos no salen de tu dispositivo", titular y bajada sobre privacidad y velocidad, botón que lleva a `#converter` (el conversor se monta ahí en 2.2), pasos "arrastra → elige → descarga" y 4 ventajas. Todo desde `messages/*.json`.

**Qué sigue**
- 1.5: utilidades de formato por idioma.

## 2026-10-19 — Sesión 5 (tarea 1.5: formato por idioma)

**Qué se hizo**
- `src/lib/format.ts`: `formatNumber`, `formatBytes` (pasos de 1024, unidades localizadas), `formatCurrency`, `formatDate`, `formatPercent`, con etiquetas Intl por idioma (`es-419`, `en-US`, `pt-BR`, `fr-FR`, `zh-CN`).
- Para monedas locales (ARS, MXN, CLP, COP, UYU, PEN, BRL) se usa la convención del país cuando el idioma coincide: un argentino en español ve "$ 4.990"; en inglés ve "ARS 4,990".
- Tests en `src/lib/format.test.ts`.

**Qué sigue**
- Hito 2, tarea 2.1: registro de formatos y detección por magic bytes.

## 2026-10-19 — Sesión 5 (tarea 2.1: registro de formatos y detección)

**Qué se hizo**
- `src/config/formats.ts` (en vez de `conversions.ts`: contiene formatos y conversiones): 23 formatos con MIME, extensiones y categoría; lista de conversiones con su motor (`browser` | `server`). Imágenes → cualquier imagen raster + PDF en el navegador; PDF → JPG/PNG en el navegador; PDF → Word y documentos de oficina → PDF en el servidor. HEIC y SVG solo como entrada. Utilidades `outputsFor`, `findConversion`, `formatFromExtension`, `outputFilename`.
- `src/lib/detect.ts`: detección del tipo real por magic bytes (JPG, PNG, GIF, WEBP, BMP con validación del encabezado DIB, TIFF, ICO, AVIF/HEIC por la caja `ftyp`, PDF, RTF, ZIP → DOCX/XLSX/PPTX/ODT/ODS/ODP, OLE2 → DOC/XLS/PPT, SVG, texto/CSV). La extensión solo desempata contenedores. `detectFileFormat(file)` lee los primeros 64 KB.
- Tests: `src/lib/detect.test.ts` y `src/config/formats.test.ts`.

**Qué sigue**
- 2.2: componente de arrastrar y soltar que detecta el tipo y muestra solo salidas válidas.

## 2026-10-19 — Sesión 5 (tarea 2.2: arrastrar y soltar)

**Qué se hizo**
- `src/components/converter/`: `Dropzone` (arrastrar y soltar o clic, accesible con `<label>` sobre un input oculto), `useFileQueue` (cola de archivos con detección real por magic bytes) y `Converter` (lista con formato detectado, tamaño localizado, quitar/limpiar, y botones de formato de salida). Con varios archivos se muestran solo las salidas comunes (`commonOutputs` en `formats.ts`, con tests); los archivos no compatibles se marcan y se ignoran.
- Montado en la portada en `#converter`. Probado con Playwright (Chromium): PNG detectado con sus 8 salidas, archivo binario marcado como no compatible.
- El botón "Convertir" todavía no hace nada: se conecta en 2.3.

**Qué sigue**
- 2.3: worker de imágenes con @jsquash y progreso.

## 2026-10-19 — Sesión 5 (tarea 2.3: worker de imágenes)

**Qué se hizo**
- `@jsquash/{jpeg,png,webp,avif}` instalados. `src/lib/image/codecs.ts`: codificadores y decodificadores WASM cargados con `import()` dinámico (cada códec se descarga solo cuando se usa; webpack los emite como `.wasm` aparte en `_next/static/media`).
- `src/workers/image.worker.ts`: decodifica primero con `createImageBitmap` + `OffscreenCanvas` (nativo y rápido) y si falla usa el decodificador WASM; codifica con WASM; informa progreso por etapas. Para JPG aplana la transparencia sobre blanco (`src/lib/image/pixels.ts`, con tests).
- `src/lib/image/client.ts`: un worker compartido con cola de trabajos, transfiere los buffers (sin copias) y recrea el worker si se cae. `src/lib/convert.ts`: punto único `convertFile` + `isRunnable` (la UI solo ofrece salidas que ya funcionan; se irán habilitando con cada motor).
- UI: `FileRow` con barra de progreso accesible, botón Descargar, tamaño antes → después y porcentaje de ahorro.
- Probado en Chromium con Playwright: PNG → WEBP, JPG y AVIF generan archivos válidos (firma verificada).

**Decisiones**
- El build muestra un aviso de webpack "Circular dependency between chunks with runtime" causado por el chunk del worker; no afecta el funcionamiento.

**Qué sigue**
- 2.4: opciones de calidad y redimensionado.

## 2026-10-19 — Sesión 5 (tarea 2.4: calidad y redimensionado)

**Qué se hizo**
- `src/lib/image/dimensions.ts`: `computeSize` (original, porcentaje 1–400 %, o caber en ancho/alto máximo manteniendo proporción y sin agrandar; tope de 16384 px por lado, proporcional). Tests en `dimensions.test.ts`.
- El worker redimensiona con `OffscreenCanvas` (`imageSmoothingQuality: "high"`) antes de codificar.
- Panel "Opciones" (`ImageOptionsPanel`): deslizador de calidad (solo JPG/WEBP/AVIF) y modo de tamaño. Probado en Chromium: PNG 64×48 al 50 % → WEBP y AVIF de 32×24.
- `src/lib/image/options.ts`: tipos y constantes livianas separadas de `codecs.ts`, para que el bundle principal no referencie los chunks WASM.

**Problemas resueltos**
- El build fallaba con caché ("RealContentHashPlugin ... unexpected caching problem") por una dependencia circular de chunks: el codificador AVIF multihilo trae un worker pthread que se instancia a sí mismo. Como la versión multihilo solo se usa con `crossOriginIsolated` (no es nuestro caso), `next.config.ts` la reemplaza por la de un hilo con `NormalModuleReplacementPlugin`. El aviso de dependencia circular desapareció.

**Qué sigue**
- 2.5: formatos extra en el navegador (GIF, BMP, ICO, TIFF, SVG→PNG).

## 2026-10-19 — Sesión 5 (tarea 2.5: formatos extra)

**Qué se hizo**
- Salidas nuevas en el navegador: GIF (`gifenc`, paleta de 256 colores con transparencia), BMP (codificador propio de 24 bits, `bmp.ts`), TIFF (`utif2`), ICO (contenedor propio con PNG de 16 a 256 px, centrado en un cuadrado transparente; `ico.ts`).
- Entrada TIFF: decodificador `utif2` como respaldo (solo Safari decodifica TIFF de forma nativa). GIF/BMP/ICO de entrada usan el decodificador nativo.
- SVG → raster: se rasteriza en el hilo principal (los workers no tienen DOM) directamente al tamaño pedido; el tamaño intrínseco sale de `width`/`height`/`viewBox` (`svg.ts`, 1024 px si no declara nada). En modo "ancho/alto máximo" un SVG sí se agranda (`computeSize(..., { upscale: true })`).
- Helpers de canvas para el worker en `canvas.ts`; tipos para `gifenc` en `src/types/gifenc.d.ts`.
- Tests: BMP, ICO, ida y vuelta TIFF, tamaño intrínseco de SVG. Probado en Chromium: PNG→GIF/BMP/TIFF/ICO, TIFF→JPG/PNG y SVG→PNG a 480×240.

**Qué sigue**
- 2.6: HEIC de entrada.

## 2026-10-19 — Sesión 5 (tarea 2.6: HEIC)

**Qué se hizo**
- `libheif-js` (variante ESM con el WASM embebido, `libheif-bundle.mjs`): `src/lib/image/heic.ts` decodifica la imagen principal aplicando la rotación guardada en el archivo y libera la memoria WASM. El módulo (~2 MB) se carga solo la primera vez que alguien convierte un HEIC, dentro del worker.
- El worker intenta primero el decodificador nativo (Safari 17+ lo soporta) y si falla usa libheif.
- Test con un HEIC real de 120×80 (`tests/fixtures/photo.heic`, generado con pillow-heif). Probado en Chromium: HEIC → JPG y PNG.

**Decisiones**
- Se eligió libheif-js en vez de heic2any porque heic2any necesita el DOM (no funciona dentro de un Web Worker). libheif es LGPL-3.0: se usa sin modificar y en un chunk separado que se carga dinámicamente, lo que es compatible con la licencia; conviene mencionarlo en la página de licencias/créditos.

**Qué sigue**
- 2.7: insignia "Se procesa en tu dispositivo" / "en nuestro servidor".

## 2026-10-19 — Sesión 5 (tarea 2.7: insignia de procesamiento)

**Qué se hizo**
- `ProcessingBadge` (verde "Se procesa en tu dispositivo: tu archivo no sale de tu computadora" / ámbar "Se procesa en nuestro servidor y se borra en 1 hora"), traducida a los 5 idiomas. En el conversor cambia según el motor de la conversión elegida; las páginas por herramienta (7.1) la reutilizan.

**Qué sigue**
- 2.8: lotes con descarga ZIP.

## 2026-10-19 — Sesión 5 (tarea 2.8: lotes y ZIP)

**Qué se hizo**
- `src/lib/zip.ts` con `fflate`: ZIP sin recomprimir (los archivos convertidos ya están comprimidos, así es mucho más rápido), nombres únicos estilo explorador ("a.jpg", "a (1).jpg"). Tests en `zip.test.ts`.
- Botón "Descargar todo en ZIP (n)" cuando hay 2+ resultados; el módulo ZIP se importa al hacer clic. `src/lib/download.ts` con `saveBlob`.
- Probado en Chromium: PNG + TIFF + HEIC + PNG repetido → JPG → `fileflip.zip` con 4 archivos y nombre duplicado renombrado.

**Qué sigue**
- 2.9: detección de capacidad/tamaño y respaldo automático al servidor (API con sharp).

## 2026-10-19 — Sesión 5 (tarea 2.9: respaldo automático al servidor)

**Qué se hizo**
- `sharp` instalado. `src/lib/server/image.ts`: conversión en memoria con libvips (aplica orientación EXIF, aplana transparencia para JPG, SVG ampliable, BMP/ICO con los codificadores propios). Entradas: JPG, PNG, WEBP, AVIF, GIF, TIFF, SVG (el sharp precompilado no lee HEIC/HEVC, BMP ni ICO: esos quedan solo en el navegador). Capacidades compartidas en `src/config/server-capabilities.ts`.
- `POST /api/convert/image`: valida el tipo real por magic bytes, el tamaño (límite del plan) y las opciones (`parse-options.ts`); responde el archivo con `Content-Disposition` UTF-8 y `no-store`. Nada se guarda en disco.
- Errores de API como códigos (`src/lib/api-errors.ts`) traducidos en el namespace `ApiErrors` (test que verifica que cada código tenga traducción).
- `src/config/limits.ts`: límites por plan (gratis: 15 MB y 5 archivos en servidor; 200 MB y 50 en navegador; Pro más amplio) con `checkLimits` y tests (adelanta parte de 4.3).
- Decisión de motor (`src/lib/convert.ts`): se procesa localmente si el navegador tiene Worker/WASM/OffscreenCanvas y el archivo entra en el presupuesto del dispositivo (`capabilities.ts`, según `navigator.deviceMemory`); si no, o si la conversión local falla, se usa el servidor automáticamente. El resultado indica con ☁️ "Procesado en nuestro servidor (se borra en 1 hora)". Subida con XHR para tener progreso.
- Probado: API con curl (WEBP al 50 %, HEIC/binario → 415, sin archivo → 400) y en Chromium sin `OffscreenCanvas` (PNG→WEBP pasa por el servidor; HEIC muestra "Tu navegador no puede convertir este archivo").

**Qué sigue**
- Hito 3: operaciones PDF en el navegador (3.1 unir PDFs).

## 2026-10-19 — Sesión 5 (tarea 3.1: unir PDF)

**Qué se hizo**
- `pdf-lib` instalado. `src/lib/pdf/ops.ts`: operaciones PDF puras (`mergePdfs`, `pageCount`), con tests (`tests/helpers/pdf.ts` genera PDFs de prueba).
- `src/lib/worker-rpc.ts`: mini protocolo de llamadas a workers con progreso (`exposeHandlers` / `createWorkerClient`), usado por el nuevo `src/workers/pdf.worker.ts` y `src/lib/pdf/client.ts`.
- Registro de herramientas `src/config/tools.ts` (unir, dividir, rotar, ordenar, imágenes→PDF, comprimir) con slugs traducidos por idioma (`/es/unir-pdf`, `/en/merge-pdf`, `/pt/juntar-pdf`, `/fr/fusionner-pdf`, `/zh/merge-pdf`); `availableTools` controla qué páginas se generan.
- Ruta `src/app/[locale]/[slug]/page.tsx`: página por herramienta con título, descripción, insignia, metadatos traducidos, canonical y hreflang (`metadataBase` desde `NEXT_PUBLIC_SITE_URL`). Slugs de otro idioma → 404.
- El selector de idioma traduce el slug (`translatePathname` en `src/config/routes.ts`, con tests): en `/es/unir-pdf` elegir English lleva a `/en/merge-pdf`.
- UI reutilizable de herramientas: `useToolFiles` (detección y orden), `FileList` (subir/bajar/quitar), `ProgressBar`, `ToolResult`. `MergePdfTool`.
- Probado en Chromium: dos PDF reordenados y unidos → páginas en el orden elegido.

**Qué sigue**
- 3.2: dividir y rotar.

## 2026-10-19 — Sesión 5 (tarea 3.2: dividir y rotar)

**Qué se hizo**
- `ops.ts`: `splitPdf` (un documento por grupo de páginas) y `rotatePdf` (suma al giro existente, todas o algunas páginas). `ranges.ts`: `parsePageRanges` ("1-3, 5, 8-", "-2", con validación de límites) y `rangeLabel`. Tests de todo.
- Worker PDF con métodos `count`, `split`, `rotate`.
- Herramientas `/es/dividir-pdf` (cada página / un PDF por rango / extraer en un solo PDF; varios resultados se descargan en ZIP) y `/es/rotar-pdf` (90° derecha, 180°, 90° izquierda; todas o algunas páginas).
- Componentes reutilizables: `useSinglePdf` + `SinglePdfInput` (un PDF con su número de páginas y aviso si está dañado o protegido), `ChoiceGroup`, `RangesInput` (con `aria-describedby` para la ayuda/error), `PrimaryButton`.
- Probado en Chromium: dividir "1-2, 4-" de un PDF de 5 páginas → ZIP con 2 PDF; rotar solo la página 2 en 180°.

**Qué sigue**
- 3.3: reordenar páginas con miniaturas (pdf.js).

## 2026-10-19 — Sesión 5 (tarea 3.3: ordenar páginas con miniaturas)

**Qué se hizo**
- `pdfjs-dist` 6 (build *legacy*, para navegadores más viejos, comunes en Android económicos): `src/lib/pdf/render.ts` con `openPdf`, `renderPage` (escala y tope de píxeles), `canvasToBlob` y `pageThumbnail`. pdf.js analiza el PDF en su propio Web Worker y se carga de forma diferida.
- `organizePdf` en `ops.ts` (reordenar, girar y eliminar páginas en una sola pasada) con tests; método `organize` en el worker.
- Herramienta `/es/ordenar-pdf`: grilla de miniaturas generadas progresivamente (`usePdfThumbnails`), arrastrar y soltar, y botones accesibles para mover antes/después, girar y eliminar; "Restaurar todas".
- Probado en Chromium: 5 miniaturas, mover/girar/eliminar con botones → PDF correcto.

**Problemas**
- El arrastrar y soltar HTML5 no se pudo verificar con Playwright (los eventos sintéticos no producen `drop`); los botones cubren la misma función. Revisar a mano en un navegador real.

**Qué sigue**
- 3.4: imágenes → PDF.

## 2026-10-19 — Sesión 5 (tarea 3.4: imágenes a PDF)

**Qué se hizo**
- `imagesToPdf` en `ops.ts`: una imagen por página; tamaño "igual a la imagen", A4 o Carta (orientación según la imagen, centrada) y margen. Tests con imágenes generadas con sharp.
- `src/lib/image/exif.ts`: lee la orientación EXIF de un JPG (tests con EXIF little/big-endian y datos truncados). Si un JPG viene girado (típico de celulares), se recodifica para que la rotación quede en los píxeles; si no, se incrusta tal cual (sin pérdida).
- PNG se incrusta directo; GIF/ICO/SVG pasan a PNG y HEIC/WEBP/AVIF/TIFF/BMP a JPG (calidad 92) con el worker de imágenes antes de armar el PDF.
- Herramienta `/es/imagenes-a-pdf` (orden de páginas, tamaño, margen) y el conversor general ahora ofrece "PDF" para cualquier imagen.
- Probado en Chromium: PNG + HEIC + JPG con orientación 6 → PDF Carta con la página del JPG vertical; conversor JPG → PDF.

**Qué sigue**
- 3.5: PDF → JPG/PNG con pdf.js.

## 2026-10-19 — Sesión 5 (tarea 3.5: PDF a JPG/PNG)

**Qué se hizo**
- `src/lib/pdf/to-images.ts`: renderiza cada página con pdf.js a la resolución elegida y la exporta a JPG (con calidad) o PNG, liberando cada canvas enseguida para no agotar memoria en PDFs largos. `pageImageName` ("informe-03.jpg") con test.
- Conversor: PDF → JPG/PNG habilitado; una página devuelve la imagen, varias devuelven un ZIP (`ConvertResult.filename` permite nombres propios). En "Opciones" aparece "Resolución" (72 / 150 recomendado / 300 DPI) en lugar del redimensionado cuando la entrada es PDF.
- Probado en Chromium: PDF de 1 página a 300 DPI → PNG de 1250×833 con los colores correctos; PDF de 5 páginas → ZIP con 5 JPG.

**Qué sigue**
- 3.6: comprimir PDF.

## 2026-10-19 — Sesión 5 (tarea 3.6: comprimir PDF)

**Qué se hizo**
- `src/lib/pdf/compress.ts`: recorre las imágenes del PDF y recodifica como JPEG las fotos JPEG (DCTDecode) y las imágenes RGB/grises sin predictor (FlateDecode), reduciéndolas a un lado máximo según el nivel (baja 2400 px/q80, recomendada 1600 px/q65, fuerte 1100 px/q45). Solo reemplaza si queda al menos 10 % más chica; deja intactos CMYK, indexados, máscaras, `/Decode` y lo que falle. Nunca devuelve un archivo más grande que el original. El texto y los vectores no se tocan.
- El recompresor es inyectable: en el worker usa `createImageBitmap` (sin aplicar EXIF, como los visores PDF) + `OffscreenCanvas` + mozjpeg (`recompress-browser.ts`); en los tests uno simulado.
- Herramienta `/es/comprimir-pdf` con nivel y resultado "3,2 MB → 113 kB (97 % menos)" o "ya está optimizado". `ToolResult` acepta una nota.
- Con esto todas las herramientas PDF tienen página (`availableTools = toolIds`).
- Probado en Chromium: PDF de 3,2 MB con una foto JPG y una PNG → 113 kB, se renderiza correctamente.

**Decisiones**
- Sin respaldo en servidor para comprimir PDF por ahora: Gotenberg no tiene una ruta de compresión de PDF existentes y agregar Ghostscript/qpdf sería otro servicio. Si hace falta, se puede sumar más adelante.

**Qué sigue**
- Hito 4: 4.1 cliente Gotenberg y API de documentos de oficina → PDF.

## 2026-10-19 — Sesión 5 (tarea 4.1: Gotenberg y documentos → PDF)

**Qué se hizo**
- `src/lib/server/gotenberg.ts`: cliente de Gotenberg (`/forms/libreoffice/convert`) con timeout, errores tipados (`unavailable` / `failed` / `timeout`) y chequeo de salud. Tests con `fetch` simulado.
- `src/lib/server/upload.ts`: lectura y validación común de subidas (límite del plan antes y después de leer, tipo real por magic bytes, formato permitido). La ruta de imágenes ahora lo usa.
- `POST /api/convert/document`: Word (DOC/DOCX), Excel (XLS/XLSX/CSV), PowerPoint (PPT/PPTX), ODT/ODS/ODP, RTF y TXT → PDF. A Gotenberg se le manda un nombre neutro con la extensión real (`document.docx`), nunca el nombre del usuario. Caída del servicio → 503 `serviceUnavailable`; documento ilegible → 422. Tests del handler con Gotenberg simulado (nombre UTF-8 en `Content-Disposition`, PNG disfrazado de DOCX → 415, solo salida PDF, >15 MB → 413).
- El conversor de la portada ya ofrece PDF para documentos de oficina; la insignia cambia a "Se procesa en nuestro servidor…"; el límite gratuito se verifica antes de subir.
- **Verificado con Gotenberg 8 real** (Docker en este entorno, `docker-compose.yml`): DOCX, XLSX, ODT, CSV y TXT → PDF por la API y desde la UI.

**Qué sigue**
- 4.2: PDF → Word en el servidor.

## 2026-10-19 — Sesión 5 (tarea 4.2: PDF a Word)

**Qué se hizo**
- `src/lib/pdf/text-layout.ts`: reconstruye párrafos a partir del texto posicionado de pdf.js (líneas por línea base, espacios faltantes, palabras cortadas con guion, cortes por salto vertical, cambio de tamaño, sangría o línea corta; títulos por tamaño de letra). Tests.
- `src/lib/server/pdf-to-docx.ts`: extrae el texto con pdf.js en Node y arma un DOCX con la librería `docx` (títulos, párrafos, salto de página por página, tamaño de página del PDF; hasta 300 páginas). PDF escaneado sin texto → código `pdfHasNoText` ("Este PDF es una imagen escaneada…").
- `POST /api/convert/document` acepta PDF → DOCX. En el conversor aparece "Word" para PDFs con un aviso de calidad ("conserva el texto, los títulos y los párrafos; columnas, tablas e imágenes pueden cambiar").
- Probado: PDF generado por Gotenberg → DOCX con el texto correcto, por la API y desde la UI.

**Decisiones (cambio respecto del plan)**
- Gotenberg solo produce PDF (su ruta de LibreOffice no permite otro formato de salida), así que PDF → Word no puede pasar por Gotenberg. En vez de meter LibreOffice en la imagen de la app (cientos de MB), se extrae el texto con pdf.js (ya era parte del stack) y se genera el DOCX con `docx`. El resultado es texto editable con párrafos reales (LibreOffice importa PDFs como cuadros de texto sueltos, que es peor para editar). Limitación: no conserva tablas, columnas ni imágenes.
- En el servidor pdf.js corre su "worker" en el mismo proceso: se registra `globalThis.pdfjsWorker` para que funcione dentro del bundle de Next.

**Qué sigue**
- 4.3: validación, límites por plan y rate limiting por IP.

## 2026-10-19 — Sesión 5 (tarea 4.3: validación, límites y rate limiting)

**Qué se hizo**
- Validación por magic bytes y límites de tamaño por plan ya estaban en `readUpload` (tareas 2.9/4.1) y `src/config/limits.ts` (con tests).
- `src/lib/server/rate-limit.ts`: limitador de ventana deslizante en memoria por IP (`RATE_LIMIT_PER_MINUTE`, 20 por defecto), IP real desde `X-Forwarded-For`/`X-Real-IP` (proxy de Railway). Solo para anónimos; responde 429 `rateLimited` con `Retry-After`. Tests con reloj simulado y del flujo completo en `upload.test.ts`.
- Límite de lote en el cliente: en conversiones de servidor, los archivos que superan `serverMaxBatch` (5 gratis) se marcan con "Demasiados archivos en un mismo lote" sin subirlos.
- Verificado con el servidor real: 20 conversiones seguidas OK, la 21.ª y 22.ª → 429.

**Decisiones**
- Rate limit en memoria (una instancia en Railway). Si se escalan réplicas, mover el contador a MongoDB o Redis.

**Qué sigue**
- 4.4: almacenamiento temporal con borrado ≤1 hora y metadatos en Mongo.

## 2026-10-19 — Sesión 5 (tarea 4.4: borrado temporal y metadatos)

**Qué se hizo**
- Las conversiones de servidor ya corren completamente en memoria (sharp, Gotenberg vía HTTP, pdf.js); Gotenberg borra sus temporales al terminar cada pedido. Para cualquier uso futuro de disco: `src/lib/server/temp.ts` (`withTempDir` siempre borra; `sweepTempFiles` elimina lo que tenga más de `TEMP_FILE_TTL_MINUTES`) y `src/instrumentation.ts` lo ejecuta al arrancar y cada 10 minutos. Tests.
- Modelo `src/models/ConversionLog.ts`: formato de entrada/salida, motor (navegador/servidor), tamaños, éxito, usuario opcional y fecha (TTL de un año). Nunca nombre ni contenido del archivo.
- `logConversion` (no hace nada sin `MONGODB_URI` y nunca rompe una conversión) desde las APIs de imagen y documentos; `POST /api/stats` recibe del navegador solo formato y tamaños (validado, sin confiar en motor/usuario del cliente, rate limit propio) y el conversor lo envía con `sendBeacon`.
- Tests con `mongodb-memory-server` (dependencia de desarrollo). Verificado de punta a punta: una conversión de servidor y una del navegador quedan registradas con solo metadatos.

**Qué sigue**
- 4.5: mensajes de error traducidos para la API.

## Pendiente del dueño
- Crear credenciales de Google OAuth (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
- Configurar un proveedor SMTP para magic links (`EMAIL_SERVER`, `EMAIL_FROM`).
- Crear cuenta de Mercado Pago y obtener credenciales de prueba (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).
- Elegir proveedor de pagos internacional (por ejemplo Lemon Squeezy o Paddle) para usuarios fuera de los países de Mercado Pago.
- Cuenta de Google AdSense (`NEXT_PUBLIC_ADSENSE_CLIENT`).
- Proyecto en Railway y base MongoDB (Railway o Atlas).
