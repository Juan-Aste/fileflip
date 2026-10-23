# Auditoría de bugs (fase 6)

Registro de hallazgos. Gravedad: **crítica** (rompe una herramienta, el login o los pagos para muchos usuarios), **alta**, **media**, **baja** (cosmético). Estado: abierto / arreglado / dueño (necesita una decisión o configuración del dueño) / descartado.

| ID | Página / herramienta | Navegador y viewport | Pasos para reproducir | Gravedad | Estado | Commit |
|----|----------------------|----------------------|-----------------------|----------|--------|--------|
| B-01 | Auth.js (todas las páginas: consulta de sesión del header, `/api/auth/session`, `/account`, `/admin`) | Servidor (cualquier navegador) | Arrancar la app sin `MONGODB_URI` pero con un método de email habilitado (`RESEND_API_KEY`, `EMAIL_SERVER` o `AUTH_EMAIL_LOG_LINKS=true`, o `next dev`). Cada llamada de Auth.js responde 500 "There was a problem with the server configuration" (`MissingAdapter: Email login requires an adapter`): nadie puede iniciar sesión, ni con Google, y `/admin` da 404 aunque la sesión sea válida. En producción no pasa mientras `MONGODB_URI` esté configurada. Encontrado al construir la prueba 6A.1 | media | arreglado | 697c531 |
| B-02 | Panel de admin, listas con barras (`BarList`: páginas, herramientas, países) | Todos | La barra de proporción de cada fila es una capa `absolute` decorativa (`aria-hidden`) sin `pointer-events-none`: recibe los clics y el puntero en lugar del contenido de la fila. Hoy no tapa ningún enlace (la celda solo tiene texto), pero es el mismo patrón que la capa del hero de la fase 5 y taparía cualquier enlace que se agregue a la fila. Encontrado por la revisión de código 6A.3 | baja | arreglado | b5df792 |
| B-03 | Convertidor de audio (`/en/audio-converter`): MP3 → WAV/FLAC/OGG/M4A | WebKit de Playwright en Linux (GTK/GStreamer), escritorio 1280×900 | Subir `audio.mp3` (o `audio.wav`), elegir FLAC y convertir: la herramienta dice "This file is damaged or incomplete" aunque el archivo está bien (en Chromium y Firefox convierte; WAV, OGG, M4A y MP3 sí funcionan en WebKit). Causa: `canEncodeAudio("flac")` es verdadero en WebKit, así que se usaba su codificador FLAC propio (GStreamer), cuyos paquetes rompen el empaquetado de mediabunny (`RangeError: Tried reading [4, 5)…`); el error se informaba como archivo dañado. Arreglo: FLAC usa siempre el codificador WASM de mediabunny, como en Chromium. Test de regresión: el test `@xb` de audio (WebKit e iPhone) sin `fixme` | media | arreglado | 52dbd3b |
| B-04 | Todas las páginas de video (convertir, comprimir, unir, velocidad, recortar) | WebKit de Playwright en Linux (GTK/GStreamer) | Abrir `/en/video-converter`: la pestaña se cuelga ("Page crashed") al cargar. Causa: `VideoEncoder.isConfigSupported({ codec: "avc1.42001f", … })`, que la página llama al montar para avisar si falta H.264, cierra el proceso del renderizador de esa build de WebKit (sin la llamada la página carga). Es un fallo del motor (GStreamer), no del código; Safari usa VideoToolbox y no se pudo comprobar. Queda anotado y el test de video en WebKit se marca `fixme` | baja | descartado (motor: WebKitGTK/GStreamer; un cuelgue del renderizador no se puede detectar desde la página; el test queda `fixme` en WebKit e iPhone; revisar en Safari real si el dueño puede) | |
| B-05 | Todas las herramientas con zona de arrastre (`Dropzone`: portada, imagen, PDF, comprimidos, etc.) | Todos; visto en WebKit en el CI, más probable en celulares lentos | Elegir un archivo antes de que termine de cargar el JavaScript de la página (el input de archivo ya está en el HTML del servidor): React no ve ese cambio y el archivo se ignora en silencio; la herramienta sigue mostrando "Arrastra tus archivos aquí" y no hay botón de convertir. Apareció como fallo intermitente del test de extraer ZIP en WebKit en el CI | media | arreglado | 28ea427 |
| B-06 | "Descargar todo (ZIP)" en herramientas con varios resultados (visto en convertir modelos 3D y extraer ZIP) | Firefox (Playwright), con carga en paralelo; en el CI en 2 de 3 corridas; también en emulación de iPhone (WebKit) en el CI: "Descargar todo" de convertir hoja de cálculo, corrida de ed97622 (falló también el reintento; las corridas siguientes, 0c70dc1 y 9c62399, pasaron) | Convertir varios archivos y pulsar "Descargar todo": el botón queda activo pero el navegador no inicia ninguna descarga (sin error en la consola). En aislado pasa 9/9. No se encontró la causa (no es la activación de usuario: una descarga de blob 6 s después del clic funciona en Firefox). Puede ser del entorno de pruebas o un fallo real intermitente | media | abierto (investigar en 6C.1) | |
| B-07 | Herramientas de imagen, PDF (unir, dividir, rotar, organizar, comprimir, seleccionar páginas, firmar), hojas de cálculo, datos, EPUB, OCR, comprimidos, modelos 3D y CAD | Navegador sin `Worker`, `WebAssembly` u `OffscreenCanvas` (navegadores viejos o recortados; simulado en Chromium) | Abrir la herramienta en un navegador sin esas APIs, subir un archivo válido y convertir: el error decía "No se pudo convertir este archivo.", que no explica que el problema es el navegador y no el archivo. Arreglo: `errorCode()` y los mensajes fijos de las herramientas PDF usan `browserUnsupported` ("Tu navegador no puede convertir este archivo. Prueba con una versión reciente…") ante un fallo inesperado cuando faltan esas APIs. Test de regresión: `tests/e2e/unsupported.spec.ts` (escenario `legacy`) y `capabilities.test.ts` | media | arreglado | f971cb6 |
| B-08 | Audio (convertir, recortar, ajustar, normalizar, unir) y video (convertir, comprimir, unir, velocidad, recortar) | Navegador sin WebCodecs (simulado en Chromium) | Subir un MP3 o un WebM y convertir: el audio decía "Your browser can't read the audio in this file (for example, AAC…)" y el video "…can't create video in this format (MOV needs H.264)", aunque el formato elegido no era MOV ni el archivo AAC. Arreglo: sin `AudioDecoder`/`VideoEncoder` el error es `browserUnsupported`. El aviso previo "This browser can't process audio/video (it lacks WebCodecs)" ya existía en el convertidor de audio y en convertir, comprimir, unir y velocidad de video. Test de regresión: `tests/e2e/unsupported.spec.ts` (escenario `webCodecs`) | baja | arreglado | f971cb6 |
| B-09 | Herramientas que usan el servidor (Markdown/HTML → PDF, PDF → PDF/A, EPUB → PDF y el respaldo de imágenes) | Todos | Si el proxy de Railway responde con su propia página (413 por cuerpo demasiado grande, 502/503/504 si la app está caída o reiniciando), la herramienta decía "No se pudo convertir este archivo.", culpando al archivo. Arreglo: `statusCode()` en `server-client.ts` traduce 413 → "archivo demasiado grande" y 502–504 → "servicio no disponible" cuando la respuesta no trae nuestro JSON. Test de regresión: `tests/e2e/failure-states.spec.ts` y `server-client.test.ts` | media | arreglado | 20bee6b |
| B-10 | Todas las herramientas que cargan su motor al convertir (imagen, PDF, audio, OCR, comprimidos y el resto) y las de servidor | Todos; sobre todo celulares que pierden la señal y cualquier pestaña abierta durante un despliegue nuevo en Railway (los archivos JS viejos dejan de existir) | Abrir una herramienta, elegir el archivo, quedarse sin conexión (o desplegar una versión nueva) y convertir: decía "No se pudo convertir este archivo." (y las de servidor "El servicio no está disponible"), sin explicar qué pasó ni qué hacer. Arreglo: código nuevo `connectionLost` (5 idiomas: "Se perdió la conexión o la página se actualizó… Revisa tu conexión o recarga la página") cuando `navigator.onLine` es falso o falla la carga de un chunk, worker o WASM; al volver la conexión, reintentar funciona sin recargar. Test de regresión: `tests/e2e/failure-states.spec.ts` (5 herramientas del navegador y 3 de servidor) y `capabilities.test.ts` | alta | arreglado | 20bee6b |
| B-11 | Precios ("Pasar a Pro") y Mi cuenta ("Cancelar suscripción") | Todos | Con sesión, pulsar "Pasar a Pro" con la API de facturación lenta o colgada: el botón solo se deshabilitaba (sin texto ni indicador de trabajo) y, si la respuesta no llegaba nunca, quedaba deshabilitado para siempre; sin conexión decía "El servicio no está disponible". "Cancelar suscripción" igual y además ignoraba el código de error de la API. Arreglo: `postAction()` (tiempo límite de 20 s, código de la API, `connectionLost` sin conexión) usado por los dos botones, que muestran "Redirigiendo…"/"Procesando…" con indicador, `aria-busy` y bloqueo del doble envío con una ref. Test de regresión: `tests/e2e/billing-states.spec.ts` (6) y `post-action.test.ts` | media | arreglado | ed97622 |
| B-12 | Panel de admin, enlaces "Exportar CSV" | Todos (solo admin) | Con MongoDB caído o lento, pulsar "Exportar CSV": el enlace tiene `download`, así que el navegador descarga un `export.json` con `{"error":"serviceUnavailable"}` en vez del CSV, sin ningún mensaje en el panel (comprobado en Chromium) | baja | arreglado (los enlaces CSV descargan con `fetch` y, si falla, muestran "No se pudo exportar…" en el panel; test de regresión: `tests/e2e/environments.spec.ts`) | e07b326 |
| B-13 | Selector de idioma (todas las páginas) | Todos; sobre todo pestañas abiertas durante un despliegue nuevo | Sin conexión, o después de un despliegue (los archivos JS viejos dan 404), elegir otro idioma: el chunk con las tablas de slugs no carga, queda un `ChunkLoadError` sin capturar y no pasa nada (tras un despliegue, el selector no funciona hasta recargar). Arreglo: se captura el error; sin conexión el selector queda como estaba y se puede volver a usar, y con conexión se carga la portada del idioma elegido. La precarga al pasar el puntero tampoco deja errores sin capturar. Test de regresión: `tests/e2e/search-locale-states.spec.ts` | media | arreglado | 0c70dc1 |
| B-14 | Todas las páginas (consulta de sesión del header), `/api/auth/*`, login | Servidor (cualquier navegador) | Arrancar en producción sin `AUTH_SECRET` (variable olvidada o vacía en Railway): cada visita a cualquier página pedía `/api/auth/session` y recibía 500 (`MissingSecret`), con un error en la consola del navegador; el login ofrecía Google y email, que también daban 500. Arreglo: sin `AUTH_SECRET` en producción `/api/auth/session` responde `null` (nadie con sesión), el resto de `/api/auth/*` 503 con código, y el login muestra "El inicio de sesión todavía no está configurado". Test de regresión: `src/lib/auth-providers.test.ts` | media | arreglado | 697c531 |
| B-15 | Todas las páginas (`metadataBase` del layout) y checkout | Servidor | Construir con `NEXT_PUBLIC_SITE_URL` vacía (`NEXT_PUBLIC_SITE_URL=`) o sin protocolo (`app.up.railway.app`): `new URL()` lanzaba "Invalid URL" en el layout y todas las páginas daban 500; con la variable vacía el checkout armaba las URLs de regreso de Mercado Pago sin dominio. Arreglo: `configuredSiteUrl()` en `seo.ts` valida el valor (agrega `https://` a un dominio sin protocolo; si no es válido se ignora) y el checkout usa el origen de la petición. Test de regresión: `src/lib/seo.test.ts` | alta | arreglado | 697c531 |
| B-16 | Login, sesión y todo lo que usa el adaptador de Auth.js (cuenta, precios con sesión, admin) | Servidor | Arrancar la app mientras MongoDB no responde (por ejemplo, los dos servicios reiniciando a la vez en Railway) y después levantar MongoDB: el cliente nativo de MongoDB cuyo primer intento de conexión falló queda cerrado para siempre ("Topology is closed"), así que nadie puede iniciar sesión y las sesiones abiertas aparecen como cerradas hasta reiniciar la app. Además, con MongoDB caído cada página con sesión esperaba hasta 30 s. Arreglo: `getMongoClient()` conecta de forma explícita y, si falla, descarta el cliente para reintentar en la siguiente petición; la espera de selección de servidor baja a 5 s (también en Mongoose). Test de regresión: `src/lib/mongo-client.test.ts` y `tests/e2e/environments.spec.ts` (falla sin el arreglo: comprobado) | alta | arreglado | e07b326 |
| B-17 | Todas las respuestas (páginas, APIs, archivos) | Todos (producción y `dev`) | Pedir cualquier URL de producción y mirar las cabeceras: no hay `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy` ni `Strict-Transport-Security` (`next.config.ts` solo define `Cache-Control` para `/ocr`). Sin `frame-ancestors` el sitio se puede embeber en otro (clickjacking). Encontrado por la prueba de humo 6D.3 | media | arreglado (cabeceras en `next.config.ts` para todas las respuestas; CSP limitada a `frame-ancestors`, `object-src`, `base-uri` y `form-action` para no romper AdSense ni los workers/WASM; test de regresión: `tests/e2e/security-headers.spec.ts`) | a738689 |
| B-18 | Herramientas de páginas PDF (unir, dividir, rotar, ordenar, eliminar/extraer páginas, comprimir, numerar, marca de agua, recortar, firmar, OCR, extraer imágenes) | Todos | Subir un PDF cifrado: con contraseña de apertura (`password-abre123.pdf`) o solo con permisos, sin contraseña para abrir (`permissions-only.pdf`, común en extractos bancarios y formularios) y unir/dividir/etc.: la herramienta descargaba un PDF con las páginas **en blanco** sin ningún aviso, porque pdf-lib copia los contenidos cifrados tal cual. Además, las herramientas de PDF mostraban siempre un error genérico e ignoraban el código del error. Arreglo: el worker de PDF descifra con qpdf los PDF que solo tienen permisos y rechaza los que tienen contraseña de apertura con "Este PDF tiene contraseña de apertura. Quítala primero con «Quitar contraseña de PDF»…" (5 idiomas); pdf.js informa lo mismo en las herramientas que lo usan; las 7 herramientas muestran el código del error. Test de regresión: `src/lib/pdf/password.test.ts` (sin descifrar, el texto de las páginas unidas queda vacío) y `tests/e2e/edge-files.spec.ts` | alta | arreglado | 5ab4537 |
| B-19 | Lista de archivos de las herramientas PDF (unir, etc.) | Todos | Subir un `.pdf` de 0 bytes: la fila decía "Solo PDF", confuso para un archivo que sí se llama `.pdf`. Arreglo: "El archivo está vacío" (5 idiomas) cuando el archivo pesa 0 bytes. Test de regresión: `tests/e2e/edge-files.spec.ts` | baja | arreglado | 5ab4537 |
| B-20 | Herramientas de datos, documentos, OCR, comprimidos, EPUB, audio, video, 3D, CAD y la portada | Todos | Elegir un archivo de 0 bytes (`empty.csv`, `.zip`, `.epub`, `.mp3`, `.mp4`, `.stl`, `.dxf`, `.png`…): la herramienta lo aceptaba, mostraba el botón y al convertir decía "Este formato no se puede convertir así." (comprimidos, EPUB, audio, video, 3D, CAD), "El archivo está dañado o incompleto" (OCR) o "No pudimos leer el contenido. Revisa que el formato sea válido…" (datos); la portada decía "Formato no compatible". Arreglo: `checkInputs()` rechaza al elegirlo con "nombre: El archivo está vacío." (código `emptyFile`, 5 idiomas), salvo en hash, Base64 y crear ZIP, donde un archivo vacío es válido; la portada dice lo mismo. Test de regresión: `tests/e2e/edge-files-families.spec.ts` y `state.test.ts` (antes del arreglo el sondeo mostraba los mensajes de arriba) | baja | arreglado | 3edd510 |
| B-21 | Portada, PDF → JPG/PNG de varias páginas | Todos | Convertir a JPG un PDF guardado con otra extensión (`informe.docx`, detectado como PDF por el contenido): la descarga se llamaba `informe.docx-jpg.zip` y las páginas `informe.docx-1.jpg`. Arreglo: se quita la última extensión, sea cual sea. Test de regresión: `tests/e2e/edge-files-families.spec.ts` y `to-images.test.ts` | baja | arreglado | 3edd510 |

