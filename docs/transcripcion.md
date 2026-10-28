# Transcribir audio y video (fase 10D)

Decisiones de la tarea 10D.1: qué modelo, con qué licencia, cómo se ejecuta en el navegador y de dónde se descargan los pesos. Las medidas de tamaño y velocidad se completan en la 10D.4.

## Modelo y licencias

| Parte | Licencia | Notas |
|---|---|---|
| Whisper (OpenAI), pesos `tiny` y `base` | MIT (repositorio `openai/whisper` en GitHub); la ficha de Hugging Face de `openai/whisper-*` dice Apache-2.0 | Las dos son permisivas y permiten uso comercial. |
| Exportación ONNX `onnx-community/whisper-tiny` y `onnx-community/whisper-base` | Sin licencia propia declarada: es una conversión de los pesos de OpenAI (obra derivada), por lo que rige la licencia de Whisper | Hecha por Hugging Face con Optimum para Transformers.js. |
| onnxruntime-web 1.30.0 | MIT | Ya es dependencia del proyecto (voz IA de la fase 8). |

Se usan los archivos cuantizados a 8 bits (`*_quantized.onnx`), que funcionan con el backend WASM en todos los navegadores (los `q4` del decodificador pesan más y los `fp16` necesitan WebGPU).

## Por qué no se usa la librería transformers.js

El pedido proponía `@huggingface/transformers` (Apache-2.0). La versión actual (4.3.2) depende de:

- `onnxruntime-node` 1.30.0: ~300 MB desempaquetados y un `postinstall` que descarga binarios; no lo usaríamos (todo corre en el navegador), pero se instalaría en la imagen de Docker de Railway.
- `onnxruntime-web` 1.31.0-dev (una versión de desarrollo): ~145 MB más, duplicando el `onnxruntime-web` 1.30.0 fijo que ya usa la voz IA, y sin versión estable.
- `sharp` ^0.35 (el proyecto usa otra versión) y `@huggingface/jinja`.

Agregar casi 450 MB de dependencias y una versión de desarrollo del motor por un modelo que solo necesita el motor que ya tenemos no compensa. Por eso Whisper se ejecuta directamente con el `onnxruntime-web` 1.30.0 existente: el código propio hace lo mismo que el pipeline de Transformers.js para Whisper (espectrograma log-mel de 80 bandas a 16 kHz, codificador, decodificador con caché de claves y valores, decodificación voraz con marcas de tiempo y el tokenizador BPE de bytes de `tokenizer.json`) y se prueba con el modelo real. Si en el futuro transformers.js publica una versión sin `onnxruntime-node` obligatorio y con `onnxruntime-web` estable, se puede reconsiderar.

## Archivos fijados

Todos los archivos están fijados a un commit de Hugging Face y se comprueban con su tamaño y SHA-256 antes de usarlos o guardarlos en caché (`src/lib/transcribe/model.ts`, igual que la voz IA en `src/lib/tts/model.ts`). Los SHA-256 de los `.onnx` son los `oid` de Git LFS que publica Hugging Face; se verificó uno descargándolo (`encoder_model_quantized.onnx` de `tiny`).

| Modelo | Repositorio y commit | Descarga | Uso |
|---|---|---|---|
| Rápido (`tiny`) | `onnx-community/whisper-tiny` @ `ff4177021cc41f7db950912b73ea4fdf7d01d8e7` | ~43 MB (codificador 10,1 MB, decodificador 30,7 MB, tokenizador 2,5 MB) | Predeterminado; también en celulares. |
| Preciso (`base`) | `onnx-community/whisper-base` @ `1846881b6b3a3024392c1eea3ad983695bc23925` | ~79 MB (codificador 23,2 MB, decodificador 53,7 MB, tokenizador 2,5 MB) | Opcional, con aviso de que tarda más. |

`small` (~250 MB cuantizado) queda fuera: en el navegador con WASM sería varias veces más lento que el audio en un celular.

## Origen de los pesos y CSP

Como en la fase 8, los pesos se descargan desde Hugging Face (`https://huggingface.co/<repo>/resolve/<commit>/<archivo>`, que redirige a su CDN en `*.hf.co` con CORS abierto), no desde Railway: no ocupan espacio en la imagen ni ancho de banda del servidor. Se guardan en la Cache API del navegador para no volver a descargarlos. La CSP actual no define `connect-src`; si algún día se agrega, debe incluir `https://huggingface.co` y `https://*.hf.co` (ya anotado en `docs/launch-checklist.md`). La política de privacidad debe mencionar que, al usar la transcripción, el navegador se conecta a Hugging Face para bajar el modelo (el audio no se envía; tarea 10F.2).

## Herramienta (10D.2b y 10D.3)

- Página «Transcribir audio a texto» (categoría Audio): `/es/transcribir-audio-a-texto`, `/en/audio-to-text`, `/pt/transcrever-audio-para-texto`, `/fr/transcrire-audio-en-texte`, `/zh/audio-to-text`. Componente `src/components/tools/audio/TranscribeTool.tsx`.
- Flujo: el archivo (audio, o video del que se toma el sonido) se lee con mediabunny en la página para mostrar su duración y comprobar el límite; al pulsar «Transcribir» se decodifica a 16 kHz mono (`src/lib/transcribe/audio.ts`), se carga el modelo en el worker (`src/workers/transcribe.worker.ts`, descarga desde Hugging Face o lectura de la Cache API) y se transcribe por ventanas de 30 s con progreso y tiempo restante (`src/lib/transcribe/eta.ts`). Cancelar termina el worker.
- Nada se descarga al abrir la página ni al elegir el archivo: el tamaño de la descarga (o «ya descargado») se muestra junto a la elección del modelo, antes del botón.
- Idioma: automático (detección del propio Whisper en la primera ventana) o elegido entre los 99 del modelo, con los 5 del sitio primero. Los nombres de los idiomas salen de `Intl.DisplayNames` del navegador y se arman después de hidratar (los de Node no coinciden).
- Salida (`src/lib/transcribe/output.ts`): texto editable con un segmento por línea; TXT con el texto tal como se editó; SRT y VTT con las marcas de tiempo (líneas de hasta 42 caracteres, dos por subtítulo; los segmentos largos se parten repartiendo el tiempo). Si se corrigen palabras sin agregar ni quitar líneas, los subtítulos usan la corrección; si cambia la cantidad de líneas, se avisa y los subtítulos usan el texto original.
- Límite: 30 minutos de audio por archivo (`MAX_TRANSCRIBE_SECONDS`, error `transcribeTooLong`).
