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
  - "Convertir audio" incluye LAME (MP3) y el codificador AAC de FFmpeg, ambos **LGPL**, compilados a WASM en las extensiones de mediabunny sin modificar: conviene una página de créditos/licencias con enlaces a su código fuente (LAME pide un enlace a lame.sourceforge.io).

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
- Lint, typecheck, tests (440), build y `check:static` (547 páginas, igual que antes) pasan; `scripts/audit/pdf-tools.mjs` 19/19 y `scripts/audit/browser.mjs` 88/88.

## 2026-10-21 00:10 UTC — Fase 3, tarea 3B.2 (páginas de categoría y "Todas las herramientas")

**Qué se hizo**
- `src/config/categories.ts`: slug de "Todas las herramientas" (`/es/herramientas`, `/en/tools`, `/pt/ferramentas`, `/fr/outils`, `/zh/tools`) y de cada categoría en cada idioma (`/es/herramientas-pdf`, `/en/pdf-tools`, `/pt/ferramentas-de-imagem`, `/fr/outils-documents`…; zh usa los de en, como las herramientas). Solo se publican categorías con herramientas o páginas de conversión (hoy: imágenes, PDF, documentos).
- `CatalogViews.tsx`: página de categoría (herramientas en tarjetas + conversiones, agrupadas por formato de entrada si son más de 16) y página "Todas las herramientas" con secciones por categoría y filtros (navegación por categorías con `aria-current`). `CategoryIcon` con íconos lucide por categoría.
- Rutas en el `[slug]` existente (un solo segmento, en vez de `/herramientas/pdf` del plan: reutiliza `translatePathname`, el selector de idioma y el sitemap sin rutas nuevas). Metadatos traducidos con hreflang, sitemap (+20 URL: 567 páginas estáticas) y enlaces en el header ("Herramientas" ahora lleva a `/herramientas`) y el footer.
- Textos en el namespace `Catalog` (5 idiomas) con nombre y descripción de las 15 categorías.
- Tests (`categories.test.ts`): slugs únicos y seguros, solo categorías con contenido, cada conversión en una sola categoría, traducción de rutas y sitemap; el test de choques de slugs incluye categorías.

**Pendiente**
- El beacon de visitas cuenta las páginas de catálogo como "otras"; se ajusta con el panel por categoría (3D.4).

**Verificación**
- Lint, typecheck, tests (445), build y `check:static` pasan; `pdf-tools.mjs` 19/19. Capturas 360/1280 claro/oscuro revisadas (`docs/screenshots/es_herramientas*.webp`).

## 2026-10-21 00:30 UTC — Fase 3, tarea 3B.3 (buscador)

**Qué se hizo**
- `src/lib/search/match.ts`: normalización sin acentos ni mayúsculas (también chino) y búsqueda que exige todas las palabras; puntúa título > descripción/palabras clave y comienzo de palabra > coincidencia interna; herramientas antes que conversiones a igual puntaje.
- `src/lib/search/index.ts`: índice por idioma generado del registro (todas las herramientas, categorías publicadas, páginas de conversión y guías de cola larga del idioma), con formatos y extensiones como palabras clave.
- `/api/search-index/[locale]`: JSON **estático** generado en el build (~15 KB en es). Se pide solo al abrir el buscador (o al pasar el mouse/foco por el botón), así que la carga inicial no cambia.
- `SearchButton` en el header (ícono en móvil, "Buscar Ctrl K" en escritorio) con atajos `Ctrl/⌘+K` y `/` (este último no se activa si se está escribiendo en un campo). El diálogo (`SearchDialog`) se carga con import dinámico al primer uso: `<dialog>` modal nativo (foco atrapado), combobox ARIA con `aria-activedescendant`, flechas, Enter, Escape, clic en el fondo cierra y una línea `role="status"` con la cantidad de resultados. Textos en el namespace `Search` (5 idiomas).

**Problemas encontrados y corregidos**
- Con `<input type="search">`, Escape borra el texto en vez de cerrar el diálogo: se usa `type="text"` con `enterKeyHint="search"` y Escape manejado a mano.
- La regla global `:focus-visible` dibujaba un recuadro alrededor del campo: el foco se muestra como subrayado de la fila.

**Verificación**
- Tests (453, incluidos los de búsqueda y del índice en los 5 idiomas), lint, typecheck, build y `check:static` pasan. `scripts/audit/search.mjs` (nuevo): 12/12 en 360 y 1280 px (el índice no se pide al cargar la página; Ctrl+K, `/`, flechas, Enter navega, Escape cierra, mensaje sin resultados). `pdf-tools.mjs` 19/19.

**Siguiente**: 3B.4 (motor de trabajos genérico en workers).

## 2026-10-21 00:20 UTC — Fase 3, tarea 3B.4 (motor de trabajos genérico)

**Qué se hizo**
- `src/lib/jobs/pool.ts`: `createJobPool(start, { concurrency })` — pool de workers que hablan el protocolo de `worker-rpc` (`exposeHandlers` del lado del worker), creados al primer uso y reutilizados; cola en orden; progreso; **cancelación** con `AbortSignal` (un trabajo en cola sale de la cola; uno en curso **termina su worker** con `worker.terminate()` y el siguiente trabajo arranca uno nuevo); **tiempo máximo por trabajo** (`timeoutMs`) que también termina el worker; un worker que se cae falla solo su trabajo y se reemplaza; `dispose()` para salir de la página.
- `src/lib/jobs/batch.ts`: `runBatch(items, task, { concurrency, signal, onProgress, onItem })` — un resultado por archivo (`done` o `error` con código traducible) sin cortar el lote, progreso total promedio, y los archivos no empezados al cancelar quedan como `jobCancelled`.
- `src/lib/jobs/urls.ts`: registro de object URLs (`create`/`revoke`/`revokeAll`) para liberar vistas previas y descargas de una sola vez.
- Códigos nuevos `jobCancelled` y `jobTimedOut` en `api-errors.ts` con textos en los 5 idiomas.
- El cliente de las herramientas PDF (`src/lib/pdf/client.ts`) usa el pool con un límite de 10 minutos por trabajo (antes, un bucle infinito de pdf-lib dejaba el worker ocupado para siempre). Se quitó `createWorkerClient` de `worker-rpc.ts` (ya no se usaba).

**Decisiones**
- El conversor de imágenes mantiene su pool propio (`src/lib/image/client.ts`, con precarga de códecs y protocolo propio): funciona y está auditado; se migra solo si una herramienta nueva necesita compartirlo.
- El pool de PDF es de un solo worker (documentos grandes ocupan cientos de MB); los trabajos se ejecutan en orden.

**Verificación**
- 19 tests nuevos con un worker simulado (reutilización, tope de concurrencia, orden, progreso, transferibles, cancelación en curso y en cola, señal ya abortada, timeout, caída del worker, respuestas viejas, `dispose`). Lint, typecheck, tests (472) y build pasan; `scripts/audit/pdf-tools.mjs` 19/19 y `scripts/audit/browser.mjs` 88/88.

## 2026-10-21 00:35 UTC — Fase 3, tarea 3B.5 (interfaz genérica de herramienta)

**Qué se hizo**
- `src/components/tools/shell/state.ts` (lógica pura): `checkInputs` (filtro por extensión, tamaño máximo y cantidad contando los ya elegidos; el contenido lo sigue validando cada procesador), `shellReducer` (`idle` → `processing` con progreso que no retrocede → `done` / `error`; ignora eventos tardíos; si todas las entradas fallan con el mismo código se muestra un solo error; con fallas parciales se conservan los archivos buenos), `outputFiles` y `renameExtension`.
- `src/components/tools/shell/ToolShell.tsx`: entrada de archivos (Dropzone) o de texto (textarea), opciones de la herramienta, botón de acción con barra de progreso y **Cancelar** (aborta el `AbortSignal` que recibe el procesador → el pool termina el worker), lista de resultados con descarga individual, error traducido por archivo, "Descargar todo en ZIP" si hay más de uno y "Empezar de nuevo". Los object URL se crean una vez por resultado y se liberan al reiniciar o salir de la página (`createUrlRegistry`).
- Límites visibles y reales: "Hasta N archivos de X como máximo cada uno" / "Un archivo de X como máximo", el mínimo entre el plan del usuario (`limits.ts`) y el límite propio de la herramienta.
- Textos nuevos en `ToolUi` (`cancel`, `limitsMultiple`, `limitsSingle`) en los 5 idiomas.

**Convención para 3C**
- Una herramienta nueva implementa `process({ files, text }, { signal, onProgress })` que devuelve `ShellOutput[]` (`file` o `error` con código) y se monta con `<ToolShell input=… actionLabel=… options=… process=… />`. Los trabajos pesados van al pool de `@/lib/jobs` pasando `signal`.

**Verificación**
- 12 tests de la lógica de estado. Lint, typecheck, tests (484) y build pasan (una corrida con `next start` abierto en paralelo tuvo un test lento por timeout; repetida sin carga, todo verde). El componente todavía no tiene consumidores: su prueba de navegador llega con la primera herramienta de 3C (3C.1) y la base de 3B.7.

## 2026-10-21 00:55 UTC — Fase 3, tarea 3B.6 (plantilla de página de herramienta)

**Qué se hizo**
- La página de cada herramienta (`ToolView` en `src/app/[locale]/[slug]/page.tsx`) ahora tiene: encabezado + herramienta, "Qué hace …" (texto propio), **Límites** generados del registro y del plan (archivos por vez y tamaño máximo del plan gratis, lo que da Pro, tiempo máximo por trabajo, dónde se procesa), **preguntas frecuentes** con `FAQPage` (componente `FaqList` existente), **herramientas relacionadas** (`relatedTools` en `tools.ts`: misma categoría primero, luego las que comparten formato de entrada) con enlace a la categoría, y datos estructurados `SoftwareApplication` (`softwareApplicationJsonLd` en `seo.ts`, gratis, en el idioma de la página).
- Textos: `Tools.<id>.about` y `Tools.<id>.faq.q1/a1…` (3 preguntas por herramienta, con los nombres reales de los botones de cada idioma) para las 6 herramientas PDF en los 5 idiomas, y el namespace `ToolPage` (títulos de sección y frases de límites).

**Convenciones**
- Las preguntas se numeran `q1/a1`, `q2/a2`… sin huecos; la página lee hasta que falta una (máximo 12). Se usa el namespace existente `Tools.<id>` en lugar del `Catalog.<id>` que decía el plan, para no duplicar título/descripción.
- Los límites que se muestran salen de `limits.ts` y del `timeoutMs` del registro: si cambian, la página cambia sola.

**Verificación**
- Tests nuevos: cada herramienta publicada tiene introducción (> 120 caracteres; > 40 en chino) y ≥ 3 preguntas numeradas con respuesta en los 5 idiomas, sin introducciones repetidas entre herramientas; `relatedTools`; `softwareApplicationJsonLd`. Lint, typecheck, tests (488), build y `check:static` (567 páginas) pasan; `pdf-tools.mjs` 19/19.
- Capturas revisadas con Playwright: `/es/unir-pdf` a 1280 px claro y `/zh/compress-pdf` a 360 px oscuro (ambas con `SoftwareApplication` + `FAQPage`). Se corrigió un texto que mencionaba arrastrar en "Unir PDF" (esa herramienta ordena con botones).

## 2026-10-21 01:45 UTC — Fase 3, tarea 3B.7 (tests de navegador)

**Qué se hizo**
- `@playwright/test` 1.56.0 (Apache-2.0, misma versión que `playwright-core`) y `playwright.config.ts`: `tests/e2e/**/*.spec.ts`, levanta `next start` en el puerto 3100 (o usa `BASE_URL`), Chromium del entorno (`/opt/pw-browsers/...`) o `CHROME_PATH`, 4 workers, traza solo si falla. Comando: `npm run build && npm run test:e2e`.
- `tests/e2e/support.ts`: `test` con la API de conversión **bloqueada** (`serverCalls` registra los intentos) y que falla ante errores de JavaScript en la página; `openWithFiles`, `runTool`/`waitForResult` (descarga o mensaje de error), y validadores independientes del código de la app: `inspectPdf` (pdf-lib + pdf.js: páginas, rotación, tamaños, orden por el texto "page N of M"), `inspectImage` (sharp con decodificación de píxeles, BMP e ICO por encabezado), `unzipEntries`, `readText`, `readJson`, `readCsv` (lector RFC 4180 propio).
- Migrados los scripts de auditoría (se borraron `scripts/audit/*.mjs`; `docs/audit-inventory.md` apunta a los specs): `converter.spec.ts` (88 conversiones + 7 corruptos), `pdf-tools.spec.ts` (12 casos de las 6 herramientas + 8 de corruptos), `search.spec.ts` (360 px oscuro y 1280 px claro).
- `tests/e2e-coverage.test.ts` (Vitest, corre en CI): cada herramienta publicada y el conversor deben tener un bloque `test.describe("tool: <id>")` en `tests/e2e`.

**Problemas y decisiones**
- Con 4 workers, Chromium a veces no emite el evento `download` de un enlace `blob:` aunque la conversión terminó (2 de 117 en una corrida). `waitForResult` espera la descarga 15 s y, si no llega, lee los mismos bytes del `href` del enlace (queda una anotación en el test); la salida se sigue validando igual.
- Los archivos corruptos del conversor pueden ir al servidor legítimamente (un texto con extensión `.jpg` se detecta como TXT → PDF en el servidor): la verificación "sin servidor" solo aplica a las conversiones de imagen.
- El CI de GitHub no corre los tests de navegador (necesitaría instalar Chromium y hacer el build dos veces); se corren localmente al cerrar cada tarea con interfaz. Queda como mejora posible.

**Verificación**
- `npm run test:e2e`: 117/117 (y el conversor 190/190 con `--repeat-each 2`). Lint, typecheck, tests (495), build y `check:static` pasan.

## 2026-10-21 02:20 UTC — Fase 3, tarea 3B.8 (Lighthouse al cierre de 3B) — HITO 3B TERMINADO

- `docs/perf/2026-10-21-3B-final.md`: Lighthouse 13.5 móvil (mediana de 3) en 9 páginas, incluidas "Todas las herramientas", la categoría PDF y "Unir PDF" con la plantilla nueva: rendimiento 97–99, accesibilidad 100, SEO 100, CLS 0, JS 145–152 KB (+3 KB por el botón del buscador).
- `scripts/perf/lighthouse.sh` mide también esas 3 páginas. Nota: `LIGHTHOUSE` debe ser la ruta a un ejecutable (no `npx …`, el script lo cita como un solo comando).

**Siguiente**: 3C.1 (JSON ↔ CSV/TSV), la primera herramienta sobre `ToolShell`.

## 2026-10-21 02:30 UTC — Fase 3, tarea 3C.1 (JSON ↔ CSV/TSV)

**Qué se hizo**
- Dos herramientas nuevas en la categoría **Datos** (que ahora se publica: `/es/herramientas-de-datos`): **JSON a CSV** (`/es/json-a-csv`, `/en/json-to-csv`, `/pt/json-para-csv`, `/fr/json-en-csv`) y **CSV a JSON** (`/es/csv-a-json`…). Formatos nuevos en `formats.ts`: `json` y `tsv` (categoría `data`, fuera del conversor).
- `src/lib/data/csv.ts` (funciones puras, papaparse MIT): objetos anidados → columnas con punto (`address.city`, `tags.0`) y al revés; acepta lista de objetos, un objeto, un objeto que envuelve una sola lista y lista de listas; separador `,` `;` o tab; BOM UTF-8 opcional (por defecto sí, para Excel); detección del separador (`,` `;` tab `|`); comillas y saltos de línea en celdas; encabezados vacíos/repetidos con nombre propio; tipado opcional que solo convierte lo que se relee igual (`007` y enteros de 20 dígitos quedan como texto); protección contra prototype pollution (`__proto__`, `constructor`, `prototype` quedan como claves planas), y topes de 5000 columnas y 32 niveles.
- `src/lib/data/text.ts`: decodifica UTF-8, UTF-16 con BOM y, si no es UTF-8 válido, **Windows-1252** (CSV de Excel en Windows).
- Worker propio `src/workers/data.worker.ts` sobre el pool de `@/lib/jobs` (límite de 2 minutos por trabajo); papaparse solo entra en el chunk del worker.
- `ToolShell`: opción `paste` (pegar el contenido además de elegir archivos; se oculta al elegir uno) y vista previa de salidas de texto (`preview`) con botón **Copiar** (primeros 100 000 caracteres). Componente `Checkbox`. Helper `runTextTool` (una salida por archivo, error por archivo, estadísticas).
- El pool convierte los errores del worker que son códigos de la API en `ConversionError` (antes llegaban como `Error` genérico) y `trackTool` informa el código real. Código nuevo `invalidData` (5 idiomas).
- Límite propio por herramienta en el registro (`limits.maxFileBytes`, 50 MB para datos): `ToolShell` y la sección "Límites" de la página muestran el menor entre el plan y la herramienta (nuevo texto `limitProBatch` cuando Pro no amplía el tamaño).
- Textos de las dos herramientas (introducción + 3 preguntas) y namespace `DataTools` en los 5 idiomas. En los mensajes ICU, las llaves literales se escriben `'{'…'}'`.
- Fixtures nuevos (en `generate.mjs`): `data.json`, `table-excel.csv` (punto y coma, coma decimal, Windows-1252), `table.tsv`, `corrupt/broken.json`, `corrupt/bad-quotes.csv`.

**Limitaciones conocidas**
- CSV no tiene tipos: con "convertir valores", un texto numérico como `"100000"` vuelve como número (los que tienen ceros a la izquierda no). Una clave ausente vuelve como `null`; una lista vacía no tiene celda propia y no vuelve.
- La coma decimal (`3,25`) se deja como texto: no se adivina la configuración regional.

**Verificación**
- 22 tests unitarios de datos (incluida la ida y vuelta, BOM y Windows-1252). `tests/e2e/data-tools.spec.ts`: 7 casos (archivo anidado, pegar → TSV, JSON roto, CSV de Excel, lote TSV+CSV, ida y vuelta, comillas rotas), validados con lectores propios (`readCsv`, `readJson`). Lint, typecheck, tests (519), build, `check:static` (582 páginas) y `npm run test:e2e` (124/124) pasan. Capturas revisadas: `/es/json-a-csv` 1280 claro y `/zh/csv-to-json` 360 oscuro.

**Siguiente**: 3C.2 (JSON ↔ YAML y JSON ↔ TOML).

## 2026-10-21 02:45 UTC — Fase 3, tarea 3C.2 (JSON ↔ YAML y JSON ↔ TOML)

**Qué se hizo**
- Cuatro herramientas nuevas en **Datos**: JSON a YAML (`/es/json-a-yaml`), YAML a JSON (`/es/yaml-a-json`), JSON a TOML (`/es/json-a-toml`) y TOML a JSON (`/es/toml-a-json`), con slugs en los 5 idiomas, textos propios (introducción + 3 preguntas) y formatos `yaml` y `toml` en `formats.ts`.
- `src/lib/data/yaml.ts` con **`yaml` 2.9.1 (ISC)** en lugar de js-yaml: trae el límite de alias (`maxAliasCount`, 100) que frena el "billion laughs"; además se cuentan los valores al convertir (tope de 2 millones y 200 niveles). Lee YAML 1.2, varios documentos (→ lista), anclas, claves `<<`; rechaza claves repetidas y errores de sintaxis; las etiquetas personalizadas (`!!js/function`) no se ejecutan (quedan como texto); `!!binary` → base64; `__proto__` queda como dato. Al escribir, sin cortar líneas largas y **con comillas en los textos que un lector YAML 1.1 cambiaría** (`yes`, `on`, `0o17`, fechas, `007`).
- `src/lib/data/toml.ts` con **smol-toml 1.9.0 (BSD-3-Clause)**: fechas → texto ISO; enteros > 2^53 se rechazan (el parser no los acepta con pérdida). JSON → TOML omite las claves con `null`; raíz que no es objeto o `null` dentro de una lista → código nuevo `tomlUnsupported` con un mensaje que lo explica (5 idiomas).
- `src/lib/data/json.ts` (helpers compartidos) y `TextConvertTools.tsx`: un componente genérico para conversiones sin opciones (elegir archivos o pegar, descargar o copiar), reutilizable por las próximas herramientas de datos. `DataTools.paste` con el nombre del formato.
- Fixtures: `config.yaml`, `config.toml`, `corrupt/alias-bomb.yaml` (9 niveles × 9 alias), `corrupt/broken.toml`.

**Verificación**
- 15 tests unitarios (ida y vuelta, comillas 1.1/1.2, varios documentos, merge, billion laughs, etiquetas, `__proto__`, binario, claves repetidas, TOML con tablas, nulls, raíz inválida, fechas, enteros grandes). `data-tools.spec.ts`: 15 casos en total (8 nuevos, uno en inglés con texto pegado), validados releyendo la salida con `yaml`/`smol-toml` desde el test.

## 2026-10-21 02:55 UTC — Fase 3, tarea 3C.3 (JSON ↔ XML)

**Qué se hizo**
- Dos herramientas en **Datos**: JSON a XML (`/es/json-a-xml`) y XML a JSON (`/es/xml-a-json`), formato `xml`, con fast-xml-parser 5.11.2 (MIT) en el worker de datos.
- Convención: atributos como claves `@nombre`, texto mixto `#text`, elementos repetidos → lista, CDATA → texto. **Los valores quedan como texto** (XML no tiene tipos; `007` no pierde ceros). Se omiten comentarios, declaración e instrucciones de procesamiento.
- Seguridad: cualquier documento con `<!ENTITY` (también en minúsculas) se rechaza **antes de parsear** con el código nuevo `xmlEntitiesBlocked` (mensaje que explica quitar el DOCTYPE, 5 idiomas): cubre XXE y "billion laughs". Se valida con `XMLValidator` antes de convertir. La librería además rechaza nombres como `<__proto__>` (→ `invalidData`) y no carga nada externo.
- JSON → XML: una sola clave en la raíz = elemento raíz; si no, `<root>` (listas → `<item>`). Las claves se convierten en nombres XML válidos (`bad key` → `bad_key`, `1st` → `_1st`, prefijo `xml` reservado → `_xml…`), sin choques (sufijo `_2`) y con `__proto__` como dato. Escapa `&`, `<`, `>` y comillas.
- En los mensajes ICU de next-intl, `<…>` se interpreta como etiqueta: los ejemplos de código se escriben entre comillas simples completas (`'<root>'`, `'{"a": 1}'`); dos segmentos citados pegados (`'…''…'`) producen un apóstrofo literal, hay que citar el ejemplo entero de una vez.
- Fixtures: `catalog.xml`, `corrupt/xxe.xml` (entidad externa a `/etc/passwd`), `corrupt/broken.xml`.

**Verificación**
- 8 tests unitarios (atributos, listas, CDATA, referencias, XXE, billion laughs, XML roto, `__proto__`, nombres inválidos, ida y vuelta). `data-tools.spec.ts`: 19 casos; la salida XML se valida con el `DOMParser` del navegador (independiente de la librería). Lint, typecheck, tests (548), build, `check:static` (612 páginas) y `npm run test:e2e` (136/136) pasan.

**Siguiente**: 3C.4 (formateador y validador de JSON, XML y YAML).

## 2026-10-21 03:10 UTC — Fase 3, tarea 3C.4 (formateador y validador de JSON, XML y YAML)

