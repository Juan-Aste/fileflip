# Voz IA en la nube (Google Cloud Text-to-Speech)

Fase 13.3. El lector («Leer texto en voz alta») ofrece tres opciones: «Escuchar» (voces del dispositivo, por defecto), **«Voz IA (nube)»** y «Modo privado» (Supertonic en el navegador). Esta página explica la voz en la nube y lo que tiene que hacer el dueño para encenderla.

**Sin `GOOGLE_TTS_API_KEY` en el servidor la opción no aparece** y el lector funciona como antes (`GET /api/tts` responde `{"enabled":false}` y `POST /api/tts` da 404).

## Cómo funciona

- El navegador pide `GET /api/tts` después de cargar el lector: si está encendida, si queda cupo este mes y un token firmado de 30 minutos.
- Cada frase (máx. 1500 caracteres y 5000 bytes, el límite de la API) es un `POST /api/tts` con `{ text, voice, rate, token }`. El servidor (Node, `src/app/api/tts/route.ts`) llama a `texts:synthesize` con la clave en la cabecera `X-Goog-Api-Key` (no en la URL), solo con `input.text` (nunca SSML: el usuario no puede inyectar marcado), y devuelve el MP3 (24 kHz mono) sin guardarlo.
- El lector prepara 3 frases por adelantado, 3 pedidos a la vez, para que no haya silencios (fase 13.1). «Descargar MP3» une las frases en el navegador (decodifica y vuelve a codificar con el codificador MP3 del sitio, con 0,3 s entre frases).
- La lógica está detrás de una interfaz `TtsProvider` (`src/lib/server/tts/provider.ts`) para poder sumar Azure más adelante.

## Voces

