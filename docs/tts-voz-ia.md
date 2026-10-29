# Voz IA del lector en voz alta (fase 8.3)

Decisión tomada el 2026-10-26 (tarea 8.3a). Código: `src/lib/tts/model.ts`.

## Modelo elegido: Supertonic 3

- **Supertonic 3** (Supertone Inc.), repositorio de pesos `Supertone/supertonic-3` en Hugging Face, **commit fijado `3cadd1ee6394adea1bd021217a0e650ede09a323`**. Es la versión más reciente y cubre español, inglés, portugués y francés (31 idiomas en total). **No incluye chino**: en zh la herramienta ofrece solo las voces del dispositivo y la descarga MP3 aparece deshabilitada con una explicación.
- Supertonic 2 (`Supertone/supertonic-2`, commit `75e6727618a02f323c720cba9478152d4bc16ca4`, es/en/pt/fr/ko) queda como alternativa si las mediciones de 8.3c muestran que la versión 3 es demasiado pesada para celulares (263 MB contra 398 MB).
- Funciona con ONNX Runtime y no usa phonemizer ni espeak-ng (el texto entra como caracteres Unicode, `onnx/unicode_indexer.json`). No hay dependencias GPL/AGPL.
- El repositorio de código en GitHub (`supertone-inc/supertonic`, código de ejemplo MIT) está archivado y sin soporte; no copiamos su código: el procesamiento (texto → índices, predictor de duración, codificador de texto, estimador de vectores por pasos, vocoder) se escribe en el proyecto a partir de los modelos y su `tts.json`. Si en el futuro se adapta código de ejemplo, se acredita como MIT.

### Archivos fijados

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `onnx/duration_predictor.onnx` | 3.700.147 | `c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db` |
| `onnx/text_encoder.onnx` | 36.416.150 | `c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff` |
| `onnx/vector_estimator.onnx` | 256.534.781 | `883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c` |
| `onnx/vocoder.onnx` | 101.424.195 | `085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba` |
| `onnx/tts.json` | 8.253 | (se valida por tamaño y JSON) |
| `onnx/unicode_indexer.json` | 277.676 | (se valida por tamaño y JSON) |
| `voice_styles/{F1…F5,M1…M5}.json` | ~290.000 c/u | (una por voz elegida) |
| `LICENSE` | 15.007 | `0d944a9110fed9a9602d60e0423a272903e7bd21ab060490774efc77c2275e9f` |

**Descarga total antes de la primera voz: ~398 MB** (más ~0,3 MB por voz). Se pide confirmación al usuario mostrando el tamaño, con barra de progreso, y se guarda en la Cache API del navegador.

## Licencia de los pesos: BigScience OpenRAIL-M (18/08/2022)

Leída del archivo `LICENSE` del commit fijado. Conclusiones:

- **Permite uso comercial**: la licencia de copyright y de patentes es mundial, gratuita y sin regalías, sin cláusula "no comercial". Un sitio con anuncios puede usarla.
- **Distribución (punto 4)**: servir los pesos al navegador del usuario cuenta como "Distribution" (incluye "web access"). Obligaciones:
  - 4.a: incluir las **restricciones de uso del Anexo A como cláusula exigible** en el acuerdo que rige el uso (nuestros **Términos y condiciones**, sección de uso aceptable, en los 5 idiomas) y **avisar** a los usuarios de que el modelo está sujeto al punto 5. → tarea 8.4b.
  - 4.b: **dar una copia de la licencia** a quienes reciben el modelo. → enlace al texto de la licencia en la herramienta y en Créditos (8.4b).
  - 4.c: marcar archivos modificados (no modificamos los pesos).
  - 4.d: conservar los avisos de copyright y atribución (Créditos y `docs/dependencies.md`).
- **Punto 5**: debemos exigir a nuestros usuarios que cumplan las restricciones del Anexo A.
- **Punto 6**: el licenciante no reclama derechos sobre el audio generado; el usuario es responsable de su uso.
- **Punto 7**: "esfuerzos razonables para usar la última versión del modelo" (el repositorio está archivado; revisar si aparece una versión nueva).
- **Punto 8**: no usar las marcas de Supertone ni sugerir respaldo.
- Nada en la licencia es incumplible para nosotros. **Se integra.**