## 6A.1 — Clicabilidad de todas las páginas (2026-10-23)

`tests/e2e/clickable.spec.ts` + `tests/e2e/hit-test.ts`: 216 páginas (portada en los 5 idiomas, catálogo, 16 categorías, las herramientas publicadas, conversiones, cola larga, precios, login, verificación, contacto, legales, créditos) más `/es/account` y `/es/admin` con una sesión JWT de administrador de prueba, en 1280×800, 768×1024 y 390×844, claro y oscuro (6 combinaciones, 90 tests, ~10 min con 4 workers). Para cada enlace, botón, input, select, textarea, label, summary y rol interactivo visible: `document.elementFromPoint` en el centro y en las 4 esquinas internas (con margen según el `border-radius`) debe devolver el elemento o un descendiente; además, fuera de pantalla, scroll horizontal de la página y objetivos táctiles < 24×24 px en tablet y móvil con la excepción de espaciado de WCAG 2.5.8 (un círculo de 24 px centrado en el objetivo no toca otro objetivo), enlaces en línea dentro de un texto y controles nativos sin estilo. Los botones deshabilitados no se exigen (ignoran el puntero a propósito). Un test de control inyecta una capa invisible sobre la portada y dos botones de 16 px pegados y verifica que el detector los reporta.

**Resultado**: ningún elemento tapado, fuera de pantalla ni con scroll horizontal en las 216 páginas × 6 combinaciones; ningún objetivo táctil chico sin espacio suficiente. El arreglo de la capa decorativa de la fase 5 se mantiene. Hallazgo colateral: B-01.

