# PLAN de Fileflect (antes FileFlip)

Micro-SaaS de conversión de archivos e imágenes: interfaz limpia y fácil, sin marcas de agua, sin registro obligatorio. **Todo lo que se pueda se procesa en el dispositivo del usuario** (privacidad + velocidad); solo los documentos de oficina van al servidor.

## Especificación resumida

### Stack
- Next.js (App Router, `output: "standalone"`) + TypeScript + Tailwind CSS + ESLint
- MongoDB con Mongoose (conexión cacheada)
- Auth.js (next-auth v5): Google + email (magic link)
- next-intl con rutas `app/[locale]/...`
- Mercado Pago (suscripciones / preapproval) con webhooks verificados; credenciales de prueba
- Navegador: Web Workers + WebAssembly (@jsquash para JPG/PNG/WEBP/AVIF, libheif-js o heic2any para HEIC, pdf-lib y pdf.js para PDF), carga diferida de códecs
- Servidor: sharp como respaldo de imágenes; LibreOffice vía Gotenberg (servicio HTTP aparte)
- Tests con Vitest
- Deploy en Railway: servicio app (Dockerfile + standalone) + servicio Gotenberg por red privada; documentado en DEPLOY.md (sin deploy real)

### Conversión
- En el navegador: conversión/compresión/redimensionado de imágenes; unir, dividir, rotar y reordenar PDF; imágenes→PDF; PDF→JPG/PNG. En Web Workers, con barra de progreso.
- Insignia por herramienta: "Se procesa en tu dispositivo: tu archivo no sale de tu computadora" / "Se procesa en nuestro servidor y se borra en 1 hora".
- Respaldo automático al servidor si el navegador no soporta algo o el archivo es demasiado grande.
- Servidor solo para oficina: Word, Excel, PowerPoint, ODT/ODS, RTF, TXT→PDF y PDF→Word.
- Imágenes: JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, HEIC (entrada), SVG→PNG; calidad y redimensionado.
- Flujo: arrastrar → detectar tipo → solo salidas válidas → convertir → descargar. Lotes con ZIP.

### Idiomas
- es (por defecto), en, pt, fr, zh. Rutas con prefijo; detección por navegador + cookie.
- Selector en el header con nombres nativos, manteniendo la página actual.
- Todos los textos en `messages/*.json`. Slugs traducidos, metadatos traducidos, hreflang, sitemap multi-idioma.
- Emails y errores traducidos; formato de números/fechas/monedas por idioma.
- Test de paridad de claves entre archivos de mensajes.

### Enfoque latinoamericano y negocio
- Público principal LatAm (es/pt). Precios Pro en moneda local para AR, BR, MX, CL, CO, UY, PE (archivo de configuración editable), detección de país (cabecera geo / idioma) + selector manual.
- Fuera de esos países: precio en USD, cobro detrás de una interfaz de proveedor intercambiable.
- Gratis: todo funciona; límites de tamaño/lote en servidor (más generosos en navegador). Pro mensual/anual: sin anuncios, archivos y lotes más grandes. Nunca bloquear funciones básicas.
- AdSense discreto: banner lateral (escritorio) y debajo del resultado. `<AdSlot>` con placeholder si falta `NEXT_PUBLIC_ADSENSE_CLIENT`, oculto para Pro. Sin pop-ups ni intersticiales.

### Privacidad y seguridad
- Archivos de servidor en memoria/temporal, borrados en ≤1 hora. Mongo solo guarda metadatos.
- Validación por magic bytes, límites de tamaño, rate limiting por IP para anónimos.

### UI y SEO
- Moderna, claro/oscuro, responsive, accesible. Una página por conversión con metadatos, sitemap y robots.
- Páginas: inicio, conversiones, cola larga, precios, login, mi cuenta, privacidad, términos, contacto.

---

## Tareas

### Hito 0 — Base del repositorio
- [x] 0.1 Crear `main` con README mínimo y rama `dev`
- [x] 0.2 PLAN.md, PROGRESS.md, `.env.example`, `docker-compose.yml` (MongoDB + Gotenberg), `.gitignore`
- [x] 0.3 Scaffolding con create-next-app (App Router, TS, Tailwind, ESLint, `src/`), `output: "standalone"`; `npm run lint` y `npm run build` pasan
- [x] 0.4 Estructura de carpetas (`src/lib`, `src/components`, `src/workers`, `src/config`, `src/models`) y conexión Mongoose con caché (`src/lib/db.ts`)
- [x] 0.5 Vitest configurado con un test de ejemplo y script `npm test`
- [x] 0.6 Commitear `package-lock.json` (generado por CI o con acceso a npm) y cambiar CI a `npm ci`