### Restricciones de uso (Anexo A, copia literal)

You agree not to use the Model or Derivatives of the Model:
(a) In any way that violates any applicable national, federal, state, local or international law or regulation;
(b) For the purpose of exploiting, harming or attempting to exploit or harm minors in any way;
(c) To generate or disseminate verifiably false information and/or content with the purpose of harming others;
(d) To generate or disseminate personal identifiable information that can be used to harm an individual;
(e) To generate or disseminate information and/or content (e.g. images, code, posts, articles), and place the information and/or content in any context (e.g. bot generating tweets) without expressly and intelligibly disclaiming that the information and/or content is machine generated;
(f) To defame, disparage or otherwise harass others;
(g) To impersonate or attempt to impersonate (e.g. deepfakes) others without their consent;
(h) For fully automated decision making that adversely impacts an individual's legal rights or otherwise creates or modifies a binding, enforceable obligation;
(i) For any use intended to or which has the effect of discriminating against or harming individuals or groups based on online or offline social behavior or known or predicted personal or personality characteristics;
(j) To exploit any of the vulnerabilities of a specific group of persons based on their age, social, physical or mental characteristics, in order to materially distort the behavior of a person pertaining to that group in a manner that causes or is likely to cause that person or another person physical or psychological harm;
(k) For any use intended to or which has the effect of discriminating against individuals or groups based on legally protected characteristics or categories;
(l) To provide medical advice and medical results interpretation;
(m) To generate or disseminate information for the purpose to be used for administration of justice, law enforcement, immigration or asylum processes, such as predicting an individual will commit fraud/crime commitment (e.g. by text profiling, drawing causal relationships between assertions made in documents, indiscriminate and arbitrarily-targeted use).

La restricción (e) implica que quien publique el audio debe aclarar que es voz generada por IA: se recordará junto al botón de descarga y en los Términos.

## Desde dónde se sirven los pesos: Hugging Face (versión fija)

- **Decisión: descargar desde Hugging Face** (`https://huggingface.co/Supertone/supertonic-3/resolve/<commit>/...`), no desde nuestro dominio. Motivo: ~398 MB por usuario nuevo; Railway cobra el tráfico de salida y la imagen Docker crecería 400 MB. Hugging Face redirige a su CDN (`*.cdn.hf.co`) con CORS abierto (`access-control-allow-origin` igual al origen o `*`, verificado el 2026-10-26).
- **CSP**: la política actual no define `connect-src` ni `default-src` (solo `frame-ancestors`, `object-src`, `base-uri`, `form-action`), así que `fetch` a Hugging Face ya está permitido; no hace falta cambiarla. Si en el futuro se agrega `connect-src`, incluir `https://huggingface.co` y `https://*.hf.co`.
- **Integridad**: el commit fijado no cambia; además cada ONNX se comprueba con su SHA-256 antes de usarlo (y antes de guardarlo en la caché).
- **Privacidad**: el navegador del usuario se conecta a Hugging Face solo cuando elige "Voz IA" o "Descargar MP3"; el texto nunca se envía (solo se piden los archivos del modelo). Se menciona en la herramienta y en la Política de privacidad (8.4b).
- Riesgo: si Hugging Face retira el repositorio, la voz IA deja de funcionar para usuarios sin caché; plan B: subir los mismos archivos (mismo SHA-256) a un almacenamiento propio con CDN.

## Inferencia en el navegador (8.3b)