**Qué se hizo**
- Tres herramientas en la categoría **Desarrolladores** (que ahora se publica: `/es/herramientas-para-desarrolladores`): Formatear y validar JSON (`/es/formatear-json`, `/en/json-formatter`), XML (`/es/formatear-xml`) y YAML (`/es/formatear-yaml`).
- `src/lib/data/format.ts`: devuelve un resultado en vez de lanzar, con **línea y columna** del primer error. JSON: sangría 2/4/tab o minificado, ordenar claves (recursivo, `__proto__` como dato); la posición sale de un escáner propio (`jsonErrorOffset`) porque cada navegador redacta distinto (y a veces sin posición) el error de `JSON.parse`. XML: buena formación con `XMLValidator` (línea/columna), sangría o minificado con `preserveOrder`, conservando comentarios, CDATA, atributos y referencias tal cual; entidades DTD rechazadas (`xmlEntitiesBlocked`); se omite el DOCTYPE. YAML: sangría 2/4 (YAML no admite tabs ni tiene sentido "minificarlo"), conserva comentarios, anclas y todos los documentos; claves repetidas → error con posición (`prettyErrors: true` hace falta para tener `linePos`).
- `ToolShell`: los errores pueden llevar `position` (`ShellOutput` y estado de error; se conserva si falla una sola entrada) y se muestran como "… (línea 4, columna 1)" (`ToolUi.errorAt`, 5 idiomas). `TextPositionError` en `convert-error.ts`; `formatText` en el cliente del worker la arma desde el resultado.
- Problema encontrado por el test de navegador y corregido: el constructor XML partía la línea después de un CDATA, lo que agregaba espacios al texto del elemento; ahora el cierre queda pegado (`]]></note>`).

**Verificación**
- 21 tests unitarios de formato (offsets de error JSON, posiciones, sangrías, minificado, orden, XML con comentarios/CDATA, entidades, YAML con comentarios/anclas/varios documentos, claves repetidas) + 2 del estado del shell. `data-tools.spec.ts`: 25 casos (6 nuevos; la salida XML se compara con el `DOMParser` del navegador contra el fixture original). Lint, typecheck, tests (574), build, `check:static` (632 páginas) y `npm run test:e2e` (142/142) pasan.

**Siguiente**: 3C.5 (Base64 de texto y archivos + codificar/decodificar URL).

## 2026-10-21 03:25 UTC — Fase 3, tarea 3C.5 (Base64 y codificar/decodificar URL)

**Qué se hizo**
- Tres herramientas en **Desarrolladores**: Codificar a Base64 (`/es/codificar-base64`), Decodificar Base64 (`/es/decodificar-base64`) y Codificar y decodificar URL (`/es/codificar-url`). Formatos nuevos `base64` y `bin` (cualquier archivo como bytes).
- `src/lib/data/base64.ts`: codificación por bloques de 3 × 32 KB (no desborda la pila con archivos grandes y los bloques se concatenan bien), saltos cada 76 caracteres opcionales, data URL con el tipo del archivo; decodificación de Base64 puro o data URL, con saltos de línea, alfabeto seguro para URL y sin relleno; rechaza caracteres ajenos o longitudes imposibles (`invalidData`). `asReadableText` decide si el resultado se muestra como texto. URL: `encodeURIComponent` (valor) o `encodeURI` (URL completa), decodificación con `+` como espacio opcional; `%` mal formado o sustitutos sueltos → `invalidData`.
- Decodificar elige la extensión por el tipo de la data URL, luego por el contenido (`detectFormat`: PNG, JPG, PDF…), luego `.txt` si es texto legible, si no `.bin`; `foto.png.txt` vuelve a `foto.png`. Codificar nombra la salida `<archivo original>.txt`. `runTextTool` acepta `outputName`.
- Base64 corre en el worker de datos (archivos de hasta 50 MB); URL en el hilo principal (es inmediato).

**Verificación**
- 7 tests unitarios (comparación con el Base64 de Node en tamaños que cruzan los bloques, hasta 300 KB aleatorios, ida y vuelta byte a byte, saltos, data URL, alfabeto URL, inválidos, texto legible, URL). `data-tools.spec.ts`: 32 casos (7 nuevos: PNG → Base64 igual al de Node y data URL, texto UTF-8, data URL → PNG idéntico, Base64 de un PDF reconocido por contenido, texto con vista previa, inválido, URL en sus modos y `%` roto). Lint, typecheck, tests (584), build, `check:static` (647 páginas) y `npm run test:e2e` (149/149) pasan.

**Siguiente**: 3C.6 (hashes MD5/SHA de texto y archivos).

## 2026-10-21 06:25 UTC — Fase 3, tarea 3C.6 (hashes MD5/SHA)

**Qué se hizo**
- Herramienta **Generador de hash MD5 y SHA** en Desarrolladores (`/es/generador-hash`, `/en/hash-generator`, `/pt/gerador-de-hash`, `/fr/generateur-hash`): MD5, SHA-1, SHA-256 y SHA-512 de texto pegado (UTF-8) o de archivos, en el worker de datos con **hash-wasm 4.12.0 (MIT, WASM incrustado)**. Los archivos se leen en bloques de 4 MB con progreso, así que el único límite es el del plan (200 MB gratis / 1 GB Pro) y 10 minutos por trabajo.
- Salida: un solo `checksums.txt` con todos los archivos en formato BSD (`SHA256 (foto.jpg) = …`), que `sha256sum -c` lee; opción de hexadecimal en mayúsculas.
- "Hash esperado" opcional: se reconoce el algoritmo por la longitud, sin distinguir mayúsculas ni espacios, y se muestra "Coincide"/"No coincide"/"No se pudo comparar". Para eso `ShellOutput` admite `message: { ok, text }`, que `ToolShell` muestra en verde o rojo sobre la vista previa.
- Textos (introducción + 3 preguntas y opciones) en los 5 idiomas.

**Verificación**
- 5 tests unitarios: vectores publicados ("" y "abc" en los 4 algoritmos), UTF-8, archivo aleatorio de 8 MB leído por bloques comparado con `crypto` de Node y progreso, líneas BSD y comparación con el esperado. `data-tools.spec.ts`: 3 casos nuevos (dos archivos comparados con Node + coincidencia; solo SHA-256 validado con **`sha256sum -c` del sistema**; texto en mayúsculas en inglés + aviso de no coincidencia). Lint, typecheck, tests (590), build, `check:static` (652 páginas) y `npm run test:e2e` (152/152) pasan. Capturas revisadas: `/es/generador-hash` 1280 claro y `/zh/hash-generator` 360 oscuro.

**Siguiente**: 3C.7 (UUID y conversor de timestamps).

## 2026-10-21 06:45 UTC — Fase 3, tarea 3C.7 (UUID y conversor de timestamps)

**Qué se hizo**
- **Generador de UUID** (`/es/generador-uuid`, `/en/uuid-generator`…): v4 aleatorio y **v7** ordenado por tiempo (RFC 9562, contador de 12 bits en `rand_a` para que los generados en el mismo milisegundo queden en orden; si el contador se desborda, avanza un milisegundo), hasta 10 000 por vez, mayúsculas y con/sin guiones, con `crypto.getRandomValues`. Salida `uuid.txt`/`uuids.txt` con vista previa.
- **Conversor de timestamp Unix** (`/es/convertir-timestamp`, `/en/timestamp-converter`, `/pt/conversor-de-timestamp`, `/fr/convertisseur-timestamp`): una línea por valor; números en s/ms/µs/ns detectados por la cantidad de dígitos (≤ 11 s, ≤ 14 ms, ≤ 17 µs, si no ns; BigInt para no perder precisión) o unidad elegida; fechas ISO 8601 (con o sin zona; sin zona se leen en la zona elegida) y RFC 2822. Fechas imposibles (29/2 en año no bisiesto, mes 13) se rechazan. Salida `timestamps.csv` con segundos, milisegundos, ISO UTC, hora en la zona elegida y su desplazamiento; una línea inválida → error con línea y columna. Zonas horarias de `Intl` (horario de verano incluido; una hora repetida al atrasar el reloj toma la primera).
- `ToolShell` admite `input: { kind: "none" }` (generadores sin entrada) y el registro `limits.files: "none"` para herramientas de texto u opciones: la sección "Límites" ya no muestra límites de archivos que no aplican (también corrige "Codificar URL"). El test del registro admite herramientas sin formato de entrada solo si están en la lista de generadores.
- "Más de 1 minutos": `ToolPage.limitTime` ahora usa plural ICU en es/en/pt/fr.

**Limitaciones**
- Chromium lista las zonas con los nombres antiguos de ICU (`America/Buenos_Aires`, `Asia/Calcutta`); funcionan igual, pero el selector las muestra así.

**Verificación**
- 8 tests unitarios (v4/v7, orden y unicidad de 5000 v7, desborde del contador, formatos; unidades, ISO/RFC 2822, zonas con y sin horario de verano, años 0–99, fechas imposibles, CSV y error con posición). `data-tools.spec.ts`: 4 casos nuevos (500 v7 válidos, únicos, ordenados y con la hora actual; v4 en mayúsculas sin guiones; timestamps → CSV en `America/Sao_Paulo`; línea inválida con posición). Lint, typecheck, tests (600), build, `check:static` (662 páginas) y `npm run test:e2e` (156/156) pasan. Capturas revisadas: `/es/generador-uuid` 360 oscuro y `/pt/conversor-de-timestamp` 1280 claro.

**Nota de entorno**: un `next start` viejo que sigue corriendo mientras se reconstruye `.next` puede guardar 404 en `.next/server/route-cache` y servirlos después; solo pasa en local (en Railway cada deploy es una imagen nueva). Solución: matar el servidor antes del build o borrar esa carpeta.

**Siguiente**: 3C.8 (QR: generar y leer).

## 2026-10-21 07:05 UTC — Fase 3, tarea 3C.8 (códigos QR: generar y leer)

**Qué se hizo**
- Categoría **Utilidades** publicada (`/es/utilidades`) con dos herramientas:
  - **Generador de códigos QR** (`/es/generador-codigo-qr`, `/en/qr-code-generator`, `/pt/gerador-de-qr-code`, `/fr/generateur-qr-code`): texto/enlace, **Wi-Fi** (formato `WIFI:T:…;S:…;P:…;H:…;;` con escape de `\ ; , : "`) y **contacto** (vCard 3.0 con escape RFC 2426, solo campos completos); PNG (256–2048 px, módulos enteros, zona de silencio de 4) o SVG (un solo `path`); corrección L/M/Q/H; colores y fondo transparente con aviso si el contraste es < 3:1; texto demasiado largo → código nuevo `qrTooLong`. Matriz con **qrcode 1.5.4 (MIT)**; el SVG y los píxeles los arma `src/lib/qr/qr.ts` (el texto del usuario nunca entra en el SVG).
  - **Leer código QR desde una imagen** (`/es/leer-codigo-qr`…): PNG, JPG, WEBP, GIF, BMP y AVIF (hasta 25 MB), en un worker propio (`qr.worker.ts`) con **jsQR 1.4.0 (Apache-2.0)**: prueba a 1000, 2000 y 3200 px de lado y códigos invertidos; sin código → `qrNotFound`; imagen dañada → `fileDamaged`. No abre enlaces, solo muestra el texto.
- `ToolShell`: `input: { kind: "none", ready }` (el botón se habilita cuando hay contenido; las opciones se muestran siempre) y **vista previa de imagen** cuando el resultado es una sola imagen.
- Fixtures nuevos (en `generate.mjs`): `qr.png`, `qr-photo.jpg` (girado 12°, luz despareja, ruido, desenfoque, JPEG 70 %) y `qr-inverted.png` (claro sobre oscuro, UTF-8). Al regenerar, LibreOffice vuelve a sellar los archivos de oficina: se descartaron esos cambios.

**Verificación**
- 6 tests unitarios (ida y vuelta generador → jsQR en los 4 niveles, UTF-8, 1500 caracteres, capacidad excedida, Wi-Fi con escapes, vCard, SVG y píxeles, contraste). `tests/e2e/qr-tools.spec.ts` (5 casos): PNG de 512 px, SVG de Wi-Fi rasterizado con sharp y vCard **decodificados en el test con sharp + jsQR**; aviso de bajo contraste; foto ruidosa; lote con código invertido, imagen sin código y PNG truncado (cada uno con su resultado). Lint, typecheck, tests (608), build, `check:static` (677 páginas) y `npm run test:e2e` (161/161) pasan. Capturas revisadas: `/es/generador-codigo-qr` 1280 claro y `/zh/qr-code-generator` 360 oscuro con el resultado.

**Siguiente**: 3C.9 (generador de contraseñas y contador de palabras).

## 2026-10-21 07:20 UTC — Fase 3, tarea 3C.9 (contraseñas y contador de palabras)

**Qué se hizo**
- **Generador de contraseñas** (`/es/generador-de-contrasenas`, `/en/password-generator`, `/pt/gerador-de-senhas`, `/fr/generateur-mot-de-passe`): longitud 8–128 (la librería acepta 4–128), hasta 100 por vez, mayúsculas/minúsculas/números/símbolos y opción de evitar caracteres ambiguos (`I l 1 O 0 o | \` ' "`). **Sin sesgo**: cada carácter sale de `crypto.getRandomValues` con muestreo por rechazo (`randomBelow`), y una contraseña a la que le falta un tipo elegido se vuelve a sortear entera (uniforme entre las válidas). Muestra la entropía (longitud × log2 del alfabeto): "Fuerte" desde 80 bits; sin tipos elegidos el botón se deshabilita.
- **Contador de palabras y caracteres** (`/es/contador-de-palabras`, `/en/word-counter`, `/pt/contador-de-palavras`, `/fr/compteur-de-mots`): componente propio en vivo (no `ToolShell`): palabras, caracteres como se ven (grafemas: un emoji con tono de piel = 1), sin espacios, oraciones, párrafos, líneas y tiempo de lectura (200 palabras/min), todo con `Intl.Segmenter` del idioma de la página (en chino separa palabras sin espacios). Cambia a MAYÚSCULAS, minúsculas, Tipo Título y Tipo oración según el idioma (`ß` → `SS`); abrir archivo de texto (detección de Windows-1252), copiar y descargar `.txt`. Informa el uso una vez por visita (2 s después de haber texto). Límite de 2 millones de caracteres.
- Detalle encontrado en los tests: el segmentador de oraciones de ICU no corta antes de una minúscula, así que "Tipo oración" busca los cortes en el texto original y después pasa cada oración a minúsculas.

**Verificación**
- 8 tests unitarios (sesgo del muestreo, uniformidad sobre 10 000 caracteres, tipos garantizados, ambiguos, límites, entropía; conteos con emoji y acentos, chino, mayúsculas por idioma y tipo oración con `¿` y `«`). `tests/e2e/text-tools.spec.ts` (5 casos): 50 contraseñas únicas con los 4 tipos, solo dígitos sin ambiguos (`[2-9]{20}`) con aviso "Weak", botón deshabilitado sin tipos; conteos en vivo, mayúsculas/oración y descarga; archivo `text.txt` y chino. Lint, typecheck, tests (618), build, `check:static` (687 páginas) y `npm run test:e2e` (166/166) pasan. Capturas revisadas: `/es/contador-de-palabras` 360 oscuro y `/fr/generateur-mot-de-passe` 1280 claro.

**Siguiente**: 3C.10 (colores y unidades).

## 2026-10-21 07:45 UTC — Fase 3, tarea 3C.10 (colores y unidades) + Lighthouse

**Qué se hizo**
- **Conversor de colores** (`/es/conversor-de-colores`, `/en/color-converter`, `/pt/conversor-de-cores`, `/fr/convertisseur-couleurs`): lee HEX (3/4/6/8 dígitos), `rgb()`/`rgba()` (comas o espacios, porcentajes, `/ alfa`), `hsl()`/`hsla()` (unidades de tono deg/turn/rad/grad), `oklch()` y los 148 nombres CSS; muestra HEX, RGB, HSL y OKLCH (sintaxis moderna) con botón de copiar, selector de color nativo sincronizado y muestra. **Contraste WCAG 2** contra un fondo elegible (el color translúcido se mezcla con el fondo), tabla AA/AAA para texto normal y grande, y contraste con blanco y negro. Matemática propia (`src/lib/color/`), sin dependencias; OKLCH fuera de gama sRGB se recorta por canal.
- **Conversor de unidades** (`/es/conversor-de-unidades`…): longitud, peso, temperatura, volumen (medidas de EE. UU. + galón imperial), superficie, velocidad, datos (SI y binarios KiB…TiB) y tiempo, con **definiciones exactas**; valor con coma o punto decimal (`parseDecimal`: "1.234,5", "1,234.5", grupos de miles válidos), intercambiar unidades y tabla con el valor en todas las unidades (10 cifras significativas, notación científica fuera de 1e-6…1e15). Nombres de unidades en los 5 idiomas.
- Ambas son componentes en vivo (sin `ToolShell`) e informan el uso una vez por visita.
- Corregido tras revisar capturas: a 360 px los valores HSL/OKLCH se cortaban (ahora se parten por espacios) y la insignia "No cumple" se partía en dos líneas.
- **Lighthouse después de 3C.10** (`docs/perf/2026-10-21-3C10.md`): rendimiento 96–99, accesibilidad 100, CLS 0 en 11 páginas (se agregaron una herramienta de datos y una de utilidades al script). SEO 92 solo por medir en el puerto 3101 con un build cuyo canonical apunta a `localhost:3000` (artefacto de la medición; en 3B era 100 en el puerto 3000).