### Hito 1 — Internacionalización y layout base
- [x] 1.1 next-intl: `src/i18n/routing.ts`, `request.ts`, middleware con detección de idioma y cookie, rutas `app/[locale]/`
- [x] 1.2 `messages/{es,en,pt,fr,zh}.json` con textos base y test de paridad de claves
- [x] 1.3 Layout: header con logo, selector de idioma (nombres nativos, mantiene la página), footer, modo claro/oscuro
- [x] 1.4 Portada con el mensaje central de privacidad y velocidad (todo traducido)
- [x] 1.5 Utilidades de formato (números, fechas, monedas) por idioma + tests

### Hito 2 — Núcleo de conversión de imágenes en el navegador
- [x] 2.1 Registro de formatos y conversiones (`src/config/conversions.ts`): entradas, salidas válidas, dónde se procesa; detección de tipo por magic bytes + tests
- [x] 2.2 Componente de arrastrar y soltar: detecta tipo y muestra solo salidas válidas
- [x] 2.3 Worker de imágenes con @jsquash (JPG/PNG/WEBP/AVIF) cargado de forma diferida, con progreso
- [x] 2.4 Opciones de calidad y redimensionado + tests de la lógica de dimensiones
- [x] 2.5 Formatos extra en el navegador: GIF, BMP, ICO (salida), TIFF (entrada), SVG→PNG
- [x] 2.6 HEIC (entrada) con libheif-js/heic2any en worker
- [x] 2.7 Insignia "Se procesa en tu dispositivo" / "en nuestro servidor" por herramienta
- [x] 2.8 Lotes y descarga ZIP (client-zip o fflate)
- [x] 2.9 Detección de capacidad/tamaño y respaldo automático al servidor (API con sharp)

### Hito 3 — Operaciones PDF en el navegador
- [x] 3.1 Worker PDF con pdf-lib: unir PDFs
- [x] 3.2 Dividir y rotar páginas
- [x] 3.3 Reordenar páginas con miniaturas (pdf.js)
- [x] 3.4 Imágenes→PDF
- [x] 3.5 PDF→JPG/PNG con pdf.js
- [x] 3.6 Comprimir PDF (re-muestreo de imágenes en el navegador; respaldo en servidor)

### Hito 4 — Conversión de documentos en el servidor
- [x] 4.1 Cliente Gotenberg (`src/lib/gotenberg.ts`) y ruta API Word/Excel/PowerPoint/ODT/ODS/RTF/TXT/CSV→PDF
- [x] 4.2 PDF→Word en el servidor (Gotenberg/LibreOffice) con aviso de calidad
- [x] 4.3 Validación por magic bytes, límites de tamaño por plan y rate limiting por IP + tests de límites
- [x] 4.4 Almacenamiento temporal con borrado ≤1 hora y modelo de metadatos en Mongo (sin contenido)
- [x] 4.5 Mensajes de error traducidos para la API

### Hito 5 — Cuentas y suscripción
- [x] 5.1 Auth.js v5: Google + email magic link (adaptador MongoDB), email traducido
- [x] 5.2 Páginas de login y "Mi cuenta"
- [x] 5.3 Config de precios por país (`src/config/pricing.ts`), detección de país (cabecera geo / idioma) + selector manual + tests
- [x] 5.4 Interfaz `PaymentProvider` intercambiable; implementación Mercado Pago (preapproval) en modo prueba; stub internacional (USD)
- [x] 5.5 Webhook de Mercado Pago con verificación de firma y actualización de estado de suscripción
- [x] 5.6 Página de precios (mensual/anual) y cancelación desde "Mi cuenta"
- [x] 5.7 Aplicar límites Pro (tamaño y lote) en cliente y servidor

### Hito 6 — Publicidad
- [x] 6.1 Componente `<AdSlot>` (placeholder sin `NEXT_PUBLIC_ADSENSE_CLIENT`, oculto para Pro)
- [x] 6.2 Ubicaciones: lateral en escritorio y debajo del resultado; nunca cerca del botón de descarga

