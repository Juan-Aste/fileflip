# Lista para publicar Fileflect

Pasos concretos y en orden. Las explicaciones largas están en [DEPLOY.md](../DEPLOY.md); acá solo lo que hay que hacer. `fileflect.com` es un ejemplo: usar el dominio real.

## 0. Antes de empezar (decisiones)
- [ ] Confirmar el nombre y comprar el dominio (ver "Pendiente del dueño" en `PROGRESS.md`).
- [x] Textos legales publicados (fase 7): responsable, domicilio y contacto en `messages/*.json`, namespace `Legal`. Falta la revisión de un abogado de lo marcado en [`docs/legal/pendientes-legales.md`](legal/pendientes-legales.md).
- [ ] Plan Pro: queda **apagado** (`PRO_ENABLED=false`) hasta la inscripción fiscal. Antes de encenderlo: revisar los precios por país en `src/config/pricing.ts`, construir los botones de arrepentimiento y de baja, y resolver B-27 (`docs/bug-audit.md`).

## 1. Railway: servicios ([DEPLOY.md §1](../DEPLOY.md#1-crear-el-proyecto))
- [ ] Proyecto nuevo desde el repo `Juan-Aste/fileflip`, rama **`main`**; servicio `app` (usa el `Dockerfile`).
- [ ] Base de datos **MongoDB** (Railway o Atlas).
- [ ] Servicio `gotenberg` con la imagen `gotenberg/gotenberg:8`, **sin dominio público**, 1 GB de memoria o más, y este *Custom Start Command*:
  ```
  gotenberg --api-port=3000 --api-timeout=90s --chromium-disable-javascript=true --chromium-deny-private-ips=true --chromium-deny-public-ips=true
  ```
- [ ] El build descarga SheetJS de `https://cdn.sheetjs.com`: si falla el `npm ci` en Railway, revisar que ese dominio sea accesible.

## 2. Railway: variables del servicio `app` ([DEPLOY.md §3](../DEPLOY.md#3-variables-del-servicio-app))
Las `NEXT_PUBLIC_*` se fijan al construir: si se cambian, redesplegar.

| Variable | Valor de ejemplo |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://fileflect.com` |
| `AUTH_URL` | `https://fileflect.com` |
| `AUTH_SECRET` | salida de `npx auth secret` |
| `MONGODB_URI` | `${{MongoDB.MONGO_URL}}` |
| `GOTENBERG_URL` | `http://gotenberg.railway.internal:3000` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `contact@fileflect.com` |
| `PRO_ENABLED` | `false` (plan Pro oculto hasta poder cobrar; `true` lo activa y requiere redesplegar) |
| `ADMIN_EMAILS` | `tu-correo@gmail.com` |
| `AUTH_GOOGLE_ID` | `1234567890-abc.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | `GOCSPX-…` |
| `RESEND_API_KEY` | `re_XXXXXXXX` (no usar `EMAIL_SERVER`: Railway bloquea el SMTP salvo en Pro) |
| `EMAIL_FROM` | `Fileflect <no-reply@fileflect.com>` |
| `MP_ACCESS_TOKEN_AR` (y `_BR`, `_MX`, `_CL`, `_CO`, `_UY`, `_PE` según dónde se cobre) | `APP_USR-…` (primero `TEST-…`) |
| `MP_WEBHOOK_SECRET_AR` (uno por cada token) | clave secreta del webhook de esa cuenta |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | `APP_USR-…` |
| `INTL_PAYMENT_PROVIDER` | `none` |
| `PAYMENTS_MOCK` | `false` |
| `AUTH_EMAIL_LOG_LINKS` | `false` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-1234567890123456` |
| `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR` | `1234567890` |
| `NEXT_PUBLIC_ADSENSE_SLOT_RESULT` | `0987654321` |
| `NEXT_PUBLIC_MODELS_BASE_URL` | `https://modelos.fileflect.com` (opcional: copia propia de los modelos de IA en Cloudflare R2, [docs/modelos-r2.md](modelos-r2.md); vacía = solo Hugging Face) |
| `RATE_LIMIT_PER_MINUTE` | `20` |
| `TEMP_FILE_TTL_MINUTES` | `60` |

**Imprescindibles en esta etapa**: `PRO_ENABLED=false` (o sin definir: el plan Pro queda oculto, `/pricing` da 404 y todos ven anuncios) y `NEXT_PUBLIC_CONTACT_EMAIL=contact@fileflect.com` (la página de contacto la muestra con el horario "lunes a viernes, en horario hábil"). Las dos se leen al construir: después de cambiarlas, redesplegar.

Las de Google, email, Mercado Pago y AdSense se pueden dejar vacías el primer día: el sitio funciona sin login, sin pagos y con espacios de anuncio reservados.

