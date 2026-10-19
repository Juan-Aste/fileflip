# PLAN de FileFlip

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
- [ ] 4.1 Cliente Gotenberg (`src/lib/gotenberg.ts`) y ruta API Word/Excel/PowerPoint/ODT/ODS/RTF/TXT/CSV→PDF
- [ ] 4.2 PDF→Word en el servidor (Gotenberg/LibreOffice) con aviso de calidad
- [ ] 4.3 Validación por magic bytes, límites de tamaño por plan y rate limiting por IP + tests de límites
- [ ] 4.4 Almacenamiento temporal con borrado ≤1 hora y modelo de metadatos en Mongo (sin contenido)
- [ ] 4.5 Mensajes de error traducidos para la API

### Hito 5 — Cuentas y suscripción
- [ ] 5.1 Auth.js v5: Google + email magic link (adaptador MongoDB), email traducido
- [ ] 5.2 Páginas de login y "Mi cuenta"
- [ ] 5.3 Config de precios por país (`src/config/pricing.ts`), detección de país (cabecera geo / idioma) + selector manual + tests
- [ ] 5.4 Interfaz `PaymentProvider` intercambiable; implementación Mercado Pago (preapproval) en modo prueba; stub internacional (USD)
- [ ] 5.5 Webhook de Mercado Pago con verificación de firma y actualización de estado de suscripción
- [ ] 5.6 Página de precios (mensual/anual) y cancelación desde "Mi cuenta"
- [ ] 5.7 Aplicar límites Pro (tamaño y lote) en cliente y servidor

### Hito 6 — Publicidad
- [ ] 6.1 Componente `<AdSlot>` (placeholder sin `NEXT_PUBLIC_ADSENSE_CLIENT`, oculto para Pro)
- [ ] 6.2 Ubicaciones: lateral en escritorio y debajo del resultado; nunca cerca del botón de descarga

### Hito 7 — SEO y páginas de cola larga
- [ ] 7.1 Páginas por conversión con slugs traducidos (`/es/jpg-a-webp`, `/en/jpg-to-webp`, ...) y metadatos traducidos
- [ ] 7.2 hreflang, `sitemap.ts` multi-idioma y `robots.ts`
- [ ] 7.3 Archivo de datos de cola larga (`src/content/longtail.ts`) y plantilla con texto, FAQ y FAQ schema
- [ ] 7.4 Primeras páginas: HEIC a JPG desde iPhone, comprimir PDF para AFIP, foto tamaño DNI, reducir PDF para WhatsApp, foto para el SAT, PDF para gov.br
- [ ] 7.5 Páginas legales y de contacto: privacidad, términos, contacto (traducidas)

### Hito 8 — Deploy (preparado, sin deploy real)
- [ ] 8.1 Dockerfile multi-etapa para standalone (con sharp)
- [ ] 8.2 DEPLOY.md: Railway con servicio app + Gotenberg por red privada, MongoDB, variables, dominios, webhooks
- [ ] 8.3 Revisión final: accesibilidad, modo oscuro, rendimiento (carga diferida de WASM), lint/build/tests