## 6A.2 — Estados abiertos (2026-10-23)

`tests/e2e/open-states.spec.ts` (19 tests): el mismo detector, limitado al elemento abierto cuando corresponde, en 390×844 y 1280×800, claro y oscuro: buscador (Ctrl+K en escritorio, botón en móvil) con resultados y clic real en un resultado; acordeones de preguntas frecuentes y paneles de opciones abiertos; convertidor de la portada antes y después de convertir; resultados de unir PDF, comprimir imágenes y extraer ZIP (un enlace de descarga por archivo); menú móvil abierto (claro y oscuro; el botón de cerrar sigue alcanzable y un enlace cierra el menú y navega); selector de idioma dentro del menú móvil (mantiene la página: `/es/unir-pdf` → `/pt/juntar-pdf`, `lang="pt"`).

**Resultado**: sin hallazgos.

## 6A.3 — Revisión del código: capas absolutas y fijas (2026-10-23)

Se revisaron todos los elementos `absolute`/`fixed` de `src` (clases de Tailwind, pseudo-elementos `before:`/`after:` y CSS). Intencionales y correctos: el `after:absolute inset-0` de la zona de arrastre (agranda a propósito el área del label que abre el selector de archivos), el panel del menú móvil, las asas de recorte y de esquinas (interactivas), el botón de quitar archivo, la insignia de "recomendado" en precios, las etiquetas del gráfico de líneas y la marca de página seleccionada (dentro de su propio botón). Las capas decorativas del hero (portada y `PageHero`), la línea de pasos de la portada y las guías de recorte y de foto carnet ya tienen `pointer-events-none`. Única falta: B-02.