**Verificación**
- 9 tests unitarios (notaciones equivalentes, alfa, valores de referencia OKLCH de CSS Color 4, rechazos, contraste 4,54:1 de #767676; definiciones exactas, temperaturas, ida y vuelta entre todas las unidades, lectura de números). `tests/e2e/utility-tools.spec.ts` (4 casos). Lint, typecheck, tests (629), build, `check:static` (697 páginas) y `npm run test:e2e` (170/170) pasan. Capturas revisadas: `/es/conversor-de-colores` 360 oscuro y `/pt/conversor-de-unidades` 1280 claro.

## 2026-10-21 07:50 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas en esta ejecución: 3C.6 (hashes), 3C.7 (UUID y timestamps), 3C.8 (QR), 3C.9 (contraseñas y contador), 3C.10 (colores y unidades) + medición Lighthouse.
- La ejecución anterior (candado de las 03:08) se cortó sin subir nada: el candado quedó vencido y se retomó.
- Aviso para el dueño: `npm audit` informa vulnerabilidades ya existentes (no agregadas en esta ejecución), entre ellas **nodemailer ≤ 10.0.5** (alta: DoS en el parser de direcciones y una validación de dominio evitable). Actualizar a nodemailer 10.x es un salto de versión mayor; queda anotado para revisarlo.

**Siguiente**: 3C.11 ("Comprimir imagen" con página propia y "comprimir a un peso objetivo").

## 2026-10-21 08:45 UTC — Fase 3, tarea 3C.11 (comprimir imagen y peso objetivo)

**Qué se hizo**
- Herramienta **Comprimir imagen** en la categoría Imágenes (`/es/comprimir-imagen`, `/en/compress-image`, `/pt/comprimir-imagem`, `/fr/compresser-image`): JPG, PNG, WEBP y AVIF, en lotes, hasta 50 MB por archivo y 5 minutos por trabajo.
  - **Por nivel** (baja/recomendada/fuerte = calidad 82/68/50 en JPG/WEBP/AVIF). PNG: nivel bajo **sin pérdida** (re-codificado + oxipng nivel 3), recomendada/fuerte = **paleta** de 256/64 colores (cuantizador de gifenc + escritor de PNG indexado propio `src/lib/image/png-indexed.ts` con tRNS, luego oxipng). Si el resultado no es más chico que el original (mismo formato), se devuelve **el original sin cambios** con el aviso "ya estaba optimizada".
  - **A un peso exacto** (botones 50 KB, 100 KB, 200 KB, 500 KB, 1 MB y "Otro" en KB, mínimo 10 KB): búsqueda binaria de la mejor calidad que entra (`fitToTarget` en `src/lib/image/compress.ts`, ~8 codificaciones); si ni con calidad 40 entra, achica la imagen (raíz del cociente de pesos) y vuelve a buscar; solo en el tamaño mínimo (160 px de lado) baja la calidad hasta 5. Si no se puede → código nuevo `targetTooSmall`. Los PNG se guardan como JPG en este modo (aviso en la interfaz; WEBP para conservar transparencia).
  - Formato de salida: igual al original, JPG, PNG (solo por nivel), WEBP o AVIF.
  - "Antes/después": cada resultado muestra "172,7 kB → 13,5 kB (92 % menos)" y, si se achicó, las dimensiones nuevas; vista previa cuando es un solo archivo. Los metadatos (EXIF/GPS) se pierden al re-codificar (dicho en el texto de la página).
- Worker nuevo `src/workers/image-tools.worker.ts` sobre el pool de `@/lib/jobs` (cancelación y tiempo máximo), que reutiliza los códecs del conversor; servirá también para 3C.12–3C.16. La decodificación se movió a `src/lib/image/decode.ts` (compartida con `image.worker.ts`). Los JPEG/PNG truncados se rechazan con `fileDamaged` (mismo chequeo de integridad que el conversor).
- Textos (introducción + 4 preguntas, namespace `ImageTools`, error `targetTooSmall`) en los 5 idiomas.
- Fixtures nuevos generados por script: `photo.jpg` (1000×750, JPEG 95 %, 177 KB), `photo-alpha.png` (360×270 con transparencia, 158 KB) y `noise.jpg` (grano fuerte, 93 KB: para llegar a 12 KB hay que achicarla).

**Decisiones**
- Los presets usan KB decimales (100 KB = 100 000 bytes): entran en un límite de "100 KB" lo lea el formulario como 1000 o 1024 bytes.
- `@jsquash/oxipng` 2.3.0 (Apache-2.0): se importa directo `codec/pkg/squoosh_oxipng.js` (un hilo). El módulo principal también referencia el build multihilo (wasm-bindgen-rayon), que genera un chunk circular en webpack (mismo problema que el AVIF multihilo en la fase 1) y solo se usaría con COOP/COEP.
- Sin libimagequant (GPL-3): la paleta usa gifenc (MIT). En fotos con degradados suaves la paleta puede mostrar bandas; por eso el nivel bajo de PNG es sin pérdida.

**Verificación**
- Unit: 6 tests de `fitToTarget` con codificador simulado (mejor calidad, tope 92, achicado, calidad < 40 solo en el mínimo, imposible → null, pasos) + helpers; 4 tests del PNG indexado (sharp lo lee píxel por píxel con alfa, errores, ≤ 64 colores y más chico que el RGBA, transparencia).
- `tests/e2e/image-tools.spec.ts` (6 casos, salida validada con sharp): JPG recomendada < 50 % y 1000×750; 50 KB → ≤ 50 000 bytes y > 30 000 (no aplastada); 12 KB con `noise.jpg` → achicada con proporción 4:3 y aviso con las dimensiones reales; PNG paleta (`isPalette`, alfa 0 en la esquina y 255 en el centro, < 60 % del original) y PNG sin pérdida (píxeles visibles idénticos); JPG → AVIF y PNG transparente → AVIF con alfa, JPG → WEBP; un JPG ya comprimido vuelve **byte a byte igual** y un JPG truncado falla solo con "dañado".
- Lint, typecheck, tests (643), build (sin avisos), `check:static` (702 páginas) y `npm run test:e2e` (176/176) pasan. Capturas revisadas: `/es/comprimir-imagen` 1280 claro con resultado y `/zh/compress-image` 360 oscuro en modo peso exacto.

**Siguiente**: 3C.12 ("Redimensionar imagen").

## 2026-10-21 09:15 UTC — Fase 3, tarea 3C.12 (redimensionar imagen)

**Qué se hizo**
- Herramienta **Redimensionar imagen** (`/es/redimensionar-imagen`, `/en/resize-image`, `/pt/redimensionar-imagem`, `/fr/redimensionner-image`): JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF y HEIC, en lotes, hasta 50 MB por archivo.
  - **En píxeles**: ancho y/o alto; con "Mantener proporciones" no agranda salvo que se marque "Permitir agrandar"; sin proporciones estira al tamaño exacto.
  - **En porcentaje** (1–400 %).
  - **Redes sociales**: 10 medidas (`socialPresets` en `src/lib/image/resize-plan.ts`: Instagram cuadrada/vertical, historia 1080×1920, publicación y portada de Facebook, publicación y encabezado de X, miniatura de YouTube, banner de LinkedIn, foto de perfil) con **recortar los bordes** (centro) o **agregar bordes** (blancos en JPG/BMP, transparentes en PNG/WEBP/AVIF).
  - Formato de salida: igual al original (HEIC → JPG, porque no hay codificador HEIC), JPG, PNG, WEBP o AVIF (calidad 82). Mensaje por archivo "foto.jpg: 1000 × 750 → 400 × 300 px".
- Geometría pura en `planResize` (tamaño, rectángulo de origen y destino, bordes); el dibujo lo hace el handler `resize` del worker `image-tools.worker.ts` con `OffscreenCanvas` (`imageSmoothingQuality: "high"`).
- **Límite de memoria**: el resultado se limita a ~36 MP (`MAX_OUTPUT_PIXELS`, ~144 MB de píxeles) manteniendo la forma, además del tope de 16 384 px por lado; la página lo explica en las preguntas frecuentes. GIF animado: solo el primer cuadro (dicho en la página).
- Textos (introducción + 4 preguntas, nombres de las medidas) en los 5 idiomas. A 360 px el nombre largo de una medida cortaba las dimensiones dentro del `<select>`: las dimensiones se muestran debajo.

**Verificación**
- 7 tests unitarios de `planResize` (porcentaje y rango, un lado con proporción, agrandar solo si se pide, estirar, lados inválidos, tope de píxeles con la forma, recorte centrado, bordes centrados y agrandado al cuadro, presets únicos).
- `image-tools.spec.ts`: 4 casos nuevos validados con sharp: 400 px de ancho → 400×300 y mensaje; 50 % en lote (JPG 500×375, TIFF sigue TIFF 80×60, HEIC → JPG a la mitad, PNG truncado falla solo); Instagram cuadrada 1080×1080 con el sol del paisaje dentro del recorte; historia con bordes en PNG (arriba transparente, centro opaco); estirar a 300×300 en WEBP con alfa.
- Lint, typecheck, tests (651), build, `check:static` (707 páginas) y `npm run test:e2e` (180/180) pasan. Capturas revisadas: `/es/redimensionar-imagen` 360 oscuro (redes sociales) y `/fr/redimensionner-image` 1280 claro.

**Siguiente**: 3C.13 (rotar/voltear y quitar metadatos EXIF/GPS).

## 2026-10-21 09:50 UTC — Fase 3, tarea 3C.13 (rotar/voltear y quitar metadatos EXIF)

**Qué se hizo**
- **Rotar imagen** (`/es/rotar-imagen`, `/en/rotate-image`, `/pt/girar-imagem`, `/fr/pivoter-image`): 90° derecha/izquierda, 180° o "Solo enderezar", más volteo horizontal y vertical (primero gira, después voltea). La orientación EXIF se aplica antes (decodificador del navegador), así que el resultado queda como se ve y sin etiqueta de orientación. JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF y HEIC (→ JPG); los formatos con pérdida se vuelven a guardar con calidad 92. Handler `transform` del worker de herramientas de imagen.
- **Quitar metadatos EXIF** (`/es/quitar-metadatos-exif`, `/en/remove-exif-metadata`, `/pt/remover-metadados-exif`, `/fr/supprimer-metadonnees-exif`): borrado **sin pérdida** propio (`src/lib/image/metadata.ts`):
  - JPG: conserva tablas/frame/scans, JFIF, perfil ICC y el segmento Adobe; quita EXIF, XMP, IPTC/APPn, comentarios y **todo lo que viene después del EOI** (los celulares agregan ahí imágenes extra con su propio EXIF). Si la foto tenía orientación ≠ 1, escribe un **EXIF mínimo solo con la orientación** (en vez de re-codificar para aplicarla): la foto se sigue viendo derecha y los píxeles son idénticos.
  - PNG: quita `tEXt`, `zTXt`, `iTXt`, `eXIf` y `tIME`; conserva color (iCCP, sRGB, gAMA…), pHYs y animación.
  - WEBP: quita los chunks `EXIF` y `XMP `, limpia los bits del VP8X y recalcula el tamaño RIFF.
  - HEIC: no hay escritor HEIC, se guarda como JPG (calidad 92) sin metadatos, avisado en el resultado.
  - Antes de borrar se muestra qué tenía cada foto con **exifr 7.1.3 (MIT)**: ubicación GPS, cámara, fecha, programa y autor ("se quitó ubicación GPS (-34.60000, -58.36667) · cámara … · fecha 1 de mayo de 2024 …"); para WEBP se le pasa el bloque EXIF (TIFF) porque exifr no lee WEBP. Archivos dañados → `fileDamaged`.
- Textos (introducción + 4 preguntas cada una) en los 5 idiomas. Fixtures nuevos: `exif-gps.jpg` (de costado con orientación 6), `exif-gps.png` y `exif-gps.webp` con metadatos inventados.

**Verificación**
- 9 tests unitarios de `metadata.ts` (JPG con comentario y una imagen agregada tras el EOI: sin GPS/cámara/fecha, orientación 6 conservada, mismos píxeles; JPG derecho sin bloque EXIF; truncados rechazados; PNG; WEBP con tamaño RIFF y flags; resumen y marca no repetida).
- `image-tools.spec.ts`: 5 casos nuevos (rotación 90° y espejo comprobados por la esquina transparente; JPG de costado enderezado a 240×320 sin orientación ni GPS + JPG truncado; JPG limpio con el mensaje completo, orientación 6 y píxeles idénticos; PNG y WEBP sin EXIF con píxeles idénticos, WEBP sin metadatos → "had no metadata", PNG truncado; HEIC → JPG sin metadatos).
- Lint, typecheck, tests (662), build sin avisos, `check:static` (717 páginas) y `npm run test:e2e` (185/185) pasan. En una corrida completa de Vitest fallaron por tiempo `indexes.test.ts` y un test de `document/route.test.ts` (MongoDB en memoria con la máquina cargada); repetidos, pasan todos (662/662). Capturas revisadas: `/es/quitar-metadatos-exif` 360 oscuro y `/fr/pivoter-image` 1280 claro.

**Siguiente**: 3C.14 (recortar imagen con proporciones fijas, accesible con teclado).

## 2026-10-21 12:12 UTC — Fin de la ejecución (otra ejecución tomó el candado)

- Hechas en esta ejecución: 3C.11 (comprimir imagen y peso objetivo), 3C.12 (redimensionar imagen) y 3C.13 (rotar/voltear y quitar metadatos EXIF).
- Esta sesión se demoró entre 3C.12 y 3C.13: la hora del candado (08:37) quedó con más de 3 horas y otra ejecución lo tomó a las 12:03. 3C.13 ya estaba terminada y verificada, así que se subió encima del candado de la otra ejecución **sin tocarlo** (sigue siendo suyo) y esta ejecución se detuvo. Si la otra ejecución empezó también 3C.13, al hacer pull verá la tarea marcada.

## 2026-10-21 13:20 UTC — Fase 3, tarea 3C.14 (recortar imagen)

**Contexto**: esta ejecución tomó el candado a las 12:03 (el de las 08:37 tenía más de 3 horas). La ejecución anterior seguía viva y subió su 3C.13 a las 12:11; esta ejecución había hecho la misma tarea en paralelo y **descartó su versión sin subirla** (la subida era equivalente) y siguió con 3C.14.

**Qué se hizo**
- **Recortar imagen** (`/es/recortar-imagen`, `/en/crop-image`, `/pt/cortar-imagem`, `/fr/recadrer-image`): una imagen por vez (JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC; hasta 50 MB), proporción libre, original, 1:1, 4:3, 3:4, 16:9, 9:16, 3:2 o 4:5; salida igual al original (HEIC → JPG), JPG, PNG, WEBP o AVIF.
  - **Vista previa desde el worker** (handler `preview`): la imagen se decodifica con el mismo decodificador que el recorte (orientación EXIF aplicada, HEIC y TIFF incluidos, que `<img>` no muestra) y se envía una copia JPEG de hasta 1600 px más el tamaño real; las coordenadas siempre están en píxeles de la imagen original.
  - **Editor** (`CropEditor.tsx`): arrastrar el recuadro o sus 4 esquinas (pointer events con captura, funciona con el dedo), guías de tercios, sombreado exterior con 4 franjas (las esquinas nunca quedan cortadas). **Teclado**: el recuadro es enfocable (`role="group"` con etiqueta que dice tamaño y posición); flechas = mover 1 % de la imagen, Mayús + flechas = cambiar el tamaño desde la esquina inferior derecha; campos X, Y, ancho y alto en píxeles que se aplican con Enter o al salir (así escribir "120" no se corta en "1").
  - Geometría pura en `src/lib/image/crop-rect.ts` (`fitAspect`, `moveRect`, `resizeCorner`, `setField`, `isValidCrop`): enteros, dentro de la imagen, mínimo 8 px, proporción respetada; si un tamaño escrito no entra desde la posición actual, el recuadro se corre.
  - Handler `crop`: valida el rectángulo (`invalidRequest` si no es válido) y **copia las filas de píxeles** (sin re-muestrear); JPG/WEBP/AVIF con calidad 92.
- `ToolShell`: nuevas props `onFilesChange` (la herramienta se entera del archivo elegido para editarlo antes de ejecutar) e `input.ready` (botón deshabilitado mientras se prepara la vista previa o si el archivo está dañado); la tarjeta de opciones se muestra apenas hay un archivo.
- Textos (introducción + 4 preguntas, etiquetas y ayuda de teclado) en los 5 idiomas.

**Verificación**
- 9 tests unitarios de `crop-rect.ts` (encaje centrado, bordes, esquina opuesta fija, proporción y límites, mínimo, campos, validación).
- `image-tools.spec.ts`: 3 casos nuevos (1:1 → 750×750 con el sol en la posición esperada y mensaje; teclado + campos exactos → PNG 300×220 comparado con `sharp().extract()` del original, diferencia media < 2; JPG con orientación 6 recortado como se ve a 9:16 = 180×320, HEIC 120×80 → 80×80 JPG, PNG truncado → error y botón deshabilitado).
- Lint, typecheck, tests (672), build, `check:static` (722 páginas) y `npm run test:e2e` (188/188) pasan. Capturas revisadas: `/es/recortar-imagen` 360 oscuro (antes y después de cambiar el sombreado: las esquinas se cortaban con `overflow-hidden`) y `/fr/recadrer-image` 1280 claro.

**Siguiente**: 3C.15 (marca de agua y agregar texto a una imagen).

## 2026-10-21 14:05 UTC — Fase 3, tarea 3C.15 (marca de agua y agregar texto)

**Qué se hizo**
- **Marca de agua en imágenes** (`/es/marca-de-agua-imagen`, `/en/watermark-image`, `/pt/marca-dagua-imagem`, `/fr/filigrane-image`): texto o **logo** (PNG/JPG/WEBP de hasta 10 MB, transparencia respetada), en lotes; tamaño (texto: 3/5/8 % del lado corto; logo: 10/20/30/50 % del ancho), color, opacidad 10–100 %, posición en una cuadrícula de 9 lugares o **mosaico** inclinado −30° que cubre toda la imagen (filas desfasadas como ladrillos).
- **Agregar texto a una imagen** (`/es/agregar-texto-a-imagen`, `/en/add-text-to-image`, `/pt/adicionar-texto-na-imagem`, `/fr/ajouter-texte-image`): varias líneas (hasta 500 caracteres), tipo de letra (sin serifa / con serifa / monoespaciada, fuentes del sistema), negrita, tamaño, color, **contorno** de color opuesto y **recuadro** semitransparente detrás, 9 posiciones; el mismo texto se puede aplicar a varias imágenes.
- Las dos comparten `OverlayImageTool.tsx` (variante por herramienta) y `src/lib/image/overlay.ts`: `overlayPlacements` (geometría pura: márgenes del 3 % del lado corto, mosaico con paso mínimo del 5 % de la imagen para que un elemento diminuto no genere millones de copias) y `drawOverlay`, que dibuja igual sobre un `CanvasRenderingContext2D` (vista previa en vivo en la página, desde la imagen que devuelve el handler `preview` del worker) y sobre un `OffscreenCanvas` (handler `overlay` del worker, resultado a tamaño completo). Los tamaños son relativos, así que la vista previa reducida coincide con el resultado.
- Formato de salida igual al original (HEIC → JPG), JPG, PNG, WEBP o AVIF; JPG/WEBP/AVIF con calidad 92. El botón queda deshabilitado sin texto o sin logo válido.
- Selector de posición accesible: 9 radios (con nombre para lectores de pantalla) en una grilla 3 × 3, más "Mosaico". Textos (introducción + 4 preguntas cada una) en los 5 idiomas.

**Limitaciones**
- Sin fuentes web en el worker: se usan las del sistema, así que el texto puede verse levemente distinto entre dispositivos (los acentos, emojis y chino se dibujan con las fuentes del dispositivo).
- SVG no se acepta como logo (en un worker `createImageBitmap` no decodifica SVG); se puede convertir antes con SVG → PNG.

**Verificación**
- 3 tests unitarios de `overlayPlacements` (9 posiciones con margen, mosaico que cubre esquinas y centro sin colocar copias lejos, tope de copias).
- `image-tools.spec.ts`: 4 casos nuevos, salida PNG comparada con el original por regiones con sharp: texto abajo a la derecha (los otros 3 cuadrantes idénticos, la esquina cambiada) con vista previa; **logo = el QR de los fixtures centrado al 50 % y leído de vuelta con jsQR** desde la salida (y franja izquierda intacta); mosaico que cambia los 4 cuadrantes en un lote con HEIC y un PNG truncado que falla solo; texto de dos líneas con recuadro arriba al centro y el resto de la imagen intacto.
- Lint, typecheck, tests (677), build, `check:static` (732 páginas) y `npm run test:e2e` (192/192) pasan. Capturas revisadas: `/es/marca-de-agua-imagen` 360 oscuro (mosaico en la vista previa) y `/fr/ajouter-texte-image` 1280 claro.

**Siguiente**: 3C.16 (favicon, SVG → PNG/JPG con página propia y HEIF como entrada).

## 2026-10-21 14:50 UTC — Fase 3, tarea 3C.16a (generador de favicon)

**Qué se hizo**
- 3C.16 se dividió en 3C.16a (favicon) y 3C.16b (SVG → PNG/JPG con página propia y HEIF).
- **Generador de favicon** (`/es/generador-de-favicon`, `/en/favicon-generator`, `/pt/gerador-de-favicon`, `/fr/generateur-favicon`): desde una imagen (PNG, JPG, WEBP, AVIF, GIF, BMP, TIFF, HEIC; hasta 25 MB) o un **SVG**, genera `favicon.ico` (16, 32 y 48 px, PNG dentro del ICO con el escritor propio `ico.ts`), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180, siempre opaco: iOS pinta de negro la transparencia), `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest` (nombre opcional escapado con `JSON.stringify`, hasta 60 caracteres) y `favicon-head.html` con las 5 etiquetas `<link>`. Descarga individual o "Descargar todo en ZIP" (`favicon.zip`).
- Opciones: si no es cuadrada, **ajustar con márgenes** o **recortar al cuadrado** (centro); fondo transparente o de color.
- Todo sale de un "maestro" de 512 × 512 en `OffscreenCanvas` (handler `favicon` del worker de imágenes). El SVG se rasteriza en la página con `<img>` (los workers no tienen DOM), que **no ejecuta scripts ni carga recursos externos**; `rasterizeSvg` de `client.ts` ahora se exporta.
- Geometría, manifest y fragmento HTML en `src/lib/image/favicon.ts`.
- Detalle encontrado: `<head>` dentro de un texto traducido rompe ICU (next-intl lo toma como etiqueta de texto enriquecido): los textos dicen "head" sin corchetes.

**Verificación**
- 4 tests unitarios (márgenes y recorte, manifest con comillas y `</script>` en el nombre, recorte a 60 caracteres, fragmento con todos los archivos).
- `image-tools.spec.ts`: 2 casos nuevos: PNG transparente 4:3 → ICO leído entrada por entrada (16/32/48, cada PNG con su tamaño), los 5 PNG con su tamaño, margen transparente en el de 512, Apple opaco, manifest con el nombre, etiqueta del manifest y **ZIP** con los 8 archivos; SVG 2:1 con `<script>` que intenta marcar `window.top` y hacer `fetch` → fondo rojo en el margen, rectángulo azul al centro, la marca no existe y el servidor no recibió ninguna llamada.
- Lint, typecheck, tests (682), build, `check:static` (737 páginas) y `npm run test:e2e` (194/194) pasan. Captura revisada: `/es/generador-de-favicon` 360 oscuro con el resultado (8 archivos y botón ZIP).

**Siguiente**: 3C.16b (SVG → PNG/JPG con página propia y HEIF como entrada).

## 2026-10-21 15:25 UTC — Fase 3, tarea 3C.16b (convertir SVG y HEIF como entrada)

**Qué se hizo**
- **Convertir SVG a PNG, JPG o WEBP** (`/es/convertir-svg`, `/en/svg-converter`, `/pt/converter-svg`, `/fr/convertir-svg`): página propia, distinta de las páginas de conversión `svg-a-png`/`svg-a-jpg` (que siguen existiendo); escala 1×, 2×, 4× o ancho exacto (1–8000 px, con error visible y botón deshabilitado si no es válido), salida PNG/WEBP (con transparencia) o JPG (fondo blanco), en lotes de SVG de hasta 10 MB. Reutiliza `convertImage` del conversor: el SVG se dibuja en un `<img>` directamente al tamaño final (nítido al agrandar) y se codifica en el worker de imágenes. Mensaje por archivo con el tamaño final. Un SVG que el navegador no puede dibujar → `fileDamaged`.
- **Seguridad del SVG**: dibujado como imagen, **no ejecuta `<script>` ni carga recursos externos** (`<image href>`); probado en el navegador.
- **HEIF**: la detección ya aceptaba la marca `mif1` y la extensión `.heif` ya estaba asociada al formato HEIC, pero no había archivo de prueba. Nuevo fixture `photo.heif` (generado por script desde `photo.heic` con la marca `mif1`), test unitario del decodificador y prueba de navegador en la página HEIC → JPG y en "Redimensionar imagen". El buscador ya encuentra "heif" (las extensiones son palabras clave).
- Textos (introducción + 4 preguntas) en los 5 idiomas.

**Verificación**
- `heic.test.ts`: nuevo caso `.heif` con `mif1` (120×80, azul a la izquierda).
- `image-tools.spec.ts`: 3 casos nuevos (SVG 160×120 a 2× → PNG 320×240 con el círculo naranja en su lugar, ancho inválido → aviso y botón deshabilitado, 800 px → JPG 800×600; SVG con `<script>` que marca `window.top` y hace `fetch`, más una `<image>` externa → PNG 100×100 con esquina transparente y el cuadrado verde, sin marca y sin llamadas al servidor, y un SVG roto que falla solo; `photo.heif` → JPG 120×80 y redimensionado al 50 % → 60×40).
- Lint, typecheck, tests (684), build, `check:static` (742 páginas) y `npm run test:e2e` (197/197) pasan. Captura revisada: `/es/convertir-svg` 360 oscuro.

**Siguiente**: 3C.17 (subtítulos SRT ↔ VTT ↔ ASS/SSA, desplazar tiempos y ajustar FPS).

## 2026-10-21 15:30 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas en esta ejecución: 3C.14 (recortar imagen), 3C.15 (marca de agua y agregar texto), 3C.16a (generador de favicon) y 3C.16b (convertir SVG + HEIF). La quinta "tarea" fue 3C.13, hecha en paralelo con la ejecución anterior y descartada sin subir porque esa ejecución subió una equivalente a las 12:11.
- Causa del solapamiento: la ejecución anterior siguió trabajando más de 3 horas sin actualizar `.agent-lock` (última actualización 08:37) y esta ejecución lo tomó como vencido a las 12:03. Para evitarlo, cada ejecución debe actualizar la hora del candado en cada commit de tarea (lo hace) y no pasar más de 3 horas en una sola tarea.
- Nota de entorno: `pkill -f "next start"` (o `next-server`) dentro de un comando de shell que contiene ese mismo texto mata al propio shell (código 144); usar `pkill -f "^next-server"`.

**Siguiente**: 3C.17 (subtítulos SRT ↔ VTT ↔ ASS/SSA, desplazar tiempos y ajustar FPS).

## 2026-10-21 18:40 UTC — Fase 3, tarea 3C.17 (subtítulos: convertir y sincronizar)

**Qué se hizo**
- Candado: el `.agent-lock` tenía la hora 14:14 (una ejecución que lo tomó y se cortó sin subir nada); a las 18:08 estaba vencido y esta ejecución lo tomó.
- **Convertir subtítulos** (`/es/convertir-subtitulos`, `/en/subtitle-converter`, `/pt/converter-legendas`, `/fr/convertir-sous-titres`): SRT, WebVTT, ASS y SSA en cualquier dirección, en lotes o pegando el texto. Se conservan tiempos, saltos de línea, `<i>`, `<b>` y `<u>` (en ASS/SSA como `{\i1}…{\i0}`); colores, fuentes, posiciones, `<font>`, voces `<v>`, ajustes de VTT y estilos ASS distintos de `Default` se quitan y **se avisa** debajo del resultado ("Se quitaron colores, fuentes o posiciones…"), junto con la cantidad de subtítulos.
- **Sincronizar subtítulos** (`/es/sincronizar-subtitulos`, `/en/subtitle-sync`, `/pt/sincronizar-legendas`, `/fr/synchroniser-sous-titres`): desplazar en segundos (acepta `-2,5` y `1.5`; inválido → aviso y botón deshabilitado; 0 sin cambio de FPS → deshabilitado) y/o cambiar la velocidad de cuadros (23,976 / 24 / 25 / 29,97 / 30). **Reescribe solo los tiempos en el archivo original**: estilos ASS, `Comment:`, posiciones, ids, ajustes y bloques `NOTE`/`STYLE` de VTT quedan intactos. Nada baja de 0: las líneas que terminan antes se eliminan (con aviso de cuántas) y las que cruzan el 0 empiezan en 0; un SRT se renumera.
- Motor propio sin dependencias en `src/lib/subtitle/subtitle.ts` (el plan proponía ass-compiler, pero el subconjunto que usamos es chico y así no se agrega nada al bundle), ejecutado en el worker de datos existente (`convertSubtitles`, `syncSubtitles`). Detección del formato por contenido (`WEBVTT`, `[Script Info]` + `[V4 Styles]`/`[V4+ Styles]`, línea de tiempos); codificación con `decodeText` (UTF-8, UTF-16 con BOM o Windows-1252), salida siempre UTF-8. Al escribir: VTT escapa `&`, `<`, `>` salvo las tres etiquetas; una línea vacía dentro de un subtítulo se escribe como espacio duro (si no, cortaría el bloque) y `-->` del texto pasa a `->` en SRT/VTT; `{`/`}` del texto pasan a `(`/`)` en ASS.
- Límites: 10 MB por archivo, 100 000 subtítulos, 1 minuto por trabajo.
- Formatos nuevos en `formats.ts`: `srt`, `vtt`, `ass`, `ssa` (categoría `data`: solo los usan herramientas). Categoría "Subtítulos" publicada (página `/es/herramientas-de-subtitulos`, etc.) con descripción nueva.
- `ToolShell`: `ready: false` ahora también deshabilita el botón con texto pegado, y las opciones se muestran apenas hay texto pegado (antes solo si el botón estaba habilitado).
- Fixtures nuevos (generados por `generate.mjs`): `subtitles.{srt,vtt,ass,ssa}`, `subtitles-latin1.srt` (Windows-1252 + CRLF) y `corrupt/broken.srt`.