### Hito 7 — SEO y páginas de cola larga
- [x] 7.1 Páginas por conversión con slugs traducidos (`/es/jpg-a-webp`, `/en/jpg-to-webp`, ...) y metadatos traducidos
- [x] 7.2 hreflang, `sitemap.ts` multi-idioma y `robots.ts`
- [x] 7.3 Archivo de datos de cola larga (`src/content/longtail.ts`) y plantilla con texto, FAQ y FAQ schema
- [x] 7.4 Primeras páginas: HEIC a JPG desde iPhone, comprimir PDF para AFIP, foto tamaño DNI, reducir PDF para WhatsApp, foto para el SAT, PDF para gov.br
- [x] 7.5 Páginas legales y de contacto: privacidad, términos, contacto (traducidas)

### Hito 8 — Deploy (preparado, sin deploy real)
- [x] 8.1 Dockerfile multi-etapa para standalone (con sharp)
- [x] 8.2 DEPLOY.md: Railway con servicio app + Gotenberg por red privada, MongoDB, variables, dominios, webhooks
- [x] 8.3 Revisión final: accesibilidad, modo oscuro, rendimiento (carga diferida de WASM), lint/build/tests

---

## Fase 2

La fase 1 está terminada y probada por el dueño. La fase 2 mejora rendimiento, diseño y agrega un panel de administración, sin romper nada de lo existente (si una mejora rompe algo, se revierte). Orden de hitos: 2A → 2B → 2C. Medición base: `docs/perf/2026-10-19-baseline.md` (script `scripts/perf/lighthouse.sh`).

### Hito 2A — Rendimiento
Meta: Lighthouse móvil ≥ 90 en portada y páginas de conversión, sin empeorar accesibilidad ni SEO.
- [x] 2A.1 Medición base con Lighthouse (móvil) de portada, conversión de imagen, conversión/herramienta PDF, cola larga y precios; script reproducible y resultados en `docs/perf/`
- [x] 2A.2 Correcciones rápidas de la medición: favicon provisorio (sin 404), metadatos de páginas dinámicas en el `<head>` (precios), evitar el prefetch innecesario de `/login` y la consulta de sesión que no hace falta en la primera pintura
- [x] 2A.3 Analizar el bundle con `@next/bundle-analyzer` (script `npm run analyze`) y documentar qué entra en el JS inicial de cada tipo de página
- [x] 2A.4 Reducir el JS inicial: componentes de servidor donde se pueda (header, footer, secciones estáticas), import dinámico de las herramientas PDF y de paneles que no están a la vista (opciones, ZIP), y verificar que pdf.js/pdf-lib/fflate/códecs no entren al bundle de la portada
- [x] 2A.5 Revisar SSG/ISR: conversiones, cola larga y legales estáticas en los 5 idiomas; precios con el mínimo dinamismo posible; solo cuenta y API por pedido
- [x] 2A.6 Sin saltos de diseño: espacio reservado para anuncios (también mientras se carga el plan), imágenes con `next/image` y tamaños, y `next/font` preparado (subconjuntos, `display: swap`)
- [x] 2A.7 Caché larga e inmutable para `.wasm` y workers con hash (`headers()` en `next.config.ts`), y precarga del códec al elegir formato o al pasar el mouse por la herramienta
- [x] 2A.8 Workers: reutilizar el worker, lotes con concurrencia limitada según `navigator.hardwareConcurrency` (pool), liberar memoria (`revokeObjectURL`, `ImageBitmap.close`) + tests del pool
- [x] 2A.9 Servidor: índices en MongoDB para las consultas actuales y del panel, timeouts razonables hacia Gotenberg, respuestas sin copias innecesarias de buffers
- [x] 2A.10 Medición final de 2A (mismas páginas y método) y comparación en `docs/perf/`