- **Código de referencia**: el SDK de Python `supertonic` 1.3.1 de PyPI (licencia MIT, Copyright (c) 2025 Supertone Inc.), que es el mismo código de ejemplo del repositorio archivado. Se portó a TypeScript en `src/lib/tts/supertonic.ts` (se acredita como MIT en Créditos, 8.4b): misma normalización del texto (NFKD, emojis fuera, comillas y guiones unificados, espacios antes de la puntuación, punto final si falta), etiquetas de idioma `<es>…</es>`, máscaras y forma del ruido. Cambios propios: la arroba se lee en el idioma del texto ("arroba", "arobase"), "e.g." solo se expande en inglés, los caracteres que el modelo no conoce se omiten y el ruido inicial es reproducible (semilla).
- **Pipeline por frase**: `duration_predictor` (segundos de la frase, divididos por la velocidad 0,7–2) → `text_encoder` → `vector_estimator` en **5 pasos** de flow matching (el SDK usa 8; 5 es su valor del motor y suena igual de bien, ~35 % más rápido) → `vocoder` → PCM mono a 44,1 kHz recortado a la duración predicha.
- **Worker** `src/workers/tts.worker.ts`: onnxruntime-web 1.30 en WASM con **un hilo** (sin COOP/COEP, igual que "Quitar fondo"). `prepare` descarga (o lee de la caché) los 6 archivos y la voz elegida, informa el progreso por bytes y crea las 4 sesiones de a una (la copia descargada se libera antes de la siguiente). `speak` genera una frase y la transfiere. Si la carga falla se reintenta en el próximo pedido.
- **Descarga y caché** `src/lib/tts/model-cache.ts`: `fetch` a Hugging Face sin credenciales, lectura por partes al tamaño fijado (más bytes = error), **SHA-256 de cada archivo** (modelos, JSON y las 10 voces, fijados en `model.ts`) antes de usarlo y de guardarlo en la Cache API (`fileflect-tts-supertonic3-3cadd1ee6394`, una caché por commit). Una entrada dañada se borra y se descarga de nuevo; sin Cache API (modo privado) funciona igual pero descarga cada vez.
- **Cliente** `src/lib/tts/ai-voice.ts`: un solo worker, creado la primera vez que el usuario elige usar la voz IA (nunca al abrir la página). Cancelar la descarga termina el worker; cancelar una lectura o un MP3 solo deja de pedir frases, así el modelo cargado se conserva.
- **Memoria**: con el modelo cargado, el proceso de la pestaña usa ~800 MB (medido en Chromium de escritorio).
- **Verificado**: en Node con el modelo real (`SUPERTONIC_DIR=… npx vitest run src/lib/tts/supertonic.model.test.ts`): una frase corta en es, en, pt y fr da 2,6–2,9 s de audio con energía (RMS 0,04–0,05) en ~1× tiempo real con un hilo. En Chromium con la descarga real desde Hugging Face: ~25 s para los 398 MB en este entorno y lectura correcta.

## Escuchar y descargar MP3 con la voz IA (8.3c)

- **Interfaz**: selector "Tipo de voz" (Voces del dispositivo / Voz IA, recordado en `localStorage`). Con la voz IA: 10 voces del modelo (Mujer 1–5, Hombre 1–5) y velocidad 0,75×–2× (el modelo no habla más lento que 0,7; se le pasa 1,05 × la velocidad elegida). Si el navegador no tiene `speechSynthesis`, se usa la voz IA directamente.
- **Antes de la primera descarga** se muestra el tamaño (~380 MiB = 398 MB) y que el texto no se envía; en celulares, además, que conviene wifi. Barra de progreso por bytes y Cancelar. Las visitas siguientes leen el modelo de la Cache API sin preguntar.
- **Escuchar**: cada frase se genera en el worker y suena con Web Audio mientras se generan las 2 siguientes (reproducción progresiva). Pausa/Reanudar suspenden el reloj de audio; anterior/siguiente, barra de frases y resaltado iguales que con las voces del dispositivo (sin resaltado de palabra: el modelo no da tiempos por palabra). Cambiar voz o velocidad regenera la frase actual. Mientras una frase no está lista se muestra "Generando la voz…". El `AudioContext` se crea dentro del clic (iOS).
- **MP3**: "Descargar MP3" genera todas las frases (progreso "frase N de M", Cancelar) y las escribe al vuelo con mediabunny + `@mediabunny/mp3-encoder` (LAME), mono 44,1 kHz a 64 kbit/s (~0,5 MB por minuto), con 0,3 s de pausa entre frases. Nombre: el título del documento (metadatos del PDF/DOCX/EPUB o el nombre del archivo) o las 6 primeras palabras. Junto al botón: aviso de que el audio es voz generada por IA (restricción (e) de la licencia) y enlace a la licencia OpenRAIL-M.
- **Chino**: sin voz IA (el modelo no lo incluye): la opción y el botón MP3 aparecen deshabilitados con la explicación.