**Limitaciones**
- Codificaciones distintas de UTF-8/UTF-16/Windows-1252 (por ejemplo GBK o Big5 en subtítulos chinos antiguos) se leen mal; lo dice la pregunta frecuente en chino.
- No se convierten formatos de imagen (SUP/IDX+SUB) ni MicroDVD (`.sub` por cuadros); SBV/TTML quedan para más adelante si hace falta.

**Verificación**
- 33 tests unitarios: lectura de cada fixture (SRT con `<font>`, VTT con NOTE/STYLE/id/ajustes/voz/entidades, ASS y SSA con comas en el texto y `Comment:`), Windows-1252, archivos sin subtítulos, escritura de cada formato, **ida y vuelta de los 16 pares**, aviso de estilos solo si cambia el formato, desplazamiento negativo y FPS, sincronización en el lugar de SRT/VTT/ASS.
- `subtitle-tools.spec.ts` (5 casos): SRT + ASS → VTT leídos con **el parser WebVTT de Chromium** (`<track>` → `TextTrack.cues`), Windows-1252 → ASS en UTF-8, VTT → SRT, archivo roto con error, SRT −4 s (línea eliminada, renumerado, `<font>` intacto, botón deshabilitado con 0 y con "abc"), ASS 25 → 23,976 FPS con estilos intactos y VTT pegado +1,5 s conservando `line:0`. Sin llamadas al servidor.
- Lint, typecheck, tests (719), build, `check:static` (757 páginas) y `npm run test:e2e` (202/202) pasan.

**Siguiente**: 3C.18 (eliminar y extraer páginas de PDF con miniaturas).

## 2026-10-21 18:55 UTC — Fase 3, tarea 3C.18 (eliminar y extraer páginas de PDF)

**Qué se hizo**
- **Eliminar páginas de un PDF** (`/es/eliminar-paginas-pdf`, `/en/delete-pdf-pages`, `/pt/excluir-paginas-pdf`, `/fr/supprimer-pages-pdf`) y **Extraer páginas de un PDF** (`/es/extraer-paginas-pdf`, `/en/extract-pdf-pages`, `/pt/extrair-paginas-pdf`, `/fr/extraire-pages-pdf`), con un componente compartido `PageSelectPdfTool.tsx`.
- Miniaturas de todas las páginas (`usePdfThumbnails`, pdf.js) como **botones conmutables** (`aria-pressed`, nombre "Página N", foco visible): en rojo con ✕ para eliminar, con ✓ para extraer. El campo **Páginas** está sincronizado en los dos sentidos: escribir `1-3, 5` o `8-` marca las miniaturas y tocar una miniatura reescribe el campo normalizado (`formatPageRanges` nuevo en `ranges.ts`). "Seleccionar todas" / "Quitar la selección" y un resumen en vivo (`role=status`: "Se eliminará 1 página de 3.").
- Eliminar: no deja eliminar todas las páginas (aviso + botón deshabilitado); usa `organizePdfFile` con las páginas que quedan (se copian sin recomprimir). Extraer: un solo PDF (`documento-1_3.pdf`) o un PDF por página en ZIP (`documento-pages.zip` con `documento-2.pdf`…), en el orden original, con `splitPdfFile`.
- Textos (introducción + 4 preguntas) en los 5 idiomas; textos de interfaz nuevos en `ToolUi`.

**Verificación**
- 2 tests unitarios de `formatPageRanges` (incluye ida y vuelta con `parsePageRanges`).
- `pdf-tools.spec.ts`: 4 casos nuevos con la salida leída por pdf-lib + pdf.js (etiquetas "page N of M"): eliminar la página 2 tocando la miniatura; `1-` marca las 3 y bloquea, luego se desmarca la 1 y queda solo la página 1; extraer `3, 1` → páginas 1 y 3 en orden; extraer 3 y 2 por página → ZIP con dos PDF. Más 2 casos de PDF corruptos (error visible). 26/26.
- Lint, typecheck, tests (723), build y `check:static` (767 páginas) pasan. Captura revisada: `/es/eliminar-paginas-pdf` 360 px oscuro con la página 2 marcada.

**Siguiente**: 3C.19 (numerar páginas y marca de agua de texto en PDF).

## 2026-10-21 19:30 UTC — Fase 3, tarea 3C.19 (numerar páginas y marca de agua en PDF)

**Qué se hizo**
- **Numerar páginas** (`/es/numerar-paginas-pdf`, `/en/add-page-numbers-to-pdf`, `/pt/numerar-paginas-pdf`, `/fr/numeroter-pages-pdf`): 6 posiciones (arriba/abajo × izquierda/centro/derecha, a ~1 cm del borde), formato `1`, `1 / 10` o "Página 1 de 10" traducido (la plantilla sale de `PdfTools.pageOf` con `{n}`/`{total}` como valores), 3 tamaños (9/11/14 pt), número inicial y "sin número en la portada". Lotes con ZIP.
- **Marca de agua en PDF** (`/es/marca-de-agua-pdf`, `/en/watermark-pdf`, `/pt/marca-dagua-pdf`, `/fr/filigrane-pdf`): texto (hasta 200 caracteres, por defecto "CONFIDENCIAL" traducido), diagonal (sigue la diagonal real de cada página), horizontal o mosaico a 30° en filas desfasadas (máximo 400 copias por página), 3 tamaños, color, opacidad 10–100 % (graphics state `/ca`), todas las páginas o rangos (se validan contra cada PDF del lote; fuera de rango → error nuevo `pagesOutOfRange` traducido).
- Motor `src/lib/pdf/stamp.ts` (pdf-lib, en el worker de PDF): **posiciones visuales** — se calcula el tamaño visible desde el CropBox y el `/Rotate` de cada página y se convierte cada punto al espacio de la página, así el número queda abajo al centro y derecho también en páginas giradas 90/180/270°.
- Texto: Helvetica (texto real seleccionable) cuando se puede codificar en WinAnsi (español, portugués, francés); si no (chino, emojis), el worker lo dibuja con las fuentes del dispositivo en un `OffscreenCanvas` a 4× y lo inserta como PNG (cada etiqueta distinta se inserta una sola vez). Un PDF que pdf-lib no puede leer → `fileDamaged`.
- `RangesInput` acepta un aviso propio (`invalidHint`) cuando no se conoce la cantidad de páginas (lotes).
- Textos (introducción + 4 preguntas) e interfaz (`PdfTools`) en los 5 idiomas.

**Limitaciones**
- El texto chino queda como imagen (no seleccionable). El color de los números de página es gris oscuro fijo (en páginas negras no se ve).
- La marca de agua es contenido de la página: un editor de PDF podría quitarla (lo dice la FAQ).

**Verificación**
- 9 tests unitarios con pdf.js como lector independiente: posición y orientación visual de los números en páginas de 0°, 90° y 270° (abajo al centro y arriba a la derecha, siempre derechos), portada sin número + inicio en 5 con acentos, plantilla sin `{n}` y PDF dañado, texto chino con el renderizador (3 imágenes, una por etiqueta), marca diagonal en páginas giradas, solo la página 2 con `/ca 0.3` solo en esa página, mosaico acotado a 30°, texto vacío.
- `pdf-tools.spec.ts`: 6 casos nuevos + 2 corruptos (34/34): "Página N de 3" arriba a la derecha, lote de 2 PDF con portada sin número, numeración china como imágenes, CONFIDENCIAL en todas las páginas, mosaico solo en la página 2 y página 9 → error claro, marca de agua china como imagen.
- Lint, typecheck, tests (734), build y `check:static` pasan. Revisados: la página 1 de la salida en mosaico (pdftoppm) y la página `/es/marca-de-agua-pdf` a 1280 px.
- Nota para 3D: el pie de página lista todas las herramientas PDF/datos/etc. y ya es muy largo; hay que resumirlo en 3D.1.

**Siguiente**: 3C.20 (PDF → texto y recortar márgenes).

## 2026-10-21 20:05 UTC — Fase 3, tarea 3C.20 (PDF a texto y recortar márgenes)

**Qué se hizo**
- **PDF a texto** (`/es/pdf-a-texto`, `/en/pdf-to-text`, `/pt/pdf-para-texto`, `/fr/pdf-en-texte`): texto de todas las páginas en orden de lectura de pdf.js, en un TXT UTF-8 con vista previa y botón copiar; opción "Marcar el comienzo de cada página" (`--- Página N ---`, traducido); lotes con ZIP. Saltos de línea: los `hasEOL` de pdf.js más los saltos verticales que pdf.js no marca, sin duplicar los ítems vacíos de fin de línea. Un PDF sin capa de texto → error nuevo **`pdfIsScanned`** ("parece una imagen escaneada… hace falta OCR"); el mensaje existente `pdfHasNoText` habla de Word y quedó para PDF → Word.
- **Recortar márgenes de PDF** (`/es/recortar-pdf`, `/en/crop-pdf`, `/pt/cortar-pdf`, `/fr/rogner-pdf`): modo **automático** (cada página se dibuja con pdf.js a 36 ppp, `contentMargins` busca el área no blanca y se deja 3 mm alrededor; página en blanco → sin cambios) o **manual** (mm por lado, validados; botón deshabilitado si no son números de 0 a 999 o todos son 0). Se cambia el **CropBox** con pdf-lib en el worker de PDF, usando las mismas posiciones visuales de 3C.19 (funciona en páginas giradas) y dejando siempre al menos ~1 cm visible. El contenido no se recomprime ni se borra; la página y la FAQ avisan que lo recortado queda oculto, no eliminado (no sirve para ocultar datos privados).
- Fixture nuevo `scan.pdf` (una página A4 que solo tiene una imagen).

**Verificación**
- Tests unitarios: `pageText` (EOL y saltos verticales), extracción de `document.pdf` con y sin encabezados y progreso, acentos, escaneo → `pdfIsScanned`; `contentMargins` (área y página en blanco), `cropPdf` con márgenes visuales en páginas de 0° y 90°, página `null` intacta, mínimo visible y PDF dañado.
- `pdf-tools.spec.ts` (39/39): TXT con encabezados por página y vista previa; escaneo + PDF basura → mensaje de OCR y ninguna descarga; recorte automático con CropBox alrededor del texto (x 40–56, alto 715–810 pt) y texto intacto (pdf.js); manual 10 mm con validación; PDF corrupto en recortar.
- Lint, typecheck, tests (744), build y `check:static` (787 páginas) pasan.

**Siguiente**: 3C.21 (firmar PDF dibujando la firma o subiendo una foto).

## 2026-10-21 20:45 UTC — Fase 3, tarea 3C.21 (firmar PDF)

**Qué se hizo**
- **Firmar PDF** (`/es/firmar-pdf`, `/en/sign-pdf`, `/pt/assinar-pdf`, `/fr/signer-pdf`): 1) la firma se **dibuja** en un recuadro (`SignaturePad`, eventos de puntero: dedo, mouse o lápiz; tinta azul o negra; borrar) o se **sube** una foto/imagen PNG, JPG o WEBP de hasta 10 MB con la opción "Quitar el fondo blanco del papel" (umbral con transición suave para no dejar bordes); en ambos casos se recorta al trazo (`trimSignature`) y se exporta como PNG transparente. 2) Se elige la página (anterior/siguiente con nombres accesibles), se ve la página dibujada con pdf.js y se **toca o arrastra** la firma; también se mueve con el **teclado** (control `role=slider` con flechas, Mayús = pasos de 5 %, posición anunciada como texto) y se ajusta el tamaño (5–80 % del ancho). 3) `signPdf` (pdf-lib, worker de PDF) dibuja la imagen en la posición visual (mismas conversiones que 3C.19, sirve en páginas giradas).
- Aviso visible y en la FAQ: es una firma **visible**, no una firma digital certificada (no reemplaza certificado/token ni ICP-Brasil). No se guarda la firma: todo queda en el navegador.
- Errores: imagen vacía/blanca → "No encontramos ninguna firma"; formato o tamaño de imagen no válidos → errores traducidos existentes; página fuera de rango → `pagesOutOfRange`; PDF o PNG dañado → `fileDamaged`.

**Limitaciones**
- Una sola firma por ejecución (para firmar varias páginas, se repite con el PDF resultante). No hay firma "escrita" con tipografía manuscrita (no cargamos fuentes web).

**Verificación**
- 4 tests unitarios: posición/tamaño de la imagen leídos del operador de dibujo con pdf.js en una página normal y una girada 90°, validaciones (página, lista vacía, PNG dañado, PDF dañado) y `trimSignature` (recorte y fondo blanco).
- `sign-pdf.spec.ts` (3 casos, posición validada con el mismo método independiente): firma dibujada con el mouse y colocada tocando la página 2 al 25 %/80 % (ninguna imagen en otras páginas, texto original intacto); foto JPG sobre papel gris claro, movida con Mayús+← ×2 y ↑ y agrandada al 50 % (imagen con máscara de transparencia); imagen en blanco rechazada.
- Lint, typecheck, tests (749), build, `check:static` (792 páginas) y `npm run test:e2e` (224/224) pasan. Capturas revisadas a 360 px oscuro: recuadro con la firma y paso de colocación.

**Siguiente**: 3C.22 (proteger con contraseña y quitar la contraseña, qpdf-wasm).

## 2026-10-21 20:50 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas en esta ejecución: 3C.17 (convertir y sincronizar subtítulos), 3C.18 (eliminar y extraer páginas de PDF), 3C.19 (numerar páginas y marca de agua en PDF), 3C.20 (PDF a texto y recortar márgenes) y 3C.21 (firmar PDF). 11 herramientas nuevas publicadas; `npm run test:e2e` 224/224 al cierre.
- El candado encontrado (14:14) estaba vencido: una ejecución anterior lo tomó y se cortó sin subir cambios.
- Pendiente para 3D.1: el pie de página lista cada herramienta y ya es muy largo.

**Siguiente**: 3C.22 (proteger con contraseña y quitar la contraseña, qpdf-wasm; revisar licencia antes de instalar).

## 2026-10-21 20:30 UTC — Fase 3, tarea 3C.22 (proteger y quitar contraseña de PDF)

**Qué se hizo**
- **Proteger PDF con contraseña** (`/es/proteger-pdf`, `/en/protect-pdf`, `/pt/proteger-pdf`, `/fr/proteger-pdf`): contraseña + confirmación (aviso "no coinciden" y botón deshabilitado), "Mostrar contraseña", permisos imprimir / copiar / modificar (activos por defecto), lotes con ZIP. Cifrado **AES-256 (R6, PDF 2.0)** con qpdf; la contraseña de propietario es aleatoria (24 bytes), así los permisos solo se levantan con la contraseña de apertura. Un PDF que ya está cifrado (con contraseña o solo con permisos) se rechaza con el error nuevo `pdfAlreadyProtected`: re-cifrarlo quitaría restricciones puestas por otro.
- **Quitar contraseña de PDF** (`/es/quitar-contrasena-pdf`, `/en/unlock-pdf`, `/pt/desbloquear-pdf`, `/fr/deverrouiller-pdf`): **solo con la contraseña** (de apertura o de propietario; no se prueban ni rompen contraseñas). Errores nuevos `pdfWrongPassword` y `pdfNotProtected`.
- Motor `src/lib/pdf/password.ts` con `@neslinesli93/qpdf-wasm` 0.3.0 (ISC; qpdf 12.2, Apache-2.0) en el worker de PDF, import diferido; el `.wasm` (1,3 MB) se sirve desde nuestro dominio y solo lo descargan estas dos páginas. Una instancia nueva de qpdf por archivo (no queda nada en memoria entre archivos). Límite: 200 MB por archivo (qpdf tiene entrada y salida en memoria WASM), 5 min por trabajo.
- Seguridad: las contraseñas se pasan como `--user-password=…`/`--password=…` (un argumento, sin shell), así una contraseña que empiece con `@` (archivos de argumentos de qpdf) o `--` no se interpreta; hasta 128 caracteres.
- `next.config.ts`: `IgnorePlugin` para `fs`/`path`/`crypto` solo dentro de `qpdf-wasm` (el cargador Emscripten los pide únicamente en Node).

**Formatos y detalles verificados**
- Este build de qpdf no manda los errores a `printErr` y los códigos de `--is-encrypted`/`--requires-password` no son confiables (devuelven 2 con "invalid password"): el estado (cifrado o no, dañado) se decide antes con pdf-lib (`isEncrypted`, 0 páginas = dañado) y qpdf solo cifra/descifra (0 = ok, 3 = ok con advertencias).
- Contraseñas con acentos (UTF-8) funcionan y pdf.js las acepta.

**Verificación**
- 6 tests unitarios (qpdf real en Node, lector independiente pdf.js): sin contraseña / con la incorrecta → `PasswordException`, con la correcta mismas 3 páginas y mismo texto; `/V 5` y `/R 6`; permisos leídos con `getPermissions`; contraseñas `@/etc/passwd` y `--decrypt`; ya cifrado, vacía, >128, `garbage.pdf`, `truncated.pdf`; quitar → pdf-lib `isEncrypted = false` y mismo texto; incorrecta / sin contraseña / dañado.
- `pdf-password.spec.ts` (5 casos, entradas cifradas generadas en el test con qpdf en Node): lote de 2 protegido sin imprimir (validación de confirmación y "Mostrar"), ya cifrado + basura → errores; quitar la contraseña de apertura (etiquetas "page N of 3" intactas), quitar restricciones con la contraseña de propietario (fr), contraseña incorrecta + PDF sin contraseña + truncado → 3 errores. Sin llamadas al servidor.
- Lint, typecheck, tests (757), build, `check:static` (802 páginas) y `npm run test:e2e` (229/229) pasan. Captura revisada: `/es/proteger-pdf` 360 px oscuro con el aviso de contraseñas distintas.

**Siguiente**: 3C.23 (extraer imágenes de un PDF en ZIP).

## 2026-10-21 20:40 UTC — Fase 3, tarea 3C.23 (extraer imágenes de un PDF)

**Qué se hizo**
- **Extraer imágenes de un PDF** (`/es/extraer-imagenes-pdf`, `/en/extract-images-from-pdf`, `/pt/extrair-imagens-pdf`, `/fr/extraire-images-pdf`): todas las imágenes distintas del PDF, en orden de página, con descarga individual o ZIP (`fileflect-images.zip`); nombres `<pdf>-p<página>-<n>.jpg|png`. Opción "Ignorar imágenes pequeñas (menos de 50 px de lado)" activa por defecto (íconos, viñetas, líneas). Lotes de varios PDF.
- Motor híbrido en `src/lib/pdf/images.ts`:
  - **pdf.js** recorre la lista de operadores de cada página (`paintImageXObject`, `…Repeat` e imágenes en línea) y entrega cada imagen ya decodificada (cualquier filtro: Flate, JPX, JBIG2, CCITT; cualquier espacio de color; con su máscara suave aplicada como transparencia). Se guarda como PNG (en el navegador desde el `ImageBitmap` en un canvas; en Node con `toRgba`, que expande los formatos de pdf.js: RGB, RGBA y gris de 1 bit).
  - **pdf-lib** (worker de PDF, `originalJpegs`) busca las imágenes guardadas como **JPEG simple** (DCTDecode, RGB/gris/ICC de 1 o 3 componentes, 8 bits, sin `Decode`, `SMask` ni `Mask`) y devuelve sus bytes; se emparejan con las de pdf.js por la referencia del objeto (pdf.js expone `ref`, p. ej. `"12R"`), así esas fotos se descargan **byte a byte, sin recomprimir**. PDF cifrados: todo pasa por pdf.js (pdf-lib no descifra).
  - Una imagen repetida (en varias páginas o con varios nombres) se descarga una vez (por id de pdf.js y por referencia).
- `sourceImage` de `compress.ts` ahora se exporta (misma detección de JPEG que usa "Comprimir PDF").
- Error nuevo `pdfHasNoImages` (5 idiomas). Textos (introducción + 4 preguntas) en los 5 idiomas.
- `scripts/perf/lighthouse.sh`: se agregan `/es/recortar-imagen` y `/es/extraer-imagenes-pdf`.

**Limitaciones**
- Solo imágenes: texto y dibujos vectoriales no (la FAQ remite a PDF → JPG). Las imágenes CMYK, con máscara o en otros filtros salen en PNG (decodificadas por pdf.js), no en su formato original. El color de píxeles semitransparentes puede variar ±1 por el canvas (alfa premultiplicado).

**Verificación**
- 5 tests unitarios (pdf.js en Node + sharp): `toRgba` (RGB y 1 bit), PDF de prueba con JPEG + PNG transparente + la misma foto en la página 2 + un punto de 10 px → JPEG **idéntico byte a byte** al original, PNG con **los mismos píxeles y alfa** que el original, repetida omitida, punto incluido solo sin mínimo; `document-images.pdf` (la foto de 2 páginas → 1 JPEG 640×480), `scan.pdf` (320×240), texto sin imágenes → `pdfHasNoImages` con progreso, basura → sin originales.
- `pdf-tools.spec.ts`: 2 casos nuevos (JPEG byte a byte, PNG con alfa exacto y color ±1,5 de media, ZIP con los 2 archivos, "Empezar de nuevo" sin el mínimo → 3 imágenes con el punto de 10×10; escaneo + PDF sin imágenes + basura → 1 imagen y 2 errores).
- Lint, typecheck, tests (763), build, `check:static` (807 páginas) y `npm run test:e2e` (230/231: falló `add-text-to-image › text with a box…` solo bajo carga en paralelo; pasa sola y no se tocó ese código) pasan.

**Siguiente**: medición de Lighthouse después de 3C.23 (la pide el plan) y luego 3C.24 (fuentes TTF/OTF ↔ WOFF/WOFF2).

## 2026-10-21 21:30 UTC — Fase 3, medición de Lighthouse después de 3C.23