Guarda nueva en el CI: `tests/decorative-layers.test.ts` (Vitest, con el compilador de TypeScript) recorre el JSX de `src` y falla si un elemento `aria-hidden` con `absolute` o `fixed` no tiene `pointer-events-none` (salvo que tenga manejadores de puntero propios). Falla sin el arreglo de B-02 y pasa con él.

## 6A.4 — Arreglos de 6A

B-02 se arregló en 6A.3. 6A.1 y 6A.2 no encontraron controles tapados, fuera de pantalla ni objetivos táctiles chicos. B-01 es de configuración del entorno y se arregla en 6D.1.

## 6B.1 — Firefox y WebKit en escritorio (2026-10-23)

Proyectos `firefox` y `webkit` en `playwright.config.ts` que corren solo los tests marcados `@xb`: uno por familia (comprimir imagen, unir PDF, hoja de cálculo → CSV, Markdown → HTML, JSON → CSV, OCR de foto de celular, extraer ZIP con carpetas, EPUB → HTML, MP3 → WAV/FLAC/OGG/M4A, WebM → MOV, modelos 3D → GLB, DXF → SVG, generador de QR, convertidor de colores). Job nuevo `e2e-browsers` en el CI, dentro de la imagen oficial de Playwright (navegadores y librerías ya instalados; instalar las dependencias con apt tardaba más de 20 min en el runner): corre la muestra en Firefox y WebKit (~1 min) y los chequeos rápidos de clics de Chromium (`open-states`, `login` y el control de `clickable`).

**Resultado**: Firefox 14/14. WebKit 12/14: B-03 (audio, mensaje de "archivo dañado") y B-04 (las páginas de video cuelgan esa build de WebKit), ambos marcados `fixme` con referencia. Artefactos de test (no del producto): WebKit informa las descargas `blob:` propias como peticiones (el test de EPUB las contaba como externas; arreglado), y "Descargar todo" de extraer ZIP en Firefox no disparó el evento de descarga una vez de varias corridas con 4 workers en paralelo (9/9 en aislado y en la corrida con 2 workers, como en el CI).