### Mediciones (2026-10-27, Chromium 1243, onnxruntime-web WASM con 1 hilo)

| Medición | Resultado |
|---|---|
| Descarga del modelo (primera vez) | 398,4 MB + 0,29 MB por voz; ~20 s en este entorno (conexión de centro de datos); con 50 Mbit/s serían ~65 s |
| Memoria de la pestaña con el modelo cargado | ~800 MB |
| PC (vCPU de servidor, comparable a una PC común) | **~63 s para generar 1 minuto de audio** (5 pasos), es decir ~1× tiempo real; 81 s la primera vez incluyendo descarga y caché |
| Celular de gama media (estimado: CPU de la pestaña limitada al 25 %) | **~4 min (246 s) para 1 minuto de audio** con 5 pasos |
| Pasos del estimador (frase de 8,7 s, Node) | 2 pasos 3,9 s · 3 pasos 5,0 s · 5 pasos 7,6 s · 8 pasos 11,3 s |

- La limitación de CPU de DevTools (`Emulation.setCPUThrottlingRate`) **no afecta a los Web Workers** (con 4× y 6× tardó lo mismo: 63 s), por eso el celular se estimó deteniendo y reanudando el proceso de la pestaña (SIGSTOP/SIGCONT, 25 ms de cada 100 ms).
- Decisiones: para **escuchar en un celular se usan 3 pasos** (~1,5× más rápido; aun así la lectura hace pausas entre frases mientras genera, por eso en celulares conviene escuchar con las voces del dispositivo); el MP3 usa siempre 5 pasos. **Límite del MP3 en celulares: 3.000 caracteres** (~4 minutos de audio, ~15 minutos de generación); en computadoras el límite es el general de 50.000.

## Tests con el modelo real (8.5a)

- `tests/e2e/tts-ai.spec.ts`, bloque "with the real model" (con `TTS_REAL_MODEL=1`): lectura progresiva con pausa y reanudar, segunda visita sin descargas (Cache API) y MP3 en es, en, pt y fr validados con ffprobe/ffmpeg (mp3 mono 44,1 kHz, duración entre texto/25 y texto/6 segundos, RMS > 0,01).
- Playwright no puede servir por `route.fulfill` archivos tan grandes (el navegador se cierra), así que el modelo se descarga de Hugging Face de verdad.
- **CI**: job `e2e-ai-voice` (en paralelo a los demás): restaura con `actions/cache` un perfil de Chromium (`TTS_MODEL_PROFILE=.cache/tts-profile`, ~600 MB) cuya clave es el hash de `src/lib/tts/model.ts`; el modelo se baja solo cuando cambia la versión fijada. Se borran los candados `Singleton*` del perfil y se usa una carpeta de descargas nueva en cada corrida.
- Local: `TTS_REAL_MODEL=1 [TTS_MODEL_PROFILE=dir] npx playwright test tts-ai --project chromium` (en este entorno con proxy, además `E2E_IGNORE_HTTPS_ERRORS=1`). En Node: `SUPERTONIC_DIR=<copia de los archivos> npx vitest run src/lib/tts/supertonic.model.test.ts`.