- `docs/perf/2026-10-21-3C23.md`: 15 páginas, móvil, mediana de 3. Rendimiento 95–98, accesibilidad y SEO 100, CLS 0.
- **Regresión encontrada y corregida**: `/es/extraer-imagenes-pdf` medía 90 con 345 KB de JS porque `images.ts` importaba pdf-lib. La búsqueda de JPEG originales pasó a `src/lib/pdf/jpegs.ts` (solo la importa el worker de PDF) y las constantes de las herramientas de contraseña a `password-options.ts`. Ahora 162 KB y 97.
- Convención: un módulo que importa la página nunca debe importar pdf-lib ni otro motor; lo que necesita el worker va en un archivo aparte (como `compress.ts`/`client.ts`).
- `scripts/perf/lighthouse.sh` suma `/es/recortar-imagen`, `/es/extraer-imagenes-pdf`, `/es/proteger-pdf` y `/es/convertir-fuentes`.
- Verificación: lint, typecheck, tests, build y `npm run test:e2e` (234/234) pasan.

## 2026-10-21 21:40 UTC — Fase 3, tarea 3C.24 (conversor de fuentes)

**Qué se hizo**
- **Convertir fuentes** (`/es/convertir-fuentes`, `/en/font-converter`, `/pt/converter-fontes`, `/fr/convertir-polices`): TTF, OTF, WOFF y WOFF2 de entrada; salida **WOFF2** (por defecto), **WOFF** o **TTF/OTF**. Se cambia el contenedor, no los contornos: TrueType sale `.ttf` y CFF sale `.otf` (la FAQ aclara que no convierte OTF → TTF). Con una sola salida web se muestra la regla `@font-face` lista para copiar. Lotes con ZIP (`fileflect-fonts.zip`); si dos archivos dan el mismo nombre (font.ttf y font.otf → font.woff2) el segundo pasa a `font-2.woff2`. Categoría **Fuentes** publicada (`/es/herramientas-de-fuentes`…).
- Motor `src/lib/font/font.ts` en el worker de datos: WOFF 1.0 propio con fflate (zlib por tabla, solo si achica); WOFF2 con **woff2-encoder** 2.0.0 (MIT; codificador de referencia de Google + Brotli, WASM incrustado ~1 MB) con import diferido. Formatos nuevos `ttf`, `otf`, `woff`, `woff2` en `formats.ts`.
- Seguridad: máximo 40 MB por fuente y para lo que un WOFF/WOFF2 declare al descomprimirse (**bomba** rechazada antes de inflar; además fflate escribe en un búfer fijo del tamaño declarado), hasta 256 tablas, cada tabla dentro del archivo, y la fuente resultante debe tener `head`, `cmap` y contornos (`glyf`+`loca` o `CFF `/`CFF2`). Colecciones (`ttcf`) no se aceptan.
- Fixtures propios con `scripts/fixtures/fonts.mjs`: fuente "Fileflect Test" (6 glifos poligonales) como TTF (constructor TrueType del script), OTF (opentype.js, devDependency), WOFF (escritor zlib del script) y WOFF2 (codificador de Google); `corrupt/truncated.woff2` y `corrupt/bomb.woff` (1 GB declarado). fontkit (devDependency, MIT) es el lector independiente de los tests; tipos mínimos en `src/types/fontkit.d.ts`.

**Verificación**
- 16 tests unitarios: detección; los 4 fixtures se leen igual con fontkit; **las 12 combinaciones** (4 entradas × 3 salidas) dan la misma familia, cantidad de glifos, avance y caja de "A", "ñ" y espacio; WOFF más chico y ida y vuelta byte a byte; truncado, bomba, sfnt cortado, PNG y encabezado WOFF2 de 2 GB rechazados.
- `font-tools.spec.ts` (3 casos): TTF + OTF → WOFF2 leídos con fontkit y **aceptados por el sanitizador de fuentes de Chromium** (`FontFace.load()`), nombres `font.woff2`/`font-2.woff2`; WOFF → `.ttf` y WOFF2 → `.otf` con sus firmas, TTF → WOFF más chico con la regla `@font-face`; truncado + bomba → error sin descargas. Sin llamadas al servidor.
- Lint, typecheck, tests (780), build, `check:static` (817 páginas) y `npm run test:e2e` (234/234) pasan. Lighthouse de `/es/convertir-fuentes`: 97, 164 KB (en `docs/perf/2026-10-21-3C23.md`). Captura revisada: 360 px oscuro con el resultado.

**Siguiente**: 3C.25 (Markdown ↔ HTML en el navegador y Markdown → PDF).

## 2026-10-21 22:20 UTC — Fase 3, tarea 3C.25a (Markdown ↔ HTML) y arreglo del worker de pdf.js

**Qué se hizo**
- 3C.25 se dividió en 3C.25a (Markdown ↔ HTML en el navegador) y 3C.25b (Markdown → PDF con Gotenberg).
- **Markdown a HTML** (`/es/markdown-a-html`, `/en/markdown-to-html`, `/pt/markdown-para-html`, `/fr/markdown-en-html`): CommonMark + GFM (tablas, tachado, listas de tareas, código con lenguaje) con marked; el resultado se **sanea con DOMPurify** (sin `<script>`, atributos `on*`, formularios, botones ni enlaces `javascript:`; las casillas de las listas de tareas se conservan). Opción "Página HTML completa" (por defecto): doctype, `charset`, título = primer `<h1>` (escapado) y estilos legibles claro/oscuro; si no, solo el fragmento. Archivos `.md`/`.markdown`/`.txt` en lotes o texto pegado.
- **HTML a Markdown** (`/es/html-a-markdown`, `/en/html-to-markdown`, `/pt/html-para-markdown`, `/fr/html-en-markdown`): turndown + turndown-plugin-gfm (títulos `#`, `-` en listas, código cercado, tablas, tachado). El HTML se analiza con `DOMParser` (inerte: no ejecuta scripts ni carga imágenes) y se convierte solo el `<body>`; se descartan `script`, `style`, `noscript`, `iframe`, `object`, `embed`, `form` y `template`. HTML sin contenido → `invalidData`.
- Las dos corren en la página (DOMPurify y turndown necesitan DOM) con las librerías en un import diferido; límite 5 MB por archivo. Formatos nuevos `md` y `html` en `formats.ts`. Textos (introducción + 4 preguntas) en los 5 idiomas, en la categoría Documentos.
- **Arreglo de pdf.js (afecta a todas las herramientas que abren PDF en el navegador)**: `render.ts` compartía el worker de pdf.js con `GlobalWorkerOptions.workerPort`; el primer `loadingTask.destroy()` de un lote lo destruía y un PDF que se abría al mismo tiempo fallaba con "the worker is being destroyed" (se veía como "archivo dañado"). Lo detectó la prueba de "Extraer imágenes" bajo carga. Ahora se crea un solo `PDFWorker` y se pasa explícito a `getDocument`, así pdf.js nunca lo destruye con un documento.

**Limitaciones**
- Markdown → HTML y HTML → Markdown corren en el hilo de la página: el límite de tiempo del registro (1 min) no puede cortar un archivo patológico; por eso el tope de 5 MB.
- En HTML → Markdown se pierden estilos, colores y celdas combinadas (lo dice la FAQ).

**Verificación**
- 5 tests unitarios con jsdom (`// @vitest-environment jsdom`): GFM con tabla, tachado, código y casilla marcada; sin `<script>`, `onerror` ni `javascript:`; página completa con título escapado; HTML → Markdown con encabezado, énfasis, lista, tabla, código y enlace, sin scripts, estilos ni `<title>`; ida y vuelta; HTML vacío.
- `markup-tools.spec.ts` (4 casos, salida leída con jsdom): `document.md` → página segura (tabla, código, casilla, sin scripts/eventos, la variable `pwned` nunca se define y ninguna petición sale de localhost); fragmento pegado; `page.html` → Markdown GFM sin `<head>`, estilos, scripts ni formulario y sin peticiones externas; HTML vacío → error.
- Fixtures nuevos `document.md` y `page.html` (en `generate.mjs`).
- Lint, typecheck, tests (787), build, `check:static` (827 páginas) y `npm run test:e2e` (238/238) pasan; además `pdf-tools`, `sign-pdf` y `converter` dos veces seguidas (278/278).

**Siguiente**: 3C.25b (Markdown → PDF con Gotenberg).

## 2026-10-21 22:25 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas: 3C.22 (proteger / quitar contraseña de PDF), 3C.23 (extraer imágenes de PDF), medición de Lighthouse después de 3C.23 (con una regresión de bundle corregida), 3C.24 (conversor de fuentes) y 3C.25a (Markdown ↔ HTML). 6 herramientas nuevas y la categoría Fuentes publicada. También se corrigió un error de pdf.js que podía marcar como "dañado" un PDF válido en lotes. `npm run test:e2e` 238/238 al cierre.

**Siguiente**: 3C.25b (Markdown → PDF con Gotenberg).

## 2026-10-21 22:40 UTC — Fase 3, tarea 3C.25b (Markdown → PDF)

**Qué se hizo**
- **Markdown a PDF** (`/es/markdown-a-pdf`, `/en/markdown-to-pdf`, `/pt/markdown-para-pdf`, `/fr/markdown-en-pdf`): archivos `.md`/`.markdown`/`.txt` (lotes) o texto pegado; tamaño de página **A4** (por defecto) o **Carta**. Es la primera herramienta del registro con `engine: "server"`.
- Ruta nueva `POST /api/convert/markdown`: valida como las demás (`readUpload`: límite de plan, contenido de texto, límite por IP), tope de la herramienta 5 MB, decodifica UTF-8/UTF-16/Windows-1252 (`decodeText`), genera el HTML y lo imprime con **Gotenberg Chromium** (`htmlToPdf` en `gotenberg.ts`, ruta `/forms/chromium/convert/html`, `preferCssPageSize`, `skipNetworkIdleEvent`). Registra la conversión en las estadísticas con `tool: "markdown-to-pdf"`; el navegador solo informa los fallos que el servidor no vio.
- El Markdown se convierte **en el servidor** (`src/lib/server/markdown-pdf.ts`, marked con renderer propio) y no se acepta HTML del navegador, para que lo que llega a Chromium sea siempre una página inerte:
  - el HTML escrito dentro del Markdown se reduce a su **texto** (sin etiquetas ni comentarios);
  - solo se incrustan imágenes `data:image/(png|jpeg|gif|webp);base64`; las demás muestran su texto alternativo; enlaces solo `http(s)`, `mailto` y `#`;
  - **CSP** en el `<head>` antes de los estilos: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:`;
  - título del PDF = primer `#`; estilos de impresión (márgenes, tablas, código con salto de línea, `@page` con el tamaño).
- `ToolShell` acepta `engine="server"` y la página de la herramienta muestra los límites de servidor del plan (5 archivos / 15 MB gratis, 50 con Pro; acá el tope real es 5 MB por archivo). `convertOnServer` acepta un `AbortSignal` (cancelar aborta la subida).
- **Gotenberg endurecido** (docker-compose y DEPLOY.md): `--chromium-disable-javascript=true --chromium-deny-private-ips=true --chromium-deny-public-ips=true`.

**Verificación de SSRF con Gotenberg 8 real (Docker)**
- Página con `<link>`, `@import`, `background:url()`, `<img>`, `<iframe>`, `<object>` y `fetch()` hacia un servidor de prueba: Gotenberg por defecto **sin CSP → 7 peticiones**; **con nuestra CSP → 0**; Gotenberg con las 3 opciones y sin CSP → 0. Las dos capas funcionan por separado.

**Verificación**
- 5 tests de `markdown-pdf.test.ts`: CSP antes de `<style>`, título escapado, GFM (tabla, casilla, tachado, enlace), sin `<script>`/`onerror`/`javascript:`/imagen remota; solo `data:` (no SVG, ni `file:`, ni 169.254.169.254); etiquetas anidadas (`<scr<script>ipt>`), `<meta refresh>` y comentarios eliminados. **Impresión con el Chromium local** (el mismo motor que usa Gotenberg): 0 peticiones de red, tamaño Carta 612×792, texto (ñ, tabla, código, 中文) leído con pdf.js. Con `GOTENBERG_URL` definido, además **con Gotenberg real**: A4 595×842, título del PDF y texto.
- 4 tests de la ruta (nombre del PDF, opciones, Windows-1252, binario/salida inválida/opciones inválidas/archivo > 5 MB sin llamar a Gotenberg ni registrar, 503 → `serviceUnavailable`, 400 → `conversionFailed`) y 2 de `htmlToPdf`.
- `markdown-pdf.spec.ts`: con Gotenberg real, `document.md` en Carta (título, tamaño y texto validados con pdf-lib y pdf.js; la opción viaja en la petición) y un lote de 2 en inglés (A4, 中文); siempre: un `.md` binario rechazado por la ruta real y una caída simulada del servicio con el mensaje traducido. **El primer caso se salta si no hay `GOTENBERG_URL`** (el CI no corre e2e).
- Lint, typecheck, tests (798 + 1 saltado sin Gotenberg), build, `check:static` (832 páginas) y `npm run test:e2e` completo con Gotenberg (240/240) pasan. Captura revisada: `/es/markdown-a-pdf` 360 px oscuro con el resultado.

**Limitaciones**
- Necesita Gotenberg (servidor): si no está, error "servicio no disponible". Imágenes enlazadas no se incluyen (FAQ). Las fuentes son las de la imagen de Gotenberg (Noto, incluida CJK).

**Pendiente del dueño**
- Actualizar el *Custom Start Command* del servicio `gotenberg` en Railway con las 3 opciones de Chromium (ver DEPLOY.md). Sin ellas la herramienta sigue protegida por la CSP, pero se pierde la segunda capa.

**Siguiente**: 3C.26 (HTML → PDF con Gotenberg, protección SSRF, fixture PPT y PDF/A).

## 2026-10-21 23:05 UTC — Fase 3, tarea 3C.26a (HTML → PDF)