**Seguimiento en el CI**: la primera corrida del job tardó más de 20 min en instalar las librerías con apt (espejo de Ubuntu lento) y se pasó a la imagen oficial de Playwright. La siguiente falló en WebKit (extraer ZIP): la página no había tomado el archivo. Causa: B-05 (archivo elegido antes de la hidratación). Arreglo en `Dropzone` (al montar toma los archivos que ya tenga el input) y test de regresión `tests/e2e/early-pick.spec.ts` (retiene los chunks de JavaScript, elige el archivo, los libera y espera el resultado; corre en los 3 navegadores; falla sin el arreglo). El job sube `test-results/` como artefacto cuando falla.

Luego, en el CI, el test de modelos 3D falló dos veces en Firefox con el mismo síntoma que el de extraer ZIP: "Descargar todo" no produjo descarga (B-06). Los proyectos Firefox y WebKit tienen 1 reintento solo en el CI, así que esos casos se informan como "flaky" sin poner el job en rojo; B-06 queda abierto.

## 6B.2 — Emulación de iPhone y Android (2026-10-23)

Proyectos `iphone` (WebKit con `devices["iPhone 13"]`: 390×664, táctil, agente de usuario de iOS, escala 3) y `android` (Chromium con `devices["Pixel 7"]`: 412×839, táctil, escala 2,625) en `playwright.config.ts`, con la misma muestra `@xb` de 15 tests (una por familia más la carga temprana de archivos). Se agregaron al paso de la muestra del job `e2e-browsers` del CI.

**Resultado**: Android 15/15. iPhone 13/15 y 2 `fixme` (B-03 y B-04, los mismos de WebKit de escritorio: la emulación usa el mismo motor). Sin hallazgos nuevos: con viewport de celular, táctil y agente de usuario móvil las herramientas cargan el archivo, convierten y descargan igual que en escritorio. Limitación: la emulación no reproduce la memoria ni la CPU de un celular real ni el Safari de iOS (WebKit de Playwright en Linux usa GStreamer, no los códecs de Apple).


## 6B.3 — Lo que el navegador no soporta (2026-10-23)

**B-03** (FLAC en WebKit): causa encontrada y arreglada (ver la tabla). **B-04**: se descarta como fallo del motor de Playwright en Linux; no se puede detectar de antemano un cuelgue del proceso del renderizador.

Detector nuevo: `tests/e2e/unsupported.spec.ts` borra APIs antes de que corran los scripts de la página y prueba una herramienta por familia (imagen, PDF, hoja de cálculo, datos, Markdown, EPUB, OCR, comprimidos, 3D, CAD, audio, video, GIF) en dos escenarios: `legacy` (sin `Worker`, `WebAssembly`, `OffscreenCanvas` ni WebCodecs) y `webCodecs` (sin WebCodecs, para audio y video). Exige que en 30 s haya un resultado o un mensaje que diga que es el navegador, que no haya errores sin capturar y que el botón quede usable (sin colgarse). Corre en Chromium en el job `e2e-browsers` del CI.

**Resultado**: ninguna herramienta se colgó ni falló en silencio. Mensajes engañosos: B-07 (genérico en vez de "tu navegador no puede") y B-08 (audio y video culpaban al archivo o al formato), ambos arreglados. Markdown → HTML y video → GIF funcionan sin esas APIs. Los avisos previos de WebCodecs ya existentes se mantienen; el resto de las herramientas avisa al convertir.


## 6C.1 — Herramientas: lentitud, errores, sin conexión, doble clic y cancelar (2026-10-23)

Detector nuevo: `tests/e2e/failure-states.spec.ts` (32 tests, Chromium, en el CI).
- Herramientas de servidor (Markdown → PDF, PDF → PDF/A, EPUB → PDF) con la API reemplazada por `page.route`: 503 y 429 con código, páginas 502 y 413 del proxy sin JSON, sin conexión, respuesta lenta con doble clic y petición que nunca responde. Cada caso exige mensaje traducido en `role="alert"`, que se pueda reintentar con el mismo archivo y que la segunda vez funcione; el doble clic manda una sola petición; "Cancelar" corta la petición colgada y deja la herramienta usable.
- Herramientas del navegador (comprimir imagen, unir PDF, convertir audio, OCR, extraer ZIP): sin conexión después de cargar la página, doble clic (un solo resultado), y cancelar un OCR en curso y volver a correrlo.

**Resultado**: indicador de trabajo, bloqueo del doble envío, `aria-live`, reintento y cancelar ya funcionaban en todos los casos. Mensajes engañosos: B-09 (páginas de error del proxy) y B-10 (sin conexión o tras un despliegue: alta, porque afecta a cualquier pestaña abierta durante un despliegue), ambos arreglados. Observación sin cambio: las subidas al servidor no tienen un tiempo límite propio (dependen del límite del trabajo y del botón Cancelar, que funciona).


## 6C.2 — Login, checkout, cancelación, panel de admin y CSV (2026-10-23)

- **Login por email y Google**: ya cubiertos por `tests/e2e/login.spec.ts` (fase 5: enviando, doble envío, error 500 y de red, tiempo límite de 20 s, validación, traducción, estado de redirección). Sin hallazgos nuevos.
- **Checkout**: detector nuevo `tests/e2e/billing-states.spec.ts` (Chromium, en el CI), con sesión en el segundo servidor de pruebas (`PAYMENTS_MOCK=true` solo ahí; la API se reemplaza con `page.route`, no se crean suscripciones): respuesta lenta + doble clic, 503 con código, página 502 del proxy, error de red, sin conexión y respuesta que nunca llega (con el reloj simulado de Playwright). Encontró B-11.
- **Cancelar suscripción**: el botón solo aparece con una suscripción activa en MongoDB, que el entorno de pruebas no tiene; se revisó el código (mismos problemas que el checkout, B-11) y se cubre con `post-action.test.ts`, que prueba el código compartido.
- **Panel de admin**: se renderiza en el servidor (sin acciones con estado en el navegador salvo los enlaces). Exportar CSV: B-12 (baja), se arregla en 6C.3.


