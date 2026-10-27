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
