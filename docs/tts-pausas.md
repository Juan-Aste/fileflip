# Lector: sin pausas entre oraciones (tarea 13.1)

**Problema**: con la voz IA, entre una oración y la siguiente quedaba un silencio de varios segundos mientras se generaba la siguiente.

## Qué se cambió
- **Cola de generación anticipada** (`src/lib/tts/prefetch.ts`): mientras suena la oración *n*, se piden *n + 1 … n + 3*, con un máximo de pedidos en curso a la vez (`concurrency`). Cada oración se genera una sola vez por combinación de ajustes (voz, velocidad, idioma, pasos); pedirla otra vez devuelve la misma promesa. Saltar a otra oración descarta (y aborta) lo que quedó fuera de la ventana; cambiar voz, velocidad o texto descarta todo. Lo que aún no empezó no se genera nunca; un pedido en curso recibe la señal de abortar (un `fetch` a la nube se corta; una frase que ya está en el worker de Supertonic termina y se descarta, porque cortarla obligaría a cerrar el worker y volver a cargar el modelo).
- **Reproducción encadenada en el reloj de audio** (`src/lib/tts/player.ts`): la oración siguiente se programa con `AudioBufferSourceNode.start(t)` para que empiece exactamente cuando termina la anterior (con su pausa de 0,3 s, la misma que en el MP3), en vez de esperar al evento `ended`. Si no llegó a generarse a tiempo, empieza apenas está lista y el lector muestra «Generando…». Pausa suspende el reloj de audio (la oración programada espera con él).
- **Dos workers en computadoras** (`src/lib/tts/parallel.ts`): el modelo corre en un solo hilo por worker (sin `SharedArrayBuffer`, porque AdSense impide activar COOP/COEP) a ~1× tiempo real en un núcleo de PC (fase 11), así que con un solo worker la lectura se atrasa. En computadoras con ≥ 4 núcleos (y ≥ 8 GB cuando el navegador lo informa) se usan **2 workers**, cada uno con su copia del modelo (~0,5–0,8 GB más de memoria); en celulares y equipos chicos, 1. El segundo worker carga el modelo desde la caché (Cache API) con su primera oración, del mismo origen que el primero (R2 o Hugging Face).
- La lógica es genérica (`src/components/tools/tts/useQueuedSpeech.ts`): la voz en la nube de la 13.3 la usa con 2–3 pedidos en paralelo.
- Las voces del dispositivo (Web Speech API) no se generan de antemano: el motor del sistema arma el audio de cada oración y la pausa entre oraciones la decide el navegador.

## Medición
Silencio entre oraciones **además de la pausa de 0,3 s del texto**: `inicio(n + 1) − (inicio(n) + duración(n) con su pausa)`, tomado del reloj de audio al llamar a `start` (test `no silence between sentences beyond the text's pause` en `tests/e2e/tts-ai.spec.ts`, con el modelo real: `TTS_REAL_MODEL=1`; con `TTS_GAPS_BASELINE=1` solo informa sin exigir).

Texto: 7 oraciones en español (voz F5, 5 pasos), Chromium en esta máquina (4 vCPU de servidor, como una PC común), modelo ya en caché.

| Versión | Silencio extra en las 6 transiciones (ms) |
|---|---|
| Antes (`5d717cc`: 2 por adelantado, inicio con `ended`, 1 worker) | 8, 2643, 2, 896, 3863, 1055 |
| Solo cola de 3 + encadenado, 1 worker | 0, 2601, 0, 2106, 3413, 797 · 1378, 3554, 48, 1718, 4922, 1337 |
| **Después** (cola de 3 + encadenado + 2 workers) | **0, 0, 0, 0, 0, 0** (dos corridas iguales) |

- La primera fila muestra que el problema era de **velocidad**: con un solo worker la generación (~1× tiempo real) no alcanza a la reproducción, por más que se pida por adelantado. Con 2 workers sí, y el encadenado deja 0 ms de silencio extra (objetivo: < 150 ms).
- **Nube simulada** (`src/lib/tts/player.test.ts`, reloj de audio falso): 600–900 ms por pedido, 3 en paralelo, oraciones de 1–4 s → silencio extra < 150 ms en todas las transiciones; solo la primera oración espera a la red. También se prueba Supertonic a 0,4× tiempo real (0 ms) y un celular lento (2 s por oración de 1 s: cada oración empieza apenas está lista, sin esperas de más).
- En un celular sigue habiendo pausas con la voz del navegador (genera a ~0,25× tiempo real, fase 11): ahí conviene «Escuchar» con las voces del dispositivo o la voz en la nube (13.3/13.4).