**Qué se hizo**
- 3C.26 se dividió en 3C.26a (HTML → PDF), 3C.26b (PDF → PDF/A) y 3C.26c (fixture PPT y PPT → PDF).
- **HTML a PDF** (`/es/html-a-pdf`, `/en/html-to-pdf`, `/pt/html-para-pdf`, `/fr/html-en-pdf`): archivo `.html`/`.htm`/`.txt` (lotes) o HTML pegado; A4 o Carta (el `@page` del propio documento tiene prioridad). Ruta `POST /api/convert/html`.
- **Saneado en el servidor** (`src/lib/server/html-print.ts`, **parse5** 8.0.1, MIT, nueva dependencia directa; ya venía con jsdom): se recorre el árbol sin recursión y se eliminan `script`, `noscript`, `template`, `iframe`/`frame`, `object`/`embed`/`applet`, `base`, `link`, `meta` (incluido `refresh`), `audio`/`video`/`source`/`track`, `canvas`, las animaciones SVG (`animate`, `set`…) y los comentarios; se quitan los atributos `on*`, `srcdoc`, `http-equiv` y **todo atributo con URL** salvo `href` seguro en `a`/`area` (http, https, mailto, #) y `src` `data:image` (png/jpeg/gif/webp) en `img`. Luego se insertan primero en `<head>` el `charset`, la **misma CSP** que Markdown → PDF (bloquea `url()` e `@import` del CSS que se conserva) y la regla `@page`.
- Anidamiento malicioso: un estimador lineal de profundidad (sin contar elementos con cierre opcional como `li`, `p`, `td`) rechaza más de 1000 niveles **antes** de parsear (parse5 se vuelve cuadrático: 20 000 `<div>` tardan 2,5 s y su serializador desborda la pila a ~5000); error `fileDamaged`. Una lista de 5000 `<li>` sin cerrar se acepta.
- Ruta compartida `src/lib/server/print-route.ts` (`printUpload`) para Markdown → PDF y HTML → PDF: misma validación, opciones, registro de estadísticas y errores. Componente cliente común `PrintToPdfTools.tsx`.
- Textos (introducción + 4 preguntas) en los 5 idiomas. Convención: **no usar `<etiquetas>` en `messages/*.json`** (next-intl las interpreta como texto enriquecido).

**Verificación de SSRF**
- Página de ataque con 30 vectores (meta refresh, base, link/preload, `@import`, `url()` en CSS y en `style`, `@font-face`, scripts, `onload`/`onerror`, `srcset`, `picture`, `iframe`/`srcdoc`, `object`, `embed`, `video`/`audio`/`poster`, `input type=image`, `background`, SVG `image`/`use`/`animate`/`a`/`script`, MathML `href`, `form action`/`formaction`, `ping`, `noscript`, `template`, comentarios). **Gotenberg 8 real sin opciones de seguridad**: la página original hizo **24 peticiones** a un servidor de prueba (incluida la redirección); la saneada, **0**.
- Nota: en Playwright los recursos bloqueados por CSP igual emiten el evento `request` (no `requestfinished`); el servidor de prueba es la fuente de verdad.

**Verificación**
- 6 tests de `html-print.test.ts` (CSP primero, estilos y contenido conservados, los 30 vectores eliminados fuera del CSS, anidamiento, fragmento → página completa; **Chromium local**: control sin sanear con > 5 peticiones al servidor de prueba y la saneada con 0, PDF A4; **Gotenberg real** si hay `GOTENBERG_URL`: título y texto con chino). 2 tests de la ruta.
- `markdown-pdf.spec.ts`: `page.html` → PDF con Gotenberg real (título "Página", texto, sin "pwned") y anidamiento rechazado con el mensaje traducido.
- Lint, typecheck, tests (806 + 2 saltados sin Gotenberg), build, `check:static` (837 páginas) y `npm run test:e2e` completo con Gotenberg (242/242) pasan. Captura revisada: `/fr/html-en-pdf` 1280 claro con el resultado.

**Limitaciones**
- Sin URL de entrada (solo archivo/texto) y sin recursos externos (hojas de estilo, fuentes e imágenes enlazadas); sin JavaScript: las páginas que arman su contenido con JS salen incompletas (lo dicen las FAQ).

**Siguiente**: 3C.26b (PDF → PDF/A con Gotenberg).

## 2026-10-21 23:25 UTC — Fase 3, tarea 3C.26b (PDF → PDF/A)

**Qué se hizo**
- **PDF a PDF/A** (`/es/pdf-a-pdfa`, `/en/pdf-to-pdfa`, `/pt/pdf-para-pdfa`, `/fr/pdf-en-pdfa`), categoría PDF, en el servidor: **PDF/A-1b, 2b (por defecto) o 3b**, lotes, salida `<nombre>-pdfa.pdf` (no pisa el original). Ruta `POST /api/convert/pdfa` → Gotenberg `/forms/pdfengines/convert` (motor LibreOffice) con `pdfa=…` (`pdfToPdfA` en `gotenberg.ts`).
- Antes de llamar a Gotenberg el PDF se abre con pdf-lib: dañado o sin páginas → `fileDamaged` (Gotenberg respondía 500 con `truncated.pdf`, que se habría mostrado como "servicio no disponible"); cifrado → `pdfAlreadyProtected` (el PDF/A no admite cifrado; el mensaje remite a "Quitar contraseña de un PDF").
- Helper de cliente `runServerBatch` (`components/tools/shell/serverBatch.ts`): subida por archivo con progreso, cancelación y estadísticas sin duplicar; lo usan Markdown/HTML → PDF y PDF/A.
- Textos (introducción + 4 preguntas, ayuda de cada versión) en los 5 idiomas.
- `tests/e2e/markdown-pdf.spec.ts` pasa a llamarse `gotenberg-tools.spec.ts` (todas las herramientas con Gotenberg).

**Formatos verificados**
- Con Gotenberg 8 real y el validador de referencia **veraPDF** (imagen Docker `verapdf/cli`, solo para tests): `document.pdf` en 1b, 2b y 3b, `document-images.pdf` (1b y 2b), `scan.pdf` (1b y 2b) y `document-1page.pdf` → **PASS**; el original sin convertir → FAIL (control).

**Verificación**
- `pdfa.test.ts` (con `GOTENBERG_URL`): para las 3 versiones, `pdfaid:part`/`conformance` del XMP, todas las fuentes incrustadas (`FontFile*` en cada `FontDescriptor`), `OutputIntents`, sin cifrado y **mismo texto por página** (pdf.js); PDF con fotos conserva páginas e imágenes; con `VERAPDF_DOCKER=1`, los 4 archivos pasan veraPDF.
- 3 tests de la ruta (versión elegida / por defecto, nombre `-pdfa.pdf`, truncado → `fileDamaged`, cifrado con qpdf → `pdfAlreadyProtected`, DOCX con nombre `.pdf` → 415, errores de Gotenberg) y 1 de `pdfToPdfA`.
- e2e: `document.pdf` → PDF/A-1b (nombre, 3 páginas, XMP, texto) con Gotenberg real; truncado → mensaje "damaged" de la ruta real.
- Lint, typecheck, tests (811 + 7 saltados sin Gotenberg), build, `check:static` (842 páginas) y `npm run test:e2e` completo con Gotenberg (244/244) pasan.

**Limitaciones**
- Conformidad nivel **b** (aspecto visual), no **a**/**u** (accesible/Unicode). En PDF/A-1b se aplanan transparencias; enlaces y formularios interactivos pueden perderse (FAQ). Límite de tamaño: el de servidor del plan (15 MB gratis, 100 MB Pro).

**Siguiente**: 3C.26c (fixture PPT 97-2003 y prueba PPT → PDF).

## 2026-10-21 23:35 UTC — Fase 3, tarea 3C.26c (PPT → PDF probado)

**Qué se hizo**
- El PPT (PowerPoint 97-2003) era el único formato de oficina sin probar: LibreOffice lo exporta con ~450 KB, más de lo razonable para `tests/fixtures/`. Ahora `tests/inventory/server.test.ts` lo **genera al correr** desde `slides.pptx` (`soffice --convert-to ppt`), comprueba que sea un contenedor OLE2 y lo pasa por `POST /api/convert/document`: PDF de **2 páginas** con el texto "Fileflect slide 1" (pdf.js).
- La variable `SOFFICE` permite usar otro binario de LibreOffice (por ejemplo un envoltorio que ejecute el `soffice` de la imagen de Gotenberg: `docker run --rm -u 0 -v /tmp:/tmp --entrypoint soffice gotenberg/gotenberg:8 "$@"`). Los 12 casos de oficina → PDF (DOCX, DOC, ODT, RTF, TXT, CSV, XLSX, XLS, ODS, PPTX, ODP y PPT) pasan con el LibreOffice 24.2 del entorno y con el 26.8 de la imagen de Gotenberg.
- Actualizados `docs/audit-inventory.md`, `docs/audit.md` y `tests/fixtures/README.md` (PPT probado).
- 3C.26 queda completa (3C.26a, b y c).

**Verificación**
- `npx vitest run tests/inventory/server.test.ts` (y con `SOFFICE=<envoltorio>`) → 12 casos de oficina pasan; sin LibreOffice se saltan como antes. Lint, typecheck y tests (812) pasan.

**Siguiente**: 3C.27 (hojas de cálculo XLSX ↔ CSV ↔ ODS en el navegador).

## 2026-10-21 23:55 UTC — Fase 3, tarea 3C.27 (convertir hojas de cálculo)

**Qué se hizo**
- **Convertir hoja de cálculo** (`/es/convertir-hoja-de-calculo`, `/en/spreadsheet-converter`, `/pt/converter-planilha`, `/fr/convertir-tableur`), categoría Documentos, en el navegador: entradas **XLSX, XLS, ODS, CSV y TSV**; salidas **XLSX, ODS o CSV**. Lotes con ZIP. Para CSV: separador **coma** (punto decimal) o **punto y coma con coma decimal** (Excel en español/portugués/francés), **un CSV por hoja** (`libro-Hoja.csv`) o solo la primera, y **UTF-8 con BOM** (activado por defecto, para que Excel muestre bien los acentos).
- Motor `src/lib/sheet/sheet.ts` en el worker de datos con import diferido (SheetJS no entra en otras herramientas): **SheetJS CE 0.20.3** (Apache-2.0) desde el tarball oficial de cdn.sheetjs.com (no la 0.18.5 de npm, con CVEs).
  - CSV de entrada con nuestro parser (papaparse + `decodeText`: UTF-8 o Windows-1252), separador detectado; con `;` se reconocen números con coma decimal y miles con punto ("1.234,5"); "007" y enteros enormes quedan como texto. Nombre de la hoja = nombre del archivo (≤ 31 caracteres, sin `[]:*?/\`).
  - CSV de salida propio: números exactos (con coma decimal si se pide), fechas y demás como se muestran (`w`), filas rellenadas al mismo ancho y sin filas vacías al final.
  - Se conservan **hojas, valores y fórmulas** (con su último resultado); el formato visual no (SheetJS CE no lo escribe): lo dicen la nota y las FAQ.
- Seguridad y límites: 50 MB por archivo; **2 millones de celdas** con datos (error nuevo `tooManyCells`, 5 idiomas); para XLSX/ODS se suma lo que el ZIP **declara** descomprimir (directorio central, sin inflar) y más de 400 MB se rechaza antes de leer (**bomba**); el formato se decide por contenido (ZIP, OLE2 o texto; binario → `fileDamaged`); 2 minutos por trabajo en el worker.
- Fixtures nuevos `workbook.{ods,xlsx}` generados con LibreOffice desde una hoja ODF plana en `generate.mjs` (2 hojas, fórmulas, fechas, "007", acentos, chino).

**Verificación**
- 11 tests unitarios con lectores independientes (XML dentro del ZIP con fflate y **LibreOffice leyendo las salidas**): XLSX y ODS → CSV por hoja (texto exacto), CSV para Excel en español con BOM, XLSX → ODS (2 hojas, `of:=[.B2]*[.C2]`, chino), ODS → XLSX (`<f>SUM(D2:D3)</f>`), CSV de Excel en Windows-1252 → números 3.25/9.5, XLS y TSV; LibreOffice relee ODS→XLSX, XLSX→ODS y CSV→XLSX con los mismos valores; errores: PNG, DOCX, XLSX cortado, comillas rotas, ZIP que declara 4 GB, CSV de 2 000 002 celdas.
- `sheet-tools.spec.ts` (3 casos, sin llamadas al servidor): libro de 2 hojas → 2 CSV para Excel en español (contenido exacto); CSV de Excel → XLSX con números; ODS → XLSX con fórmulas; XLSX cortado + binario fallan uno por uno y el TSV sale.
- Lint, typecheck, tests (824 + 7 saltados sin Gotenberg), build, `check:static` (847 páginas) y `npm run test:e2e` completo (247/247, con Gotenberg) pasan. Captura revisada: 360 px oscuro con las opciones de CSV.

**Pendiente del dueño**
- El build (`npm ci`) descarga SheetJS desde `cdn.sheetjs.com` (fijado con su hash en `package-lock.json`): Railway necesita acceso a ese dominio al construir.

**Siguiente**: 3C.28 (crear ZIP, TAR y TAR.GZ).

## 2026-10-21 23:58 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas: 3C.25b (Markdown → PDF), 3C.26a (HTML → PDF), 3C.26b (PDF → PDF/A), 3C.26c (PPT → PDF probado) y 3C.27 (convertir hojas de cálculo). 4 herramientas nuevas, las primeras del catálogo que usan el servidor (Gotenberg) además de la conversión de oficina existente.
- En esta ejecución hubo Docker disponible: se probó con **Gotenberg 8 real** y se validó PDF/A con **veraPDF**. Las pruebas de navegador de las herramientas con Gotenberg se saltan sin `GOTENBERG_URL`.
- `npm run test:e2e` 247/247 al cierre.

**Siguiente**: 3C.28 (crear ZIP, TAR y TAR.GZ).

## 2026-10-22 00:22 UTC — Fase 3, tarea 3C.28 (crear ZIP, TAR y TAR.GZ)

**Qué se hizo**
- **Crear ZIP** (`/es/crear-zip`, `/en/create-zip`, `/pt/criar-zip`, `/fr/creer-zip`), primera herramienta de la categoría **Archivos comprimidos** (`/es/archivos-comprimidos`…, ahora publicada). Cualquier archivo de entrada (lote del plan: 50 gratis / 500 Pro); salida **ZIP**, **TAR** o **TAR.GZ**; compresión sin comprimir / normal (6) / máxima (9) para ZIP y TAR.GZ; nombre del archivo opcional (se limpian separadores y la extensión repetida; por defecto `archive.<ext>`).
- Motor `src/lib/archive/create.ts` en el worker de datos (sin dependencias nuevas: fflate ya estaba):
  - ZIP con `zipSync`: los formatos ya comprimidos (JPG, PNG, WEBP, MP4, DOCX, ZIP…) se guardan sin recomprimir; fecha de modificación de cada archivo (acotada al rango DOS 1980–2107); nombres UTF-8.
  - **Escritor TAR propio** (POSIX ustar): bloques de 512, suma de verificación, modo 0644, fecha del archivo; los nombres no ASCII o de más de 100 caracteres van en un encabezado **PAX** (`path=` en UTF-8) con un nombre ASCII de respaldo; dos bloques vacíos al final. TAR.GZ = `gzipSync` del TAR.
  - Nombres seguros: un solo segmento (las barras `/` `\` pasan a `_`, sin caracteres de control, `.`/`..` → `file`), duplicados como `nombre (1).ext` (`uniqueNames`).
  - Límites: **500 MB en total** (todo se arma en memoria: entrada + salida) → `fileTooLarge`; 65 535 entradas (ZIP sin ZIP64) → `tooManyFiles`; lista vacía → `invalidRequest`; 10 minutos por trabajo.
- Formatos nuevos `zip`, `tar`, `tgz` en `formats.ts` (categoría `data`, no entran en el conversor). Textos (introducción + 4 preguntas, notas por formato) en los 5 idiomas.

**Verificación**
- 8 tests unitarios: los 3 formatos se extraen con **`unzip` y `tar` del sistema** con los 7 archivos idénticos byte a byte (foto, PDF, nombre con ñ/—/中文, nombre de 138 caracteres, archivo vacío, duplicado y `../../etc/passwd` → `.._.._etc_passwd`); `tar -tvf` muestra nombres UTF-8 y largos, tamaño y fecha (sin `PaxHeaders` visibles) y el tamaño es múltiplo de 512; `unzip -v`: JPG «Stored», texto y PDF «Defl:», fecha; nivel 0 más grande; TAR.GZ = gzip del TAR; errores de lista vacía, tamaño y cantidad.
- `archive-tools.spec.ts` (3 casos, sin llamadas al servidor): ZIP con nombre propio y un PDF dañado incluido tal cual (leído con fflate); TAR.GZ máximo extraído con `tar`; TAR sin opciones de compresión y el mismo archivo dos veces (`photo (1).jpg`).
- Lint, typecheck, tests (833 + 7 saltados sin Gotenberg), build, `check:static` (857 páginas) y `npm run test:e2e` completo (247 + 3 saltados sin Gotenberg) pasan. Captura revisada: 360 px oscuro con TAR.GZ elegido.

**Limitaciones**
- Sin carpetas (se agregan archivos sueltos) y sin ZIP con contraseña (la FAQ lo dice). ZIP64 no: máximo 65 535 archivos y menos de 4 GB (el tope de 500 MB lo evita).

**Siguiente**: 3C.29 (extraer ZIP, TAR y TAR.GZ con protecciones).

## 2026-10-22 00:44 UTC — Fase 3, tarea 3C.29 (extraer ZIP, TAR y TAR.GZ)

**Qué se hizo**
- **Extraer ZIP** (`/es/extraer-zip`, `/en/extract-zip`, `/pt/extrair-zip`, `/fr/extraire-zip`), categoría Archivos comprimidos: entradas **ZIP, TAR, TAR.GZ/TGZ y GZ** (lotes); cada archivo de adentro se descarga por separado (con su ruta) o todos en `fileflect-extracted.zip` **con las mismas carpetas**; con varios archivos comprimidos, cada uno va en una carpeta con su nombre.
- Motor propio `src/lib/archive/extract.ts` en el worker de datos (fflate solo para inflar). El archivo se trata como **hostil**:
  - **Zip slip**: la ruta se rearma solo con segmentos normales (`\` → `/`, sin `..`, `.`, vacíos, letra de unidad ni `/` inicial; caracteres reservados de Windows → `_`; máx. 32 niveles y 255 caracteres por segmento). Ninguna ruta puede salir de la carpeta.
  - **Enlaces y especiales**: enlaces simbólicos de ZIP (modo Unix en los atributos externos) y de TAR, enlaces duros, FIFOs y dispositivos se **omiten** (se avisa cuántos); nunca se siguen.
  - **Bombas**: tope de **500 MB** descomprimidos y **5000 archivos** (`EXTRACT_LIMITS`). En ZIP se rechaza antes de inflar si el directorio central declara más; al inflar (en streaming, de a 64 KB) se cuenta lo producido y se corta si supera lo declarado o el tope; el GZIP también se cuenta en streaming. Error nuevo `archiveTooLarge`.
  - Integridad: **CRC-32** y tamaño de cada entrada ZIP; TAR con suma de verificación de cada encabezado y corte detectado; ZIP64 leído (registro final y campo extra). Errores nuevos `archiveEncrypted` (ZIP con contraseña), `archiveUnsupported` (métodos que no son store/deflate: bzip2, LZMA, zstd…) y `archiveEmpty` (solo carpetas o enlaces), en 5 idiomas.
  - Nombres: marca UTF-8, campo extra Info-ZIP Unicode Path y, si no, **página de códigos 437** (ZIP de Windows antiguos: `a\xA4o.txt` → `año.txt`). TAR: ustar con prefijo, PAX (`path=`) y nombres largos GNU (`L`). GZ suelto: nombre guardado en el encabezado (FNAME) o el del archivo sin `.gz`.
- Fixtures nuevos con **`scripts/fixtures/archives.py`** (zipfile/tarfile/gzip de Python, independientes de fflate): `archive.{zip,tar,tar.gz}`, `text.txt.gz`, `legacy-cp437.zip` y en `corrupt/`: `zip-slip.zip`, `symlink.zip`, `links.tar`, `bomb-declared.zip`, `lying-size.zip`, `encrypted.zip`, `truncated.{zip,tar.gz}`.
- **Arreglo de `ToolShell`** (afecta a todas las herramientas): un mensaje de error largo en la lista de resultados quedaba en una sola línea y **desbordaba horizontalmente a 360 px**; ahora va debajo del nombre y se ajusta. El nombre truncado muestra la ruta completa en `title`.
- **Prueba inestable corregida**: `add-text-to-image` y `watermark-image` marcaban con `check({ force: true })` un radio `sr-only` de 1 px y a veces el clic no lo cambiaba; ahora hacen clic en la celda visible (`label[title=…]`) y comprueban que quedó marcado (20/20 en 5 repeticiones).

**Verificación**
- 13 tests unitarios: los 3 fixtures de Python con todos los archivos byte a byte (carpetas, UTF-8, vacío, PNG y PDF; nombre de > 255 caracteres en TAR); GZ con nombre del encabezado; CP437; ida y vuelta con el escritor de 3C.28; zip slip (6 rutas, ninguna con `..`, `\` ni absoluta); enlace simbólico omitido y TAR con 4 especiales omitidos; bomba declarada → `archiveTooLarge`, tamaño mentido → `fileDamaged`; bombas reales con límites reducidos en ZIP, TAR.GZ y GZ y por cantidad de archivos; contraseña, cortados (ZIP, TAR.GZ, TAR), PNG, vacío, un byte alterado (CRC) y bzip2 → errores claros; `safePath`, detección y CRC-32 de referencia.
- `archive-tools.spec.ts` (+3 casos, sin llamadas al servidor): ZIP → 5 archivos y ZIP de descarga con las carpetas; TAR.GZ + GZ juntos en carpetas por archivo, byte a byte; 6 archivos hostiles a la vez → 8 archivos seguros, aviso de 4 omitidos y los mensajes de bomba, contraseña y dañado.
- Lint, typecheck, tests (847 + 7 saltados sin Gotenberg), build, `check:static` (862 páginas) y `npm run test:e2e` completo (249/250 en la primera corrida: falló la prueba inestable de arriba, ya corregida). Capturas revisadas: 360 px claro y oscuro con resultados y errores (sin desborde: `scrollWidth` 360).

**Limitaciones**
- No se extraen 7Z ni RAR (3C.30), ni ZIP con contraseña. Las carpetas vacías no se incluyen. Un TAR cortado justo en el límite de un bloque, entre dos archivos, no se puede distinguir de uno completo sin marca de fin (como en GNU tar).

**Siguiente**: 3C.30 (extraer 7Z y RAR con libarchive.js).

## 2026-10-22 00:57 UTC — Fase 3, tarea 3C.30 (extraer 7Z y RAR)

**Qué se hizo**
- "Extraer ZIP" ahora abre también **7Z y RAR (versiones 4 y 5)**, solo lectura. Formatos nuevos `7z` y `rar` en `formats.ts`; textos (descripción, introducción y FAQ de formatos y límites) actualizados en los 5 idiomas.
- Motor: **libarchive-wasm 1.2.0** (envoltorio MIT de ofk, con **libarchive 3.7.7**, BSD-2-Clause, 600 KB de WASM) en `src/lib/archive/libarchive.ts`, dentro del worker de datos con import diferido (`detect.ts` reconoce las firmas sin cargar nada). Verificado: la página y un ZIP no piden el WASM; un 7Z sí (una petición).
- Se eligió frente a **libarchive.js 2.0.2** (MIT, libarchive 3.7.2): esa versión es más vieja (CVE-2024-26256 y CVE-2024-48957/48958 en el lector RAR) y lanza su propio worker sin límites de tamaño. 7z-wasm (7-Zip) se descartó por la restricción de licencia unRAR.
- Protecciones (las mismas de 3C.29 más):
  - **Instancia nueva de WASM por archivo** (no queda estado de un archivo hostil) y archivo de entrada ≤ **250 MB** (todo vive en el heap de 2 GB del WASM).
  - Tamaño declarado de cada entrada contra el tope (500 MB / 5000 archivos) **antes** de leerla; libarchive nunca escribe más que ese tamaño en el búfer, y si entrega menos → `fileDamaged`.
  - Enlaces simbólicos y duros, dispositivos, sockets y FIFOs se omiten; rutas con `safePath`.
  - 7Z: libarchive termina en silencio si el archivo está cortado antes de la cabecera (va al final), así que se valida el *start header* (CRC de los 20 bytes, posición y CRC de la cabecera siguiente) antes de abrirlo.
  - Entradas o cabeceras cifradas → `archiveEncrypted`; errores de libarchive → `fileDamaged`.
- `next.config.ts`: el `IgnorePlugin` de fs/path/crypto (ramas de Node del cargador de Emscripten) se extiende a libarchive-wasm.
- Fixtures con `scripts/fixtures/archives_7z_rar.py`: 7Z con **py7zr** (LGPL, solo para generarlos); como no hay escritor RAR libre, los RAR son **archivos de prueba del propio libarchive** (BSD, etiqueta v3.7.7) descargados y decodificados; detalle en `tests/fixtures/README.md`.

**Limitación conocida (anotada en la FAQ)**
- Este build de libarchive corre en el locale "C": en los **7Z** (nombres en UTF-16) y en RAR 4 sin marca Unicode, las letras no ASCII de los **nombres** se pierden (`año` → `a_o`); el contenido queda intacto. RAR 5 conserva bien los nombres (incluso emoji). Además libarchive 3.7.7 no tiene las correcciones de 2025 (p. ej. CVE-2025-5914 en RAR); el riesgo queda contenido en el sandbox WASM del worker, sin acceso a la página. Se agregó la tarea **3C.45** para compilar un WASM propio de libarchive 3.8.x con locale UTF-8.
- RAR divididos en partes y archivos con contraseña no se abren.

**Verificación**
- 6 tests unitarios con libarchive real en Node: 7Z de py7zr byte a byte (PNG, PDF, texto, vacío); RAR 5 comprimido validado con el patrón `verify_data` de los tests de libarchive; RAR 4 con enlace omitido; RAR 5 con emoji, enlace duro y simbólico omitidos; 7Z con datos cifrados y con cabecera cifrada, RAR cifrado → `archiveEncrypted`; 7Z y RAR cortados, un byte alterado y entrada de más de 250 MB → error; límites de tamaño y cantidad; firmas.
- `archive-tools.spec.ts` (+1 caso): 7Z + RAR 4 + RAR cifrado + 7Z cortado en Chromium → 7 archivos, aviso de 1 enlace omitido, mensajes de contraseña y dañado, ZIP de descarga con los bytes originales.
- Lint, typecheck, tests (853 + 7 saltados sin Gotenberg), build, `check:static` (862 páginas) y `npm run test:e2e` completo (251 + 3 saltados sin Gotenberg) pasan.

**Siguiente**: 3C.31 (imagen → texto con tesseract.js).

## 2026-10-22 01:16 UTC — Fase 3, tarea 3C.31 (imagen a texto con OCR)

**Qué se hizo**
- **Imagen a texto (OCR)** (`/es/imagen-a-texto`, `/en/image-to-text`, `/pt/imagem-para-texto`, `/fr/image-en-texte`), primera herramienta de la categoría **OCR** (ahora publicada): JPG, PNG, WEBP, BMP, GIF, TIFF, HEIC y AVIF (hasta 50 MB, lotes) → un `.txt` por imagen con vista previa para copiar; idioma español, inglés, portugués, francés o chino simplificado (por defecto, el de la interfaz). Aviso si la confianza media es < 60 %. Error nuevo `ocrNoText` (5 idiomas).
- Motor: **tesseract.js 7.0.0** + **tesseract.js-core 7.0.0** (Apache-2.0) con los modelos **tessdata_best int** de `@tesseract.js-data/*` (MIT/Apache-2.0), modo LSTM. Todo se sirve **desde nuestro dominio**: `scripts/copy-ocr-assets.mjs` (en `prebuild` y `predev`) copia a `public/ocr/` (no se commitea, `.gitignore`) el worker, las 3 variantes LSTM del core (el worker elige según SIMD) y los 5 modelos, en rutas con versión (`src/lib/ocr/assets.ts`; el script falla si no coinciden con lo instalado) y `Cache-Control: immutable` (`next.config.ts`). Sin `workerBlobURL`, sin CDN. Solo se descarga el modelo del idioma elegido (luego tesseract.js lo guarda en IndexedDB).
- `src/lib/ocr/client.ts`: la imagen se decodifica en la página (`createImageBitmap`, orientación EXIF aplicada; TIFF y HEIC pasan antes por el worker de imágenes existente), se pone sobre fondo blanco y se reduce si supera 4000 px. **No se agranda**: al probar, un renglón chino de 48 px ampliado 2× se leía mal (天 → 大), así que se quitó la ampliación. `user_defined_dpi=300`. Una sesión de tesseract por lote; **cancelar** o el **límite de 3 minutos por imagen** terminan el worker (`jobCancelled`/`jobTimedOut`) y la imagen siguiente arranca otro.
- `src/lib/ocr/text.ts`: limpieza del resultado (sin los espacios que tesseract pone entre caracteres chinos, sin espacios finales, máximo una línea en blanco seguida). Nombres repetidos (`scan.png` y `scan.tiff`) → `scan.txt` y `scan-2.txt`.
- ESLint ignora `public/ocr/`.

**Verificación**
- 7 tests unitarios: tamaños, limpieza, versiones de los assets = paquetes instalados, y **OCR real en Node** con los mismos modelos que se sirven: español exacto en las frases con acentos/¿?/números (confianza > 80), foto inglesa torcida y con ruido (≥ 90 % de las palabras y "4821"), chino exacto sin espacios, imagen en blanco → vacío.
- `ocr-tools.spec.ts` (4 casos en Chromium): PNG + TIFF de 1 bit en español → 2 `.txt` con el texto (`ocr-es.txt`, `ocr-es-2.txt`), **solo se pidió `spa.traineddata.gz` desde `/ocr/` y ninguna petición salió de localhost**; foto inglesa → texto exacto y vista previa; chino + imagen sin texto + PNG cortado en un lote → texto exacto, "未找到文字" y "损坏"; cancelar y volver a ejecutar.
- Lint, typecheck, tests (861 + 7 saltados sin Gotenberg), build, `check:static` (872 páginas) y `npm run test:e2e` completo (255 + 3 saltados sin Gotenberg) pasan. Captura revisada: `/pt/imagem-para-texto` 360 px oscuro con el resultado (sin desborde).

**Limitaciones**
- Solo imágenes (PDF escaneado: 3C.32). La primera vez descarga el core (~3,9 MB, ~2,9 MB con compresión) y el modelo (2–4 MB). Letra manuscrita y fotos muy torcidas dan malos resultados (FAQ). La ü puede salir como u en algunos casos.
- El build copia ~20 MB a `public/ocr` (imagen Docker un poco más grande).

**Siguiente**: 3C.32 (PDF escaneado → PDF con texto buscable y → texto).

## 2026-10-22 01:33 UTC — Fase 3, tarea 3C.32 (OCR de PDF escaneado)

**Qué se hizo**
- **OCR de PDF escaneado** (`/es/ocr-pdf`, mismo slug en todos los idiomas: es el término que se busca), categoría OCR: PDF (hasta **100 páginas** y 100 MB, lotes) → **PDF con texto buscable** (por defecto) o **solo el texto** (.txt). Idioma como en "Imagen a texto". Opción (activada) para dejar como están las páginas que ya tienen texto digital (≥ 20 caracteres): no se reconocen y su texto va tal cual al .txt. Errores nuevos `tooManyPages` y `pdfAlreadySearchable` (todas las páginas ya tenían texto); PDF con contraseña → `pdfAlreadyProtected`.
- Cómo funciona: pdf.js renderiza cada página a **300 dpi** (máx. 4000 px), tesseract la reconoce y con `pdfTextOnly` devuelve una página PDF **solo con el texto invisible** (fuente GlyphLessFont); en el worker de PDF, `src/lib/pdf/ocr-layer.ts` (pdf-lib) la dibuja **encima de la página original**, que no se toca (misma calidad, imágenes, tamaño y rotación), usando `visualPage`/`placeBox` de `stamp.ts` para cuadro de recorte y `/Rotate`. Límite de 3 minutos **por página**; cancelar detiene el motor.
- **Umbral adaptativo (Sauvola)** en todas las herramientas de OCR (`OCR_PARAMETERS` en `text.ts`): la foto de papel gris pegada en una página blanca no daba **ningún texto** con el Otsu global de tesseract (todo el gris quedaba negro); con Sauvola se lee perfecto (confianza 95) y los demás fixtures dan el mismo texto que antes.
- La FAQ de "Imagen a texto" ahora remite a esta herramienta para PDF escaneados (5 idiomas). Textos (introducción + 4 preguntas, opciones) en los 5 idiomas.
- Fixture nuevo `scan-text.pdf` (3 páginas: escaneo en español, foto inglesa en página con `/Rotate 90`, página con texto digital) en `scripts/fixtures/ocr.mjs`.

**Verificación**
- `ocr-layer.test.ts` (OCR real en Node con los modelos que se sirven + pdf.js como lector): las páginas 1 y 2 pasan a tener texto ("papaya", "1.250", "Invoice", "lazy"), la 3 queda igual; mismos tamaños; todas las palabras caen dentro de la página vista por el lector y en la página girada las líneas se leen de arriba abajo y de izquierda a derecha; rotación 90 conservada; PDF dañado, cantidad de capas incorrecta y capa inválida → errores.
- `ocr-tools.spec.ts` (+3 casos): `scan-text.pdf` → `scan-text-ocr.pdf` con 3 páginas, rotaciones [0, 90, 0], mismos tamaños y **misma cantidad de imágenes**, texto buscable en las páginas escaneadas y la digital igual, sin peticiones fuera de localhost; salida .txt con el texto de la foto y el de la página digital, `document.pdf` (digital) → .txt, PDF cortado → "damaged", y como PDF buscable → "already has text"; PDF de 101 páginas → rechazado antes del OCR.
- Lint, typecheck, tests (864 + 7 saltados sin Gotenberg), build, `check:static` (877 páginas) y `npm run test:e2e` completo (258 + 3 saltados sin Gotenberg) pasan.

**Limitaciones**
- El texto invisible sigue el diseño que detecta tesseract: columnas complejas o tablas pueden quedar en un orden de lectura raro al copiar. Sin corrección de páginas torcidas ni de orientación (una página escaneada de costado sin `/Rotate` no se lee). Unos segundos por página en el navegador.

**Siguiente**: 3C.33 (EPUB → HTML/TXT y EPUB → PDF).

## 2026-10-22 01:33 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas: 3C.28 (crear ZIP/TAR/TAR.GZ), 3C.29 (extraer ZIP/TAR/TAR.GZ/GZ con protecciones), 3C.30 (extraer 7Z y RAR con libarchive), 3C.31 (imagen a texto con OCR) y 3C.32 (OCR de PDF escaneado). 5 herramientas nuevas y 2 categorías publicadas (Archivos comprimidos y OCR).
- Arreglos generales: errores largos en la lista de resultados ya no desbordan a 360 px; prueba inestable de marca de agua/texto en imagen corregida; las horas de las entradas de esta ejecución se corrigieron según los commits.
- Nueva tarea 3C.45 (WASM propio de libarchive 3.8 con locale UTF-8).
- `npm run test:e2e` 258/258 (+3 saltados sin Gotenberg) al cierre.

**Siguiente**: 3C.33 (EPUB → HTML/TXT y EPUB → PDF).

## 2026-10-22 02:35 UTC — Fase 3, tarea 3C.33a (convertir EPUB a HTML y TXT)

**Qué se hizo**
- 3C.33 se dividió en 3C.33a (EPUB → HTML/TXT en el navegador) y 3C.33b (EPUB → PDF con Gotenberg).
- **Convertir EPUB** (`/es/convertir-epub`, `/en/epub-converter`, `/pt/converter-epub`, `/fr/convertir-epub`), primera herramienta de la categoría **Libros electrónicos** (ahora publicada): EPUB 2 y 3 sin DRM (hasta 100 MB, lotes) → **HTML** (una sola página: título, autores, índice, capítulos en el orden del *spine*, imágenes incluidas como `data:` o, si se desmarca la opción, reemplazadas por su texto alternativo) o **texto plano** (párrafos, títulos, listas con `- `, celdas separadas por tabulación; con vista previa). Formato nuevo `epub` en `formats.ts` y en `detect.ts` (entrada `mimetype` = `application/epub+zip`).
- `src/lib/ebook/epub.ts` (worker de datos): el ZIP pasa por el lector hostil de 3C.29 (`extractArchive` con tope de **300 MB descomprimidos y 5000 entradas**, rutas seguras, CRC). `container.xml`, `encryption.xml` y el OPF se leen con fast-xml-parser; **si declaran `<!ENTITY` se rechazan** (`fileDamaged`). Los `href` del manifiesto se resuelven con `resolveHref` (decodifica `%20`, no puede salir del libro ni apuntar a URLs). Las imágenes solo se aceptan si su tipo declarado es `image/*` **y** el contenido lo confirma (`detectFormat`).
- **DRM**: `rights.xml` (Adobe), `license.lcpl` (LCP), `sinf.xml` (Apple) o un `encryption.xml` con algoritmos que no sean la ofuscación de fuentes (IDPF/Adobe) → error nuevo `ebookDrm` en 5 idiomas.
- `src/lib/ebook/render.ts` (en la página, con import diferido): cada capítulo XHTML se analiza con `DOMParser` **como HTML** (inerte y sin entidades DTD; antes se quitan la declaración XML y el DOCTYPE con subconjunto interno, y los `<a id="x"/>` autocerrados se abren y cierran para que no se traguen el capítulo). Los `id` pasan a `c<n>-<id>` y los enlaces entre capítulos a anclas de la página (`ch2.xhtml#llegada` → `#c2-llegada`); quedan solo enlaces `http(s)`/`mailto`. Las portadas SVG con una sola `<image>` pasan a `<img>`. Se descartan las hojas de estilo del libro, audio, video y formularios; **DOMPurify** sanea cada capítulo y la página lleva una **CSP** `default-src 'none'; img-src data:; style-src 'unsafe-inline'` (no puede pedir nada a la red). Estilos de lectura propios claro/oscuro.
- Fixtures con `scripts/fixtures/ebooks.py` (zipfile de Python): `book.epub`, `book-epub2.epub` y 4 corruptos (DRM, cortado, sin contenedor, entidades). Textos (introducción + 4 preguntas, opciones) en los 5 idiomas.

**Verificación**
- 11 tests unitarios: metadatos y orden del spine (sin el `nav`), EPUB 2 con UTF-16 y ruta con espacios, imágenes verificadas por contenido, DRM/sin contenedor/entidades/cortado/no ZIP, ofuscación de fuentes aceptada, ruta `../../etc/passwd` del manifiesto ignorada, `resolveHref`; HTML (jsdom): CSP, índice, enlaces que llegan a un `id` existente, sin scripts/eventos/`javascript:`/imagen remota/CSS del libro, imágenes `data:` o texto alternativo; texto plano con listas, tablas y `&#160;`.
- `ebook-tools.spec.ts` (3 casos en Chromium, salida leída con jsdom): EPUB 3 → HTML seguro sin peticiones fuera de localhost y `pwned` sin definir; EPUB 2 → TXT con vista previa; lote con DRM, cortado y con entidades → mensajes claros y el libro bueno se convierte. Sin llamadas al servidor.
- Lint, typecheck, tests (876 + 7 saltados sin Gotenberg), build, `check:static` (887 páginas) y `npm run test:e2e` completo (261 + 3 saltados sin Gotenberg) pasan. Capturas revisadas: la herramienta a 360 px oscuro (`scrollWidth` 360) y el HTML generado abierto en Chromium (índice, portada, imágenes y tabla).

**Limitaciones**
- Sin estilos del libro (fuentes, colores), audio ni video; MOBI/AZW no (sin motor con licencia aceptable). Todo el libro se arma en la memoria de la pestaña.

**Siguiente**: 3C.33b (EPUB → PDF con Gotenberg).

## 2026-10-22 02:55 UTC — Fase 3, tarea 3C.33b (EPUB a PDF) — 3C.33 TERMINADA

**Qué se hizo**
- **EPUB a PDF** (`/es/epub-a-pdf`, `/en/epub-to-pdf`, `/pt/epub-para-pdf`, `/fr/epub-en-pdf`), categoría Libros electrónicos, `engine: "server"`: EPUB sin DRM (lotes) → PDF **A4 o Carta**, con portada, índice, **cada capítulo en una página nueva** e imágenes (opción para quitarlas si la página supera el límite).
- Cómo funciona: el libro se lee y se arma en el navegador con el mismo código de 3C.33a (DRM y libros dañados se rechazan **antes de subir nada**); solo se sube la página HTML armada a la ruta nueva `POST /api/convert/epub`, que usa `printUpload` + **`htmlToPrintHtml` (parse5)**: el servidor **no confía** en el saneado del navegador y vuelve a quitar scripts, URLs remotas, etc., con la misma CSP y `@page` de 3C.26a. Se conservan los `id`, los enlaces `#c2-…` y las imágenes `data:image/png|jpeg|gif|webp`. Gotenberg/Chromium imprime.
- `render.ts`: reglas `@media print` (12 pt, sin márgenes extra, `break-before: page` por capítulo, imágenes sin cortar, títulos sin quedar solos al pie).
- Límite: la página armada hasta **50 MB** (tope de la herramienta; el plan gratuito la limita a 15 MB). La estadística del servidor registra el tamaño de la página subida, no el del EPUB. Textos (introducción + 4 preguntas) en los 5 idiomas.

**Verificación**
- `route.test.ts` (2): la página de `book.epub` **con un `<img>` remoto y un `<script>` agregados a mano** (subida manipulada) → CSP antes de los estilos, A4, anclas e `id` conservados, 2 imágenes `data:`, `break-before`, sin script ni URL remota; registro con `tool: "epub-to-pdf"`, `from: "epub"`; contenido binario rechazado sin llamar a Gotenberg.
- `gotenberg-tools.spec.ts` (+2) con **Gotenberg 8 real** (Docker en esta ejecución): `book.epub` en Carta → `book.pdf` de 612 pt de ancho, **4 páginas** (índice, portada y un capítulo por página), título del PDF, texto (pdf.js) e imágenes; solo se sube `book.html` sin scripts ni el ZIP. Sin Gotenberg: EPUB con DRM y cortado → mensajes claros y **ninguna llamada a la ruta**.
- Lint, typecheck, tests (879 + 7 saltados sin Gotenberg), build, `check:static` (892 páginas) y `npm run test:e2e` completo con Gotenberg (266/266) pasan; con `GOTENBERG_URL` también los unitarios (885 + 1 saltado: veraPDF).

**Limitaciones**
- Necesita Gotenberg. Libros con muchas imágenes pueden superar 15 MB (gratis) una vez armados: la FAQ sugiere quitar las imágenes. Sin las fuentes ni la maquetación del libro.

**Siguiente**: 3C.34 (HTML/Markdown → EPUB).

## 2026-10-22 03:15 UTC — Fase 3, tarea 3C.34 (crear EPUB desde HTML o Markdown)

**Qué se hizo**
- **Crear EPUB** (`/es/crear-epub`, `/en/create-epub`, `/pt/criar-epub`, `/fr/creer-epub`), categoría Libros electrónicos: archivos `.md`/`.markdown`/`.txt` (como Markdown) y `.html`/`.htm` (hasta 20 MB cada uno, varios = capítulos en el orden de la lista) o Markdown pegado → **un EPUB 3** con título (si queda vacío, el primer título), autor opcional e idioma (es/en/pt/fr/zh; el índice del libro va en ese idioma). Corre en la página con import diferido (marked, DOMPurify, fflate).
- Generador propio `src/lib/ebook/build.ts`: cada entrada se sanea con DOMPurify (sin scripts, eventos, formularios, iframes, audio/video), se **divide en capítulos en cada `<h1>` de primer nivel**, los títulos reciben `id` al estilo GitHub (`[enlace](#segunda-parte)` funciona aunque el destino quede en otro capítulo: `chapter-2.xhtml#segunda-parte`), y se serializa con `XMLSerializer` como XHTML bien formado. Solo quedan enlaces `http(s)`/`mailto` y anclas internas.
- **HTML4 → HTML5** (lo pidió EPUBCheck: `align` de las tablas de marked es inválido en EPUB 3): `align` → `text-align`, `center`/`font`/`big`/`strike`/`tt`/`acronym`/`dir`/`marquee` renombrados, `a[name]` → `id`, y se quitan atributos de presentación (`bgcolor`, `border`, `valign`, `width`/`height` fuera de imágenes…).
- Imágenes: solo las `data:` cuyo contenido es PNG/JPG/GIF/WEBP (verificado por bytes; **SVG no**, puede llevar scripts) pasan a `OEBPS/images/` (sin repetir las iguales); las remotas o relativas se reemplazan por su texto alternativo (un libro no debe pedir nada a internet).
- Paquete: `mimetype` **primero y sin comprimir, sin campos extra** (OCF), `container.xml`, OPF 3.0 (`urn:uuid` aleatorio, `dcterms:modified`), `nav.xhtml` y además `toc.ncx` para lectores EPUB 2, `style.css` y los capítulos.
- Textos (introducción + 4 preguntas, opciones) en los 5 idiomas. **EPUBCheck 5.2.1** (W3C, BSD-3) como validador opcional de los tests (`EPUBCHECK_JAR`), anotado en `docs/dependencies.md`.
- `render.ts`: arreglo menor del texto plano (un espacio después de la tabulación entre celdas).

**Verificación**
- 5 tests unitarios: orden del ZIP con `mimetype` almacenado y sin extra (leyendo los encabezados locales); lectura de vuelta con `readEpub` (metadatos con caracteres a escapar, 3 capítulos, enlace entre capítulos, PNG byte a byte, `dcterms:modified`, NCX); cada capítulo XHTML parseado como XML sin errores y sin scripts/eventos/imagen remota/SVG; conversión de HTML4; título desde el primer encabezado, idioma inválido → `und`, entrada vacía → error; **EPUBCheck sin errores ni advertencias**.
- `ebook-tools.spec.ts` (+2): `document.md` + `page.html` con título, autor e idioma portugués → `Libro de prueba.epub` validado con jsdom en modo XML (contenedor, OPF, spine, índice "Sumário", tabla, sin nada inseguro, `pwned` sin definir) y **EPUBCheck** con `EPUBCHECK_JAR`; Markdown pegado con 2 capítulos y enlace interno; texto sin contenido → error.
- Lint, typecheck, tests (884 + 8 saltados), build, `check:static` (897 páginas) y `npm run test:e2e` completo con Gotenberg y EPUBCheck (268/268) pasan.

**Limitaciones**
- Sin portada como imagen ni metadatos extra (editorial, ISBN); imágenes enlazadas no se incluyen; MOBI/AZW3 no (Kindle acepta EPUB con "Enviar a Kindle", lo dice la FAQ).

**Siguiente**: medición de Lighthouse después de 3C.34 (indicada en el plan) y luego 3C.35 (audio).

## 2026-10-22 03:45 UTC — Fase 3, medición de Lighthouse después de 3C.34

- `docs/perf/2026-10-22-3C34.md`: 21 páginas (6 nuevas en el script: extraer ZIP, imagen a texto, hojas de cálculo y las 3 de libros electrónicos), mediana de 3, móvil. Todas **96–98**, accesibilidad y SEO 100, **CLS 0**; las herramientas nuevas cargan 165–166 KB de JS como las demás (los motores se descargan al ejecutar). Sin correcciones necesarias.

**Siguiente**: 3C.35 (audio: capacidades del navegador y conversión con WebCodecs + mediabunny).

## 2026-10-22 03:40 UTC — Fase 3, tarea 3C.35a (convertir audio)

**Qué se hizo**
- 3C.35 se dividió en 3C.35a (conversor de audio con mediabunny) y 3C.35b (AIFF de entrada y salida, que mediabunny no tiene).
- **Convertir audio** (`/es/convertir-audio`, `/en/audio-converter`, `/pt/converter-audio`, `/fr/convertir-audio`), primera herramienta de la categoría **Audio** (ahora publicada): entradas **MP3, WAV, FLAC, OGG (Vorbis/Opus), Opus, M4A/AAC y WebM** (lotes; 200 MB gratis / 500 MB Pro, máximo 3 horas) → **MP3, WAV, FLAC, OGG (Opus) o M4A (AAC)**, calidad 96–320 kbps en los formatos con pérdida (192 por defecto; Opus hasta 256). Formatos nuevos `mp3`, `wav`, `flac`, `ogg`, `m4a`, `aac`, `webm` en `formats.ts`.
- Motor `src/lib/audio/convert.ts` (en la página, import diferido): **mediabunny 1.62.0** (MPL-2.0) lee y escribe los contenedores y decodifica con **WebCodecs**; codifica Opus con WebCodecs y, cuando el navegador no tiene codificador, con las extensiones WASM oficiales, cada una en su propio worker y cargada solo al elegir ese formato: **MP3 con LAME 3.100** (LGPL), **FLAC con libFLAC** (BSD), **AAC con el codificador nativo de FFmpeg** (LGPL, compilado sin `--enable-gpl`). Licencias en `docs/dependencies.md`. `src/lib/audio/options.ts` (sin mediabunny) define cómo se codifica cada salida: WAV/FLAC en 16 bits a la frecuencia original, MP3 a 44,1 kHz, Opus a 48 kHz; los destinos con pérdida se recodifican siempre (la calidad elegida se aplica aunque la entrada ya sea MP3).
- **Capacidades del navegador**: si falta WebCodecs, o si el navegador no decodifica AAC (pasa en Chromium sin códecs propietarios, el de las pruebas), la herramienta lo avisa antes de convertir; además cada archivo comprueba `track.canDecode()` y falla con el error nuevo `audioCodecUnsupported`. Errores nuevos también `noAudioTrack` y `audioTooLong` (5 idiomas).
- Cancelar o el **límite de 15 minutos por archivo** detienen la conversión (`conversion.cancel()`); solo se usa la pista de audio principal (el video se descarta).
- Fixtures con `scripts/fixtures/audio.sh` (**ffmpeg del sistema**, solo para tests): 2 s estéreo con 440 Hz a la izquierda y 660 Hz a la derecha en los 7 formatos de entrada, M4A cortado y texto con extensión .mp3.

**Verificación**
- 3 tests unitarios de `audioPlan`.
- `audio-tools.spec.ts` (3 casos en Chromium, salida validada con **ffprobe/ffmpeg**, independientes de mediabunny y del navegador): WAV + FLAC + OGG Vorbis + Opus + WebM + MP3 → 6 MP3 a 44,1 kHz, estéreo, 2,0 s (±0,15), 192 kbps (±20) y **el tono correcto en cada canal** (cruces por cero: 440/660 Hz ±15); MP3 → WAV (PCM 16 bits), FLAC, OGG Opus 48 kHz y M4A AAC con las mismas comprobaciones; M4A cortado, texto disfrazado y M4A AAC (sin decodificador en este Chromium) → mensajes claros y aviso visible, el WAV del mismo lote sí se convierte. Sin llamadas al servidor.
- La página carga el mismo JS que las demás herramientas (~525 KB sin comprimir, igual que "Convertir EPUB"): mediabunny y los codificadores no entran en la carga inicial. Captura a 360 px oscuro sin desborde (`scrollWidth` 360).
- Lint, typecheck, tests (888 + 8 saltados), build, `check:static` (907 páginas) y `npm run test:e2e` completo con Gotenberg y EPUBCheck (271/271) pasan.

**Limitaciones**
- AAC/M4A de entrada depende del navegador (Chrome, Edge y Safari sí; Chromium sin códecs propietarios no). El resultado se arma en memoria (de ahí el límite de 3 horas). Las etiquetas (título, artista) se copian cuando el contenedor de salida las admite; las carátulas no se probaron. Sin AIFF todavía (3C.35b).

**Pendiente del dueño (informativo)**
- LAME y el codificador AAC de FFmpeg son **LGPL** y van compilados a WASM dentro de las extensiones de mediabunny (sin modificar). Para cumplir la LGPL alcanza con indicar en la página de licencias/créditos que se usan, con enlace a su código fuente (LAME pide además un enlace a lame.sourceforge.io). Queda anotado para la página de créditos.

**Siguiente**: 3C.35b (AIFF de entrada y salida).

## 2026-10-22 03:45 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas: 3C.33a (EPUB → HTML/TXT), 3C.33b (EPUB → PDF con Gotenberg), 3C.34 (crear EPUB desde Markdown/HTML, validado con EPUBCheck), medición de Lighthouse después de 3C.34 (21 páginas, 96–98, CLS 0) y 3C.35a (convertir audio con mediabunny). 4 herramientas nuevas y 2 categorías publicadas (Libros electrónicos y Audio).
- En esta ejecución hubo Docker: pruebas con **Gotenberg 8 real**; también **EPUBCheck 5.2.1** (Java) y **ffmpeg/ffprobe** del sistema como validadores independientes. `npm run test:e2e` 271/271 al cierre.

**Siguiente**: 3C.35b (AIFF de entrada y salida en "Convertir audio").

## 2026-10-22 04:25 UTC — Fase 3, tarea 3C.35b (AIFF en "Convertir audio") — 3C.35 TERMINADA

**Qué se hizo**
- `src/lib/audio/aiff.ts` (funciones puras, sin mediabunny): lector y escritor propios de **AIFF / AIFF-C**. Entrada: se recorren los chunks (`COMM`, `SSND`, con relleno par y tamaños fuera de rango controlados), frecuencia en **float extendido de 80 bits**, PCM 8/16/24/32 bits big-endian (`NONE`, `twos`) o little-endian (`sowt`); se reescribe como WAV PCM little-endian (el de 8 bits con signo pasa a 16 bits) que mediabunny lee. Salida: mediabunny escribe WAV 16 bits y se reescribe como AIFF (`FORM`/`AIFF`, `COMM`, `SSND`).
- `convert.ts`: si los primeros 12 bytes son `FORM`+`AIFF`/`AIFC`, el archivo se convierte a WAV antes de abrirlo; la salida `aiff` usa el plan de WAV y se reescribe al final. Formato nuevo `aiff` (`.aiff`, `.aif`, `.aifc`) en `formats.ts`; registro: entrada y salida AIFF.
- AIFF-C comprimidos (μ-law, A-law, IMA…) → `unsupportedFormat` ("Este formato no se puede convertir así"); cortado (menos datos que los cuadros declarados) o sin `COMM`/`SSND` → `fileDamaged`.
- Textos: opción "AIFF (sin pérdida)", descripción, introducción y una pregunta nueva sobre AIFF en los 5 idiomas.
- Fixtures (`scripts/fixtures/audio.sh`, ffmpeg del sistema): `audio.aiff` (16 bits), `audio-24.aif` (1 s, 24 bits), `audio.aifc` (`sowt`), `corrupt/audio-truncated.aiff` y `corrupt/audio-ulaw.aifc`.

**Verificación**
- 8 tests unitarios: float de 80 bits ida y vuelta (8 kHz…192 kHz) y bytes exactos de 44 100 Hz; AIFF y AIFF-C `sowt` dan **las mismas muestras que el WAV** de referencia; 24 bits conservados; 8 bits con signo; cortado, μ-law, WAV, encabezado incompleto y tamaño de chunk enorme rechazados; WAV → AIFF → WAV idéntico muestra a muestra.
- `audio-tools.spec.ts` (+2, salida validada con **ffprobe/ffmpeg**): AIFF + AIFF 24 bits + AIFF-C → 3 MP3 (44,1 kHz, estéreo, duración y tono correcto en cada canal); MP3 → AIFF (`pcm_s16be`, 22 050 Hz, 2 s, tonos); AIFF cortado y AIFF-C μ-law → mensajes claros y el bueno se convierte. Sin llamadas al servidor.
- Lint, typecheck, tests (896 + 8 saltados), build y `check:static` (907 páginas) pasan; `npm run test:e2e` completo: 269 pasan y 4 saltados (en esta ejecución no hay Gotenberg ni EPUBCheck).

**Limitaciones**
- Salida AIFF siempre en 16 bits (como WAV/FLAC). AIFF-C comprimido no se lee. Los chunks de texto (`NAME`, `AUTH`) y marcadores no se copian.

**Siguiente**: 3C.36 (audio: recortar, unir, bitrate/frecuencia/canales, normalizar).
- La tarea 3C.36 se dividió en 3C.36a–d en PLAN.md.

## 2026-10-22 04:45 UTC — Fase 3, tarea 3C.36a (recortar audio)

**Qué se hizo**
- **Recortar audio** (`/es/recortar-audio`, `/en/trim-audio`, `/pt/cortar-audio`, `/fr/couper-audio`), categoría Audio: un archivo (mismas entradas que "Convertir audio", AIFF incluido; 200 MB gratis / 500 MB Pro, 3 horas) → el tramo entre **Inicio** y **Fin**, con **fundido de entrada y/o de salida** de 2 s (cada uno como máximo la mitad del tramo), en MP3, WAV, FLAC, OGG (Opus), M4A (AAC) o AIFF; por defecto, el formato de entrada si se puede escribir.
- Al elegir el archivo se lee la duración (`probeAudio`, carga el motor) y se muestra un reproductor `<audio>` con botones "Usar posición actual" para cada campo (con `aria-label` distinto). Tiempos como `s`, `m:ss.d` o `h:mm:ss.d` (punto o coma); el botón queda deshabilitado y la pista explica el formato si el rango no es válido.
- Motor: `convertAudio` acepta `edit: { trim, fadeIn, fadeOut }` → `Conversion` de mediabunny con `trim` (recodifica siempre, para cortar exacto a la muestra y no en los límites de paquetes) y `process` que aplica la ganancia en float planar (los timestamps que llegan a `process` ya son relativos al inicio del resultado: verificado en el código de mediabunny y en la prueba). `openAudio` reúne las comprobaciones (AIFF → WAV, códec decodificable, duración ≤ 3 h) para el conversor, el recorte y `probeAudio`.
- `src/lib/audio/time.ts`: `parseTime`, `formatTime`, `validRange`, `fadeLengths`, `fadeGain`. Error nuevo `audioRangeInvalid` (5 idiomas). `components/tools/audio/shared.ts`: extensiones y límite de tiempo comunes a las herramientas de audio.
- Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas.

**Verificación**
- 5 tests unitarios de tiempos, rangos y fundidos.
- `audio-tools.spec.ts` (+3, validado con ffprobe/ffmpeg): WAV 0:00.5–1.5 → WAV de **1,000 s (±5 ms)** con los dos tonos, y 1–2 s → MP3; AIFF con fundidos → AIFF de 2 s con nivel < 10 % en los primeros y últimos 0,1 s, ~50 % a 0,5 s y completo en el centro; tiempos fuera del audio, invertidos o con errores (`1:75`) deshabilitan la acción; un texto disfrazado de MP3 muestra el error.
- Captura a 360 px oscuro revisada (`scrollWidth` 360). Lint, typecheck, tests (902 + 8 saltados), build, `check:static` (912 páginas) y `npm run test:e2e` completo (272 pasan, 4 saltados sin Gotenberg/EPUBCheck).

**Limitaciones**
- Un solo tramo por archivo (no se quitan partes del medio). El reproductor depende del navegador (algunos no reproducen FLAC o AIFF), pero los tiempos se pueden escribir igual.

**Siguiente**: 3C.36b ("Ajustar audio": canales, frecuencia y bitrate).

## 2026-10-22 05:00 UTC — Fase 3, tarea 3C.36b (ajustar audio)

**Qué se hizo**
- **Ajustar audio** (`/es/ajustar-audio`, `/en/adjust-audio`, `/pt/ajustar-audio`, `/fr/ajuster-audio`), categoría Audio, en lotes: **canales** (como el original, mono o estéreo; mono mezcla los dos canales), **frecuencia** (como el original, 22,05, 44,1 o 48 kHz), **formato** (MP3, WAV, FLAC, OGG Opus, M4A AAC, AIFF) y **bitrate** en los formatos con pérdida (128 kbps por defecto, pensado para voz). MP3 no ofrece "como el original" (siempre se remuestrea, 44,1 kHz por defecto) y OGG (Opus) muestra que siempre usa 48 kHz.
- Motor: `AudioEdit` suma `channels` y `sampleRate` → `numberOfChannels`/`sampleRate` de la `Conversion` de mediabunny (recodifica siempre que se piden). `audioSampleRates` en `options.ts`. Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas.

**Verificación**
- `audio-tools.spec.ts` (+2, ffprobe/ffmpeg): WAV + FLAC → 2 MP3 **mono, 48 kHz, 96 kbps (±10)**, 2 s, con señal; MP3 → WAV estéreo 44,1 kHz con los tonos correctos en cada canal; aviso de Opus; MP3 → M4A AAC a 22,05 kHz estéreo con tonos.
- Lint, typecheck, tests (903 + 8 saltados), build, `check:static` (917 páginas) y `npm run test:e2e` completo (274 pasan, 4 saltados sin Gotenberg/EPUBCheck).

**Limitaciones**
- Sin profundidad de 24 bits en la salida (16 bits como el conversor). Más de 2 canales se mezclan a estéreo o mono solo si se elige; "como el original" los mantiene cuando el formato lo admite.

**Siguiente**: 3C.36c ("Normalizar volumen").

## 2026-10-22 05:20 UTC — Fase 3, tarea 3C.36c (normalizar volumen)

**Qué se hizo**
- **Normalizar volumen** (`/es/normalizar-audio`, `/en/normalize-audio`, `/pt/normalizar-audio`, `/fr/normaliser-audio`), categoría Audio, en lotes: modo **volumen medio** (RMS a −16 dBFS, con el pico limitado a −1 dBFS) o **pico** (el punto más fuerte a −1 dBFS); salida en el **mismo formato** de cada archivo (por defecto) o en uno elegido, con bitrate. Cada resultado muestra la ganancia aplicada (formateada según el idioma).
- Dos pasadas: `measureLevels` recorre el audio decodificado con `AudioSampleSink` (solo los cuadros dentro del rango, por si se combina con recorte) y `src/lib/audio/normalize.ts` calcula la ganancia (`normalizeGain`, tope de **+30 dB** para no amplificar ruido; silencio → error nuevo `audioSilent`). La segunda pasada aplica una sola ganancia con el mismo `process` de los fundidos (el progreso se reparte 40 % medir / 60 % convertir). Límite de tiempo de 20 minutos por archivo.
- Fixture nuevo `silence.wav` (1 s, generado en `audio.sh`). Textos (introducción + 4 preguntas, interfaz, error) en los 5 idiomas.

**Verificación**
- 4 tests unitarios (pico arriba y abajo, RMS a −16 dB, límite de pico en señales con picos, tope de +30 dB, silencio, medidor por bloques).
- `audio-tools.spec.ts` (+2, validado con **`volumedetect` de ffmpeg** y ffprobe): WAV + AIFF en modo pico → mismos formatos con **pico −1,0 dB (±0,2)**, ganancia "+17,…" mostrada, duración exacta y tonos; FLAC en volumen medio → MP3 con **media −16 dB (±1)** y pico ≤ −0,5 dB; `silence.wav` → "El audio está en silencio".
- Lint, typecheck, tests (908 + 8 saltados), build, `check:static` (922 páginas) y `npm run test:e2e` completo (276 pasan, 4 saltados sin Gotenberg/EPUBCheck).

**Limitaciones**
- El volumen medio es RMS sin ponderar, no LUFS (EBU R128): similar en voz, puede diferir en música con muchos graves. No es un compresor (no cambia la dinámica).

**Siguiente**: 3C.36d ("Unir audio").

## 2026-10-22 05:55 UTC — Fase 3, tarea 3C.36d (unir audio) — 3C.36 TERMINADA

**Qué se hizo**
- **Unir audio** (`/es/unir-audio`, `/en/join-audio`, `/pt/juntar-audio`, `/fr/fusionner-audio`), categoría Audio: 2 o más archivos (formatos mezclados, AIFF incluido) en el orden de la lista → un solo MP3, WAV, FLAC, OGG (Opus), M4A (AAC) o AIFF, con **silencio opcional entre pistas** (0,5, 1 o 2 s). Nombre del resultado: `<primero>-joined.<ext>` (sufijo traducido). Si un archivo falla, el error dice cuál (`InputFileError`).
- `ToolShell`: opción nueva `reorderable` (número de posición y botones subir/bajar con las etiquetas existentes `moveUp`/`moveDown`); el orden es el que recibe `process`.
- Motor `joinAudio` (en `convert.ts`, en streaming, sin guardar el audio decodificado): parámetros comunes = la mayor frecuencia y la mayor cantidad de canales de las entradas (máximo estéreo; MP3 a 44,1 kHz y Opus a 48 kHz como en el conversor). Cada entrada pasa por su propia `Conversion` de mediabunny que decodifica y remuestrea/mezcla; su `process` reenvía cada muestra (con timestamp continuo calculado por cuadros escritos, sin huecos ni solapes) a un único `AudioSampleSource` de la salida. La salida propia de esas conversiones va a un `NullTarget` en WAV (mediabunny no finaliza un WAV vacío, por eso las muestras siguen pasando: PCM, barato, no se guarda nada). Límite: 3 horas en total; 30 minutos por trabajo.
- Refactor: `planarData`/`planarSample` compartidos entre la ganancia (fundidos/normalización) y la unión. Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas.

**Verificación**
- `audio-tools.spec.ts` (+3, ffprobe/ffmpeg): AIFF + AIFF 24 bits + MP3, **reordenados con los botones**, con 1 s de silencio → WAV 22 050 Hz estéreo de **7 s (±0,15)**; silencio real en los huecos (RMS < 2 %) y **tonos 440/660 Hz en cada tramo**; Opus 48 kHz + WAV 22 kHz → MP3 44,1 kHz de 4 s con tonos; un texto disfrazado de MP3 → error que nombra `not-audio.mp3` y sin descarga; un solo archivo → acción deshabilitada con aviso.
- Lint, typecheck, tests (909 + 8 saltados), build, `check:static` (927 páginas) y `npm run test:e2e` completo: 279/279 (+4 saltados sin Gotenberg/EPUBCheck). En una corrida anterior la prueba de "Normalizar volumen" (modo pico) falló una vez y pasó al reintento; no se reprodujo en 60 repeticiones de todo `audio-tools.spec.ts` (probablemente el evento `download` de Chromium bajo carga, ya conocido desde 3B.7).

**Limitaciones**
- El MP3 de entrada suma unas centésimas de relleno del decodificador (el total puede verse 0,1 s más largo). Sin fundido cruzado entre pistas.

**Siguiente**: 3C.37 (video: convertir entre MP4, WebM, MOV y MKV según el navegador, y extraer audio).

## 2026-10-22 05:55 UTC — Fin de la ejecución (tope de 5 tareas)

- Hechas: 3C.35b (AIFF en "Convertir audio"), 3C.36a (Recortar audio), 3C.36b (Ajustar audio), 3C.36c (Normalizar volumen) y 3C.36d (Unir audio). 4 herramientas nuevas en la categoría Audio (ahora 5). En esta ejecución no hubo Gotenberg ni EPUBCheck (4 pruebas de navegador saltadas); ffmpeg/ffprobe del sistema validaron todas las salidas de audio.

**Siguiente**: 3C.37 (video).

## 2026-10-22 06:50 UTC — Fase 3, tarea 3C.37a (convertir video)

**Qué se hizo**
- 3C.37 se dividió en 3C.37a (conversor de video) y 3C.37b (extraer audio de un video).
- **Convertir video** (`/es/convertir-video`, `/en/video-converter`, `/pt/converter-video`, `/fr/convertir-video`), primera herramienta de la categoría **Video** (ahora publicada): entradas **MP4 (.m4v), MOV, MKV y WebM** en lotes (200 MB gratis / 500 MB Pro, máximo 2 horas por archivo, 30 minutos por trabajo) → **MP4, WebM, MOV o MKV**. Formatos nuevos `mp4`, `mov`, `mkv` en `formats.ts`.
- Motor `src/lib/video/convert.ts` (import diferido, mediabunny 1.62.0 + WebCodecs; AAC con la extensión WASM ya usada por el audio). `src/lib/video/options.ts` (sin mediabunny, con tests) decide por pista: **se copia sin recomprimir** si el contenedor de destino admite el códec (MP4 solo copia H.264/HEVC, para que se vea en todos lados; MOV H.264/HEVC/ProRes; WebM VP8/VP9/AV1 + Opus/Vorbis; MKV casi todo), y si no **se recodifica** en calidad alta con el primer codificador del navegador: MP4 → H.264, o VP9/AV1 si el navegador no tiene H.264 (aviso visible); MOV → solo H.264 (sin respaldo: error claro); WebM → VP9/VP8/AV1 + Opus; MKV → H.264/VP9/AV1 + Opus. Cada resultado dice si se copió o se recodificó y con qué códec.
- `copy: { shiftTolerance: 0.5 }`: el AAC empieza con "priming" antes de 0 s, que MKV/WebM no admiten; mediabunny desplaza todo el archivo manteniendo la sincronía y así la pista se copia (sin eso se descartaba el audio).
- **Archivos cortados**: el índice de un MP4 lista todos los cuadros pero el demuxer se detiene en silencio al final de los datos (salía un video a medias sin error). Ahora se pide el último paquete (`getPacket(Infinity)`) y, si falta o la duración es 0, error `fileDamaged`. Si mediabunny descarta la pista de video o la de audio, error en lugar de una salida sin imagen o sin sonido.
- Errores nuevos (5 idiomas): `noVideoTrack`, `videoCodecUnsupported` (el navegador no decodifica el video, p. ej. H.264 en Chromium sin códecs propietarios), `videoEncoderUnsupported` (p. ej. MOV sin codificador H.264), `videoTooLong`. `ensureEncoder` del audio ahora se exporta.
- Fixtures con `scripts/fixtures/video.sh` (ffmpeg del sistema, solo para tests): 2 s, 320×240, rojo y luego azul, tonos 440/660 Hz; MP4 y MOV (H.264 + AAC), WebM (VP9 + Opus), MKV (VP8 + Vorbis), MP4 cortado y texto con extensión .mp4 (todos < 25 KB).

**Verificación**
- 4 tests unitarios de `videoPlan` (copiar, recodificar, respaldo sin H.264, MOV sin plan).
- `video-tools.spec.ts` (4 casos en Chromium, salida validada con **ffprobe/ffmpeg**: contenedor, códecs, 320×240, 2 s ±0,15, **color promedio del cuadro a 0,5 s (rojo) y 1,5 s (azul)** y **tono de cada canal**): WebM + MKV → 2 MP4 recodificados (VP9 + AAC en este Chromium, H.264 donde haya codificador); MP4 → MOV y → MKV **copiando H.264/AAC** (el Chromium de las pruebas no puede decodificar ni codificar H.264, así que la copia queda demostrada); MKV → WebM copiando VP8/Vorbis; WebM → MOV da "MOV necesita H.264" sin codificador; MP4 cortado, texto disfrazado, un WebM solo de audio y H.264 → WebM sin decodificador dan mensajes claros mientras el MKV del lote se convierte. Sin llamadas al servidor.
- Captura a 360 px oscuro revisada (`scrollWidth` 360). Lint, typecheck, tests (914 + 8 saltados), build, `check:static` (937 páginas) y `npm run test:e2e` completo: 283 pasan, 4 saltados (sin Gotenberg ni EPUBCheck en esta ejecución).

**Limitaciones**
- Depende de WebCodecs del navegador: H.264/HEVC de entrada solo se recodifican donde el navegador los decodifica (Chrome, Edge, Safari); copiar entre MP4/MOV/MKV funciona siempre. AVI, WMV, FLV y 3GP no se leen (requieren `@ffmpeg/core` GPL: decisión del dueño). Solo se conservan la pista de video y la de audio principales (sin subtítulos). Entrada y salida en memoria (de ahí el límite de 500 MB).

**Siguiente**: 3C.37b (extraer audio de un video).

## 2026-10-22 07:20 UTC — Fase 3, tarea 3C.37b (extraer audio de un video) — 3C.37 TERMINADA

**Qué se hizo**
- **Extraer audio de un video** (`/es/extraer-audio-de-video`, `/en/extract-audio-from-video`, `/pt/extrair-audio-de-video`, `/fr/extraire-audio-video`), categoría Video, en lotes: MP4, MOV, MKV y WebM (200 MB gratis / 500 MB Pro) → **Original (sin recomprimir)**, por defecto, o MP3, WAV, FLAC, OGG (Opus), M4A (AAC) o AIFF con calidad.
- "Original": `copyAudioTrack` (en `src/lib/audio/convert.ts`) copia los paquetes de la pista principal sin decodificar (`copy: { mode: "forced", shiftTolerance: 0.5 }`) a su contenedor propio: AAC → .m4a, MP3 → .mp3, Opus/Vorbis → .ogg, FLAC → .flac, PCM → .wav. Funciona aunque el navegador no decodifique AAC. Si el códec no tiene contenedor propio (p. ej. AC-3) o no se puede copiar, se convierte a MP3 192 kbps y el resultado lo dice ("Audio convertido a MP3"). Con otro formato elegido se usa `convertAudio` (que ya descartaba el video).
- `assertComplete` (último paquete presente y duración > 0) se movió al motor de audio y ahora lo usan **todas las herramientas de audio** y el conversor de video: un archivo cortado cuyo índice sigue completo ya no da una salida a medias.
- Fixture nuevo `video-no-audio.webm`. Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas; en las preguntas se aclara que no descarga videos de internet.

**Verificación**
- `video-tools.spec.ts` (+3, ffprobe/ffmpeg): MP4 + MOV + WebM + MKV con "Original" → 2 M4A AAC y 2 OGG (Opus y Vorbis) **sin pista de video**, 2 s y tonos 440/660 Hz en cada canal (en un Chromium que no decodifica AAC: la copia queda demostrada); WebM + MKV → MP3 y MKV → WAV PCM con tonos; video sin sonido ("no tiene pista de audio"), MP4 cortado y texto disfrazado → mensajes claros y el bueno se extrae.
- Lint, typecheck, tests (915 + 8 saltados), build, `check:static` (942 páginas) y `npm run test:e2e` completo: 286 pasan, 4 saltados (sin Gotenberg ni EPUBCheck). Las pruebas de audio existentes siguen pasando con la comprobación nueva.

**Limitaciones**
- Solo la pista de audio principal (no se elige entre idiomas). AVI/WMV/FLV no se leen (motor GPL, decisión del dueño).

**Siguiente**: 3C.38 (video: comprimir, recortar, cambiar resolución y velocidad, video → GIF y unir).

## 2026-10-22 07:40 UTC — Fase 3, tarea 3C.38a (comprimir video)

**Qué se hizo**
- 3C.38 se dividió en 3C.38a–e en PLAN.md (comprimir, recortar, video → GIF, velocidad, unir).
- **Comprimir video** (`/es/comprimir-video`, `/en/compress-video`, `/pt/comprimir-video`, `/fr/compresser-video`), categoría Video, en lotes: MP4, MOV, MKV y WebM → **MP4** (por defecto) o **WebM**, con **calidad** alta / media (por defecto) / baja (presets `Quality` de mediabunny, que ajustan el bitrate a la resolución y al códec) y **resolución máxima** original / 1080p / 720p (por defecto) / 480p / 360p medida en el **lado más corto** (sirve para videos verticales), nunca agranda, dimensiones pares (`scaledSize`, con tests). Cada resultado muestra "antes → después (X % menos)" y el tamaño final, o avisa si no quedó más liviano.
- Motor: `convertVideo` acepta `edit: { quality, maxShortSide }` → `videoPlan(..., reencode = true)` fuerza la recodificación del video (el audio se sigue copiando si el contenedor lo admite; Opus en MP4 pasa a AAC). Rotación de celulares respetada (se probó con un MP4 con rotación de 90° en los metadatos). `components/tools/video/shared.ts`: extensiones y detección de H.264 comunes a las herramientas de video.
- Fixtures nuevos: `video-640.webm` (640×480 con grano, 162 KB) y `video-rotated.mp4` (VP9 en MP4 con rotación 90°). Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas.

**Verificación**
- +2 tests unitarios (`scaledSize`, recodificación forzada).
- `video-tools.spec.ts` (+2, ffprobe/ffmpeg): 640×480 → 360p calidad baja → MP4 **480×360**, **< 60 % del original**, AAC, 2 s, rojo/azul y tonos; MP4 rotado + WebM → WebM en calidad alta a 1080p: el rotado se ve **240×320** (de pie), el otro sigue en **320×240** (no se agranda), colores, duración y tonos correctos.
- Lint, typecheck, tests (918 + 8 saltados), build, `check:static` (947 páginas) y `npm run test:e2e` completo: 288 pasan, 4 saltados (sin Gotenberg ni EPUBCheck).

**Limitaciones**
- No hay un "peso objetivo" exacto (como en "Comprimir imagen"): requeriría varias pasadas de codificación; queda como mejora posible. La velocidad depende del codificador del navegador (por hardware en la mayoría de las computadoras y celulares).

**Siguiente**: 3C.38b ("Recortar video").

## 2026-10-22 08:00 UTC — Fase 3, tarea 3C.38b (recortar video)

**Qué se hizo**
- **Recortar video** (`/es/recortar-video`, `/en/trim-video`, `/pt/cortar-video`, `/fr/couper-video`), categoría Video: un archivo MP4, MOV, MKV o WebM (200 MB gratis / 500 MB Pro, 2 h) → el tramo entre **Inicio** y **Fin**, en el **mismo contenedor**. Al elegir el archivo se lee la duración (`probeVideo`) y se muestra un `<video>` con "Usar posición actual" para cada campo (mismos campos, validación y textos de tiempo que "Recortar audio"; `aria-label` distintos).
- Dos modos: **Exacto** (por defecto; recodifica el video en calidad alta y corta en el cuadro preciso) y **Rápido** (copia los paquetes sin recomprimir: segundos y sin pérdida, desde el fotograma clave anterior al inicio; funciona aunque el navegador no decodifique H.264).
- Motor: `VideoEdit` suma `trim` y `exact`; la `Conversion` de mediabunny recibe `trim` y solo fuerza la recodificación si hay calidad, tamaño o corte exacto. Error nuevo `videoRangeInvalid` (5 idiomas). Textos (introducción + 4 preguntas, interfaz) en los 5 idiomas.

**Verificación**
- `video-tools.spec.ts` (+3, ffprobe/ffmpeg): WebM 0:00.5–0:01.5 exacto → WebM de **1,0 s (±0,1)**, rojo a 0,25 s y azul a 0,75 s, tonos correctos; MP4 H.264 desde 0:01.0 en modo rápido → MP4 **H.264/AAC copiado** (este Chromium no decodifica H.264), 1 s, todo azul; tiempos invertidos, fuera del video o mal escritos deshabilitan la acción; un texto disfrazado muestra el error.
- Lint, typecheck, tests (919 + 8 saltados), build, `check:static` (952 páginas) y `npm run test:e2e` completo: 291 pasan, 4 saltados (sin Gotenberg ni EPUBCheck).

**Limitaciones**
- Un solo tramo por archivo. En modo rápido el resultado puede empezar antes del inicio marcado (hasta el fotograma clave anterior; en videos de celular suele ser ≤ 1–2 s). El reproductor depende del navegador (MKV o H.264 pueden no reproducirse), pero los tiempos se pueden escribir.

**Siguiente**: 3C.38c ("Video a GIF").
