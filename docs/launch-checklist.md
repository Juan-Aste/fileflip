# Lista para publicar Fileflect

Pasos concretos y en orden. Las explicaciones largas están en [DEPLOY.md](../DEPLOY.md); acá solo lo que hay que hacer. `fileflect.com` es un ejemplo: usar el dominio real.

## 0. Antes de empezar (decisiones)
- [ ] Confirmar el nombre y comprar el dominio (ver "Pendiente del dueño" en `PROGRESS.md`).
- [ ] Completar los textos legales (razón social, jurisdicción, contacto) en `messages/*.json`, namespace `Legal`, y hacerlos revisar.
- [ ] Revisar los precios por país en `src/config/pricing.ts`.

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
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hola@fileflect.com` |
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
| `RATE_LIMIT_PER_MINUTE` | `20` |
| `TEMP_FILE_TTL_MINUTES` | `60` |

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
Por cada país donde se cobre (una cuenta por país):
- [ ] *Tus integraciones → Crear aplicación* (suscripciones).
- [ ] Copiar el Access Token **de prueba** en `MP_ACCESS_TOKEN_XX`.
- [ ] *Webhooks*: URL `https://fileflect.com/api/webhooks/mercadopago`, evento **Planes y suscripciones**; copiar la clave secreta en `MP_WEBHOOK_SECRET_XX`.
- [ ] Probar una suscripción con un usuario de prueba; después cambiar al token de producción y redesplegar.

## 7. Mergear y desplegar
- [ ] Confirmar que el CI de `dev` está en verde (pestaña *Actions* de GitHub).
- [ ] Abrir un pull request de `dev` a `main` y mergearlo. Railway despliega solo.
- [ ] Orden del primer deploy: `gotenberg` y `MongoDB`, después `app` ([DEPLOY.md §6](../DEPLOY.md#6-primer-deploy-y-verificación)).

## 8. AdSense (después de publicar)
- [ ] Dar de alta `fileflect.com` en AdSense y esperar la aprobación (puede tardar días o semanas).
- [ ] Crear dos bloques de anuncios (lateral vertical y horizontal) y cargar `NEXT_PUBLIC_ADSENSE_CLIENT` y los dos `NEXT_PUBLIC_ADSENSE_SLOT_*`; redesplegar.
- [ ] Verificar que `https://fileflect.com/ads.txt` muestra `google.com, pub-…, DIRECT, f08c47fec0942fa0` (se genera solo desde `NEXT_PUBLIC_ADSENSE_CLIENT`).

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
- [ ] `/es/pricing` muestra los precios del país; una suscripción de prueba llega como activa (webhook).
- [ ] `robots.txt`, `sitemap.xml` y `/es/creditos` cargan.
- [ ] Lighthouse móvil de la portada ≥ 90 y CLS 0.
