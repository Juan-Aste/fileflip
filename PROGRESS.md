# PROGRESS — Bitácora de Fileflect (antes FileFlip)

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

## 2026-10-19 — Sesión 5 (tarea 4.5: errores de API traducidos)

**Qué se hizo**
- Ya estaba resuelto por diseño en 2.9/4.x: la API responde solo códigos (`{ error: "fileTooLarge" }`, etc., en `src/lib/api-errors.ts`) y la interfaz los traduce con el namespace `ApiErrors` en los 5 idiomas (incluye `rateLimited`, `serviceUnavailable`, `pdfHasNoText`, `browserUnsupported`). Un test exige traducción para cada código.
- Se agregaron tests de `errorCode` (errores inesperados → mensaje genérico, sin filtrar detalles técnicos) y de `apiError` (código + estado HTTP).

**Qué sigue**
- Hito 5: 5.1 Auth.js v5 con Google + magic link.

## 2026-10-19 — Sesión 5 (tarea 5.1: Auth.js)

**Qué se hizo**
- `next-auth@5` (beta.32) con `@auth/mongodb-adapter` (driver `mongodb@6`, cliente propio en `src/lib/mongo-client.ts`, creado de forma diferida) y `nodemailer`. Configuración en `src/auth.ts`, ruta `/api/auth/[...nextauth]`.
- Proveedores: Google (solo si hay `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) y email con magic link (si hay `EMAIL_SERVER`; sin SMTP, el enlace se imprime en el log en desarrollo o con `AUTH_EMAIL_LOG_LINKS=true` para staging). `getAuthProviders()` le dirá a la página de login qué mostrar.
- Email traducido (`src/lib/email/magic-link.ts`, namespace `Email`): el idioma sale de la página desde donde se pidió el enlace (`callbackUrl` /pt/... → portugués); HTML con estilos en línea y versión texto; URL escapada. Tests.
- Sesión en base de datos con MongoDB (JWT si no hay `MONGODB_URI`); el callback de sesión expone solo id, nombre, email e imagen (no el token de sesión).
- Páginas propias: `signIn`/`error` → `/login`, `verifyRequest` → `/login/verify` (se crean en 5.2).
- Verificado de punta a punta con MongoDB en memoria: pedir el enlace → enlace en el log → abrirlo crea el usuario y la sesión y redirige a `/pt/conta`.

**Qué sigue**
- 5.2: páginas de login y "Mi cuenta".

## 2026-10-19 — Sesión 5 (tarea 5.2: login y "Mi cuenta")

**Qué se hizo**
- `/[locale]/login`: botón de Google y formulario de magic link (solo los métodos configurados), mensaje de error, `callbackUrl` limitado a rutas relativas del mismo sitio (evita redirecciones abiertas). Si ya hay sesión, va a la cuenta.
- `/[locale]/login/verify`: "Revisa tu correo".
- `/[locale]/account`: email de la sesión, plan (Gratis por ahora; estado de suscripción y cancelación en 5.6), botón "Pasar a Pro" y "Cerrar sesión". Sin sesión redirige al login con `callbackUrl`.
- Header: enlace "Iniciar sesión" / "Mi cuenta" (`AccountLink`), que consulta la sesión en el cliente para que el resto de las páginas sigan siendo estáticas.
- Todo traducido (namespaces `Login`, `Account`); páginas de cuenta con `noindex` y renderizado dinámico.
- Probado en Chromium con MongoDB en memoria: pedir enlace → "Revisa tu correo" → abrir enlace → `/es/account` → header muestra "Mi cuenta" → cerrar sesión vuelve a `/es`.

**Decisiones**
- Las páginas de cuenta/precios/legales usan rutas fijas en inglés en todos los idiomas (`/es/login`, `/es/account`, `/es/pricing`...): no son páginas de búsqueda, y Auth.js necesita rutas fijas. Los slugs traducidos quedan para herramientas, conversiones y cola larga, que son las que importan para SEO.

**Qué sigue**
- 5.3: configuración de precios por país, detección de país y selector manual.

## 2026-10-19 — Sesión 5 (tarea 5.3: precios por país)

**Qué se hizo**
- `src/config/pricing.ts` (archivo fácil de editar): precio mensual y anual del Pro en moneda local para AR (ARS 4.500 / 45.000), BR (R$ 19,90 / 199), MX (MXN 79 / 790), CL (CLP 3.990 / 39.900), CO (COP 16.900 / 169.000), UY (UYU 179 / 1.790) y PE (S/ 14,90 / 149) vía Mercado Pago; resto del mundo USD 4,99 / 49 vía el proveedor internacional.
- Detección de región: cookie de elección manual (`ff_country`) → cabecera de geolocalización del hosting/CDN (`cf-ipcountry`, `x-country-code`, `x-geo-country`, `cloudfront-viewer-country`) → región del idioma del navegador (`es-AR`, `pt` → BR) → internacional. `currentRegion()` para el servidor.
- `RegionSelector`: selector manual con nombres de países localizados (`Intl.DisplayNames`) que guarda la cookie un año y refresca la página. Se usa en la página de precios (5.6).
- Tests de configuración, mapeo de países, idioma y prioridad de la detección.

**Decisiones**
- Railway no agrega una cabecera de país propia; si se pone Cloudflare delante, `cf-ipcountry` funciona sin cambios. Sin CDN se usa el idioma del navegador + selector manual. Anotado en "Pendiente del dueño".
- Precios iniciales orientativos (~US$ 4–5/mes); el dueño debe revisarlos.

**Qué sigue**
- 5.4: interfaz `PaymentProvider` y Mercado Pago (preapproval) en modo prueba.

## 2026-10-19 — Sesión 5 (tarea 5.4: proveedor de pagos y Mercado Pago)

**Qué se hizo**
- Interfaz `PaymentProvider` (`src/lib/payments/types.ts`): crear suscripción (devuelve URL de checkout), consultar y cancelar; errores `notConfigured` / `rejected` / `unavailable`.
- Mercado Pago (`mercadopago.ts`): API de suscripciones sin plan (`POST /preapproval` con `auto_recurring` en moneda local, 1 o 12 meses, `external_reference` = id de usuario, `X-Idempotency-Key`), consulta y cancelación (`PUT status=cancelled`), mapeo de estados (`authorized` → activa). Credenciales por país (`MP_ACCESS_TOKEN_AR`, `_BR`...) con `MP_ACCESS_TOKEN` como respaldo. Tests con `fetch` simulado.
- Proveedor internacional: punto de enchufe en `providers.ts` (`INTL_PAYMENT_PROVIDER`), todavía sin implementar. Proveedor simulado (`mock.ts`) para desarrollo/demos (`PAYMENTS_MOCK=true`): su "checkout" es `/api/billing/mock-checkout`, que activa la suscripción.
- Modelo `Subscription` y lógica en `src/lib/billing.ts`: alta pendiente, aplicar estados del proveedor (activa → `currentPeriodEnd`), plan del usuario (Pro mientras está activa y, tras cancelar, hasta el fin del período pagado), cancelación. Tests con MongoDB en memoria.
- APIs: `POST /api/billing/subscribe` (requiere sesión; región detectada; descripción traducida; vuelve a `/[locale]/account?checkout=done`), `POST /api/billing/cancel`. Nuevos códigos de error traducidos `signInRequired` y `paymentsUnavailable`.
- Verificado con el servidor real y pago simulado: suscripción anual desde `pt-BR` → BRL 199 → activa hasta 2027 → cancelación 204.

**Qué sigue**
- 5.5: webhook de Mercado Pago con verificación de firma.

## 2026-10-19 — Sesión 5 (tarea 5.5: webhook de Mercado Pago)

**Qué se hizo**
- `src/lib/payments/mp-signature.ts`: verificación de la cabecera `x-signature` según la documentación de Mercado Pago (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, ids alfanuméricos en minúscula, comparación en tiempo constante) y rechazo de notificaciones de más de 10 minutos (repeticiones). Acepta cualquiera de los secretos configurados (`MP_WEBHOOK_SECRET` y `MP_WEBHOOK_SECRET_XX` por cuenta/país). Tests.
- `POST /api/webhooks/mercadopago`: firma inválida → 401. `subscription_preapproval` → se vuelve a leer la suscripción desde Mercado Pago (no se confía en el cuerpo) y se guarda el estado (`syncSubscription`). `subscription_authorized_payment` → se busca la suscripción del cobro (`/authorized_payments/{id}`) y se sincroniza. Otros tópicos se ignoran con 200; errores internos → 500 para que Mercado Pago reintente. Tests del handler.
- Verificado con el servidor real: notificación firmada → 200 y suscripción sincronizada; firma falsa → 401.

**Qué sigue**
- 5.6: página de precios y cancelación desde "Mi cuenta".

## 2026-10-19 — Sesión 5 (tarea 5.6: página de precios y cancelación)

**Qué se hizo**
- `/[locale]/pricing` (dinámica por país): tarjetas Gratis / Pro con precio en moneda local formateado según el país, selector mensual/anual con el ahorro calculado, límites reales tomados de `limits.ts`, selector de país, nota de Mercado Pago, preguntas frecuentes y hreflang. Si no hay proveedor de pagos para la región (fuera de LatAm sin proveedor internacional ni mock), muestra "Muy pronto podrás pagar desde tu país" en lugar del botón.
- `SubscribeButton`: sin sesión lleva al login y vuelve a precios; con sesión crea la suscripción y redirige al checkout.
- "Mi cuenta": plan actual, monto y período, próximo cobro, estado pausado, aviso tras volver del checkout ("Estamos confirmando tu pago") y botón "Cancelar suscripción" con confirmación; tras cancelar muestra "Tu Pro sigue activo hasta el …".
- Header y footer enlazan a Precios. `ChoiceGroup` admite leyenda solo para lectores de pantalla.
- El test de mensajes ahora analiza ICU de verdad (`@formatjs/icu-messageformat-parser`): valida la sintaxis de todos los mensajes y compara los argumentos, incluidos los de `select`/`plural`.
- Probado en Chromium (es-AR, pago simulado): precios en ARS → login con magic link → vuelta a precios → Pro mensual $ 4.500 → cuenta con próximo cobro → cancelar → "activo hasta el 19 de noviembre de 2026"; cambiar país a "Otro país" muestra USD.

**Qué sigue**
- 5.7: aplicar los límites Pro en cliente y servidor.

## 2026-10-19 — Sesión 5 (tarea 5.7: límites Pro)

**Qué se hizo**
- Servidor: `src/lib/server/plan.ts` (`requestPlan`) lee la sesión y el plan; las APIs de imagen y documentos aplican `limits[plan]` y saltan el rate limit por IP para usuarios con sesión.
- La sesión expone `user.plan` (`free`/`pro`, calculado con la suscripción; tipos en `src/types/next-auth.d.ts`).
- Cliente: `SessionInfoProvider` (`src/components/session/SessionInfo.tsx`) consulta la sesión una vez y comparte `signedIn` y `plan` (también lo usará `<AdSlot>`). El conversor usa el plan para el tamaño máximo (navegador y servidor) y el máximo por lote de servidor. `AccountLink` usa el mismo contexto.
- Vitest: `next-auth` agregado a `server.deps.inline`. Test nuevo: un usuario Pro puede subir 16 MB (el gratuito recibe 413).
- Verificado con el servidor real: anónimo con 16 MB → 413; usuario con suscripción activa → la sesión dice `plan: "pro"` y la API acepta el archivo (luego LibreOffice falló con ese TXT artificial de 16 MB en una sola línea, respondido como 503).

**Qué sigue**
- Hito 6: 6.1 componente `<AdSlot>`.

## 2026-10-19 — Sesión 5 (tarea 6.1: componente AdSlot)

**Qué se hizo**
- `src/components/ads/AdSlot.tsx`: anuncio discreto con etiqueta "Publicidad" visible, ubicaciones `sidebar` (300×600) y `result` (horizontal). Carga el script de AdSense con `lazyOnload` solo cuando hay que mostrar un anuncio; `data-ad-slot` desde `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR` / `_RESULT` (agregadas a `.env.example`).
- `ad-mode.ts` (con tests): nunca para Pro, nada hasta saber el plan (evita que un Pro vea un anuncio por un instante), placeholder "Espacio publicitario" si falta `NEXT_PUBLIC_ADSENSE_CLIENT`.
- Traducciones en el namespace `Ads`.

**Qué sigue**
- 6.2: ubicaciones (lateral en escritorio y debajo del resultado).

## 2026-10-19 — Sesión 5 (tarea 6.2: ubicaciones de anuncios)

**Qué se hizo**
- `WithSidebarAd`: columna lateral fija (sticky) de 300 px solo en pantallas anchas (`xl`), en la portada (junto al conversor) y en todas las páginas de herramientas. En celulares no hay anuncio lateral.
- Anuncio debajo del resultado: en el conversor aparece cuando hay resultados y no se está convirtiendo, separado del bloque de botones; en las herramientas va debajo de la tarjeta de resultado con margen amplio. Nunca junto al botón de descarga ni con su estilo; siempre con la etiqueta "Publicidad".
- Revisado con capturas: escritorio 1440 px (lateral + debajo del resultado, ambos etiquetados) y móvil 390 px (sin anuncios antes de convertir). Ajuste: "Iniciar sesión" ya no se corta en dos líneas en el header móvil.

**Qué sigue**
- Hito 7: 7.1 páginas por conversión con slugs traducidos.

## 2026-10-19 — Sesión 5 (tarea 7.1: páginas por conversión)

**Qué se hizo**
- `src/config/conversion-pages.ts`: slug traducido para cada conversión del registro (`/es/jpg-a-webp`, `/en/jpg-to-webp`, `/pt/jpg-para-webp`, `/fr/jpg-en-webp`, `/zh/jpg-to-webp`; DOCX/XLSX/PPTX como `word`/`excel`/`powerpoint`: `/es/word-a-pdf`, `/pt/pdf-para-word`), búsqueda inversa y conversiones relacionadas (misma entrada o misma salida). Tests: unicidad por idioma, sin choques con herramientas, ida y vuelta.
- `[slug]/page.tsx` ahora sirve herramientas y conversiones: título/descripción/metadatos traducidos ("Convertir HEIC a JPG gratis online"), canonical + hreflang, conversor con el formato de entrada (filtro del selector de archivos) y de salida preseleccionados, pasos "Cómo convertir…", texto de privacidad según el motor y enlaces internos a conversiones relacionadas.
- El selector de idioma traduce también los slugs de conversiones (`/es/heic-a-jpg` → `/fr/heic-en-jpg`).
- El build genera 550 páginas estáticas (~1 min). Probado: HEIC → JPG desde `/es/heic-a-jpg` y cambio a francés.

**Qué sigue**
- 7.2: hreflang global, `sitemap.ts` multi-idioma y `robots.ts`.

## 2026-10-19 — Sesión 5 (tarea 7.2: hreflang, sitemap y robots)

**Qué se hizo**
- `src/lib/seo.ts`: `siteUrl()`, `alternatesFor()` (canonical + hreflang de los 5 idiomas + `x-default` → español) y `sitemapEntries()` (portada, precios, herramientas y conversiones en todos los idiomas, cada URL con sus traducciones `xhtml:link`). Tests.
- `src/app/sitemap.ts` (525 URLs) y `src/app/robots.ts` (permite todo salvo `/api/`, cuentas y login; apunta al sitemap). Portada, precios, herramientas y conversiones usan `alternatesFor`.
- Verificado con el servidor: `/robots.txt`, `/sitemap.xml` y etiquetas `canonical`/`alternate` en el HTML.

**Qué sigue**
- 7.3: archivo de datos de cola larga y plantilla con FAQ y datos estructurados.

## 2026-10-19 — Sesión 5 (tarea 7.3: páginas de cola larga)

**Qué se hizo**
- `src/content/longtail.ts`: archivo de datos de páginas de cola larga (id, idioma, slug, título, meta, introducción, widget — conversor con formatos/opciones prefijados o una herramienta —, secciones, FAQ y traducciones opcionales). Para agregar una página basta con sumar una entrada: la toman el router, el sitemap y el selector de idioma. `faqJsonLd` genera los datos estructurados FAQPage.
- Plantilla `LongtailView` en `[slug]/page.tsx`: H1, introducción, herramienta, secciones, FAQ desplegable y `<script type="application/ld+json">` (con `<` escapado). Metadatos propios, canonical y hreflang solo hacia las traducciones que existan. Las páginas regionales existen únicamente en su idioma (otros idiomas → 404); el selector de idioma lleva a la portada del otro idioma si no hay traducción.
- El conversor acepta opciones de imagen prefijadas (`options`).
- Primera página: `/es/heic-a-jpg-desde-iphone` (HEIC→JPG calidad 90, cómo convertir en lote, cómo configurar el iPhone, 4 preguntas).
- Tests del archivo de datos (ids/slugs únicos, sin choques con herramientas/conversiones, meta ≤170 caracteres, ≥3 preguntas, conversiones existentes, traducciones coherentes), del sitemap y del cambio de idioma. Probado en el servidor: título, canonical, JSON-LD, conversión HEIC→JPG y `/en/...` → 404.

**Qué sigue**
- 7.4: el resto de las páginas de cola larga (AFIP, foto DNI, WhatsApp, SAT, gov.br).

## 2026-10-19 — Sesión 5 (tarea 7.4: primeras páginas de cola larga)

**Qué se hizo**
- Páginas nuevas en `src/content/longtail.ts`:
  - `/es/comprimir-pdf-para-afip` (AFIP/ARCA, herramienta Comprimir PDF, consejos de escaneo).
  - `/es/foto-tamano-dni` (foto tipo carnet 4×4 cm = 472×472 px a 300 DPI, recorte central; aclara que para el DNI argentino la foto se toma en el trámite).
  - `/es/reducir-pdf-para-whatsapp` (Comprimir PDF).
  - `/es/convertir-foto-para-el-sat` (JPG liviano: máx. 1600 px, calidad 80).
  - `/pt/pdf-para-gov-br` (Imagens para PDF para RG/CNH/comprovantes).
  - `/pt/heic-para-jpg-do-iphone`, traducción de la página de HEIC en español (hreflang entre ambas y el selector de idioma las conecta).
- Nuevo modo de tamaño "Tamaño exacto (recorta)" (`cover`): recorte central a un tamaño exacto en el navegador (`coverCrop` + canvas), en el servidor (sharp `fit: cover`) y en el panel de opciones; las opciones prefijadas por una página abren el panel. Tests.
- **Corrección:** JPG/PNG/WEBP/AVIF ahora se pueden recodificar en el mismo formato (comprimir o redimensionar un JPG a JPG), que es un uso central y antes no se ofrecía. Las páginas de conversión no incluyen esos pares (`/es/jpg-a-jpg` no existe).
- Sin datos inventados: donde el límite de tamaño depende del trámite (AFIP, SAT, gov.br), el texto dice que lo indica cada formulario.
- Probado: las 6 páginas responden con su título; foto vertical 800×1200 → JPG 472×472 desde `/es/foto-tamano-dni`.

**Qué sigue**
- 7.5: páginas de privacidad, términos y contacto.

## 2026-10-19 — Sesión 5 (tarea 7.5: privacidad, términos y contacto)

**Qué se hizo**
- `/[locale]/privacy`, `/[locale]/terms` y `/[locale]/contact`, traducidas a los 5 idiomas (namespace `Legal`; secciones como arrays leídos con `t.raw`). La política de privacidad describe lo que el producto realmente hace: archivos del navegador nunca suben; los de servidor se procesan en memoria/temporal y se borran en ≤1 hora; en Mongo solo metadatos; cuentas (email, Google), pagos vía Mercado Pago sin datos de tarjeta; cookies (idioma, país, sesión, tema) y AdSense para el plan gratuito; derechos de acceso/borrado (menciona LGPD en portugués y RGPD en francés).
- Contacto con `NEXT_PUBLIC_CONTACT_EMAIL` (nuevo en `.env.example`); sin configurar muestra "La dirección de contacto todavía no está configurada".
- Footer con enlaces a Precios, Privacidad, Términos y Contacto; las tres páginas entran al sitemap con hreflang.

**Qué sigue**
- Hito 8: 8.1 Dockerfile multi-etapa.

## 2026-10-19 — Sesión 5 (tarea 8.1: Dockerfile)

**Qué se hizo**
- `Dockerfile` multi-etapa sobre `node:22-bookworm-slim` (glibc, para los binarios de sharp): dependencias con `npm ci` (sin descargar el MongoDB de tests), build con las `NEXT_PUBLIC_*` como `ARG`, y una imagen final solo con `.next/standalone`, estáticos y `public/`, usuario `node`, `HEALTHCHECK`. Imagen base sobreescribible (`NODE_IMAGE`) para usar un mirror.
- `.dockerignore` y `GET /api/health` (`{"status":"ok","gotenberg":true|false}`; Gotenberg caído no marca la app como caída).
- **Verificado construyendo y ejecutando la imagen** (522 MB): portada 200, imagen → AVIF con sharp, DOCX → PDF con Gotenberg y PDF → Word desde el contenedor.

**Problemas**
- En este entorno Docker Hub devolvía 429 y los contenedores no tienen el proxy de salida: para la prueba se usó `mirror.gcr.io` y un Dockerfile auxiliar (solo local, no versionado) que agrega el certificado del proxy. El Dockerfile del repo no necesita nada de eso en Railway.

**Qué sigue**
- 8.2: DEPLOY.md.

## 2026-10-19 — Sesión 5 (tarea 8.2: DEPLOY.md)

**Qué se hizo**
- `DEPLOY.md`: arquitectura en Railway (servicio `app` con el Dockerfile, `gotenberg` desde la imagen `gotenberg/gotenberg:8` sin dominio público, MongoDB), red privada (`GOTENBERG_URL=http://gotenberg.railway.internal:3000`, `MONGODB_URI=${{MongoDB.MONGO_URL}}`), tabla de variables (cuáles son obligatorias, que las `NEXT_PUBLIC_*` se fijan al construir), healthcheck `/api/health`, dominio propio, Cloudflare opcional para el país, configuración de Google OAuth, SMTP, webhooks de Mercado Pago por país y AdSense, checklist del primer deploy, desarrollo local con docker compose y notas de escalado.
- No se hizo ningún deploy real.

**Qué sigue**
- 8.3: revisión final (accesibilidad, modo oscuro, rendimiento, lint/build/tests).

## 2026-10-19 — Sesión 5 (tarea 8.3: revisión final)

**Qué se hizo**
- Accesibilidad: auditoría con axe-core (WCAG 2 A/AA) en portada, herramienta, conversión, cola larga, precios, login, privacidad y portada en chino, en modo claro y oscuro. En oscuro fallaba el contraste de los botones (índigo claro con texto blanco): nuevo token `brand-solid` / `brand-solid-hover` para fondos sólidos detrás de texto blanco. Ahora todas las páginas pasan sin violaciones en ambos temas.
- Modo oscuro revisado con capturas.
- Rendimiento: JS de primera carga 103–139 kB por página; los códecs pesados (libheif ~2 MB, pdf.js ~1,2 MB, AVIF/WEBP/JPEG WASM) se descargan solo al usarlos.
- `npm run lint`, `npm run build` (≈570 páginas estáticas) y `npm test` (40 archivos, 231 tests) pasan; CI de GitHub en verde.

## PROYECTO TERMINADO

Todas las tareas de PLAN.md están marcadas. Resumen de lo construido:
- **Conversión en el navegador** (Web Workers + WASM con carga diferida): JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, HEIC (entrada) y SVG → raster; calidad, redimensionado, tamaño exacto con recorte; compresión en el mismo formato; lotes con ZIP; detección por magic bytes; respaldo automático al servidor (sharp) si el navegador no puede o el archivo excede la memoria del dispositivo.
- **PDF en el navegador**: unir, dividir, rotar, ordenar con miniaturas, imágenes → PDF (respeta EXIF), PDF → JPG/PNG, comprimir PDF.
- **Servidor**: documentos de oficina → PDF con Gotenberg/LibreOffice, PDF → Word (pdf.js + docx), límites por plan, rate limiting por IP, solo metadatos en MongoDB, temporales con borrado ≤1 h.
- **Cuentas y pagos**: Auth.js (Google + magic link traducido), plan Pro mensual/anual con precios en moneda local para AR/BR/MX/CL/CO/UY/PE vía Mercado Pago (preapproval + webhook firmado), USD para el resto detrás de una interfaz de proveedor intercambiable, cancelación desde Mi cuenta, límites Pro aplicados en cliente y servidor.
- **Publicidad** discreta con `<AdSlot>` (lateral en escritorio y debajo del resultado; nunca para Pro).
- **i18n y SEO**: es/en/pt/fr/zh con slugs traducidos, hreflang, sitemap (≈530 URLs), robots, una página por conversión, 7 páginas de cola larga con FAQ schema (archivo de datos `src/content/longtail.ts`), páginas legales y de contacto.
- **Deploy** preparado: Dockerfile verificado, `/api/health`, `DEPLOY.md` para Railway.

**Lo que el dueño debe configurar manualmente** (detalle en "Pendiente del dueño" y en DEPLOY.md):
1. Proyecto en Railway con los servicios `app`, `gotenberg` y MongoDB; variables de `.env.example`; dominio.
2. `AUTH_SECRET`, credenciales de Google OAuth y un proveedor SMTP para los magic links.
3. Cuentas de Mercado Pago por país (tokens `MP_ACCESS_TOKEN_XX`) y sus webhooks/secretos; empezar con credenciales de prueba.
4. Elegir e integrar un proveedor de pagos internacional (Lemon Squeezy, Paddle…) en `src/lib/payments/providers.ts`.
5. Cuenta de Google AdSense y los IDs de bloques.
6. Revisar precios (`src/config/pricing.ts`) y textos legales con un abogado; configurar `NEXT_PUBLIC_CONTACT_EMAIL`.
7. Opcional: Cloudflare delante de Railway para detectar el país por IP.
8. Revisar a mano el arrastrar y soltar de miniaturas en "Ordenar PDF" (no se pudo automatizar).

## Pendiente del dueño
- Crear credenciales de Google OAuth (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
- Configurar un proveedor SMTP para magic links (`EMAIL_SERVER`, `EMAIL_FROM`).
- Crear cuenta de Mercado Pago y obtener credenciales de prueba (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`). Ojo: cada cuenta de Mercado Pago cobra solo en la moneda de su país; para vender en varios países hace falta una cuenta (y un token `MP_ACCESS_TOKEN_XX`) por país.
- En cada cuenta de Mercado Pago, configurar el webhook (Tus integraciones → Webhooks) apuntando a `https://<dominio>/api/webhooks/mercadopago` con el evento "Planes y suscripciones", y copiar la clave secreta en `MP_WEBHOOK_SECRET` (o `MP_WEBHOOK_SECRET_XX` por país).
- Elegir proveedor de pagos internacional (por ejemplo Lemon Squeezy o Paddle) para usuarios fuera de los países de Mercado Pago.
- Cuenta de Google AdSense (`NEXT_PUBLIC_ADSENSE_CLIENT`, y los IDs de bloque `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR` / `_RESULT`).
- Revisar con un abogado la política de privacidad y los términos (`messages/*.json`, namespace `Legal`): falta la razón social/responsable, la jurisdicción y datos de contacto legales. Configurar `NEXT_PUBLIC_CONTACT_EMAIL`.
- Proyecto en Railway y base MongoDB (Railway o Atlas).
- Revisar los precios del plan Pro por país en `src/config/pricing.ts` (son orientativos).
- Panel de administración: definir `ADMIN_EMAILS` (correos separados por comas) con el correo con el que inicias sesión; vacío = nadie entra (todos reciben 404). Se entra en `/es/admin`.
- (Opcional) Poner Cloudflare delante de Railway para tener la cabecera de país `cf-ipcountry`; sin eso, el país se deduce del idioma del navegador y del selector manual.
- **Fase 3 — nombre Fileflect**: verificar que el nombre esté disponible (dominio, p. ej. fileflect.com/.app, registro de marca en los países objetivo, usuarios en redes) antes de invertir en él; actualizar `NEXT_PUBLIC_SITE_URL` y `EMAIL_FROM` con el dominio nuevo; si se quiere, renombrar el repo de GitHub `Juan-Aste/fileflip` (GitHub redirige las URLs viejas) y el servicio de Railway. El nombre de la base en `MONGODB_URI` puede quedar como está.
- **Fase 3 — licencias (decisiones del dueño)**, ver `docs/audit.md` §4:
  - Audio/video en formatos heredados (AVI, WMV, FLV, 3GP): solo con `@ffmpeg/core` publicado, que es **GPL-2.0-or-later**. Sin aprobación se usa WebCodecs + mediabunny (MPL-2.0) para MP4/WebM/MOV/MKV y audio común.
  - Quitar fondo con `@imgly/background-removal` (**AGPL-3.0**, mejor calidad). Sin aprobación se intenta MediaPipe (Apache-2.0, enfocado en personas).
  - MOBI/AZW (solo con Calibre, GPL-3.0) y DWG (LibreDWG GPL-3.0 u ODA comercial): descartados salvo que el dueño decida otra cosa.

## 2026-10-19 15:12 UTC — Ejecución de control (proyecto ya terminado)
- No quedan tareas sin marcar en PLAN.md y la especificación no tiene puntos sin cubrir. Verificado: `npm ci`, `npm run lint`, `npm run build` y `npm test` (40 archivos, 231 tests) pasan en `dev`.
- Se avisó al dueño que la rutina horaria ya no tiene trabajo y conviene pausarla. Las próximas ejecuciones que encuentren el mismo estado no deben volver a notificar.

## Inicio de la fase 2

## 2026-10-19 23:30 UTC — Fase 2, tarea 2A.1 (plan y medición base)

**Qué se hizo**
- PLAN.md: nueva sección "Fase 2" con las tareas de los hitos 2A (rendimiento), 2B (diseño) y 2C (panel de administración).
- `scripts/perf/lighthouse.sh`: medición reproducible con Lighthouse en modo móvil (mediana de N corridas) de portada, conversión de imagen, conversión PDF, herramienta PDF, cola larga y precios. Lighthouse no se agrega a las dependencias del proyecto (se instala aparte; ver el encabezado del script).
- Medición base en `docs/perf/2026-10-19-baseline.md`.

**Mediciones (base, móvil, mediana de 3)**
- Rendimiento 99 en todas las páginas medidas; accesibilidad 100; SEO 100 (precios 91).
- FCP 0,8–0,9 s, LCP 2,0–2,1 s, TBT 60–90 ms, CLS 0, JS transferido 142–151 kB.
- La meta (≥ 90) ya se cumple; el margen está en el LCP (77 % "render delay" por CSS + JS inicial), en el JS compartido (~103 kB) y en detalles: favicon 404, meta description de precios fuera del `<head>` (streaming de metadatos en páginas dinámicas), prefetch de `/login` y consulta de sesión en cada carga.

**Decisiones**
- Medir siempre en el puerto 3000 (o con `NEXT_PUBLIC_SITE_URL` igual a la URL medida): si no, Lighthouse marca el canonical como inválido.

**Qué sigue**
- 2A.2: correcciones rápidas detectadas en la medición.

## 2026-10-19 23:40 UTC — Fase 2, tarea 2A.2 (correcciones rápidas)

**Qué se hizo**
- Favicon provisorio `src/app/icon.svg` (Next lo enlaza en todas las páginas); el definitivo llega con el logo en 2B.3. Ya no hay 404 de `/favicon.ico`.
- `htmlLimitedBots: /.*/` en `next.config.ts`: los metadatos van siempre en el `<head>`, también en páginas dinámicas (precios). SEO de precios: 91 → 100.
- El enlace "Iniciar sesión / Mi cuenta" del header ya no hace prefetch (se veía en todas las páginas y casi nadie lo usa).
- La consulta de sesión (`/api/auth/session`) se hace cuando el navegador está libre (`requestIdleCallback`, máx. 2 s; `setTimeout` como respaldo) en vez de competir con la carga inicial.

**Mediciones (1 corrida, móvil)**
- Sin cambios en rendimiento (99 en todas); SEO 100 en todas las páginas (antes precios 91). LCP 1,8–2,1 s, TBT 60–100 ms, CLS 0.
- Buenas prácticas 96 solo en este entorno: sin `AUTH_SECRET` local, `/api/auth/session` responde 500 y aparece en la consola. Con las variables de producción no ocurre.

**Qué sigue**
- 2A.3: análisis del bundle.

## 2026-10-19 23:50 UTC — Fase 2, tarea 2A.3 (análisis del bundle)

**Qué se hizo**
- `@next/bundle-analyzer` (dependencia de desarrollo) y `npm run analyze` (`ANALYZE=true next build`); informes en `.next/analyze/`.
- Resultado documentado en `docs/perf/bundle.md`. Hallazgos principales: el selector de idioma arrastra a todas las páginas los datos de cola larga y los registros de slugs (~6 kB gzip); `[slug]` carga las 6 herramientas PDF en cualquier página; el conversor incluye de entrada el panel de opciones y el anuncio. pdf.js, libheif, códecs WASM, pdf-lib y fflate ya están fuera del JS inicial; ninguna librería de servidor entra al cliente.

**Decisiones**
- La precompilación de mensajes de next-intl (ahorraría ~12 kB del parser ICU) necesita Next 16: no se migra en esta fase.

**Qué sigue**
- 2A.4: aplicar las reducciones.

## 2026-10-20 00:10 UTC — Fase 2, tarea 2A.4 (menos JS inicial)

**Qué se hizo**
- `LocaleSwitcher`: las tablas de slugs (`src/config/routes.ts` con herramientas, conversiones y todo `src/content/longtail.ts`) se importan recién al cambiar de idioma, con precarga al pasar el mouse o enfocar el selector. Chunk del layout (todas las páginas): 9 → 2,7 kB gzip.
- `ToolComponent`: `next/dynamic` por herramienta; cada página descarga solo su herramienta (siguen renderizándose en el servidor, sin saltos). `[slug]`: First Load 139 → 132 kB.
- `Converter`: `FileRow` e `ImageOptionsPanel` con `next/dynamic` (solo aparecen al agregar archivos). Chunk del conversor: 12 → 8,3 kB gzip.
- Header, footer y las secciones de las páginas ya eran componentes de servidor; los únicos clientes del layout son el selector de idioma, el botón de tema y el enlace de cuenta.
- Verificado en Chromium (Playwright) con `next start`: PNG → WEBP desde la portada y descarga; unir 2 PDF (2 + 3 páginas → 5) en `/es/unir-pdf` (HTML del servidor incluye la herramienta); cambio de idioma `/es/unir-pdf` → `/en/merge-pdf` y `/es/heic-a-jpg-desde-iphone` → `/pt/heic-para-jpg-do-iphone`; sin errores de página.

**Mediciones (1 corrida, móvil)**
- JS transferido: portada 142 → 136 kB, conversiones 150 → 137 kB, herramienta PDF 151 → 144 kB, precios 147 → 141 kB.
- Rendimiento 98–99, accesibilidad y SEO 100, CLS 0, LCP 1,7–2,1 s, TBT 70–80 ms.

**Qué sigue**
- 2A.5: revisar SSG/ISR.

## 2026-10-20 00:20 UTC — Fase 2, tarea 2A.5 (revisión de SSG)

**Qué se hizo**
- Revisión del `prerender-manifest`: la portada, las 522 páginas de `[slug]` (herramientas, conversiones y cola larga en los 5 idiomas), privacidad, términos, contacto y "revisa tu correo" son estáticas (SSG, sin revalidación: el contenido sale del código, así que cambia solo con un nuevo deploy). `dynamicParams = false` en `[slug]`: un slug desconocido es 404 sin renderizar.
- Dinámicas a propósito: precios (precio según el país por cookie/cabecera y estado Pro), login y cuenta (sesión), y las API.
- `scripts/check-static.mjs` (`npm run check:static`, agregado al CI después del build): toma todas las URL del sitemap generado y falla si alguna no está prerenderizada, salvo precios. Probado que detecta páginas dinámicas (quitando la excepción de precios marca las 5).

**Decisiones**
- No se usa ISR: no hay contenido que cambie sin deploy. Precios sigue dinámica: hacerla estática obligaría a mover la detección de país al cliente y mostraría primero un precio equivocado; ya mide 99 en Lighthouse.

**Qué sigue**
- 2A.6: sin saltos de diseño (espacio de anuncios, imágenes, next/font).

## 2026-10-19 23:58 UTC — Fase 2, tarea 2A.6 (sin saltos de diseño)

**Qué se hizo**
- `AdSlot`: nuevo modo `reserved` mientras se consulta el plan: se reserva el mismo bloque (etiqueta + espacio del anuncio) vacío y oculto para lectores de pantalla, así nada se mueve cuando aparece el anuncio o el marcador. Para Pro el espacio se libera al conocer el plan (no ven anuncios nunca). Tests de `adMode` actualizados.
- `AccountLink`: las dos etiquetas ("Iniciar sesión" / "Mi cuenta") comparten la misma celda de grid, así el enlace mide lo mismo antes y después de cargar la sesión y el header no se desplaza.
- Imágenes: la única `<img>` del sitio son las miniaturas (URL `blob:`) de "Ordenar PDF", que ya van dentro de una caja con `aspect-[3/4]`; `next/image` no aplica a URL `blob:`. No hay otras imágenes en las páginas.
- Fuentes: hoy se usa la pila de fuentes del sistema (sin fuente web, sin salto por fuente). La fuente propia llega en 2B.1 y se cargará con `next/font` (subconjunto `latin`, `display: swap` y fallback ajustado automático); queda anotado como convención.
- AdSense ya se cargaba con `strategy="lazyOnload"`.

**Mediciones**
- CLS medido con Playwright (`PerformanceObserver` de `layout-shift`) en portada, conversión de imagen, conversión PDF, herramienta PDF, cola larga y precios, a 360 px y 1366 px: 0 en todas, también después de convertir un PNG en la portada (aparecen resultados y anuncio).

**Qué sigue**
- 2A.7: caché inmutable para `.wasm`/workers y precarga del códec.

## 2026-10-20 00:05 UTC — Fase 2, tarea 2A.7 (caché de WASM/workers y precarga del códec)

**Qué se hizo**
- Caché: todos los `.wasm` (`/_next/static/media/*.<hash>.wasm`) y los chunks de los workers (`/_next/static/chunks/<id>.<hash>.js`) ya llevan hash en el nombre y Next los sirve con `Cache-Control: public, max-age=31536000, immutable` (verificado con `curl -I` sobre `next start`, que es lo que corre en Railway). No se agregó `headers()` en `next.config.ts`: Next ignora/sobrescribe cabeceras propias en `/_next/static` y `public/` está vacío.
- Precarga del códec (`preloadImageCodecs(from, to)` en `src/lib/image/client.ts`): manda un mensaje `preload` al worker compartido (una vez por par), que importa e inicializa el códec (`encoderWarmers`/`decoderWarmers` en `codecs.ts`: @jsquash jpg/png/webp/avif con `init()`, gifenc, utif2 y libheif). Un trabajo que llega mientras se precarga espera esa misma promesa (no compila dos veces). Si la precarga falla, el trabajo carga el códec como antes.
- `Converter`: precarga al elegir el formato de salida o al agregar archivos (incluido el decodificador HEIC), y en las páginas de conversión cuando el usuario pasa el mouse o enfoca la herramienta. Nada se descarga al cargar la página.
- `heic.ts`: `loadHeic()` idempotente (promesa compartida).
- Tests: `src/lib/image/preload.test.ts` (un worker, un mensaje por par, sin Worker no falla; cobertura de los códecs WASM).

**Verificación (Chromium + `next start`)**
- `/es/jpg-a-webp`: 0 `.wasm` al cargar; al pasar el mouse por la herramienta se descarga `webp_enc_simd.wasm`.
- Portada: al agregar un HEIC se precarga el códec de la salida por defecto (JPG) y al elegir AVIF el de AVIF; la conversión HEIC → AVIF termina con "Descargar". PNG → WEBP en `/es/png-a-webp` después de la precarga: correcto (8,4 kB → 944 B).

**Qué sigue**
- 2A.8: pool de workers con concurrencia limitada y liberación de memoria.

## 2026-10-20 00:20 UTC — Fase 2, tarea 2A.8 (pool de workers y memoria)

**Qué se hizo**
- `src/lib/concurrency.ts`: `batchConcurrency` (núcleos − 1, máximo 4; 1 con `deviceMemory` ≤ 2 GB y máximo 2 con ≤ 4 GB; 1 si no hay datos) y `runLimited` (procesa una lista con N tareas en vuelo como máximo, en orden de inicio). Tests en `concurrency.test.ts`.
- Pool de workers de imagen (`src/lib/image/client.ts`): los workers se reutilizan entre archivos y conversiones; un lote se reparte en hasta `deviceConcurrency()` workers (se crean a demanda, primero se usa uno libre); pasado el límite, el trabajo va al menos ocupado. Si un worker se cae, solo fallan sus trabajos y se descarta. Un worker nuevo recibe las precargas de códec ya pedidas (2A.7).
- `useFileQueue.convertAll`: las conversiones del navegador corren en paralelo con `runLimited(deviceConcurrency())`; las del servidor siguen de a una (hay rate limit por IP) en un carril aparte, en paralelo con el del navegador. El tope de lote del servidor del plan gratis se aplica igual que antes (los que exceden quedan con "tooManyFiles").
- Memoria: `ImageBitmap.close()` en `finally` (worker y `canvas.ts`), así no quedan bitmaps abiertos si falla el dibujo. Las URL de objetos ya se liberaban (`revokeObjectURL` al quitar, limpiar, reconvertir o desmontar; miniaturas PDF y descargas también).
- Tests del pool en `src/lib/image/preload.test.ts` (4 núcleos → 3 workers, el 4.º trabajo se encola, los workers se reutilizan).

**Verificación (Chromium, 4 núcleos, `next start`)**
- 6 PNG → WEBP en `/es/png-a-webp`: 3 workers, 6 descargas + "Descargar todo", ~0,4 s en total. HEIC → AVIF y PNG → WEBP individuales siguen funcionando.

**Qué sigue**
- 2A.9: índices de MongoDB, timeouts hacia Gotenberg y buffers en el servidor.

## 2026-10-20 00:40 UTC — Fase 2, tarea 2A.9 (servidor: índices, timeouts, buffers)

**Qué se hizo**
- Índices de Auth.js (`src/lib/server/indexes.ts`, creados al arrancar el servidor desde `instrumentation-node.ts` si hay `MONGODB_URI`; idempotente y nunca tira el servidor): `sessions.sessionToken` único (se consulta en cada `/api/auth/session`), `sessions.userId`, `accounts.{provider, providerAccountId}` único y `accounts.userId`, `users.email` único (parcial, solo si es texto), `verification_tokens.{identifier, token}` único, y TTL sobre `expires` en sesiones y tokens de magic link (MongoDB borra los vencidos solo).
- `Subscription`: índice compuesto `{userId, status, createdAt: -1}` (reemplaza al de `userId` solo; lo usan `currentSubscription` y la cancelación) y, para el panel, `createdAt` y `cancelledAt` (sparse). `ConversionLog` ya tenía `createdAt` (TTL de 1 año, sirve para los rangos de fechas del panel) y `userId`; el resto de índices del panel se ajusta en 2C cuando existan las consultas.
- Gotenberg: el timeout del cliente es configurable (`GOTENBERG_TIMEOUT_MS`, por defecto 95 s) y queda apenas por encima de `--api-timeout=90s` de Gotenberg (docker-compose y DEPLOY.md, antes 60 s y 120 s, inconsistentes): así un trabajo lento termina con el error de Gotenberg y Gotenberg no sigue trabajando en pedidos ya abandonados. `maxDuration` de la ruta sigue en 120 s.
- Menos copias de buffers: la subida de imágenes llega a sharp como vista (`Buffer.from(buffer, offset, length)`) en vez de copiarse; las respuestas de imagen, DOCX y PDF se envían sin `new Uint8Array(...)`/`.slice()`; el archivo hacia Gotenberg tampoco se copia. (pdf.js sí necesita su copia: se queda.)
- Tests: `src/lib/server/indexes.test.ts` con MongoDB en memoria (crea los índices, idempotente, email único pero opcional, no lanza si un índice falla, índices declarados en `Subscription`).

**Verificación**
- `next start` con MongoDB en memoria: los índices aparecen en `sessions`, `users`, `accounts`, `verification_tokens` y `subscriptions`; `POST /api/convert/image` PNG → BMP responde 200 con un BMP válido de 800×600 y queda registrado en `conversionlogs`.
- `npm run lint`, `npm run build` y `npm test` (43 archivos, 244 tests) pasan.

**Decisiones**
- `GOTENBERG_TIMEOUT_MS` documentada en `.env.example` y DEPLOY.md (opcional). En Railway hay que cambiar el comando de inicio de Gotenberg a `--api-timeout=90s` (DEPLOY.md ya lo indica).

**Qué sigue**
- 2A.10: medición final de 2A.

## 2026-10-20 00:55 UTC — Fase 2, tarea 2A.10 (medición final de 2A) — HITO 2A TERMINADO

**Qué se hizo**
- Medición final con el mismo método que la base (`scripts/perf/lighthouse.sh`, móvil, mediana de 3; la portada con 5 corridas extra por dispersión de TBT). Resultado y comparación en `docs/perf/2026-10-20-2A-final.md`.

**Mediciones (antes → después)**
- Rendimiento: 99 → 99 en las 6 páginas; accesibilidad 100; SEO 100 en todas (precios 91 → 100).
- JS transferido: portada 142 → 137 kB, conversiones y cola larga 150 → 138 kB, herramienta PDF 151 → 145 kB, precios 147 → 142 kB.
- LCP 1,7–2,1 s (antes 2,0–2,1 s), TBT 60–110 ms (ruido de ±40 ms), CLS 0 (también al cargar sesión, resultados y anuncios).
- Meta del hito (≥ 90 móvil en portada y conversiones sin empeorar accesibilidad/SEO): cumplida.

**Qué sigue**
- Hito 2B (diseño), empezando por 2B.1: identidad visual y `docs/design.md`.

## 2026-10-20 00:25 UTC — Fase 2, tarea 2B.1 (identidad visual)

**Qué se hizo**
- `docs/design.md`: identidad "papel y tinta" con verde azulado de marca (`#0b6f6a` / oscuro `#5fd4c6`) y acento mandarina decorativo; paleta claro/oscuro con contrastes medidos (todos ≥ AA), tipografías, espaciado, radios, sombras, íconos y movimiento.
- Tokens nuevos en `globals.css` (mismos nombres que antes, más `surface-2`, `border-strong`, `accent*`, `success*`, `warning*`, `danger*`, `ring`, `shadow-card`, `shadow-lift`, `font-display`), anillo de foco global y regla global de `prefers-reduced-motion`.
- Fuentes: Bricolage Grotesque (títulos) y Figtree (texto) con `next/font/local` desde `@fontsource-variable/*` (`src/app/fonts.ts`; latín, `display: swap`, fallback ajustado). Se instaló también `lucide-react` (se usa desde 2B.2/2B.4).
- `scripts/screenshots.mjs` (+ `playwright-core` como dependencia de desarrollo): capturas de página completa a 360 y 1280 px en claro y oscuro con el Chromium del sistema.

**Decisiones**
- Fuentes autoalojadas desde paquetes npm en vez de `next/font/google`: el build (Docker/Railway) no depende de que Google Fonts responda. Peso: ~41 kB + ~20 kB woff2.
- Se mantienen los nombres de tokens existentes, así el sitio entero adopta la paleta nueva sin tocar componentes; los colores sueltos (`red-*`, `emerald-*`, `amber-*`) se reemplazan en 2B.2.

**Verificación**
- Capturas de portada y `/es/jpg-a-webp` (360/1280, claro/oscuro) revisadas: fuentes y colores aplicados. Problema ya existente: a 360 px el header desborda (el botón de tema queda cortado) → se corrige en 2B.4.
- `npm run lint`, `npm run build` y `npm test` (244 tests) pasan.

## 2026-10-20 00:40 UTC — Fase 2, tarea 2B.2 (tokens en los componentes base)

**Qué se hizo**
- `src/components/ui/styles.ts`: clases compartidas `buttonPrimary`, `buttonPrimarySmall`, `buttonSecondary`, `buttonDanger`, `field` (inputs y selects), `choicePill` (radios con forma de pastilla), `card` y `badge`. Se usan en el conversor, las herramientas PDF, precios, cuenta, login, 404, selector de idioma y de país.
- Se quitaron todos los colores sueltos de Tailwind (`red-*`, `emerald-*`, `amber-*`): errores con `text-danger`, ahorro con `text-success`, avisos con `bg-warning-soft text-warning`, insignias de procesamiento con `success-soft`/`warning-soft`. Contrastes medidos (todos ≥ AA, ver `docs/design.md`).
- Tarjetas con `shadow-card`; botones con hover elevado (`shadow-lift`) y pulsación (`active:translate-y-px`), que se apagan con `prefers-reduced-motion`.

**Convención**
- Componentes nuevos: usar `@/components/ui/styles` y los tokens; nada de colores de Tailwind sueltos.

**Verificación**
- Capturas de `/es/unir-pdf`, `/es/pricing` y `/es/login` (360/1280, claro/oscuro) revisadas. (Ojo al medir: si queda un `next start` viejo corriendo, sirve HTML con hashes de CSS que ya no existen y las capturas salen sin estilos.)
- `npm run lint`, `npm run build` y `npm test` pasan.

## 2026-10-20 00:55 UTC — Fase 2, tarea 2B.3 (logo, íconos y Open Graph)

**Qué se hizo**
- Logo original: hoja con la esquina doblada en mandarina y dos flechas de "flip" sobre un cuadrado verde azulado redondeado. `src/components/brand/LogoMark.tsx` (SVG en línea, usado en el header con el texto "File**Flip**" en Bricolage), `public/logo.svg` (ícono + texto) y `src/app/icon.svg` (favicon).
- Íconos PNG generados con sharp desde el SVG: `src/app/apple-icon.png` (180), `public/icon-192.png` y `public/icon-512.png`; `src/app/manifest.ts` (`/manifest.webmanifest`, color de tema `#0b6f6a`).
- Imagen Open Graph por idioma: `src/app/[locale]/opengraph-image.tsx` (1200×630, estática por idioma en el build) con logo, el título de la portada traducido y los formatos; Bricolage 800 en WOFF (paquete `@fontsource/bricolage-grotesque`, satori no lee WOFF2). En chino va solo la marca y los formatos (la fuente no tiene glifos CJK). `twitter:card` = `summary_large_image`. Todas las páginas heredan `og:image` de su idioma.

**Verificación**
- HTML con `<link rel="icon">`, `apple-touch-icon`, `manifest` y `og:image` absolutos; imágenes OG de es/pt/zh revisadas a ojo. Lint, build y tests pasan.

## 2026-10-20 01:15 UTC — Fase 2, tarea 2B.4 (header y footer nuevos)

**Qué se hizo**
- Header: logo nuevo, navegación de escritorio (Herramientas, Precios, cuenta, separador, idioma) y botón de tema con íconos `lucide-react` (Sol/Luna/Monitor; el texto solo desde `lg`). En móvil (< 768 px): logo, tema y botón de menú (`MobileMenu.tsx`, cliente): `aria-expanded`/`aria-controls`, etiqueta "Abrir/Cerrar menú", se cierra con Escape (devuelve el foco al botón), al navegar y al tocar un enlace. El contenido del panel se renderiza en el servidor.
- Se corrigió el desborde horizontal del header a 360 px (el botón de tema quedaba cortado): `scrollWidth` = 360.
- Footer: marca + lema + mensaje de privacidad, y columnas "Herramientas PDF", "Conversiones populares" (enlaces traducidos a las páginas de conversión, bueno para SEO interno) y "FileFlip" (precios, legales, contacto). 2 columnas en móvil, 4 en escritorio. Componente de servidor (no suma JS).
- `popularConversions` en `src/config/conversion-pages.ts` (también para los accesos rápidos de la portada en 2B.5) + test. `AccountLink` acepta `className`.
- Mensajes nuevos en los 5 idiomas: `Header.menu.{open,close}`, `Footer.headings.{tools,conversions,company}`.

**Mediciones**
- First Load JS: portada 128 kB, `[slug]` 133 kB (+1 kB por el menú y los íconos).

**Verificación**
- Playwright a 360 px (claro/oscuro): abre, Escape cierra, al ir a Precios desde el menú navega y queda cerrado. Capturas de `/es`, `/zh`, `/es/pdf-a-jpg` revisadas. Lint, build y tests pasan.

## 2026-10-20 01:35 UTC — Fase 2, tarea 2B.5 (hero de la portada)

**Qué se hizo**
- Portada: el hero ahora contiene directamente el conversor (la zona para arrastrar es lo primero que se ve después del título; se quitó el botón "Elegir archivos" que solo bajaba hasta él). Insignia de privacidad con `ShieldCheck`, h1 más grande (hasta `text-6xl`), resplandor suave de marca detrás (decorativo, CSS puro).
- Accesos rápidos: "Conversiones populares" (8 pastillas con flecha, `popularConversions`) debajo del conversor, dentro de la columna principal para no dejar un hueco al lado del anuncio lateral.
- `ProcessingBadge`: íconos `Lock`/`Cloud` de lucide en lugar de emojis.
- Fuente de títulos sin `preload` (ver mediciones). Sigue con `display: swap` y fallback ajustado: CLS 0.

**Mediciones (Lighthouse móvil, portada, 2 corridas)**
- Con las fuentes precargadas (2B.1–2B.4): rendimiento 97, LCP 2,4–2,5 s (el render delay del h1 subía porque las dos fuentes, ~60 kB, competían con CSS/JS). Con `display: optional` no mejoraba.
- Sin precargar la fuente de títulos: rendimiento 98–99, LCP 2,2–2,3 s, TBT 50–80 ms, CLS 0; accesibilidad y SEO 100.
- First Load JS de la portada según `next build`: 134 kB (antes 128), pero los chunks que realmente se descargan son los mismos (verificado comparando las dos versiones: solo cambia el chunk de la página, 178 → 194 B); la diferencia es cómo Next cuenta el `Link` cliente que ahora usa la página.

**Pendiente para 2B.7**
- La zona para arrastrar sigue con el diseño viejo (emoji de carpeta); se rediseña con sus estados en 2B.7.

**Verificación**
- Capturas de `/es` (360/1280, claro/oscuro) revisadas. Lint, build y tests (245) pasan.

## 2026-10-20 00:55 UTC — Fase 2, tarea 2B.6 (cómo funciona y preguntas frecuentes)

**Qué se hizo**
- Portada: sección "Cómo funciona" con 3 tarjetas numeradas (ícono lucide, título y explicación corta) unidas por una línea punteada decorativa en escritorio; "¿Por qué FileFlip?" con íconos lucide en lugar de emojis; "Preguntas frecuentes" con 6 preguntas (gratis, privacidad/subida, formatos, celular, lotes, calidad) en los 5 idiomas.
- `src/components/ui/FaqList.tsx` (componente de servidor, `<details>` nativo sin JS, chevron que gira) que publica también el FAQ schema. Lo usan la portada y las páginas de cola larga (antes cada una armaba su JSON-LD).
- `src/lib/faq.ts`: `faqPageJsonLd(locale, items)` y `jsonLdString` (escapa `<`); `faqJsonLd` de cola larga delega en él. Tests en `faq.test.ts`.
- Mensajes: `HomePage.steps` se reemplazó por `HomePage.how.*` y `HomePage.faq.*`.

**Verificación**
- Capturas de `/es` a 360/1280 en claro y oscuro revisadas. El HTML de `/es` y de `/es/heic-a-jpg-desde-iphone` trae un único `FAQPage`. Lint, build y tests (247) pasan. First Load JS de la portada sin cambios (134 kB).
- Nota: en escritorio queda un hueco entre los accesos rápidos y "Cómo funciona" por la altura del anuncio lateral reservado (600 px); se revisa en 2B.11.

## 2026-10-20 01:10 UTC — Fase 2, tarea 2B.7 (estados del conversor)

**Qué se hizo**
- `Dropzone` (conversor y herramientas PDF): vacío con ícono `Upload` en círculo de marca, título en `font-display`, ayuda y, en el conversor general, la lista de formatos (`Converter.dropFormats`); arrastrando: fondo `brand-soft`, borde de marca, sombra y escala leve (se apaga con `prefers-reduced-motion`); compacto (con archivos): fila con ícono `FilePlus2` y "Agrega más archivos" (`dropMore`; en las herramientas de un solo PDF sigue el título normal). Sin emojis.
- `QueueStatus` (carga diferida, solo con archivos): aviso sobre la lista con el estado de la tanda: procesando ("Convirtiendo 1 de 3…", % y barra global), listo (verde, "Listo: N archivos convertidos") o con errores (rojo, cuántos fallaron y qué hacer). Solo el titular es `role="status"` para que el lector de pantalla no lea cada porcentaje.
- `queueSummary` (`src/components/converter/queue-summary.ts`): cálculo puro del estado y progreso global (los terminados cuentan como 100 %) + tests.
- `FileRow`: íconos de estado (spinner con `motion-safe:animate-spin` y %, check en verde, alerta en rojo), fila con fondo `danger-soft` cuando falla o el formato no es compatible, ícono de nube de lucide para "procesado en el servidor" y `X` de lucide para quitar. Las tarjetas completas (miniatura, etc.) quedan para 2B.8.
- Mensajes nuevos en los 5 idiomas: `Converter.dropFormats`, `dropMore`, `statusWorking`, `statusDone`, `statusDoneHint`, `statusErrors`, `statusErrorsHint`.

**Verificación**
- Playwright en `/es` (360/1280, claro/oscuro): vacío, arrastrando (evento `dragover` simulado), procesando (2 PNG 2400×1800 + 1 PNG roto → WEBP) y resultado (2 listos con descarga, 1 con error y aviso rojo); sin errores de página. Capturas revisadas.
- Lint, build y tests (252) pasan. First Load JS: portada 135 kB (+1 kB por los íconos de la zona para arrastrar).

## 2026-10-20 01:25 UTC — Fase 2, tarea 2B.8 (tarjetas de archivo)

**Qué se hizo**
- `FileRow` ahora es una tarjeta: miniatura de 56 px, nombre (el del resultado cuando terminó), formatos "PNG → WEBP", estado y peso antes → después con el ahorro en una pastilla verde ("85 % menos"; si crece, "N % más" en gris). Borde verde cuando está lista y rojo con fondo `danger-soft` cuando falla.
- Botón "Descargar" con ícono, bien visible: a la derecha en escritorio y a todo el ancho debajo de la información en móvil; el nombre del archivo va como texto para lectores de pantalla (hay varios botones "Descargar"). Quitar (X) arriba a la derecha en móvil. El anuncio sigue debajo de toda la tarjeta de resultados, lejos de los botones.
- Miniatura (`src/components/converter/preview.ts`, `previewSource`): muestra el resultado si el navegador puede dibujarlo; si no, el original (JPG, PNG, WEBP, AVIF, GIF, BMP, ICO, SVG y ≤ 25 MB); si no, un ícono del tipo de archivo. Si la imagen no se puede decodificar (archivo roto) cae al ícono. La URL del original se crea solo cuando se muestra y se libera al desmontar o cambiar a la del resultado. Tests en `preview.test.ts`.
- Mensaje nuevo `Converter.larger` en los 5 idiomas.

**Verificación**
- Playwright en `/es` (360/1280, claro/oscuro) con 2 PNG reales y 1 roto → WEBP: miniaturas del resultado, ahorro, descarga y tarjeta de error con ícono; sin errores de página. Capturas revisadas.
- Lint, build y tests (255) pasan. First Load JS de la portada sin cambios (135 kB; la tarjeta se carga diferida).

## 2026-10-20 01:45 UTC — Fase 2, tarea 2B.9a (páginas de herramientas, conversión y cola larga)

**Qué se hizo**
- 2B.9 se dividió en 2B.9a (páginas) y 2B.9b (interior de las herramientas PDF).
- `src/components/ui/PageHero.tsx`: encabezado centrado común (ícono opcional en cuadrado de marca, h1 hasta `text-5xl`, resplandor suave como en la portada). Lo usan las herramientas PDF, las conversiones y la cola larga.
- Herramientas PDF: íconos lucide (`src/components/tools/ToolIcon.tsx`: Layers, Scissors, RotateCw, LayoutGrid, Images, FileArchive) en lugar de emojis; se quitó `icon` de `src/config/tools.ts` (la configuración no depende de React).
- Conversiones: pasos en 3 tarjetas numeradas, bloque de privacidad destacado (escudo en el navegador, nube en el servidor) y "Otras conversiones" con `PillLink` (pastilla con flecha, también en los accesos rápidos de la portada).
- Cola larga: el primer párrafo de la intro va como entradilla bajo el título; secciones con mejor interlineado.
- Corrección (venía de la fase 1): en las páginas de conversión de servidor (p. ej. Word → PDF) la insignia decía "Se procesa en tu dispositivo" hasta agregar un archivo; ahora usa el motor de la conversión de la página.

**Verificación**
- Capturas de `/es/jpg-a-webp`, `/es/word-a-pdf`, `/es/unir-pdf` y `/es/heic-a-jpg-desde-iphone` (360/1280, claro/oscuro) revisadas. Se detectó y corrigió un desborde horizontal a 360 px causado por el resplandor del encabezado (`scrollWidth` = 360 en portada, conversiones, herramientas y cola larga).
- Lint, build y tests (255) pasan. First Load JS de `[slug]` sin cambios (135 kB).
- Pendiente menor: el paso 2 de las conversiones de documentos dice "ajusta la calidad o el tamaño", que no aplica a Word → PDF; se revisa con los textos en 2B.10/2B.11.

## 2026-10-20 02:00 UTC — Fase 2, tarea 2B.9b (interior de las herramientas PDF) — 2B.9 TERMINADA

**Qué se hizo**
- `FileList` (unir, imágenes a PDF y herramientas de un solo PDF): cada archivo es una tarjeta con ícono de tipo (desde `sm`), nombre, formato y peso en una línea sin cortes, número de orden solo cuando se puede reordenar, flechas `ChevronUp/Down` y `X` de lucide; los archivos rechazados van en rojo con ícono de alerta (antes el motivo se ocultaba en móvil).
- `ProgressBar`: bloque de marca con spinner (`motion-safe`), etiqueta y porcentaje sobre la barra.
- `ToolAlert` (nuevo): errores de las 6 herramientas con ícono, borde y fondo `danger-soft`, `role="alert"`.
- `ToolResult`: ícono de éxito en círculo verde, título "Tu archivo está listo" (`role="status"`), nombre y peso del archivo en una pastilla, "Descargar" con ícono (a todo el ancho en móvil) y "Empezar de nuevo" como botón secundario. El anuncio sigue debajo de la tarjeta, separado de la descarga.

**Verificación**
- Playwright en `/es/unir-pdf` (360/1280, claro/oscuro): 2 PDF (2 + 3 páginas) + un TXT rechazado → unir → resultado → descarga con 5 páginas; `/es/dividir-pdf` con un PDF roto muestra el nuevo aviso de error; sin errores de página y sin desborde horizontal a 360 px. Capturas revisadas (se corrigió el apretado de la lista en móvil).
- Lint, build y tests (255) pasan. First Load JS de `[slug]`: 135 kB.

## 2026-10-20 01:25 UTC — Fase 2, tarea 2B.10a (precios, login y Mi cuenta)

**Qué se hizo**
- 2B.10 se dividió en 2B.10a (precios, login, cuenta) y 2B.10b (legales, contacto y 404).
- Precios: `PageHero` con ícono, tarjetas con `card`, precios grandes en `font-display`, viñetas con check de lucide en círculo verde, tarjeta Pro con borde de marca, `shadow-lift` y etiqueta "Recomendado" (`Pricing.recommended`, 5 idiomas); el botón del plan gratis usa `buttonSecondary`. Las preguntas usan `FaqList` (ahora la página publica también su FAQ schema).
- Login: `PageHero`, botón de Google con su "G" oficial (lo piden sus pautas de marca), separador "o" con líneas, botón de enlace con ícono `Mail`, error con borde y nota de privacidad con escudo. "Revisa tu correo": `PageHero` con `MailCheck` en lugar del emoji.
- Mi cuenta: inicial del correo en un cuadrado de marca, tarjeta del plan (Pro con borde de marca e insignia), datos de cobro con íconos, "Pasar a Pro" con ícono y "Cerrar sesión" como botón secundario con `LogOut`.
- `scripts/screenshots.mjs` acepta `SESSION_TOKEN` (cookie `authjs.session-token`) para capturar páginas con sesión. Sin `MONGODB_URI` la sesión es JWT: se genera con `encode` de `@auth/core/jwt` y el mismo `AUTH_SECRET` del `next start`.

**Verificación**
- Capturas de `/es/pricing`, `/es/login` (sin métodos, con Google + correo y con error), `/es/login/verify` y `/es/account` (con sesión simulada) a 360/1280 en claro y oscuro, revisadas. `/es/pricing` trae un único `FAQPage`.
- Lint, build, typecheck y tests (255) pasan.

## 2026-10-20 01:40 UTC — Fase 2, tarea 2B.10b (legales, contacto y 404) — 2B.10 TERMINADA

**Qué se hizo**
- Privacidad y términos (`LegalPage`): `PageHero` con ícono (escudo / documento), fecha de actualización como insignia, índice "Contenido" con enlaces a cada sección (fijo al costado en escritorio, arriba en móvil) y secciones numeradas dentro de una tarjeta con separadores. Mensaje nuevo `Legal.contents` en los 5 idiomas.
- Contacto: `PageHero`, tarjeta central con el correo y botón "Escribir un correo" (`Legal.contact.write`, 5 idiomas), y dos tarjetas con ícono para "qué contarnos" y "borrar tus datos".
- 404: `PageHero` con ícono, botón "Volver al inicio" con ícono y accesos a las conversiones populares (para no dejar al visitante sin salida).
- Corrección (venía de antes): las URL desconocidas se renderizan con el "error shell" de Next en el cliente, donde el script de tema del `<head>` no se ejecuta, así que el 404 salía siempre en claro. `ThemeToggle` ahora vuelve a aplicar el tema al montarse.

**Nota**
- `NEXT_PUBLIC_CONTACT_EMAIL` se fija en el build (la página de contacto es estática): hay que definirla antes de `next build` en Railway.

**Verificación**
- Capturas de `/es/privacy`, `/zh/terms`, `/es/contact` y `/es/no-existe` (360/1280, claro/oscuro) revisadas; el 404 ahora respeta el modo oscuro. Sin desborde horizontal a 360 px en precios, login, legales, contacto y 404.
- Lint, build y tests (255) pasan.

## 2026-10-20 01:55 UTC — Fase 2, tarea 2B.11a (microinteracciones)

**Qué se hizo**
- 2B.11 se dividió en 2B.11a (microinteracciones) y 2B.11b (revisión responsive y detalles pendientes).
- Animaciones solo CSS como tokens de Tailwind en `globals.css`: `animate-rise` (240 ms, aparece subiendo 6 px) y `animate-pop` (320 ms, rebote leve). Se usan en: aviso de estado de la tanda, botón "Descargar" de cada archivo, check de éxito, tarjeta de resultado de las herramientas PDF (con su check), errores de herramientas (`ToolAlert`), panel del menú móvil y la respuesta de una pregunta frecuente al abrirla.
- Íconos de descarga que bajan 2 px al pasar el mouse; desplazamiento suave para anclas (índice legal) solo con `prefers-reduced-motion: no-preference`.
- `docs/design.md` (sección "Movimiento") documenta cuándo usar cada animación. Convención: no animar el contenido de la primera pintura (título, hero) para no retrasar el LCP.

**Verificación**
- Playwright en `/es/png-a-webp` convirtiendo un PNG: con movimiento normal el botón de descarga anima `rise 0.24s` y `scroll-behavior: smooth`; con `reducedMotion: reduce` la duración es 0,01 ms y el desplazamiento `auto`; el estado final es el mismo (captura revisada). Sin errores de página.
- Lint, build y tests (255) pasan.

## 2026-10-20 02:10 UTC — Fase 2, tarea 2B.11b (revisión responsive y detalles) — 2B.11 TERMINADA

**Qué se hizo**
- Portada en escritorio (≥ 1280 px): "Cómo funciona" pasó a la columna principal junto al anuncio lateral, así ya no queda el hueco de ~250 px que dejaba el anuncio reservado (600 px) al lado de los accesos rápidos. En pantallas menores no cambia nada (el anuncio lateral solo existe desde `xl`).
- Footer a 768 px: 3 columnas (marca arriba a todo el ancho) en lugar de 2 con "FileFlip" sola debajo.
- Conversiones de servidor (Word → PDF, PDF → Word…): el paso 2 ahora dice "Comprueba que esté elegido {to} como formato de salida" (`ConversionPage.step2Document`, 5 idiomas) en vez de hablar de calidad o tamaño, que no aplican.
- Panel "Opciones" del conversor con ícono, chevron que gira y aparición suave (antes tenía el triángulo nativo del navegador).
- `formatBytes`: los tamaños de menos de 1 kB se muestran como "938 B" (Intl escribía "938 byte"); tests actualizados.
- `scripts/screenshots.mjs` acepta `WIDTHS=360,768,1280`.

**Verificación**
- Capturas de portada, conversión de imagen y de documento, herramienta PDF, cola larga, precios y legales a 360/768/1280 (claro/oscuro) revisadas.
- Sin desborde horizontal a 360, 768 y 1024 px en 20 páginas (portada, conversiones, las 6 herramientas PDF salvo rotar, cola larga, precios, login, legales, contacto, 404 y otros idiomas).
- Lint, build y tests (255) pasan.

## 2026-10-20 02:35 UTC — Fase 2, tarea 2B.12 (capturas finales y Lighthouse) — HITO 2B TERMINADO

**Qué se hizo**
- Capturas finales en `docs/screenshots/` (48 imágenes WebP de página completa, 2,6 MB): portada (es y en), JPG → WEBP, Word → PDF, Unir PDF, cola larga HEIC, precios, login (con Google y correo), privacidad, contacto, 404 y Mi cuenta (sesión simulada), a 360 y 1280 px en claro y oscuro. Se guardan en WebP (calidad 75) para no inflar el repositorio.
- Medición en `docs/perf/2026-10-20-2B-final.md`. El Lighthouse del contenedor ahora es la 13.5, así que se volvió a medir el commit de 2A con la misma versión para comparar.

**Mediciones (Lighthouse 13.5 móvil, mediana de 3)**
- 2B: rendimiento 97–99 (portada 98), accesibilidad 100, SEO 100, CLS 0, LCP 2,2–2,4 s, FCP 1,2 s, JS 142–149 KB.
- 2A con la misma versión: rendimiento 99, SEO 92, LCP 1,6–2,1 s, FCP 0,8 s, JS 136–144 KB.
- La meta (≥ 90 sin empeorar accesibilidad ni SEO) se mantiene. El costo del diseño (FCP +0,4 s) viene de la fuente de texto precargada; quitar la precarga empeoró todo (rendimiento 96, CLS > 0) y se revirtió.

**Verificación**
- Lint, build y tests (255) pasan.

## 2026-10-20 02:20 UTC — Fase 2, tarea 2C.1 (control de acceso del panel)

**Qué se hizo**
- `src/lib/admin/access.ts`: `parseAdminEmails`, `isAdminEmail` (sin distinguir mayúsculas), `getAdminSession`, `requireAdminPage` (llama a `notFound()`) y `requireAdminApi` (devuelve una respuesta 404 `{ error: "notFound" }` para no revelar que la API existe).
- Ruta `/[locale]/admin` con layout y página dinámicos (`force-dynamic`) que verifican en el servidor; la página vuelve a verificar porque layout y página se renderizan en paralelo. Los metadatos solo nombran el panel a los admins (el 404 de los demás no tiene el título del panel); siempre `noindex`.
- `ADMIN_EMAILS` en `.env.example` y en "Pendiente del dueño".

**Decisiones y convenciones**
- `getAdminSession` llama a `headers()` antes de `auth().catch(...)`: el `catch` se tragaba la señal de "uso dinámico" de Next y la página podía prerenderizarse como 404 en el build.
- Mensajes del panel solo en español en `messages/admin.es.json` (namespace `Admin`), leídos con `createTranslator` de next-intl en `src/lib/admin/messages.ts`. No van en `messages/*.json` porque `NextIntlClientProvider` manda todos esos mensajes al navegador en cada página pública, y porque el test de mensajes exige las mismas claves en los 5 idiomas.

**Verificación**
- Tests nuevos (6): admin, usuario no admin, anónimo y `ADMIN_EMAILS` vacío, para página y API.
- Con `next start` y sesiones JWT simuladas: anónimo → 404, no admin → 404 (sin "administración" en el HTML), admin → 200.
- Lint, typecheck, build y tests (261) pasan.

## 2026-10-20 02:40 UTC — Fase 2, tarea 2C.2a (duración, error y herramienta en el registro de conversiones)

**Qué se hizo**
- 2C.2 se dividió en 2C.2a (registro de conversiones), 2C.2b (uso de las herramientas PDF) y 2C.2c (beacon de visitas).
- `ConversionLog`: campos nuevos `tool` (`"convert"` o el id de la herramienta PDF; por defecto `"convert"`), `durationMs` y `errorCode` (solo códigos de `apiErrorCodes`, nunca texto). Sin índices nuevos: el panel filtra por `createdAt`, que ya tiene índice (TTL).
- APIs de conversión (imagen y documentos): miden la duración de la conversión (sin contar la subida) y guardan el código de error (`conversionFailed`, `serviceUnavailable`, `pdfHasNoText`).
- Navegador: el conversor informa `durationMs` y, en los fallos, `errorCode`. Para no contar dos veces, `ConversionError.loggedByServer` marca los fallos que la API ya registró (`isLoggedByServerCode`); los rechazos previos a convertir (tamaño, límite de pedidos, formato) los informa el navegador con `engine: "server"`.
- `parseConversionEntry`: valida duración (0–1 h), herramienta y código de error. Solo acepta `engine: "server"` del navegador en fallos, así nadie puede inflar las conversiones exitosas del servidor.

**Verificación**
- Tests nuevos: validación de los campos, guardado en MongoDB en memoria, registro de duración/error sin el nombre del archivo en la API de documentos, `isLoggedByServerCode`.
- Playwright (`next start`): convertir un PNG a WEBP envía `{"from":"png","to":"webp","size":228,"outputSize":90,"success":true,"durationMs":26}`.
- Lint, typecheck, build y tests (266) pasan.

## 2026-10-20 02:55 UTC — Fase 2, tarea 2C.2b (uso de las herramientas PDF)

**Qué se hizo**
- `trackTool(tool, { from, to, files }, run, outputSize)` en `src/lib/stats-client.ts`: ejecuta la herramienta, mide la duración y envía por el mismo beacon (`/api/stats`) la herramienta, los formatos, el tamaño total de entrada, el de salida y si funcionó (si falla, `errorCode: "conversionFailed"` y vuelve a lanzar el error).
- Las 6 herramientas PDF lo usan: unir, dividir (salida = suma de las partes), rotar, ordenar, imágenes a PDF (`from` = formato de la primera imagen) y comprimir. Se registran con `from`/`to` = `pdf` y `tool` = id de la herramienta, así el panel puede separarlas del conversor de formatos.

**Verificación**
- Tests de `trackTool` (éxito y fallo, sin nombres de archivo).
- Playwright (`next start`): unir 2 PDF envía `{"tool":"merge-pdf","from":"pdf","to":"pdf","size":1176,"outputSize":510,"success":true,"durationMs":99}` y la herramienta sigue funcionando.
- Lint, typecheck, build y tests pasan.

## 2026-10-20 03:10 UTC — Fase 2, tarea 2C.2c (beacon de visitas) — 2C.2 TERMINADA

**Qué se hizo**
- Modelo `PageView` (`src/models/PageView.ts`): `locale`, `country` (opcional), `kind` (`home`, `conversion`, `tool`, `longtail`, `pricing`, `legal`, `account`, `other`), `page` y `createdAt` con índice TTL de 1 año. Sin IP, usuario, cookie ni URL completa.
- `classifyPath` (`src/lib/server/visits.ts`): convierte la ruta en un id de página independiente del idioma (`/es/jpg-a-webp` y `/en/jpg-to-webp` → `conversion` / `jpg-webp`; herramientas → id de la herramienta; cola larga → id de la página). Las rutas de `/admin` y los idiomas desconocidos no se cuentan.
- `POST /api/visit`: recibe solo `{ path }`; el país sale de la cabecera geo del CDN (`countryFromHeaders`, nueva en `src/config/pricing.ts` y usada también por `detectRegion`; ignora `XX`/`T1`). La IP solo se usa como clave del limitador en memoria (60/min) y nunca se guarda.
- `VisitBeacon` (componente cliente en el layout): manda el beacon en `requestIdleCallback` (para no competir con la carga) en cada cambio de ruta; respeta `navigator.doNotTrack` y no cuenta el panel.

**Decisiones**
- Sin Cloudflare (u otro CDN con cabecera de país) delante de Railway, las visitas no tienen país; el panel lo mostrará como "desconocido".

**Verificación**
- Tests nuevos (6): clasificación de rutas y API con MongoDB en memoria (guarda idioma, país y página; nunca la IP; no cuenta admin; 400 con cuerpo inválido).
- Playwright (`next start`): la portada y la navegación a precios envían `{"path":"/es"}` y `{"path":"/es/pricing"}`.
- Lint, typecheck, build, `check:static` y tests (274) pasan. JS compartido sin cambios (103 kB).

## 2026-10-20 03:25 UTC — Fase 2, tarea 2C.3 (selector de período)

**Qué se hizo**
- `src/lib/admin/period.ts`: `resolvePeriod({ period, from, to })` → inicio, fin (exclusivo), período anterior de la misma duración y granularidad (`day`/`month`). Opciones: hoy, 7 días, 30 días (por defecto y ante cualquier valor inválido), 12 meses (meses calendario hasta el actual, comparados con los 12 anteriores) y personalizado (fechas `YYYY-MM-DD` inclusivas; más de 92 días se grafica por mes; tope de ~3 años). Además `bucketKeys` (todas las claves del período para graficar los días sin datos como 0), `change` (variación vs. el período anterior) y `parseDay`.
- `PeriodSelector` (componente de servidor, sin JavaScript en el cliente): enlaces para las opciones fijas y un formulario GET con dos fechas para el personalizado. La página del panel muestra el rango elegido y el de comparación.

**Decisiones**
- Todas las fechas del panel son UTC (los días empiezan a las 00:00 UTC); las agregaciones de MongoDB usarán la misma convención. Se indica "(UTC)" junto al rango.

**Verificación**
- Tests nuevos (8) de períodos, comparación y validación de fechas.
- Capturas del panel con sesión de admin simulada a 360 px (claro) y 1280 px (oscuro) revisadas; el enlace "7 días" navega bien.
- Lint, typecheck, build y tests (282) pasan.

**Siguiente**: 2C.4 (agregaciones de conversiones).

## 2026-10-20 03:11 UTC — Fase 2, tarea 2C.4 (agregaciones de conversiones)

**Qué se hizo**
- `src/lib/admin/stats/buckets.ts`: utilidades comunes para las agregaciones del panel: `bucketExpr` (`$dateToString` por día o mes en UTC), `inRange` (`$match` por rango sobre el campo con índice) y `fillBuckets` (completa los días/meses sin datos con 0, usando `bucketKeys`).
- `src/lib/admin/stats/conversions.ts`: `conversionStats(period)` hace un solo `aggregate` con `$match` por `createdAt` (usa el índice TTL) y `$facet`: total y fallidas, por día/mes, top 10 y navegador vs servidor; en paralelo, `countDocuments` del período anterior para la comparación (`change`).
- Top 10: las conversiones del conversor se agrupan por par de formatos (`tool: "convert"`, `from`, `to`) y las herramientas PDF por herramienta. Los registros viejos sin `tool` cuentan como `convert` (`$ifNull`).

**Decisiones**
- "Conversiones" cuenta todos los intentos (exitosos y fallidos); se devuelven también `succeeded` y `failed` para mostrar ambos.

**Verificación**
- Tests nuevos (6) con MongoDB en memoria: totales y comparación, días UTC con huecos en 0, agrupación mensual de 12 meses, ranking de pares y herramientas, tope de 10 y período vacío.
- Lint, typecheck, build y tests (288) pasan.

## 2026-10-20 03:13 UTC — Fase 2, tarea 2C.5 (errores, duración, bytes y archivos temporales)

**Qué se hizo**
- `src/lib/admin/stats/quality.ts`: `qualityStats(period)`, un `aggregate` con `$match` por `createdAt` y `$facet`: fallidas por código de error (las que no tienen código cuentan como `unknown`), duración promedio de las conversiones exitosas con duración (total y por motor: navegador/servidor), bytes de entrada (todos los intentos) y de salida (solo exitosas).
- `tempUsage(root)` en `src/lib/server/temp.ts`: archivos, bytes y antigüedad del más viejo en la carpeta temporal del servidor ahora mismo (recorre subcarpetas con `readdir({ recursive })`, Node ≥ 20.12; el Dockerfile usa Node 22).

**Decisiones**
- La duración promedio excluye los fallos (un fallo por tiempo de espera distorsionaría el promedio) y los registros viejos sin duración.

**Verificación**
- Tests nuevos (6): errores por código, promedios, bytes y período vacío con MongoDB en memoria; `tempUsage` con subcarpetas y con carpeta inexistente.
- Lint, typecheck, build y tests (294) pasan.

## 2026-10-20 03:16 UTC — Fase 2, tarea 2C.6 (agregaciones de visitas)

**Qué se hizo**
- `src/lib/admin/stats/visits.ts`: `visitStats(period)`, un `aggregate` sobre `PageView` con `$match` por `createdAt` (índice TTL) y `$facet`: visitas por día/mes (huecos en 0), por idioma, por país (top 20; sin cabecera geo cuenta como `unknown`), por tipo de página y top 10 de páginas de cola larga (id independiente del idioma). Total del período anterior con `countDocuments` para la comparación.

**Verificación**
- Tests nuevos (4) con MongoDB en memoria: totales y comparación, agrupación por idioma/país/tipo, ranking de cola larga con tope de 10 y período vacío.
- Lint, typecheck, build y tests (298) pasan.

## 2026-10-20 03:19 UTC — Fase 2, tarea 2C.7 (usuarios, suscripciones y MRR)

**Qué se hizo**
- `src/lib/admin/stats/accounts.ts`: `accountStats(period)` con consultas en paralelo: total de usuarios (`estimatedDocumentCount`), usuarios nuevos por día/mes y del período anterior, suscripciones activas ahora, altas del período (creadas y que pasaron de `pending`), bajas del período (`cancelledAt`) y MRR por moneda de las suscripciones activas (mensuales + anuales / 12, redondeado a centavos).

**Decisiones**
- Auth.js no guarda fecha de alta del usuario, pero su `_id` es un ObjectId cuyo inicio es la fecha de creación: los rangos se hacen sobre `_id` (`ObjectId.createFromTime`, usa el índice `_id`) y `$dateToString` agrupa directamente sobre el ObjectId. No hizo falta agregar datos ni índices (`Subscription` ya tiene índices por `status`, `createdAt` y `cancelledAt`).
- El MRR se informa por moneda, sin convertir (no hay tipos de cambio en el proyecto).

**Verificación**
- Tests nuevos (4) con MongoDB en memoria: usuarios por día desde el id, activas/altas/bajas (las `pending` no cuentan), MRR por moneda con planes anuales y período vacío.
- Lint, typecheck, build y tests (302) pasan.

## 2026-10-20 03:24 UTC — Fase 2, tarea 2C.8 (API del panel y tarjetas de resumen)

**Qué se hizo**
- `adminStats(period)` (`src/lib/admin/stats/index.ts`) junta en paralelo conversiones, calidad, visitas, cuentas y archivos temporales.
- `GET /api/admin/stats?period=…&from=…&to=…`: protegida con `requireAdminApi` (404 `{ error: "notFound" }` para anónimos y no admins), `Cache-Control: no-store`, `stats: null` sin `MONGODB_URI` y 503 si falla la base. Pensada para el CSV y usos externos; la página no la llama, consulta directo en el servidor.
- Página `/[locale]/admin`: 9 tarjetas de resumen (`StatCard`, `SummaryCards`, componentes de servidor sin JS en el cliente): conversiones (con variación vs. período anterior, exitosas/fallidas, navegador/servidor), visitas, usuarios nuevos (y total), Pro activas (altas/bajas), MRR por moneda (con el código de moneda para no confundir ARS con USD), datos procesados, tiempo promedio (por motor), fallidas (% de intentos) y archivos temporales del servidor. Aviso de error si la consulta falla.
- `formatDuration` en `src/lib/admin/format.ts` (ms / s / min, formato es-419).

**Verificación**
- Tests nuevos (3): API 404 para anónimo y no admin, 200 con las estadísticas del período para admin (MongoDB en memoria); `formatDuration`.
- Con `next start`, MongoDB en memoria con datos de ejemplo y una sesión de base de datos: anónimo → 404 en página y API, admin → 200. Capturas a 360 px (claro) y 1280 px (oscuro) revisadas.
- Lint, typecheck, build y tests (305) pasan.

**Siguiente**: 2C.9 (gráficos livianos solo en el panel).

## 2026-10-20 04:30 UTC — Fase 2, tarea 2C.9 (gráficos del panel)

**Qué se hizo**
- Gráficos SVG renderizados en el servidor, sin librería de gráficos y sin JavaScript en el cliente (la página del panel pesa 1,5 kB; el JS compartido del sitio no cambia, 103 kB):
  - `LineChart`: línea + área de una sola serie, grilla con valores enteros, etiquetas del eje x en HTML (6 en escritorio, primera/media/última en 360 px) y, por cada día/mes, una columna con tooltip nativo (`<title>`) y línea guía al pasar el mouse.
  - `BarList`: barras horizontales que son también una tabla (etiqueta, cantidad y % del total listado), así los valores nunca dependen solo del color.
- Sección "Gráficos" (`Charts`): conversiones, visitas y usuarios nuevos por día (o por mes en 12 meses / rangos largos); top 10 de herramientas y pares de formatos; navegador vs. servidor; fallidas por código de error; visitas por idioma, país (nombres con `Intl.DisplayNames`), tipo de página y top de cola larga.
- `src/lib/admin/charts.ts` (geometría pura: `niceMax`, `tickCountFor`, `lineGeometry`, `labelIndexes`, `barShares`) y `formatBucket` para las etiquetas de fecha.

**Decisiones**
- No se agregó Recharts ni otra dependencia: los datos ya llegan agregados del servidor y unos pocos SVG alcanzan; así el panel no carga JS de gráficos y no hay riesgo de que entre al bundle de las páginas públicas.

**Verificación**
- Tests nuevos (7) de la geometría y de `formatBucket`.
- `next start` con MongoDB en memoria y datos de ejemplo (600 conversiones, 1500 visitas, 40 usuarios): capturas a 360 px (claro) y 1280 px (oscuro) revisadas; se corrigieron las etiquetas del eje x que se superponían en 360 px y los valores decimales de la grilla.
- Lint, typecheck, build y tests (312) pasan.

## 2026-10-20 04:45 UTC — Fase 2, tarea 2C.10 (exportar a CSV)

**Qué se hizo**
- `GET /api/admin/export?table=…&period=…` (mismos parámetros de período que `/api/admin/stats`): descarga una tabla como CSV (`text/csv; charset=utf-8`, `Content-Disposition: attachment`, nombre `fileflip-<tabla>-<desde>_<hasta>.csv`, `no-store`). Protegida con `requireAdminApi` (404 para anónimos y no admins), 400 con tabla desconocida, 503 sin base de datos. Solo ejecuta la agregación que necesita la tabla.
- Tablas (`src/lib/admin/csv.ts`): `conversions-per-day`, `top-conversions`, `engines`, `errors`, `visits-per-day`, `visits-by-locale`, `visits-by-country`, `visits-by-page-kind`, `top-longtail`, `users-per-day` y `mrr` (esta última solo por la API, no tiene gráfico).
- Enlace "CSV" (ícono de descarga) en cada gráfico y tabla del panel, con el período elegido.

**Decisiones y convenciones**
- CSV RFC 4180 con fin de línea CRLF, encabezados en inglés (`snake_case`) y valores crudos (códigos de país, idioma y error, ids de herramienta) para poder procesarlos; las fechas son las claves UTC del panel (`YYYY-MM-DD` o `YYYY-MM`).
- Protección contra inyección de fórmulas: el texto que empieza con `=`, `+`, `-`, `@`, tab o CR lleva un apóstrofo delante.

**Verificación**
- Tests nuevos (9): escapado y fórmulas, tablas, validación del id de tabla, y la API con MongoDB en memoria (anónimo y no admin → 404, tabla inválida → 400, admin → CSV con los datos del período).
- Con `next start` y datos de ejemplo: descarga correcta y capturas del panel a 360 px y 1280 px revisadas.
- Lint, typecheck, build y tests (321) pasan.

## 2026-10-20 04:55 UTC — Fase 2, tarea 2C.11 (revisión final)

**Qué se hizo**
- Lint, typecheck, build, `check:static` (547 páginas del sitemap estáticas salvo precios) y tests (59 archivos, 321 tests) pasan en `dev`.
- Medición final con Lighthouse en `docs/perf/2026-10-20-phase2-final.md`.
- Capturas del panel (`docs/screenshots/es_admin-*.webp`, 360 y 1280 px, claro y oscuro, con datos de ejemplo).

**Mediciones finales (Lighthouse 13.5 móvil, mediana de 3)**
- Rendimiento 97–98 (portada 98), accesibilidad 100, SEO 100, CLS 0, LCP 2,2–2,6 s, FCP 1,2 s, TBT 40–100 ms, JS 142–149 KB. Igual que al final de 2B: el panel no agrega JS a las páginas públicas.

# FASE 2 TERMINADA

**Resumen**
- **2A Rendimiento**: medición reproducible (`scripts/perf/lighthouse.sh`), análisis del bundle (`npm run analyze`, `docs/perf/bundle.md`), componentes de servidor e import dinámico de lo pesado (pdf.js, pdf-lib, fflate y códecs fuera de la portada), páginas de conversión, cola larga y legales estáticas en los 5 idiomas, CLS 0 con espacios reservados para anuncios, caché inmutable para `.wasm` y workers, precarga del códec al elegir formato, pool de workers según `hardwareConcurrency` con liberación de memoria, índices de MongoDB y timeouts hacia Gotenberg.
- **2B Diseño**: identidad visual en `docs/design.md` (paleta clara/oscura AA, Bricolage Grotesque + Figtree, tokens en Tailwind), logo SVG, favicon e imágenes Open Graph por idioma, header/footer y menú móvil nuevos, portada (hero con zona de arrastre, privacidad, accesos rápidos, 3 pasos, FAQ con schema), estados del conversor y tarjetas de archivo, todas las páginas rediseñadas, microinteracciones que respetan `prefers-reduced-motion`. Capturas en `docs/screenshots/`.
- **2C Panel de administración** (`/es/admin`, 404 para quien no está en `ADMIN_EMAILS`, verificado en el layout, la página y cada API): registro de duración, error y herramienta de cada conversión, uso de las herramientas PDF y beacon de visitas (idioma, país de la cabecera del CDN, tipo de página; sin IP ni nombres de archivo); selector de período con comparación; tarjetas de resumen; gráficos SVG sin JS en el cliente; agregaciones de MongoDB con `$facet` sobre campos con índice; exportación a CSV de las tablas.

**Mediciones de rendimiento**: base 99 / final 97–98 en móvil (ver `docs/perf/2026-10-20-phase2-final.md`), accesibilidad y SEO 100, CLS 0.

**Lo que el dueño debe configurar** (además de lo de la fase 1, ver "Pendiente del dueño")
- `ADMIN_EMAILS`: correos separados por comas con acceso al panel (vacío = nadie). Se entra en `/es/admin` después de iniciar sesión con uno de esos correos.
- `MONGODB_URI` en producción: sin base de datos el panel muestra un aviso y no hay estadísticas.
- (Opcional) Cloudflare u otro CDN delante de Railway para que las visitas tengan país (`cf-ipcountry`); sin eso aparecen como "Desconocido".
- Mirar el panel con datos reales y decidir si hace falta algo más (por ejemplo, conversión del MRR a una sola moneda).

## Inicio de la fase 3

## 2026-10-20 21:40 UTC — Fase 3: plan

- PLAN.md: nueva sección "Fase 3" con las tareas de los hitos 3.0 (cambio de nombre a Fileflect) y 3A (auditoría y comparación). Las tareas de 3B–3E se detallan al terminar la auditoría (tarea 3A.6).

## 2026-10-20 21:55 UTC — Fase 3, tarea 3.0.1 (textos con el nombre Fileflect)

**Qué se hizo**
- "FileFlip" → "Fileflect" en `messages/*.json` (5 idiomas + `admin.es.json`), metadatos y títulos de todas las páginas, manifest, imagen Open Graph, email de login, descripciones de los planes de Mercado Pago (salen de `Billing.monthly/yearly`), metadatos de los PDF generados (productor/creador) y del DOCX, `EMAIL_FROM` por defecto (en `auth.ts` y `.env.example`), comentario del Dockerfile.
- Nombres de descarga: `fileflect.zip`, `fileflect-merged.pdf`, `fileflect-images.pdf`, `fileflect-<tabla>-….csv`. Carpeta temporal del servidor: `<tmp>/fileflect`.
- El wordmark del header, footer, Open Graph y `public/logo.svg` pasa de "File**Flip**" a "File**flect**" (el rediseño del logo es la tarea 3.0.3).
- `package.json` y `package-lock.json`: `name` = `fileflect`.

**Decisiones**
- Se mantienen sin cambios los nombres internos que no ve el usuario: el nombre de la base en `MONGODB_URI` de ejemplo (`/fileflip`, cambiarlo dejaría al deploy actual apuntando a otra base), los emails/dominios ficticios de los tests y las URLs del repo de GitHub.

**Verificación**
- Lint, typecheck, build y tests (321) pasan. `grep "Flip"` en `src/`, `public/` y `messages/` solo encuentra datos de tests.

## 2026-10-20 22:00 UTC — Fase 3, tarea 3.0.2 (documentación con el nombre Fileflect)

**Qué se hizo**
- README, DEPLOY.md (incluido el nombre de la imagen Docker de ejemplo), `docs/design.md` (la idea del acento pasa a ser el "reflejo": *file* + *reflect*) y los títulos de PLAN.md y PROGRESS.md.
- "Pendiente del dueño": verificar disponibilidad del nombre/dominio/marca/redes, actualizar `NEXT_PUBLIC_SITE_URL` y `EMAIL_FROM`, y opcionalmente renombrar el repo.

**Verificación**
- Búsqueda insensible a mayúsculas de "fileflip" en todo el repo (sin `node_modules`, `.next`, bitácoras ni tests): solo queda el nombre de la base en el `MONGODB_URI` de ejemplo (interno, a propósito). Las entradas antiguas de PLAN.md/PROGRESS.md se dejan como registro histórico.

## 2026-10-20 22:15 UTC — Fase 3, tarea 3.0.3 (logo, íconos y Open Graph de Fileflect) — HITO 3.0 TERMINADO

**Qué se hizo**
- Marca nueva: una hoja partida por una línea de espejo; la mitad derecha es el reflejo de la izquierda con los colores invertidos (blanco/mandarina) sobre el cuadrado verde azulado de siempre. Wordmark "File" + "flect" (en `brand`). Misma paleta y tipografía de `docs/design.md` (nueva sección "Logo").
- Trazos en un solo lugar: `src/components/brand/mark.ts` (usado por `LogoMark` en header/footer y por la imagen Open Graph de cada idioma); `src/app/icon.svg` (favicon) y `public/logo.svg` (viewBox ampliado a 160 por el nombre más largo) repiten los mismos `path`.
- `scripts/brand/icons.mjs` regenera con sharp `apple-icon.png` (180, a sangre), `icon-192.png` e `icon-512.png`.

**Verificación**
- Capturas con Playwright de la portada a 1280 px (claro) y 360 px (oscuro) y de la imagen Open Graph en español revisadas; recortes guardados en `docs/screenshots/brand-*.webp`.
- Lint, typecheck, build y tests (321) pasan.

## 2026-10-20 22:35 UTC — Fase 3, tarea 3A.1 (fixtures)

**Qué se hizo**
- `scripts/fixtures/generate.mjs`: genera en `tests/fixtures/` 24 archivos válidos (PNG, JPG, WEBP, AVIF, GIF, TIFF, BMP, ICO, SVG, 3 PDF, TXT, CSV, ODT, DOCX, DOC, RTF, ODS, XLSX, XLS, ODP, PPTX) y 8 corruptos en `tests/fixtures/corrupt/` (truncados, firma válida + basura, contenido que no coincide con la extensión, vacío). Total 768 KB → ~300 KB sin el PPT.
- Imágenes con sharp desde una imagen RGBA sintética de 160×120 (BMP e ICO con codificadores propios dentro del script); PDF con pdf-lib (fechas fijas); documentos de oficina convertidos con LibreOffice (`execFile`, sin shell, perfil temporal) desde fuentes ODF planas escritas en el script. `photo.heic` se mantiene (sharp no codifica HEIC).
- `tests/fixtures/README.md` con el origen de cada archivo; `tests/fixtures.test.ts` (33 tests): detección por magic bytes de cada fixture, tamaño < 200 KB, dimensiones 160×120, páginas de los PDF y que los corruptos fallen.

**Hallazgos (para la auditoría)**
- pdf-lib carga sin error un PDF con encabezado válido y contenido basura (o truncado); el fallo aparece recién al leer las páginas. Las herramientas PDF deben validar leyendo las páginas y mostrar un error claro (se revisa en 3A.3).
- LibreOffice exporta un PPT mínimo de ~450 KB: no se incluye un fixture `.ppt`; el PPT se probará con el PPTX/ODP o generándolo en el test si hace falta.
- LibreOffice 24.2 está instalado en este entorno: sirve para probar de verdad la conversión de oficina (la app usa Gotenberg, que también usa LibreOffice).

**Verificación**
- Lint, typecheck y tests (354) pasan. Sin cambios en `src/` (no hace falta build).

## 2026-10-20 22:55 UTC — Fase 3, tarea 3A.2 (inventario del servidor)

**Qué se hizo**
- `tests/inventory/server.test.ts` (72 casos): cada conversión de servidor de punta a punta por las rutas reales con los fixtures, validando el archivo de salida con un lector independiente (sharp, encabezados BMP/ICO, pdf-lib, DOCX descomprimido con fflate).
- La conversión de oficina se prueba con LibreOffice local en lugar de Gotenberg (mismo motor; `execFile` sin shell); sin LibreOffice esos casos se saltan (`describe.skipIf`), así el CI sigue pasando.
- Resultados en `docs/audit-inventory.md` (sección servidor).

**Resultados**
- Imágenes con sharp: 49/49 pares ✅ (JPG, PNG, WEBP, AVIF, GIF, TIFF, SVG → JPG, PNG, WEBP, AVIF, GIF, TIFF, BMP, ICO). HEIC/BMP/ICO de entrada → 415 en el servidor (solo navegador, como estaba documentado).
- Oficina → PDF: DOCX, DOC, ODT, RTF, TXT, CSV, XLSX, XLS, ODS, PPTX y ODP ✅ con la cantidad de páginas esperada. PPT sin fixture.
- PDF → Word ✅ con el texto de todas las páginas; PDF rotos → error claro.
- Archivos corruptos: 422 `conversionFailed` (decodificación) o 415 `unsupportedFormat` (detección). No se encontraron fallas que corregir en el servidor.

**Verificación**
- Lint, typecheck y tests (61 archivos, 426 tests) pasan.

**Siguiente**: 3A.3 (inventario en el navegador con Playwright).

## 2026-10-20 22:22 UTC — Fase 3, tarea 3A.3a (inventario del conversor en el navegador)

**Qué se hizo**
- 3A.3 se dividió en 3A.3a (conversor), 3A.3b (herramientas PDF) y 3A.3c (corrección de corruptos).
- `scripts/audit/browser.mjs`: Playwright con el Chromium del entorno contra `next start`; sube cada fixture al conversor de `/es`, elige cada salida, descarga y valida con lectores independientes (sharp con decodificación de píxeles, encabezados BMP/ICO, pdf-lib, fflate). Bloquea `/api/convert/**` para medir solo el navegador y anota si se pidió el servidor. `--json` guarda los resultados; sale con código 1 si algo falla.
- Resultados en `docs/audit-inventory.md` (sección navegador).

**Resultados**
- 88/88 conversiones ✅ en el navegador (10 formatos de entrada × JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, PDF, más PDF → JPG/PNG en ZIP), con las dimensiones correctas. Mediana 0,12 s por imagen.
- Corruptos: vacío, PDF roto y texto con extensión `.jpg` se manejan bien. Dos fallas → tarea 3A.3c: un JPEG truncado se convierte sin aviso (relleno gris) y los PNG dañados se reintentan en el servidor (sube un archivo inservible; el servidor responde 422).

**Convenciones**
- El selector de salida aparece un momento después de la detección: el script espera el primer `input[name=target]` antes de decidir que una salida no se ofrece. La fila cambia al nombre de salida al terminar: se ubica por posición (un archivo por carga de página).

**Verificación**
- Lint y tests (426) pasan; sin cambios en `src/`.

## 2026-10-20 22:35 UTC — Fase 3, tarea 3A.3b (inventario de las herramientas PDF)

**Qué se hizo**
- `scripts/audit/pdf-tools.mjs`: 19 casos con Playwright sobre las 6 herramientas PDF (`/es/unir-pdf`, `dividir-pdf`, `rotar-pdf`, `ordenar-pdf`, `imagenes-a-pdf`, `comprimir-pdf`) eligiendo opciones como un usuario; valida con pdf-lib (páginas, rotación, tamaño, imágenes) y con pdf.js en Node (texto "page N of M" de cada página para comprobar el orden). Servidor bloqueado.
- Resultados en `docs/audit-inventory.md`.

**Resultados**
- 12/12 casos válidos ✅ (orden, rangos, rotación por página, tamaños de página, compresión que reduce y conserva la imagen). 6/7 corruptos ✅ con error visible.
- ❌ "Imágenes a PDF" con un PNG truncado se queda colgado en 75 % → tarea 3A.3d (afecta también a imagen → PDF del conversor).

**Convenciones**
- Next.js agrega un anunciador de rutas con `role="alert"` vacío fuera de `<main>`: los tests de navegador deben buscar alertas dentro de `main`.
- En las herramientas, "Páginas" aparece en varias etiquetas: usar `getByRole("textbox", { name: "Páginas" })`.

**Verificación**
- Lint y tests pasan; sin cambios en `src/`.

## 2026-10-20 22:40 UTC — Fase 3, tarea 3A.3c (JPEG/PNG dañados en el navegador)

**Qué se hizo**
- `src/lib/image/integrity.ts`: recorrido estructural de JPEG (segmentos hasta EOI, saltando los datos de cada SOS, relleno `FF` y marcadores RST; una miniatura EXIF con su propio `FFD9` no engaña porque va dentro del APP1) y de PNG (firma, IHDR primero, cada chunk dentro del archivo hasta IEND). No mira píxeles; costo lineal.
- `convertFile` lo aplica a toda entrada JPG/PNG antes de convertir (en el navegador, en el respaldo del servidor y en imagen → PDF del conversor) y corta con el nuevo código `fileDamaged` (422): "El archivo está dañado o incompleto. Prueba con otra copia." en los 5 idiomas.
- 7 tests unitarios (progresivo, EXIF + datos después de EOI, miniatura embebida, truncados, basura, vacío).

**Decisiones**
- Solo JPEG y PNG: son los únicos donde la auditoría encontró el problema y su estructura se valida barato. Para el resto de formatos se mantiene el respaldo al servidor cuando falla el navegador (puede ser falta de memoria o de soporte, no daño).
- Un JPEG con bytes extra después de EOI se acepta (lo hacen cámaras y apps).

**Verificación**
- `scripts/audit/browser.mjs`: 88/88 ✅ y los 3 corruptos de imagen ahora muestran el error sin pedir el servidor.
- Lint, typecheck, build y tests (433) pasan.

## 2026-10-20 22:50 UTC — Fase 3, tarea 3A.3d (Imágenes a PDF colgado con un PNG truncado)

**Qué se hizo**
- Causa: `embedPng` de pdf-lib entra en un bucle infinito con un PNG truncado (reproducido en Node; con el IDAT alterado pero completo sí lanza un error). El worker de PDF quedaba ocupado y la interfaz en 75 %.
- `toPdfImage` (en `src/lib/pdf/client.ts`) valida JPEG y PNG con `isDamagedImage` antes de incrustarlos (un JPEG cortado se incrustaba sin aviso). Cada falla se envuelve en `InputFileError` (nuevo, en `convert-error.ts`, con el índice del archivo).
- "Imágenes a PDF" muestra el código real traducido y el nombre del archivo culpable ("truncated.png: El archivo está dañado o incompleto…") en lugar del genérico. Imagen → PDF del conversor ya quedaba cubierto por 3A.3c.

**Pendiente para 3B**
- El motor de trabajos genérico debe tener un tiempo máximo por trabajo y terminar el worker si se excede (una librería puede colgarse con entradas raras que la validación no detecte).

**Verificación**
- `scripts/audit/pdf-tools.mjs` 19/19 ✅; `scripts/audit/browser.mjs` sin regresiones. Lint, typecheck, build y tests (434) pasan.

## 2026-10-20 22:58 UTC — Fase 3, tarea 3A.4 (comparación con la competencia)

**Qué se hizo**
- `docs/audit-competitors.md`: relevamiento con WebFetch de fileflip.org (~80 herramientas en 10 categorías), iLovePDF (33 herramientas PDF) y CloudConvert (cantidad de formatos por categoría). Tabla de qué tenemos y qué no, y conclusiones para 3A.5.
- Solo funcionalidades; no se copió texto ni diseño.

**Hallazgos**
- Fileflect ya iguala o supera a fileflip.org en conversión de imágenes y en las PDF básicas; los huecos grandes son desarrolladores/utilidades (baratos), PDF avanzado (marca de agua, numerar, proteger), audio/video, 3D y CAD.
- La portada de fileflip.org no detalla formatos: sus pares se dedujeron de los nombres de las herramientas.

**Siguiente**: 3A.5 (`docs/audit.md` con la tabla completa y la lista priorizada, y `docs/dependencies.md`).

## 2026-10-20 23:25 UTC — Fase 3, tarea 3A.5 (auditoría y licencias)

**Qué se hizo**
- `docs/audit.md`: estado verificado de lo existente (sin herramientas rotas tras 3A.3c/3A.3d), tabla de candidatas por categoría (¿tenemos?, competencia, navegador/servidor, motor, licencia, dificultad, riesgos, tests), ideas propias para LatAm (peso objetivo, foto carnet por país, firmar PDF, PDF para WhatsApp, escanear desde el celular), descartes y lista priorizada.
- `docs/dependencies.md`: licencias de todas las dependencias actuales (incluida libvips LGPL dentro de sharp y LibreOffice/Gotenberg) y de las candidatas.

**Decisiones**
- Audio/video: **no** usar `@ffmpeg/core` publicado (GPL-2.0-or-later). Propuesta: WebCodecs + mediabunny (MPL-2.0), sin COOP/COEP; AVI/WMV/FLV/3GP quedan sujetos a aprobación del dueño.
- Quitar fondo: `@imgly/background-removal` es AGPL → alternativa MediaPipe (Apache-2.0) u onnxruntime-web + modelo Apache-2.0.
- Hojas de cálculo: el paquete `xlsx` de npm quedó en 0.18.5 (con vulnerabilidades conocidas); si se usa SheetJS, desde su tarball oficial 0.20.x (Apache-2.0); alternativa exceljs (MIT, sin ODS).
- Descartados: MOBI/AZW (Calibre GPL), DWG (formato cerrado, LibreDWG GPL), PDF → Excel/PowerPoint (sin motor de calidad), video en el servidor (costo).
- "Comprimir imagen" y "peso objetivo" se adelantan: son baratas y muy buscadas.

**Verificación**
- Solo documentación; sin cambios en `src/`.

## 2026-10-20 23:35 UTC — Fase 3, tarea 3A.6 (plan de 3B a 3E) — HITO 3A TERMINADO

- PLAN.md: tareas detalladas de 3B (8: registro, categorías, buscador, motor de trabajos, interfaz genérica, plantilla de página, tests de navegador, Lighthouse), 3C (44 tareas en el orden de prioridad acordado, con "comprimir imagen"/peso objetivo adelantadas por valor/costo), 3D (5) y 3E (1).
- "Pendiente del dueño": decisiones de licencia (ffmpeg GPL, quitar fondo AGPL, MOBI, DWG).

**Siguiente**: 3B.1 (registro único de herramientas).

## 2026-10-20 23:50 UTC — Fase 3, tarea 3B.1 (registro único de herramientas)

**Qué se hizo**
- `src/config/tools.ts` pasa a ser el registro del catálogo (en vez de un `catalog.ts` nuevo, para no duplicar): categorías (`toolCategories`: image, pdf, document, data, developer, utility, subtitle, font, archive, ocr, ebook, audio, video, 3d, cad) y, por herramienta, categoría, formatos de entrada/salida, dónde corre, librerías, límites (`files` single/multiple y `timeoutMs` para el motor de trabajos de 3B.4) y estado `draft`/`verified`.
- `availableTools` = solo las `verified`; `toolFromSlug` solo resuelve publicadas, así páginas, sitemap, footer, `translatePathname` y el beacon de visitas ignoran los borradores. Nuevas `toolsInCategory` y `conversionCategory` (categoría de cada página de conversión de `formats.ts`, que sigue siendo el registro de pares del conversor).
- `ToolComponent` exige un componente por herramienta (`Record`, lo controla TypeScript).
- Tests: solo se publican las verificadas; categorías, formatos, librerías y límites válidos; título/descripción/acción en los 5 idiomas; **ningún slug choca entre herramientas, conversiones y cola larga** en cada idioma.

**Convenciones**
- Una herramienta nueva entra como `draft` y pasa a `verified` cuando tiene procesamiento real, tests que validan la salida, prueba de navegador y textos en los 5 idiomas.
- Los límites de tamaño y de lote siguen saliendo del plan (`limits.ts`); el registro solo agrega lo propio de cada herramienta.

**Verificación**
- Lint, typecheck, tests (440), build y `check:static` (547 páginas, igual que antes) pasan; `scripts/audit/pdf-tools.mjs` 19/19.