### Hito 2B — Diseño
Meta: aspecto profesional, moderno, confiable y propio; interfaz limpia. Capturas con Playwright (360 px y 1280 px, claro y oscuro) revisadas después de cada tarea; finales en `docs/screenshots/`.
- [x] 2B.1 Identidad visual en `docs/design.md`: paleta claro/oscuro con contraste AA, tipografías (títulos con personalidad + texto legible, vía `next/font`), espaciado, radios, sombras; tokens como variables CSS en Tailwind
- [x] 2B.2 Aplicar los tokens y las fuentes en todo el sitio (globals.css, componentes base: botones, tarjetas, inputs, insignias)
- [x] 2B.3 Logo de FileFlip en SVG (ícono original + texto), favicon/íconos de app e imagen Open Graph por idioma
- [x] 2B.4 Header y footer nuevos con navegación móvil cómoda (menú accesible) e íconos lucide-react
- [x] 2B.5 Portada: hero con la zona para arrastrar como protagonista, mensaje de privacidad y accesos rápidos a las conversiones más usadas
- [x] 2B.6 Portada: "Cómo funciona" en 3 pasos y preguntas frecuentes (con FAQ schema)
- [x] 2B.7 Conversor: estados vacío, arrastrando, procesando con progreso, listo y error
- [x] 2B.8 Tarjetas de archivo: miniatura, nombre, peso antes/después, ahorro en %, botón de descarga muy claro y separado de los anuncios
- [x] 2B.9 Herramientas PDF, páginas de conversión y de cola larga con el nuevo diseño (dividida)
  - [x] 2B.9a Diseño de las páginas: encabezado común (`PageHero`), íconos lucide de herramientas, pasos en tarjetas, bloque de privacidad y enlaces relacionados en las páginas de conversión, texto y FAQ de cola larga
  - [x] 2B.9b Interior de las herramientas PDF: lista de archivos, opciones, progreso, resultado y descarga con el nuevo diseño (estados como en el conversor)
- [x] 2B.10 Precios, login, cuenta, legales, contacto y 404 con el nuevo diseño (dividida)
  - [x] 2B.10a Precios, login (y "revisa tu correo") y Mi cuenta
  - [x] 2B.10b Legales (privacidad y términos), contacto y 404
- [x] 2B.11 Microinteracciones y transiciones que respetan `prefers-reduced-motion`; revisión responsive 360/768/1280 en todas las páginas (dividida)
  - [x] 2B.11a Microinteracciones (aparición de resultados, avisos y menú, check de éxito, íconos de descarga, desplazamiento suave) que respetan `prefers-reduced-motion`
  - [x] 2B.11b Revisión responsive 360/768/1280 de todas las páginas y detalles pendientes (hueco junto al anuncio lateral en la portada, texto del paso 2 en conversiones de documentos, "Opciones" del conversor, unidades de bytes)
- [x] 2B.12 Capturas finales en `docs/screenshots/` y nueva medición de Lighthouse (no empeorar 2A)

### Hito 2C — Panel de administración
Ruta `/[locale]/admin`, solo para usuarios logueados con email en `ADMIN_EMAILS`; los demás reciben 404 (protección en el servidor: layout y cada API).
- [x] 2C.1 Control de acceso: `ADMIN_EMAILS` (en `.env.example` y "Pendiente del dueño"), `isAdmin`/`requireAdmin`, layout del panel con 404 para no admins, tests (admin, no admin, anónimo)
- [x] 2C.2 Datos que faltan en los registros, respetando la privacidad: duración y tipo de error de cada conversión, herramienta usada, beacon de visitas (idioma, país si está disponible, página de cola larga; nunca IP completa ni nombre de archivo) + tests (dividida)
  - [x] 2C.2a Registro de conversiones: duración, código de error y herramienta; el navegador informa duración y error sin duplicar los fallos que ya registra el servidor + tests
  - [x] 2C.2b Las herramientas PDF del navegador (unir, dividir, rotar, ordenar, imágenes a PDF, comprimir) informan su uso (herramienta, tamaño, duración, resultado) + tests
  - [x] 2C.2c Beacon de visitas: idioma, país (solo de la cabecera geo, sin IP), tipo de página y slug de cola larga; modelo con TTL de 1 año y API con validación + tests
- [x] 2C.3 Selector de período (hoy, 7 días, 30 días, 12 meses, personalizado) y período anterior para comparar + tests
- [x] 2C.4 Agregaciones de conversiones: por día, total y comparación, top 10 por herramienta/par de formatos, navegador vs servidor (tests con MongoDB en memoria)
- [x] 2C.5 Agregaciones de errores por tipo, tiempo promedio de conversión, tamaño total procesado y archivos temporales actuales (tests)
- [x] 2C.6 Agregaciones de visitas por idioma, país y páginas de cola larga (tests)
- [x] 2C.7 Agregaciones de usuarios (nuevos por día, total), suscripciones Pro activas, altas y bajas, MRR por moneda (tests)
- [x] 2C.8 API del panel (protegida) y página con tarjetas de resumen y selector de período
- [x] 2C.9 Gráficos livianos cargados solo en el panel (línea de conversiones por día, barras de top 10, etc.)
- [x] 2C.10 Exportar a CSV las tablas principales + tests
- [x] 2C.11 Revisión final de la fase 2: lint, build, tests, mediciones finales y "FASE 2 TERMINADA" en PROGRESS.md