## Verificación final (8.5b, 2026-10-27)
- Lighthouse móvil en es, en y zh: rendimiento 93–96, accesibilidad 100, CLS 0, sin peticiones al modelo al abrir la página ([`docs/perf/2026-10-27-phase8.md`](perf/2026-10-27-phase8.md)).
- `tests/e2e/tts-tools.spec.ts`: axe sin violaciones con texto cargado, leyendo (frase y palabra resaltadas), en pausa y con el aviso de descarga de la voz IA, en claro y oscuro, y en en/zh; detector de clics de la fase 6 sobre el reproductor en escritorio y celular, claro y oscuro; ninguna petición a Hugging Face, `.onnx` ni onnxruntime hasta confirmar la descarga.
- `tests/e2e/layout-shift.spec.ts`: CLS 0 con fuentes tardías en `/es/leer-texto-en-voz-alta`.
- Firefox y WebKit (proyectos `@xb`): extracción de los 6 formatos, lectura con pausa/reanudar/detener y axe.


## Números, fechas, símbolos, abreviaturas y siglas (fase 11.1)

Supertonic recibe el texto como caracteres (sin fonemas) y no normaliza números: el SDK de referencia tampoco lo hace. Con los dígitos tal cual leía mal "2026", "3,5", "14:30", "15 %" o "US$ 20". Desde la tarea 11.1 `preprocessText` (`src/lib/tts/supertonic.ts`) hace, en el idioma de la frase y **antes** del NFKD y de las etiquetas de idioma:

1. `expandAbbreviations` (`src/lib/tts/normalize.ts`): Sr., Sra., Dra., Ud., etc., pág./págs., p. ej., EE. UU., a. C.; Mr., Dr., e.g., i.e., vs.; Sr., Dra., p. ex., V. Exa.; Mme, M. (antes de un nombre), Dr, c.-à-d., av. J.-C. "p." y "pp." solo antes de un número.
2. `normalizeNumbers`: enteros y decimales con el separador del idioma (coma decimal y punto de miles en es/pt/fr, al revés en inglés; "3,5" → "tres coma cinco", "3.5" en español → "tres punto cinco"), años (en inglés "twenty twenty-six"), fechas (dd/mm/aaaa, mm/dd en inglés si el primer número ≤ 12, ISO, "1 de mayo" → "primero de mayo"), horas, porcentajes, monedas ($ = pesos en español y dólares en los demás idiomas; US$, USD, €, R$, £; centavos; "de" antes de millones), ordinales (1.º, 1.ª, 1er, 2do, 1st, 1re, 2e), "Nº", números romanos tras palabras como siglo/capítulo/World War y tras nombres propios (Felipe II, Louis XIV, Henry VIII, XXIe siècle), rangos ("10-20" → "diez a veinte"), teléfonos y códigos largos dígito por dígito, unidades comunes, fracciones simples y versiones. El género del sustantivo siguiente se estima por su terminación ("una casa", "doscientas personas", "duas casas", "vingt et une personnes"). Números a palabras propios (`src/lib/tts/numbers.ts`): `n2words` 6.3.0 (MIT) se evaluó y se descartó porque escribe "dieciseis" sin tilde, lee "3,5" como "tres punto cinco" en español y no maneja el género.
3. `spellAcronyms`: las siglas que no se pueden leer como palabra se deletrean con el nombre de las letras del idioma ("PDF" → "pe de efe", "pê dê efe", "pé dé effe"; en inglés las letras separadas, "P D F", que el modelo lee por su nombre). Las demás palabras en mayúsculas se pasan a minúsculas (ver abajo).

Tests: `numbers.test.ts` y `normalize.test.ts` (unos 200 casos en los 4 idiomas).

### "fecha" leída como "feka"

Revisado el 2026-10-29 con el modelo real y Whisper `base` (script `scripts/tts/engine.mjs`):