## 6C.3 — Buscador y selector de idioma (2026-10-23)

Detector nuevo: `tests/e2e/search-locale-states.spec.ts` (5 tests, Chromium, en el CI): índice del buscador con HTTP 500, error de red y respuesta lenta (estado "Cargando…", mensaje "No se pudo cargar el buscador" en `role="status"` y reintento al reabrir); selector de idioma sin conexión y tras un despliegue simulado (los chunks dan 404).

**Resultado**: el buscador ya manejaba bien todos los casos. Selector de idioma: B-13 (arreglado). Pendiente de 6C: B-12 pasa a 6D.2.


## 6D.1 — Variables de entorno faltantes o vacías (2026-10-23)

Revisión de cada variable de `.env.example` en el código (`process.env.*` en `src`) y prueba con `next build && next start` en modo producción con el entorno vacío (`env -i`) y con combinaciones: solo `AUTH_SECRET`; `AUTH_SECRET` + Resend sin MongoDB; Google sin MongoDB; MongoDB y Gotenberg inaccesibles. En cada caso se pidieron 21 rutas (portada en 2 idiomas, catálogo, precios, login, cuenta, admin, créditos, contacto, privacidad, 3 herramientas, health, `/api/auth/session` y `/providers`, robots, sitemap, ads.txt).

