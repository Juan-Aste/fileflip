# Deploy de Fileflect en Railway

Este documento explica cómo publicar Fileflect en [Railway](https://railway.com). El repositorio ya trae todo lo necesario (`Dockerfile`, salida `standalone` de Next.js, endpoint de salud); **no se hizo ningún deploy real**.

## Arquitectura

```
                 Internet
                    │ HTTPS (dominio público)
            ┌───────▼────────┐
            │  app (Next.js) │  Dockerfile de este repo, puerto $PORT
            └───┬────────┬───┘
   red privada  │        │  red privada
   ┌────────────▼──┐  ┌──▼──────────────┐
   │  gotenberg    │  │  MongoDB        │
   │  (LibreOffice)│  │  (Railway/Atlas)│
   └───────────────┘  └─────────────────┘
```

- **app**: la aplicación Next.js. Convierte imágenes y PDF en el navegador del usuario; en el servidor solo hace documentos de oficina y Markdown → PDF (vía Gotenberg), PDF → Word y el respaldo de imágenes con sharp.
- **gotenberg**: [Gotenberg 8](https://gotenberg.dev) (LibreOffice y Chromium por HTTP). **Sin dominio público**: solo la app le habla, por la red privada de Railway.
- **MongoDB**: usuarios, sesiones, suscripciones y metadatos de conversiones (nunca archivos).

## 1. Crear el proyecto

1. En Railway: **New Project → Deploy from GitHub repo** y elegir este repositorio (rama `main`, o `dev` para un entorno de pruebas). Railway detecta el `Dockerfile` y lo usa para construir. Renombrar el servicio a `app`.
2. **+ New → Database → MongoDB** (o usar MongoDB Atlas y pegar su URI).
3. **+ New → Docker Image** → `gotenberg/gotenberg:8`. Renombrar el servicio a `gotenberg`.
   - *Settings → Deploy → Custom Start Command*: `gotenberg --api-port=3000 --api-timeout=90s --chromium-disable-javascript=true --chromium-deny-private-ips=true --chromium-deny-public-ips=true`
   - Las tres opciones de Chromium son una **protección contra SSRF**: Markdown → PDF imprime con Chromium una página generada por la app, y con ellas Chromium no ejecuta JavaScript ni puede pedir ninguna dirección de red (ni interna de Railway ni de internet). La página ya trae su propia política CSP que bloquea todo; las opciones son una segunda capa. Ambas se verificaron con Gotenberg 8 real (una página con `<img>`, `<link>`, `@import`, `<iframe>`, `<object>` y `fetch` hacia un servidor de prueba: 0 peticiones con CSP o con las opciones; 7 sin ninguna de las dos).
   - No generar dominio público.
   - Memoria recomendada: 1 GB o más (LibreOffice usa bastante con planillas grandes).

## 2. Red privada

Dentro de un proyecto, cada servicio es accesible en `<nombre>.railway.internal`. Por eso la app usa:

```
GOTENBERG_URL=http://gotenberg.railway.internal:3000
```

Para MongoDB conviene usar una variable de referencia (se actualiza sola si cambia la contraseña):

```
MONGODB_URI=${{MongoDB.MONGO_URL}}
```

## 3. Variables del servicio `app`

Todas están documentadas en `.env.example`. Las `NEXT_PUBLIC_*` se incrustan en el código del navegador **al construir**: el `Dockerfile` las declara como `ARG` y Railway se las pasa al build. Si se cambian, hay que volver a desplegar.

| Variable | Obligatoria | Valor / notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | sí | `https://tu-dominio.com` (sitemap, canonical, hreflang, enlaces de email) |
| `AUTH_SECRET` | sí | generar con `npx auth secret` |
| `AUTH_URL` | sí | igual a `NEXT_PUBLIC_SITE_URL` |
| `MONGODB_URI` | sí | `${{MongoDB.MONGO_URL}}` |
| `GOTENBERG_URL` | sí | `http://gotenberg.railway.internal:3000` |
| `GOTENBERG_TIMEOUT_MS` | no | tiempo máximo de espera a Gotenberg (por defecto 95000 ms, apenas más que su `--api-timeout=90s`) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | no | login con Google (ver §5) |
| `EMAIL_SERVER`, `EMAIL_FROM` | no* | SMTP para magic links (`smtp://usuario:clave@host:587`). *Sin esto no hay login por email. |
| `MP_ACCESS_TOKEN` / `MP_ACCESS_TOKEN_AR`… | no | Mercado Pago (un token por país donde se cobra) |
| `MP_WEBHOOK_SECRET` / `MP_WEBHOOK_SECRET_AR`… | con MP | secreto del webhook de cada cuenta |
| `INTL_PAYMENT_PROVIDER` | no | `none` hasta elegir proveedor internacional |
| `PAYMENTS_MOCK` | no | `true` solo en entornos de prueba (pagos simulados) |
| `AUTH_EMAIL_LOG_LINKS` | no | `true` solo en pruebas sin SMTP (los enlaces quedan en el log) |
| `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR`, `NEXT_PUBLIC_ADSENSE_SLOT_RESULT` | no | sin ellas se muestran espacios reservados |
| `NEXT_PUBLIC_CONTACT_EMAIL` | recomendada | correo de la página de contacto |
| `RATE_LIMIT_PER_MINUTE` | no | conversiones de servidor por IP anónima (20) |
| `TEMP_FILE_TTL_MINUTES` | no | vida máxima de temporales (60) |

`PORT` lo define Railway; el servidor `standalone` lo respeta.

## 4. Healthcheck y dominio

- *Settings → Deploy → Healthcheck Path*: `/api/health` (responde `{"status":"ok","gotenberg":true|false}`; la app se considera sana aunque Gotenberg esté caído, porque solo afecta a documentos de oficina y Markdown → PDF).
- *Settings → Networking → Generate Domain* o **Custom Domain** (crear el registro CNAME que indica Railway). Después actualizar `NEXT_PUBLIC_SITE_URL` y `AUTH_URL` y redeployar.
- Opcional: poner Cloudflare delante para tener la cabecera `cf-ipcountry` (detección de país para los precios). Sin ella, el país se deduce del idioma del navegador y del selector manual.

## 5. Servicios externos

- **Google OAuth** (Google Cloud Console → Credenciales → ID de cliente OAuth "Aplicación web"): URI de redirección autorizada `https://tu-dominio.com/api/auth/callback/google`.
- **SMTP** para magic links: cualquier proveedor (Resend, Brevo, Amazon SES, Mailgun…). Configurar SPF/DKIM del dominio de `EMAIL_FROM`.
- **Mercado Pago** (por cada país donde se cobre): en *Tus integraciones* crear la aplicación, copiar el Access Token (primero el de prueba) y configurar el webhook `https://tu-dominio.com/api/webhooks/mercadopago` con el evento **Planes y suscripciones**; copiar la clave secreta en `MP_WEBHOOK_SECRET` (o `MP_WEBHOOK_SECRET_XX`).
- **Google AdSense**: dar de alta el dominio, crear dos bloques de anuncios (lateral vertical y horizontal) y cargar sus IDs.

## 6. Primer deploy y verificación

1. Deploy de `gotenberg` y `MongoDB`; luego de `app`.
2. Revisar `https://tu-dominio.com/api/health`.
3. Probar: convertir una imagen (todo en el navegador), un DOCX → PDF (Gotenberg), iniciar sesión, ver `/es/pricing`, y `robots.txt` / `sitemap.xml`.
4. En Google Search Console, enviar `https://tu-dominio.com/sitemap.xml`.

## Desarrollo local

```bash
docker compose up -d        # MongoDB en 27017 y Gotenberg en 3001
cp .env.example .env.local  # y completar
npm install
npm run dev
```

Para probar la imagen de producción en local:

```bash
docker build -t fileflect --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 .
docker run --rm -p 3000:3000 --env-file .env.local \
  -e GOTENBERG_URL=http://host.docker.internal:3001 fileflect
```

## Notas de escalado

- El límite de conversiones por IP vive en memoria: con varias réplicas de `app` cada una cuenta por separado. Si se escala, moverlo a MongoDB o Redis.
- Los archivos de servidor se procesan en memoria; no hace falta volumen persistente.