---

## Fase 3

Cambio de nombre a **Fileflect** y ampliación del catálogo de herramientas para competir con sitios como fileflip.org. Orden de hitos: 3.0 → 3A → 3B → 3C → 3D → 3E. Las tareas de 3B a 3E se escriben en detalle cuando termine la auditoría (3A), a partir de `docs/audit.md`.

Principios (resumen): una herramienta solo cuenta si procesa archivos reales de punta a punta, con tests que validan el archivo de salida; un formato solo se muestra si hay un motor que lo lee/genera y un fixture que lo prueba; primero el navegador (WASM/JS en workers, carga diferida), servidor solo si hace falta; nunca servicios de terceros; nada de librerías de conversión en el bundle de la portada; Lighthouse móvil ≥ 90 y CLS 0 al final de cada hito; licencias en `docs/dependencies.md` (sin GPL/AGPL sin aprobación del dueño); límites, cancelación, limpieza y protecciones (zip bomb, zip slip, XXE) en todas las herramientas; sin COOP/COEP en todo el sitio.

### Hito 3.0 — Cambio de nombre a Fileflect
- [x] 3.0.1 Textos: reemplazar "FileFlip" por "Fileflect" en `messages/*.json` (5 idiomas + admin), metadatos, títulos, Open Graph, manifest, emails de login, descripciones de pagos de Mercado Pago, panel de admin, páginas legales y nombres de descarga (CSV, ZIP); `package.json` (name); `EMAIL_FROM` por defecto en `.env.example` = "Fileflect <no-reply@example.com>"; tests actualizados
- [x] 3.0.2 Documentación: README, DEPLOY.md, docs/design.md y encabezados de PLAN.md/PROGRESS.md; búsqueda insensible a mayúsculas en todo el repo para confirmar que no queda "FileFlip" visible (solo nombres internos del repo y URLs de GitHub); "Pendiente del dueño": verificar disponibilidad del nombre/dominio/marca/redes y, si quiere, renombrar el repo
- [x] 3.0.3 Logo SVG, favicon/íconos de app e imágenes Open Graph con el nombre Fileflect, respetando `docs/design.md`; capturas con Playwright (360/1280, claro/oscuro) revisadas

### Hito 3A — Auditoría y comparación
- [x] 3A.1 Fixtures: script reproducible `scripts/fixtures/generate.mjs` que crea en `tests/fixtures/` archivos pequeños (< 200 KB) de cada formato actual (JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF, ICO, SVG, HEIC, PDF de varias páginas, DOCX, XLSX, PPTX, ODT, ODS, RTF, TXT, CSV) más corruptos/truncados; sin derechos de autor ni datos personales; `tests/fixtures/README.md` con el origen de cada uno
- [x] 3A.2 Inventario en el servidor: tests de integración que pasan cada fixture por las APIs actuales (respaldo de imágenes con sharp, documentos → PDF y PDF → Word con Gotenberg simulado o real si está disponible) y validan la salida; anotar funciona/falla/incompleto
- [x] 3A.3a Inventario del conversor en el navegador: script Playwright (`scripts/audit/browser.mjs`) que sube cada fixture al conversor, descarga cada salida y la valida con lectores independientes (sharp, encabezados BMP/ICO, pdf-lib, fflate), con el servidor bloqueado; corruptos; resultados en `docs/audit-inventory.md`
- [x] 3A.3b Inventario de las 6 herramientas PDF en el navegador (unir, dividir, rotar, ordenar, imágenes → PDF, comprimir) con el mismo script: salida validada con pdf-lib (páginas, rotación, orden, tamaño) y PDF corruptos
- [x] 3A.3c Corregir archivos corruptos en el conversor del navegador: un JPEG truncado se convierte sin aviso (rechazarlo como hace sharp, p. ej. exigiendo el marcador EOI o detectando el error del decodificador) y un PNG/JPEG que el navegador no puede decodificar por estar dañado no debe reintentarse en el servidor (solo los formatos que el navegador no soporta); tests unitarios + script de auditoría sin fallas
- [x] 3A.3d Corregir "Imágenes a PDF" (y imagen → PDF del conversor): con un PNG truncado entre los archivos se queda colgado en 75 % sin error; debe fallar con un mensaje claro (idealmente indicando qué archivo) y liberar el estado; test unitario + `scripts/audit/pdf-tools.mjs` sin fallas
- [x] 3A.4 Comparación con fileflip.org y 2–3 competidores (solo funcionalidades: categorías, herramientas, formatos), con WebFetch
- [x] 3A.5 `docs/audit.md`: tabla herramienta/par de formatos (¿lo tenemos?, ¿funciona?, ¿competencia?, navegador/servidor, motor propuesto, licencia, dificultad, riesgos, tests) + ideas propias para LatAm + lista priorizada; `docs/dependencies.md` con las licencias actuales
- [x] 3A.6 Escribir en PLAN.md las tareas detalladas de 3B a 3E según la auditoría y el orden de prioridad acordado