## 3. Healthcheck, dominio y DNS ([DEPLOY.md §4](../DEPLOY.md#4-healthcheck-y-dominio))
- [ ] *Settings → Deploy → Healthcheck Path*: `/api/health`.
- [ ] *Settings → Networking → Custom Domain*: `fileflect.com` (y `www` si se quiere).
- [ ] En el proveedor del dominio, crear el registro **CNAME** que indica Railway (para el dominio raíz, CNAME flattening/ALIAS, o Cloudflare).
- [ ] (Opcional) Cloudflare delante, para la cabecera de país `cf-ipcountry`.

## 4. Google OAuth ([DEPLOY.md §5](../DEPLOY.md#5-servicios-externos))
- [ ] Google Cloud Console → *APIs y servicios → Pantalla de consentimiento*: tipo externo, nombre, logo, dominio y enlaces a `/es/privacy` y `/es/terms`; **publicar** la app (si queda "en prueba", solo entran los usuarios de prueba).
- [ ] *Credenciales → ID de cliente OAuth → Aplicación web*, URI de redirección: `https://fileflect.com/api/auth/callback/google`.
- [ ] Copiar ID y secreto en `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

## 5. Resend (email de inicio de sesión)
- [ ] Cuenta en Resend → *Domains → Add domain* `fileflect.com` → crear en el DNS los registros SPF, DKIM (y MX de retorno) que muestra, hasta que diga *Verified*.
- [ ] *API Keys → Create* (permiso *Sending access*) y cargarla en Railway como `RESEND_API_KEY`. Se envía por la API HTTP de Resend porque Railway bloquea el SMTP saliente (puertos 25/465/587) salvo en el plan Pro.
- [ ] `EMAIL_FROM` con una dirección de ese dominio (p. ej. `Fileflect <no-reply@fileflect.com>`). Sin dominio verificado, `onboarding@resend.dev` solo entrega al email de la cuenta de Resend.
- [ ] Si existe `EMAIL_SERVER` en Railway, borrarla y redesplegar.

## 6. Mercado Pago ([DEPLOY.md §5](../DEPLOY.md#5-servicios-externos))
Solo cuando se active el plan Pro (`PRO_ENABLED=true`); mientras esté apagado, este paso se omite.
Por cada país donde se cobre (una cuenta por país):
- [ ] *Tus integraciones → Crear aplicación* (suscripciones).
- [ ] Copiar el Access Token **de prueba** en `MP_ACCESS_TOKEN_XX`.
- [ ] *Webhooks*: URL `https://fileflect.com/api/webhooks/mercadopago`, evento **Planes y suscripciones**; copiar la clave secreta en `MP_WEBHOOK_SECRET_XX`.
- [ ] Probar una suscripción con un usuario de prueba; después cambiar al token de producción y redesplegar.

