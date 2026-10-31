# Servir los modelos de IA desde Cloudflare R2 (fase 11.4)

**Para qué**: hoy la voz IA (Supertonic, ~398 MB) y la transcripción (Whisper, 43 u 80 MB) se descargan de Hugging Face, que en Latinoamérica llega lento (~0,4 MB/s medido por el dueño). Con una copia en Cloudflare R2 bajo `modelos.fileflect.com`:

- la voz IA baja la versión **fp16 de ~200 MB** en vez de 398 MB (`docs/tts-modelo-liviano.md`), desde la red de Cloudflare;
- R2 **no cobra el tráfico de salida**; el plan gratuito incluye 10 GB de almacenamiento (usamos ~326 MB) y un millón de escrituras y diez millones de lecturas por mes;
- si R2 falla o un archivo no coincide con su SHA-256, el sitio vuelve solo a Hugging Face (`src/lib/models/sources.ts`).

Sin la variable `NEXT_PUBLIC_MODELS_BASE_URL` todo sigue como hoy. El código ya está listo; lo que sigue lo hace el dueño en su cuenta.

## 1. Activar R2 y crear el bucket

1. Entrar a https://dash.cloudflare.com con la cuenta donde está `fileflect.com`.
2. Menú lateral **R2 Object Storage** → **Purchase R2 Plan / Activar R2**. Pide una tarjeta aunque el uso entre en el plan gratuito.
3. **Create bucket**:
   - Nombre: `fileflect-modelos` (puede ser otro; es el `R2_BUCKET` del paso 4).
   - Ubicación: **Automatic** (o una sugerencia cercana a Sudamérica si aparece; la CDN de Cloudflare igual sirve desde el punto más cercano al usuario).
   - Clase de almacenamiento: **Standard**.
4. Anotar el **Account ID** (aparece en la página principal de R2, a la derecha, o en la URL del panel): es `R2_ACCOUNT_ID`.

## 2. Conectar el dominio `modelos.fileflect.com`

1. Abrir el bucket → **Settings** → **Public access** → **Custom Domains** → **Connect Domain**.
2. Escribir `modelos.fileflect.com` → **Continue** → **Connect domain**. Cloudflare crea solo el registro DNS (el dominio ya está en Cloudflare). Esperar a que el estado diga **Active** (unos minutos).
3. **No** activar la URL `r2.dev` (queda deshabilitada): esa es solo para pruebas y tiene límites.
4. Recomendado, para que la CDN guarde los archivos cerca del usuario: **Caching** → **Cache Rules** → **Create rule**:
   - Nombre: `modelos`.
   - Cuando: *Hostname* *equals* `modelos.fileflect.com`.
   - Entonces: **Eligible for cache**; *Edge TTL*: **Use cache-control header if present** (el script sube cada archivo con `Cache-Control: public, max-age=31536000, immutable`).
   - **Deploy**. (Sin esta regla Cloudflare no guarda en la CDN los `.onnx` ni los `.json`, que no están en su lista de extensiones por defecto; igual funciona, solo que cada pedido va hasta R2.)

## 3. Política CORS del bucket

El navegador descarga los archivos con `fetch` desde las páginas de `fileflect.com`, así que el bucket debe permitirlo. Bucket → **Settings** → **CORS Policy** → **Add CORS policy** (o **Edit**) y pegar exactamente:

```json
[
  {
    "AllowedOrigins": ["https://fileflect.com", "https://www.fileflect.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "MaxAgeSeconds": 86400
  }
]
```

**Save**. (Los pedidos no llevan cookies ni encabezados propios, así que no hace falta `AllowedHeaders`.)

## 4. Token de API solo para ese bucket

1. Página principal de R2 → **Manage R2 API Tokens** (o **API** → **Manage API tokens**) → **Create API token** (o **Create Account API token**).
2. Nombre: `fileflect-modelos-sync`.
3. Permisos: **Object Read & Write**.
4. **Specify bucket(s)** → elegir solo `fileflect-modelos`.
5. TTL: el que prefieras (puede ser "Forever"; o unos días y crear otro cuando haga falta subir modelos nuevos).
6. **Create API Token**. Copiar el **Access Key ID** y el **Secret Access Key** (este se muestra **una sola vez**). No pegarlos en el código, en issues ni en chats: solo en la terminal del paso 5 o en un gestor de contraseñas.