### Hito 3B — Base del catálogo
Antes de sumar herramientas. Todo lo visible (buscador, categorías, páginas, sitemap, selector) sale del registro, y el registro solo publica herramientas con estado `verified`.
- [x] 3B.1 Registro único (`src/config/tools.ts`, ampliado): id, categoría, formatos de entrada/salida, dónde corre (navegador/servidor), motor, límites (tamaño, páginas, lote, tiempo máximo), estado (`draft`/`verified`), ícono y slugs traducidos; migrar las 6 herramientas PDF y el conversor; `generateStaticParams`, sitemap, `translatePathname` y `ToolComponent` leen solo las `verified`; tests: slugs únicos entre herramientas, conversiones y cola larga; cada herramienta verificada tiene textos en los 5 idiomas y componente
- [x] 3B.2 Categorías: página por categoría con slug traducido (`/es/herramientas-pdf`, `/en/pdf-tools`…) y página "Todas las herramientas" con filtros por categoría; enlaces en header/footer; sitemap; tests de rutas
- [x] 3B.3 Buscador: diálogo accesible (combobox ARIA) con atajo `Ctrl/⌘+K` y `/`, búsqueda sin acentos sobre nombre, palabras clave y formatos en el idioma actual, índice construido del registro sin cargar motores; botón visible en el header; tests de la función de búsqueda
- [x] 3B.4 Motor de trabajos genérico (`src/lib/jobs/`): ejecutar una tarea en un worker con progreso, cancelación (`AbortSignal` → `worker.terminate()`), **tiempo máximo por trabajo** que termina el worker, cola por lotes con concurrencia limitada (reusar el pool), errores con códigos traducidos y liberación de object URLs; tests
- [x] 3B.5 Interfaz genérica de herramienta (`ToolShell`): entrada de archivos o de texto, opciones, ejecutar, lista de resultados con descarga individual o ZIP, estados vacío/procesando/listo/error como el conversor; límites reales visibles; tests de la lógica de estado
- [x] 3B.6 Plantilla de página de herramienta: encabezado, herramienta, "qué hace", límites (del registro), preguntas frecuentes con FAQ schema, datos estructurados `SoftwareApplication` y herramientas relacionadas; textos en `messages/*.json` (`Catalog.<id>`); test de que cada herramienta verificada tiene introducción y ≥ 3 preguntas en los 5 idiomas
- [x] 3B.7 Infraestructura de tests de navegador: `tests/e2e/` con utilidades comunes (levantar `next start`, Chromium del entorno, subir un fixture, esperar la descarga, validadores independientes de imagen/PDF/ZIP/JSON/CSV/texto) y `npm run test:e2e`; migrar los scripts de `scripts/audit/` a esa base; una prueba por herramienta registrada
- [x] 3B.8 Cierre de 3B: Lighthouse móvil de portada, una categoría y una herramienta (≥ 90, CLS 0) en `docs/perf/`

### Hito 3C — Herramientas
Por cada herramienta: procesamiento real, interfaz y textos en los 5 idiomas, página con metadatos y FAQ, tests unitarios con archivos válidos y corruptos que validan la salida, prueba de navegador, límites documentados, licencias en `docs/dependencies.md`, estado `verified` solo al final.