## 7. Mergear y desplegar
- [ ] En Railway, servicio `app`: `PRO_ENABLED=false` y `NEXT_PUBLIC_CONTACT_EMAIL=contact@fileflect.com` (antes de mergear, para que el build las tome).
- [ ] Confirmar que el CI de `dev` está en verde (pestaña *Actions* de GitHub).
- [ ] Abrir un pull request de `dev` a `main` y mergearlo. Railway despliega solo.
- [ ] Orden del primer deploy: `gotenberg` y `MongoDB`, después `app` ([DEPLOY.md §6](../DEPLOY.md#6-primer-deploy-y-verificación)).

## 8. AdSense (después de publicar)
El código de AdSense va en el `<head>` de **todas** las páginas (portada, herramientas, categorías, legales, contacto, créditos, en los 5 idiomas), en el HTML que manda el servidor: el meta `<meta name="google-adsense-account" content="ca-pub-…">` y el loader `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…" crossorigin="anonymous">`. Lo pone `src/app/[locale]/layout.tsx`; los bloques (`AdSlot`) solo dibujan los `<ins>`, así que el script se carga una sola vez.

- [ ] Para la revisión de AdSense basta con `NEXT_PUBLIC_ADSENSE_CLIENT` (el ID de editor `ca-pub-…`); los `NEXT_PUBLIC_ADSENSE_SLOT_*` pueden esperar a la aprobación. El ID va solo en la variable de Railway, nunca en el código.
- [ ] Las `NEXT_PUBLIC_*` se incrustan al compilar: al crear o cambiar la variable, Railway hace un build nuevo. Si no lo hace, redesplegar a mano; con solo reiniciar no alcanza.
- [ ] Comprobar en producción: abrir `https://fileflect.com/es` (y por ejemplo `/en/terms` o una herramienta), **Ver código fuente de la página** (Ctrl+U, no el inspector) y buscar `adsbygoogle`: tiene que aparecer el script dentro del `<head>`, junto con `google-adsense-account`. Desde una terminal: `curl -s https://fileflect.com/es | grep -o 'google-adsense-account[^>]*\|adsbygoogle.js?client=[^"]*'`.
- [ ] Dar de alta `fileflect.com` en AdSense (o, si ya fue rechazada, **volver a pedir la revisión**) y esperar la aprobación (puede tardar días o semanas).
- [ ] Crear dos bloques de anuncios (lateral vertical y horizontal) y cargar los dos `NEXT_PUBLIC_ADSENSE_SLOT_*`; redesplegar.
- [ ] Verificar que `https://fileflect.com/ads.txt` muestra `google.com, pub-…, DIRECT, f08c47fec0942fa0` (se genera solo desde `NEXT_PUBLIC_ADSENSE_CLIENT`).
- Tests que lo cuidan: `scripts/check-adsense.mjs` (`npm run check:adsense`, revisa todas las páginas prerenderizadas después del build; en el CI el job `check` compila con un ID de prueba) y `tests/e2e/adsense-head.spec.ts` (HTML servido por `next start` en los 5 idiomas, sin la variable no hay código).
- Las páginas 404 de slugs inexistentes son el "shell" de error de Next (noindex): su `<head>` se completa en el navegador, así que no llevan el código en el HTML inicial. AdSense no revisa páginas 404.
- Rendimiento: el loader de Google suma ~250 KB de JS y ~250–350 ms de TBT en Lighthouse móvil, aunque la página no tenga bloques; con la mitigación de la fase 9 Lighthouse móvil queda en 91–92 y CLS 0 (ver `docs/perf/2026-10-28-phase9.md`).

## 9. Search Console
- [ ] Agregar la propiedad de dominio `fileflect.com` (verificación por registro TXT en el DNS).
- [ ] *Sitemaps*: enviar `https://fileflect.com/sitemap.xml`.
- [ ] Inspeccionar `https://fileflect.com/es` y pedir la indexación.

## 10. Verificar después de publicar
- [ ] `https://fileflect.com/api/health` → `{"status":"ok","gotenberg":true}`.
- [ ] `https://fileflect.com/` redirige a `/es` (o al idioma del navegador).
- [ ] Convertir una imagen (JPG → PNG) y unir dos PDF: todo en el navegador.
- [ ] DOCX → PDF y Markdown → PDF (usan Gotenberg).
- [ ] Iniciar sesión con Google y con enlace por email; entrar a `/es/admin` con el correo de `ADMIN_EMAILS`.
- [ ] Leer en voz alta (`/es/leer-texto-en-voz-alta`): con las voces del dispositivo lee sin descargar nada; con "Voz IA" pide confirmar la descarga (~398 MB desde Hugging Face, no desde Railway) y después lee y descarga MP3. No requiere variables ni archivos públicos nuevos; la CSP no define `connect-src` (si algún día se agrega, incluir `https://huggingface.co` y `https://*.hf.co`, ver [`docs/tts-voz-ia.md`](tts-voz-ia.md)).
- [ ] Fase 10 (sin variables, servicios ni cambios de CSP nuevos; todo en el navegador): Excel a CSV (`/es/excel-a-csv`) convierte un XLSX; Editar PDF (`/es/editar-pdf`) agrega un texto y guarda; Transcribir audio a texto (`/es/transcribir-audio-a-texto`) descarga el modelo rápido (~43 MB desde Hugging Face, no desde Railway; si algún día se define `connect-src`, incluir `https://huggingface.co` y `https://*.hf.co`) y transcribe una nota de voz; las guías (`/es/guias`, `/en/guides`, `/pt/guias`, `/fr/guides`, `/zh/guides`) cargan con sus capturas (`public/guides/*.webp`) y figuran en `sitemap.xml`.
- [ ] Con Pro apagado: no hay enlace "Precios" en el header ni en el footer, `/es/pricing` da 404 y `sitemap.xml` no lo incluye. (Cuando se encienda Pro: `/es/pricing` muestra los precios del país y una suscripción de prueba llega como activa por el webhook.)
- [ ] `/es/terms` y `/es/privacy` muestran "Juan Pablo Aste" y contact@fileflect.com; `/es/contact` muestra contact@fileflect.com y el horario.
- [ ] En `/es/login`, debajo de los botones, el texto "Al continuar, aceptas los Términos y condiciones y la Política de privacidad…" con los dos enlaces. Pedir un enlace por email: la página pasa a "Revisa tu correo" (B-26) y el correo llega.
- [ ] `robots.txt`, `sitemap.xml` y `/es/creditos` cargan.
- [ ] Lighthouse móvil de la portada, una herramienta y las páginas legales ≥ 90 y CLS 0 (fase 7: 92–96, CLS 0; ver `docs/perf/2026-10-23-phase7.md`).
