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

## Pendiente del dueño
- Crear credenciales de Google OAuth (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
- Configurar un proveedor SMTP para magic links (`EMAIL_SERVER`, `EMAIL_FROM`).
- Crear cuenta de Mercado Pago y obtener credenciales de prueba (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).
- Elegir proveedor de pagos internacional (por ejemplo Lemon Squeezy o Paddle) para usuarios fuera de los países de Mercado Pago.
- Cuenta de Google AdSense (`NEXT_PUBLIC_ADSENSE_CLIENT`).
- Proyecto en Railway y base MongoDB (Railway o Atlas).