## 5. Subir los modelos desde tu PC

Necesitás **Node.js 22 LTS** (https://nodejs.org) y una copia del repositorio en la rama `main` (o `dev`).

```bash
cd fileflip
npm ci
```

Primero una prueba sin credenciales (descarga ~370 MB de Hugging Face, verifica todo y no sube nada):

```bash
node scripts/models/sync-r2.mjs --dry-run
```

Después, la subida. En **macOS/Linux**:

```bash
export R2_ACCOUNT_ID="…" R2_ACCESS_KEY_ID="…" R2_SECRET_ACCESS_KEY="…" R2_BUCKET="fileflect-modelos"
node scripts/models/sync-r2.mjs
```

En **Windows (PowerShell)**:

```powershell
$env:R2_ACCOUNT_ID="…"; $env:R2_ACCESS_KEY_ID="…"; $env:R2_SECRET_ACCESS_KEY="…"; $env:R2_BUCKET="fileflect-modelos"
node scripts/models/sync-r2.mjs
```

Qué hace (`scripts/models/sync-r2.mjs`):

- Descarga de Hugging Face, en sus commits fijados, los archivos de Supertonic 3 y de Whisper `tiny` y `base`, y comprueba el tamaño y el SHA-256 de cada uno (los mismos que exige el sitio).
- Genera la copia fp16 de los 4 ONNX de Supertonic (`scripts/models/onnx-light.mjs`) y comprueba que su SHA-256 sea el fijado en `src/lib/tts/model.ts`.
- Sube 31 archivos (~326 MB) con `Cache-Control: public, max-age=31536000, immutable` y su `Content-Type`, más la licencia OpenRAIL-M de Supertonic y un `NOTICE.txt` que indica que la copia fp16 es una versión modificada (lo pide la licencia).
- Se puede volver a correr: salta los archivos que ya están con el mismo SHA-256. Las descargas quedan en una carpeta temporal (`--cache=<carpeta>` para elegirla).
- Las credenciales se leen solo de esas variables y no se muestran.

Estructura en el bucket (igual a la de Hugging Face, `<repo>/<commit>/<ruta>`):

```
Supertone/supertonic-3/3cadd1ee…/onnx/tts.json, onnx/unicode_indexer.json, voice_styles/F1…M5.json, LICENSE
Supertone/supertonic-3/3cadd1ee…-fp16/onnx/{duration_predictor,text_encoder,vector_estimator,vocoder}.onnx, LICENSE, NOTICE.txt
onnx-community/whisper-tiny/ff417702…/onnx/…, config.json, generation_config.json, preprocessor_config.json, tokenizer.json
onnx-community/whisper-base/1846881b…/(lo mismo)
```

Comprobar (debe responder `200` y `access-control-allow-origin: https://fileflect.com`):

```bash
curl -sI -H "Origin: https://fileflect.com" https://modelos.fileflect.com/Supertone/supertonic-3/3cadd1ee6394adea1bd021217a0e650ede09a323/onnx/tts.json
```

## 6. Activarlo en el sitio

1. Railway → servicio `app` → **Variables** → agregar `NEXT_PUBLIC_MODELS_BASE_URL` = `https://modelos.fileflect.com` (sin barra final).
2. Es una variable `NEXT_PUBLIC_*`: se fija al construir. **Redesplegar** (o mergear `dev` en `main`, que ya redespliega).
3. Probar en https://fileflect.com/es/leer-texto-en-voz-alta → **Voz IA** → **Reproducir**: el aviso debe decir «unos 191 MB desde nuestro servidor de modelos». En las herramientas de desarrollo del navegador (pestaña Red) las descargas van a `modelos.fileflect.com`.

Para volver atrás basta con borrar la variable y redesplegar.

## Cuando cambie un modelo

Si una tarea futura fija otro commit o archivo (en `src/lib/tts/model.ts` o `src/lib/transcribe/model.ts`), volver a correr el paso 5: sube solo lo nuevo, en otra carpeta (el commit es parte de la ruta), así que los usuarios con la versión vieja en caché no se ven afectados.