Datos y desarrolladores
- [x] 3C.1 JSON ↔ CSV y JSON ↔ TSV (papaparse, MIT): aplanado de objetos anidados, delimitador detectado (`,` `;` tab), BOM, comillas y saltos de línea
- [x] 3C.2 JSON ↔ YAML (`yaml`, ISC, en lugar de js-yaml: trae límite de alias) y JSON ↔ TOML (smol-toml)
- [ ] 3C.3 JSON ↔ XML (fast-xml-parser, sin resolver entidades: test de XXE y "billion laughs")
- [ ] 3C.4 Formateador y validador de JSON, XML y YAML (sangría, minificar, error con línea y columna)
- [ ] 3C.5 Base64 de texto (UTF-8) y de archivos (ida y vuelta con bytes idénticos, data URL) + codificar/decodificar URL
- [ ] 3C.6 Hashes MD5, SHA-1, SHA-256, SHA-512 de texto y archivos (hash-wasm, por bloques); vectores conocidos y comparación con `crypto` de Node
- [ ] 3C.7 Generador de UUID (v4, v7, en lote) y conversor de timestamps (Unix s/ms ↔ fecha, zonas horarias)

Utilidades
- [ ] 3C.8 Generador de QR (texto, URL, Wi-Fi, contacto; PNG y SVG; qrcode, MIT) y lector de QR desde imagen (jsQR, Apache-2.0); test: generar y volver a leer
- [ ] 3C.9 Generador de contraseñas (sin sesgo) y contador de palabras/caracteres con mayúsculas/minúsculas (`Intl.Segmenter`, también chino)
- [ ] 3C.10 Selector y conversor de colores (HEX, RGB, HSL, OKLCH, contraste AA) y conversor de unidades

Imágenes (las más buscadas primero)
- [ ] 3C.11 "Comprimir imagen" con página propia (JPG, PNG, WEBP, AVIF; niveles simples; antes/después; lotes) y "comprimir a un peso objetivo" (búsqueda de calidad + reducción de tamaño si no alcanza; presets de trámites)
- [ ] 3C.12 "Redimensionar imagen" con página propia (píxeles, porcentaje, presets de redes sociales)
- [ ] 3C.13 Rotar/voltear y quitar metadatos EXIF/GPS (aplicando antes la orientación; exifr para mostrar qué se quita)
- [ ] 3C.14 Recortar imagen con proporciones fijas (accesible con teclado)
- [ ] 3C.15 Marca de agua (texto o imagen) y agregar texto a una imagen
- [ ] 3C.16 Paquete de favicon (PNG 16–512, ICO multi-tamaño, manifest, ZIP), SVG → PNG/JPG con página propia (sin ejecutar scripts del SVG) y HEIF como entrada

Subtítulos
- [ ] 3C.17 SRT ↔ VTT ↔ ASS/SSA, desplazar tiempos y ajustar FPS (detección de codificación; aviso de estilos que se pierden)

PDF
- [ ] 3C.18 Eliminar páginas y extraer páginas (con miniaturas)
- [ ] 3C.19 Numerar páginas y marca de agua de texto (posición, tamaño, opacidad; páginas rotadas)
- [ ] 3C.20 PDF → texto (pdf.js; aviso si no tiene texto: sugerir OCR) y recortar márgenes (CropBox)
- [ ] 3C.21 Firmar PDF dibujando la firma o subiendo una foto (aclarando que no es firma digital certificada)
- [ ] 3C.22 Proteger con contraseña y quitar la contraseña conociéndola (qpdf-wasm, ISC/Apache-2.0)
- [ ] 3C.23 Extraer imágenes de un PDF (ZIP)

Fuentes y documentos
- [ ] 3C.24 TTF/OTF ↔ WOFF/WOFF2 (fonteditor-core + wawoff2, confirmar licencias; fixture de fuente propia)
- [ ] 3C.25 Markdown ↔ HTML en el navegador (marked + turndown, saneado con dompurify) y Markdown → PDF (Gotenberg)
- [ ] 3C.26 HTML → PDF con Gotenberg sin acceso a red externa (protección SSRF), fixture PPT generado en el test y PDF/A (Gotenberg)
- [ ] 3C.27 Hojas de cálculo XLSX ↔ CSV ↔ ODS en el navegador (SheetJS CE desde el tarball oficial o exceljs; límite de celdas; elegir hoja)