- **No es el NFKD ni otra diferencia con el SDK de referencia**: el SDK `supertonic` 1.3.1 hace exactamente los mismos pasos (NFKD, emojis, símbolos, espacios, punto final, `<es>…</es>`); "fecha" no tiene caracteres que el NFKD cambie.
- **El idioma llega bien**: la herramienta manda el idioma detectado del texto completo (o el que elige el usuario) en cada frase; con `<es>` las 10 voces dicen "fecha" en frases normales ("La fecha de hoy es importante.", "Anotá la fecha en el cuaderno.": Whisper oyó "fecha" en las 20 pruebas).
- **La causa son las mayúsculas**: "FECHA" (como en un formulario o un encabezado) sale "Feca", "Faker", "Peca" o "Seca" en las cuatro voces probadas; "Fecha" y "fecha" salen bien. El modelo casi no vio palabras en mayúsculas al entrenarse y lee "CH" como /k/. **Arreglo general, sin diccionario**: las palabras en mayúsculas que no son siglas para deletrear se pasan a minúsculas (y un texto todo en mayúsculas, entero). Con eso "FECHA: 28/10/2026" se oye "Fecha, 28 de octubre de 2026".
- **Limitación del modelo que queda**: con menos pasos de difusión la pronunciación empeora mucho. Con 2 pasos "La fecha de hoy es importante" se oyó "La feca…", "La flita…" o se perdieron palabras; con 3 pasos (los que usa el celular al escuchar, `PHONE_LISTEN_STEPS`) falló 1 de 4 voces; con 5 (PC y MP3) ninguna. También hay variación natural entre voces y tomas: "Fecha" sola con M3 se oyó "Ficha", y "veintiséis" a veces se oye como "veintidós" o "veintiuno". Eso no se corrige con texto.

## Muestras de cada voz (fase 11.2a)

Para que el usuario elija la voz sin descargar el modelo, cada voz (F1–F5, M1–M5) tiene una muestra en cada idioma (es, en, pt, fr) servida como archivo estático del sitio: `public/tts-samples/<idioma>-<voz>.mp3` (40 archivos).

- **Texto**: la misma frase natural por idioma, con un número y una fecha que pasan por la normalización de la tarea 11.1 (`SAMPLE_TEXT` en `src/lib/tts/samples.ts`).
- **Generación**: `SUPERTONIC_DIR=<archivos fijados> node scripts/tts/samples.mjs` (necesita ffmpeg; solo en desarrollo, nunca en tiempo de ejecución). Usa el pipeline del sitio con sus valores (5 pasos, velocidad 1,05, semilla 1), una frase por pieza con 0,25 s de pausa.
- **Formato**: MP3 32 kbps, 24 kHz mono, sin etiquetas ID3 (se reproduce en todos los navegadores, también en iPhone viejos sin Ogg Opus). 26–36 KB y 6,6–8,9 s cada uno; límite de 40 KB comprobado por el script y por `samples.test.ts`.
- **Integridad**: tamaño y SHA-256 de cada archivo en `src/lib/tts/samples.json` (lo escribe el script); `samples.test.ts` comprueba que los archivos coinciden. Si cambia el modelo (tarea 11.3) o el texto, se vuelven a generar.
- **Licencia**: es audio generado con el modelo; según el punto 6 de la OpenRAIL-M el licenciante no reclama derechos sobre lo generado. La restricción (e) del Anexo A se cumple porque la herramienta dice que son voces generadas por IA.

## Elegir la voz escuchando las muestras (fase 11.2c)

- En el lector, «Escuchar las voces IA antes de descargar» (un `<details>` cerrado, así no mueve la página al cargar) lista las 10 voces del idioma con ▶ (reproduce la muestra estática; se pide recién al tocarlo, nunca al abrir la página), la **Recomendada** del idioma (`RECOMMENDED_VOICE` en `src/lib/tts/recommended.ts`, medida en `docs/tts-wer.md`) y «Elegir». Elegir una voz pasa a la voz IA pero **no descarga nada**: el modelo se descarga, con el aviso de tamaño de siempre, recién al pulsar «Reproducir» o «Descargar MP3».
- Si el usuario no eligió ninguna voz, se usa la recomendada del idioma del texto (antes, siempre F1). En el selector de voz la recomendada dice «· Recomendada».
- La herramienta y la FAQ (5 idiomas) aclaran que todas las voces usan el mismo modelo: la descarga es la misma para cualquiera y se hace una sola vez.