| Variable | Si falta o está vacía |
|----------|-----------------------|
| `NEXT_PUBLIC_SITE_URL` | B-15 (500 en todas las páginas si está vacía o sin protocolo); arreglado. Si falta, canónicas con `http://localhost:3000`: hay que configurarla en Railway (ya en DEPLOY.md) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | La página de contacto muestra un texto alternativo. Bien |
| `MONGODB_URI` | Sin cuenta, panel ni estadísticas (las páginas con sesión dan 404 o redirigen); con email habilitado, B-01 (500 en todo Auth.js); arreglado: sin base de datos solo queda Google |
| `GOTENBERG_URL`, `GOTENBERG_TIMEOUT_MS` | Las conversiones de LibreOffice responden 503 `serviceUnavailable` con código (lo revisa 6D.2 con la app levantada); un tiempo no numérico usa 95 s. Bien |
| `AUTH_SECRET` | B-14 (500 en `/api/auth/session` en cada visita); arreglado |
| `AUTH_URL` | Opcional con `trustHost: true`. Bien |
| `AUTH_GOOGLE_ID` / `_SECRET` | Sin botón de Google. Bien |
| `RESEND_API_KEY`, `EMAIL_SERVER`, `EMAIL_FROM`, `AUTH_EMAIL_LOG_LINKS` | Sin método de envío en producción no se muestra el email; `EMAIL_FROM` tiene valor por defecto; un error de Resend lo muestra el formulario (`login.spec.ts`). Bien |
| `MP_ACCESS_TOKEN*`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` | Sin token del país el checkout responde `notConfigured` con mensaje traducido; webhook sin secreto: lo revisa 6F.2 |
| `INTL_PAYMENT_PROVIDER` y sus claves, `PAYMENTS_MOCK` | Vacío = `none`. Bien |
| `NEXT_PUBLIC_ADSENSE_*` | Espacios de anuncio de relleno y sin `ads.txt` (404). Bien |
| `RATE_LIMIT_PER_MINUTE`, `TEMP_FILE_TTL_MINUTES` | Vacío o no numérico = 20 y 60. Bien |
| `ADMIN_EMAILS` | Nadie entra al panel (404). Bien |

**Resultado**: B-01 (media), B-14 (media) y B-15 (alta), arreglados en 697c531. Después del arreglo, ninguna de las combinaciones da 500 en las rutas probadas. Sin `AUTH_SECRET` el servidor sigue registrando un `MissingSecret` por cada página que consulta la sesión (precios, login): es intencional, como aviso en los logs. El primer servidor de pruebas de Playwright (el de `login.spec.ts`) usa ahora un `MONGODB_URI` inaccesible para mostrar el formulario de email.


## 6D.2 — La app levantada con variables faltantes y servicios caídos (2026-10-23)

Detector nuevo: `tests/e2e/environments.spec.ts` (6 tests, Chromium, en el CI). Levanta el build de producción (`next start`) dos veces, con su propio entorno:
- **MongoDB (en memoria) caído al arrancar, después de vuelta, y Gotenberg que acepta la petición y nunca responde** (`GOTENBERG_TIMEOUT_MS=3000`), con un admin con sesión en la base: 18 rutas sin 500 ni páginas en blanco con MongoDB caído (y sin esperas de 30 s por página); al volver MongoDB, la sesión funciona sin reiniciar (B-16); con todo arriba, las mismas rutas y `/es/account`; Markdown → PDF con Gotenberg colgado da 503 `serviceUnavailable` en menos de 15 s y `/api/health` informa `gotenberg: false`; exportar CSV del admin con la API en 503 muestra el error en el panel y no descarga nada (B-12), y con la API bien descarga `fileflect-conversions-per-day-….csv`.
- **Sin ninguna variable de entorno**: las mismas rutas sin 500; `/api/auth/session` = `null`, `/api/auth/providers` = 503, el login dice "Sign-in isn't configured yet." y las conversiones de servidor 503 (B-14).

Otras comprobaciones a mano con `next start`: cabeceras de país (`cf-ipcountry` AR, XX, T1, con HTML) e idioma (`*`, mal formada, de 8 KB, cookie `NEXT_LOCALE` inválida) → la portada redirige a `/es` y precios responde 200 en todos los casos; idioma inexistente en la ruta → redirección; índice del buscador de un idioma inexistente → 404.

**Resend con error**: el envío por la API de Resend con respuesta de error ya está cubierto por `src/lib/email/send.test.ts` (lanza sin filtrar la clave) y el formulario lo muestra (`login.spec.ts`).

**Límite de tamaño del cuerpo**: las APIs de conversión rechazan un `Content-Length` mayor al límite del plan antes de leer el cuerpo, pero un envío sin `Content-Length` (chunked) se lee entero en memoria antes de comprobar el tamaño. Queda para 6F.3 (límites de tamaño y frecuencia en todas las APIs).

**Resultado**: B-16 (alta) y B-12 (baja), arreglados en e07b326.


## 6D.3 — Prueba de humo en producción (2026-10-23 04:16 UTC)

Script nuevo y reutilizable: `scripts/smoke-production.mjs` (solo lectura: 12 peticiones separadas 3 s y dos páginas de herramientas en Chromium con la API de conversión bloqueada; no inicia sesión, no pide emails, no inicia pagos ni convierte en el servidor). Ejecutado una vez contra https://app-production-4266.up.railway.app.

| Ruta | Resultado |
|------|-----------|
| `/api/health` | 200 `{"status":"ok","gotenberg":true}` |
| `/es`, `/en` | 200, canónica con el dominio de producción |
| `/es/herramientas`, `/pt/ferramentas` | 200 |
| `/en/merge-pdf`, `/es/comprimir-imagen`, `/en/word-to-pdf`, `/en/json-to-csv` | 200 |
| `/en/credits` | 200 |
| `/robots.txt` | 200, `Sitemap:` con el dominio de producción |
| `/sitemap.xml` | 200, URLs con el dominio de producción |
| Comprimir imagen (`photo.jpg`) en el navegador | descarga `photo.jpg` (13,8 KB); sin errores de consola, sin recursos 4xx/5xx, sin llamadas a `/api/convert` |
| Unir PDF (2 archivos) en el navegador | descarga `fileflect-merged.pdf`; sin errores de consola ni recursos 4xx/5xx |

**Cabeceras**: ninguna respuesta trae cabeceras de seguridad (B-17, media, se arregla en 6F.1). `NEXT_PUBLIC_SITE_URL` está bien configurada (canónicas, robots y sitemap con el dominio de Railway).

**Producción va atrás de `dev`**: `main` (desplegado) llega hasta el cierre de la fase 4 (be9ba40, PR #3); `dev` tiene 33 commits más, con todo lo de las fases 5 y 6 (capa del hero que tapaba botones, estados del login por email, Resend, y los arreglos B-01 a B-16). Los bugs que el dueño vio en producción siguen ahí hasta que mergee `dev` en `main`.


## 6E.1 — Fixtures de casos límite (2026-10-23)

`scripts/fixtures/edge.mjs` genera 46 archivos en `tests/fixtures/edge/` (ignorada por git; ~90 MB, 24 s): fotos de 12/24/48 MP con orientación EXIF 6 (comprobado con sharp: 4000×3000 y 8000×6000, `orientation: 6`), PNG de 12 MP (33 MB), PDF de 500 páginas, PDF escaneado sin capa de texto, PDF con contraseña (pdf-lib no lo puede abrir sin ella: comprobado), 8 nombres difíciles, 13 archivos de 0 bytes, 8 extensiones mentirosas y Markdown de 15 MB − 1 KB y 15 MB + 1 KB. Detalle en `tests/fixtures/README.md`. HEIC: sharp no codifica HEVC; se usa el `photo.heic` existente. Los límites del navegador (200 MB gratis, 1 GB Pro) se prueban en 6E.2 con objetos `File` creados en la página, sin escribirlos a disco. Sin hallazgos todavía: los usan 6E.2 y 6E.3.


## 6E.2 — Familias imagen y PDF con los fixtures de casos límite (2026-10-23)

Detector nuevo: `tests/e2e/edge-files.spec.ts` (19 tests, Chromium, en el CI; genera los fixtures si faltan).

| Caso | Resultado |
|------|-----------|
| Foto de 48 MP con orientación EXIF 6 → comprimir | `phone-48mp-orientation6.jpg`, 6000×8000 (derecha) |
| Foto de 24 MP → PNG (convertidor) | `phone-24mp-orientation6.png`, 4000×6000 |
| PNG de 12 MP (33 MB) → WebP | `phone-12mp.webp`, 4000×3000 |
| Nombres con acentos y raya, emojis, muchos puntos, sin extensión, PNG llamado `.jpg` | se conserva el nombre con la extensión nueva (`SIN EXTENSION.jpg`, `png-named.png`) |
| Imagen de 0 bytes | mensaje claro |
| 50 MB + 1 byte en comprimir imagen | "enorme.jpg: El archivo es demasiado grande." y sin botón de comprimir |
| PDF de 500 páginas + 1 → unir | 501 páginas |
| PDF de 500 páginas → dividir | ZIP con 500 PDF |
| PDF escaneado de 5 páginas → comprimir | 5 páginas |
| PDF con contraseña → unir / PDF a texto | B-18 (antes: páginas en blanco sin aviso); ahora pide quitar la contraseña |
| PDF solo con permisos → unir | B-18 (antes: páginas en blanco); ahora conserva el texto ("1 of 3"…) |
| Nombre de 235 caracteres y nombre en chino → dividir | nombre de descarga ≤ 255 caracteres, empieza igual |
| PDF de 0 bytes | B-19 ("Solo PDF" → "El archivo está vacío"); no se puede unir |
| Word llamado `.pdf` | "Solo PDF"; no se puede unir |

**Falsos positivos del entorno**: en el contenedor (locale C, sin UTF-8) Chromium ignora un archivo elegido por ruta con caracteres no ASCII y guarda las descargas con nombre no ASCII como "download". No pasa con el locale UTF-8 de cualquier sistema de usuario: `playwright.config.ts` ahora pone `LANG=C.UTF-8` cuando no hay locale, y así todos los nombres funcionan.

**Ruido en el CI**: el servidor de pruebas con MongoDB inaccesible (6D.1) hacía que cada `/api/visit` esperara la selección de servidor, lo que retrasaba `networkidle`; probablemente por eso el job de navegadores de 0b54228 llegó al límite de 25 min (los siguientes, con 5 s de espera, tardaron 11 min). Ahora `tests/e2e/support.ts` responde `/api/visit` con 204 como ya hacía con `/api/stats`.

**Resultado**: B-18 (alta) y B-19 (baja), arreglados.

## 6E.3 — Resto de familias con los fixtures de casos límite (2026-10-23)

Primero un sondeo (25 casos, cada herramienta con el fixture que aplica, sin aserciones) y después el detector `tests/e2e/edge-files-families.spec.ts` (24 tests, Chromium, ~40 s, en el CI junto con `edge-files`).

| Caso | Resultado |
|------|-----------|
| Archivo de 0 bytes en CSV a JSON, formatear JSON, extraer ZIP, convertir EPUB, audio, video, modelo 3D, DXF, imagen a texto, hoja de cálculo y portada | B-20 (antes: botón activo y error engañoso después del clic); ahora "El archivo está vacío." al elegirlo |
| Archivo de 0 bytes en generador de hash / crear ZIP | hash correcto del contenido vacío (`e3b0c442…`) / el ZIP lo incluye con 0 bytes |
| Nombres con acentos, raya y emojis en crear ZIP, CSV a JSON, audio, DXF y EPUB | se conservan en las entradas del ZIP y en las descargas |
| MP3 llamado `.wav`, WebM llamado `.mp4` | se convierten según el contenido (WAV y MP4 válidos) |
| ZIP llamado `.epub` | "El archivo está dañado o incompleto. Prueba con otra copia." |
| PDF llamado `.docx` en la portada | se detecta como PDF y se convierte; B-21 en el nombre de la descarga |
| JSON llamado `.csv` en CSV a JSON | se lee como CSV de una columna (es texto válido); sin error ni cuelgue. No se considera bug |
| Markdown 1 KB por encima del límite del servidor en Markdown a PDF / portada | rechazado al elegirlo / "El archivo es demasiado grande." al convertir; en los dos casos sin subir nada |
| Markdown de 15 MB en Markdown a HTML (límite propio de 5 MB) | rechazado al elegirlo |
| PDF con contraseña en OCR de PDF | pide quitar la contraseña (B-18) |

Los PDF grandes y escaneados ya se probaron en 6E.2 (OCR de PDF escaneado: `ocr-tools.spec.ts`). No se encontraron cuelgues ni errores sin capturar.

**Resultado**: B-20 y B-21 (baja), arreglados.

## 6F.1 — Cabeceras HTTP y cookies de sesión (2026-10-23)

Detector nuevo: `tests/e2e/security-headers.spec.ts` (4 tests, Chromium, en el CI).

| Cabecera | Valor | Motivo |
|----------|-------|--------|
| `Content-Security-Policy` | `frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com` | Evita que otro sitio embeba la app (clickjacking), los plugins y el secuestro de `<base>`; los formularios solo van a la app y al login de Google (Chrome aplica `form-action` también a la redirección del formulario). `script-src`, `connect-src`, `img-src` y `frame-src` quedan abiertos a propósito: AdSense carga desde muchos dominios de Google que cambian, y las herramientas usan workers, `blob:` y WebAssembly. Una CSP estricta con nonce exigiría renderizar todas las páginas de forma dinámica (perdería la caché estática y empeoraría Lighthouse) |
| `X-Frame-Options` | `SAMEORIGIN` | Lo mismo que `frame-ancestors`, para navegadores viejos |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No filtra rutas ni consultas a otros sitios |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), usb=()` | Ninguna herramienta los usa; las funciones de anuncios quedan con los valores de Google |
| `Strict-Transport-Security` | `max-age=31536000` | Sin `includeSubDomains` ni `preload`, para no afectar subdominios de un dominio propio futuro |

**Cookies**: Auth.js no cambia los valores por defecto. Detrás del proxy HTTPS de Railway (`X-Forwarded-Proto: https`) las cookies son `__Host-authjs.csrf-token` y `__Secure-authjs.*` (incluida la de sesión) con `HttpOnly; Secure; SameSite=Lax`; en HTTP local, sin `Secure`. La cookie de región de precios (la escribe JavaScript, no es sensible) ahora lleva `secure` en HTTPS.

**Comprobaciones**: las cabeceras están en páginas, APIs, `robots.txt`, `sitemap.xml`, archivos estáticos y el 404; un `<iframe>` de otro origen no muestra la app; sin violaciones de CSP en portada, herramientas, login y precios; las suites de OCR, PDF, imagen, audio, video, 3D, quitar fondo, login y navegador sin APIs (172 tests) pasan con las cabeceras.

**Resultado**: B-17 (media) arreglado. Se verá en producción cuando el dueño mergee `dev` en `main`.