Archivos comprimidos
- [ ] 3C.28 Crear ZIP, TAR y TAR.GZ (fflate + escritor TAR propio; test leyendo la salida con `tar` del sistema)
- [ ] 3C.29 Extraer ZIP, TAR y TAR.GZ con protecciones (zip bomb por tamaño y cantidad de entradas en streaming, zip slip, symlinks); fixtures maliciosos generados por script
- [ ] 3C.30 Extraer 7Z y RAR (solo lectura) con libarchive.js y las mismas protecciones

OCR
- [ ] 3C.31 Imagen → texto con tesseract.js (datos de idioma servidos desde nuestro dominio, solo el idioma pedido: es, en, pt, fr, zh)
- [ ] 3C.32 PDF escaneado → PDF con texto buscable y → texto (límite de páginas)

Libros electrónicos
- [ ] 3C.33 EPUB → HTML/TXT (navegador, saneado, sin XXE) y EPUB → PDF (Gotenberg)
- [ ] 3C.34 HTML/Markdown → EPUB (generador propio; `mimetype` correcto)

Audio y video (WebCodecs + mediabunny, MPL-2.0; sin `@ffmpeg/core` GPL salvo aprobación del dueño)
- [ ] 3C.35 Detección de capacidades del navegador (qué códecs puede leer/escribir) y conversión de audio entre los formatos disponibles (WAV, MP3, AAC/M4A, OGG/Opus, FLAC, AIFF); límites de tamaño/duración
- [ ] 3C.36 Audio: recortar, unir, cambiar bitrate/frecuencia/canales y normalizar volumen
- [ ] 3C.37 Video: convertir entre MP4, WebM, MOV y MKV según el navegador, y extraer audio
- [ ] 3C.38 Video: comprimir, recortar, cambiar resolución y velocidad, video → GIF (gifenc) y unir

3D y CAD
- [ ] 3C.39 Modelos 3D con three.js (MIT, cargado solo en esas páginas): STL ↔ OBJ ↔ PLY ↔ GLB/glTF con visor y límite de vértices
- [ ] 3C.40 Entradas 3MF, COLLADA y FBX (solo lectura; sin anunciar salidas que no existen) e imagen → litofanía (STL)
- [ ] 3C.41 DXF → SVG/PNG/PDF con dxf-parser (MIT) y aviso de entidades omitidas; DWG documentado como no viable

Ideas propias y quitar fondo
- [ ] 3C.42 Foto carnet por país (tamaños oficiales AR, BR, MX, CL, CO, PE, UY; guía de rostro; hoja 10×15 con copias)
- [ ] 3C.43 Escanear documento desde el celular (foto → recorte de perspectiva → PDF en blanco y negro)
- [ ] 3C.44 Quitar fondo solo con licencia aceptable (MediaPipe Apache-2.0 u onnxruntime-web + modelo Apache-2.0); si no hay calidad suficiente, anotarlo y no publicar

Mediciones: Lighthouse móvil (≥ 90, CLS 0) después de 3C.10, 3C.23, 3C.34 y 3C.44, en `docs/perf/`.

### Hito 3D — Experiencia de usuario del catálogo
- [ ] 3D.1 Portada que escale a 100+ herramientas: buscador visible, categorías claras, herramientas populares, sin abrumar en móvil
- [ ] 3D.2 Enlaces internos entre herramientas relacionadas (misma categoría, mismos formatos) generados del registro
- [ ] 3D.3 Accesibilidad y teclado completos; capturas Playwright 360/1280, claro/oscuro, de una muestra de páginas nuevas en `docs/screenshots/`
- [ ] 3D.4 Panel de admin: uso y errores por herramienta y por categoría (con tests de agregación)
- [ ] 3D.5 Medición final de Lighthouse de la fase 3

### Hito 3E — Informe final
- [ ] 3E.1 `docs/report-phase3.md`: herramientas verificadas, formatos de entrada y salida, matriz generada desde el registro y los tests, pruebas y resultados, limitaciones, descartes y motivos, dependencias y licencias, rendimiento, seguridad, diseño y SEO, y lo que debe decidir el dueño; "FASE 3 TERMINADA" en PROGRESS.md