WaveNet: gratis hasta 4 millones de caracteres por mes; después US$4 por millón ([precios](https://cloud.google.com/text-to-speech/pricing)). Tres por idioma (`src/lib/tts/cloud-voices.ts`):

| Idioma | Voces |
|---|---|
| es | es-US-Wavenet-A (mujer), es-US-Wavenet-B (hombre), es-ES-Wavenet-C (mujer) |
| en | en-US-Wavenet-F, en-US-Wavenet-D, en-US-Wavenet-H |
| pt | pt-BR-Wavenet-A, pt-BR-Wavenet-B, pt-BR-Wavenet-C |
| fr | fr-FR-Wavenet-A, fr-FR-Wavenet-B, fr-FR-Wavenet-C |
| zh | cmn-CN-Wavenet-A, cmn-CN-Wavenet-B, cmn-CN-Wavenet-D |

Por primera vez el chino tiene voz IA y MP3. **La voz recomendada por idioma (y si es mejor es-US o es-ES) queda pendiente**: en esta sesión no hay clave, así que no se pudieron grabar muestras ni medir el WER. Mientras tanto el lector no muestra muestras («sin muestra») y usa el orden de la tabla. Cuando el dueño corra el script (paso 7), las muestras aparecen y la voz con menor WER de cada idioma queda primera.

## Protección de costos

| Límite | Variable | Por defecto |
|---|---|---|
| Caracteres por día por IP sin cuenta | `TTS_DAILY_CHARS_ANON` | 20.000 |
| Caracteres por día por usuario con cuenta | `TTS_DAILY_CHARS_USER` | 100.000 |
| Pedidos por minuto por IP | `TTS_REQUESTS_PER_MINUTE` | 60 |
| **Tope mensual global** | `TTS_MONTHLY_CHAR_LIMIT` | **3.500.000** |
| Tamaño por pedido | — | 1500 caracteres / 5000 bytes, cuerpo ≤ 16 KB |

- El tope mensual se cuenta en MongoDB (colección `ttsusages`: documentos `m:AAAA-MM` y `d:AAAA-MM-DD` con **solo el número** `chars`; nunca el texto, la IP ni el usuario). Los caracteres se reservan de forma atómica antes de llamar a Google (pedidos en paralelo no pueden pasar el tope) y se devuelven si Google falla. Si MongoDB no responde, se rechaza el pedido (no se gasta sin poder contar). Al llegar al tope la opción se apaga sola hasta el mes siguiente (UTC) y el lector ofrece las voces del dispositivo y el modo privado.
- Los límites por día y por minuto viven en la memoria del servidor (como el limitador existente): con varias réplicas cada una cuenta aparte.
- Contra otros sitios: el POST exige `Origin` del propio sitio (y `Sec-Fetch-Site: same-origin` cuando el navegador lo manda) y el token firmado con `AUTH_SECRET`. Un script fuera del navegador puede imitar ambos; por eso los límites por IP y el tope mensual son la protección real.
- El panel de admin (`/es/admin`) muestra los caracteres del mes (con el % del tope) y del día.
- Con 3.500.000 por mes, aunque se agote el tope se queda debajo de los 4 millones gratis. El presupuesto con alertas (paso 4) es la segunda red.

## Revisión de seguridad de `/api/tts` (13.5, 2026-11-02)

| Riesgo | Cómo se cubre | Resultado |
|---|---|---|
| Inyección de SSML o de otros campos | Solo se envía `input.text` (Google lo trata como texto plano, nunca `input.ssml`); voz por lista blanca (`cloudVoice`, `Map`, sin búsquedas en objetos), velocidad numérica acotada a 0,5–2, caracteres de control quitados | OK (test «SSML-looking input as plain text») |
| Cuerpos enormes o sin `Content-Length` | `readJson` corta a 16 KB mientras lee; texto ≤ 1500 caracteres y ≤ 5000 bytes | OK; test nuevo con cuerpo *chunked* de 20 KB → 413 sin llamar a Google |
| Uso desde otros sitios | `Origin` del propio sitio + `Sec-Fetch-Site`, token HMAC (30 min) | OK. El token se puede reutilizar dentro de esos 30 min: solo prueba «cargó la página»; los límites son la protección real |
| IP falsificada con `X-Forwarded-For` | `clientIp` usa el **último** valor (el que agrega el proxy de Railway) | OK |
| Rotar direcciones IPv6 para saltar el límite por IP | **Arreglado en 13.5**: las IPv6 se cuentan por /64 (`ipBucket`); IPv4 mapeadas como IPv4 | Test nuevo |
| Pedidos en paralelo al abrir el mes | **Arreglado en 13.5**: dos *upsert* simultáneos del documento del mes daban error 11000 y uno se rechazaba como «tope alcanzado» aunque hubiera lugar; ahora se reintenta sin *upsert* (sigue sin poder pasar el tope) | Test nuevo (falla sin el arreglo) |
| Pasar el tope mensual con pedidos en paralelo | Reserva atómica en MongoDB con `chars ≤ tope − n` | OK (30 pedidos en paralelo, ni uno de más) |
| MongoDB caído | Se rechaza (falla cerrado) | OK |
| La clave en el navegador o en logs | Clave en cabecera `X-Goog-Api-Key` (no en la URL), solo en `.next/server`; `check:static` falla si aparece en `.next/static`; errores registrados solo con tipo y código HTTP | OK |
| El texto en logs | No se registra el texto ni la respuesta de Google (puede repetir el texto: no se lee) | OK (test e2e revisa los logs del servidor) |
| Muchas cuentas para sumar cupo diario | Las cuentas exigen correo; el tope mensual global limita el costo igual | Aceptado |
| Un 403 de Google por clave o API mal configurada | Se muestra como «tope alcanzado»; el log del servidor dice `HTTP 403` | Aceptado: el dueño lo ve en los logs de Railway |

## Privacidad

El texto nunca se guarda ni se registra en nuestro servidor (ni en logs ni en estadísticas): los errores se anotan solo con el tipo y el código HTTP. El lector avisa junto a la opción: «Tu texto se envía a Google para generar la voz y no lo guardamos». La política de privacidad (5 idiomas) suma a Google Cloud como proveedor, qué recibe (el texto de cada frase, la voz y la velocidad; no la IP ni la cuenta del usuario, porque el pedido sale de nuestro servidor) y la transferencia internacional.

## Términos de Google sobre el audio generado

Revisado el 2026-11-02. Lo que se pudo verificar:

- Las preguntas frecuentes de Cloud Text-to-Speech, citadas en el [foro de Google Developers](https://discuss.google.dev/t/text-to-speech-api-license/187973) y en [discuss.google.dev/t/commercial-use/128101](https://discuss.google.dev/t/commercial-use/128101), dicen que el audio generado puede usarse en aplicaciones o para acompañar medios (video, grabaciones), también con fines comerciales, sujeto a los [Términos de servicio de Google Cloud](https://cloud.google.com/terms) y a la ley aplicable.
- La restricción conocida es no usar el audio para crear o mejorar otro sistema de síntesis de voz que compita ([Service Specific Terms](https://cloud.google.com/terms/service-terms) de Google Cloud). Fileflect solo se lo entrega al usuario para escucharlo o descargarlo.
- **No se encontró una cláusula oficial que diga explícitamente quién es dueño del audio.** El dueño debería confirmarlo al leer los términos cuando cree la cuenta de facturación (y, si quiere certeza por escrito, preguntar al soporte de Google Cloud). Al usuario se le sigue pidiendo que indique que es una voz generada por IA si publica el audio.

## Pasos del dueño

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/) (por ejemplo «fileflect-tts»).
2. Activar la facturación del proyecto (Facturación → vincular una cuenta de facturación). Sin facturación la API no responde, aunque el uso quede dentro de lo gratis.
3. Habilitar **Cloud Text-to-Speech API** (APIs y servicios → Biblioteca → «Cloud Text-to-Speech API» → Habilitar).
4. Crear un **presupuesto con alertas**: Facturación → Presupuestos y alertas → Crear presupuesto, solo para este proyecto, monto **US$5**, avisos al **50 %, 90 % y 100 %** por correo.
5. Crear una **clave de API restringida**: APIs y servicios → Credenciales → Crear credenciales → Clave de API → Editar → «Restricciones de API» → **Restringir clave** → marcar solo **Cloud Text-to-Speech API**. En «Restricciones de aplicación» dejar «Ninguna» (la usa nuestro servidor, no el navegador; Railway no tiene IP fija). No compartirla ni pegarla en el código ni en issues.
6. En Railway, servicio `app` → Variables: `GOOGLE_TTS_API_KEY=<la clave>` y, si se quiere otro tope, `TTS_MONTHLY_CHAR_LIMIT` (y opcionalmente `TTS_DAILY_CHARS_ANON`, `TTS_DAILY_CHARS_USER`, `TTS_REQUESTS_PER_MINUTE`). Se leen en cada pedido: alcanza con que Railway reinicie el servicio, no hace falta reconstruir. Verificar que `AUTH_SECRET` y `MONGODB_URI` estén definidas (token y tope mensual).
7. En una computadora con el repo: `GOOGLE_TTS_API_KEY=<la clave> node scripts/tts/cloud-samples.mjs` (graba 15 muestras en `public/tts-samples/cloud/` y escribe `src/lib/tts/cloud-samples.json`; unos 1.500 caracteres). Para medir también el WER con Whisper `base` (método de la fase 11) agregar `WHISPER_DIR=<carpeta con base/>` y `--wer` (unos 10.000 caracteres; escribe `docs/tts-wer/cloud.json` y una tabla). Subir esos archivos a `dev` (no van a R2: se sirven desde nuestro dominio).
8. Comprobar en `https://fileflect.com/es/leer-texto-en-voz-alta`: aparece «Voz IA (nube)» con el aviso; lee un texto sin pausas; «Descargar MP3» baja un MP3 que suena; `/es/admin` muestra el uso del mes y del día.

Para apagarla: borrar `GOOGLE_TTS_API_KEY` en Railway (o desactivar la clave en Google Cloud).

## Tests

`src/lib/server/tts/service.test.ts` (Google simulado: límites por minuto, día y cuenta; tope mensual que se desactiva y vuelve el mes siguiente; sin clave; origen; token; SSML como texto; el texto no aparece en los logs), `usage.test.ts` (MongoDB en memoria, pedidos en paralelo), `cloud-client.test.ts`, `cloud-voices.test.ts` y el e2e `tests/e2e/tts-cloud.spec.ts` (build de producción con un servidor falso de Google: lectura progresiva, MP3 en español y chino validado con ffprobe, la clave no llega al navegador, el texto no llega a los logs). `npm run check:static` falla si algún archivo de `.next/static` menciona la clave o el código del proveedor.
