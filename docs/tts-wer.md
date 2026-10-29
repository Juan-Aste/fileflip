# Voz IA: inteligibilidad de cada voz (WER con Whisper)

Medido el 2026-10-29 (tarea 11.2b) con `scripts/tts/wer.mjs`, para elegir de forma objetiva la voz «Recomendada» de cada idioma en el lector en voz alta.

## Método

- **Modelo**: Supertonic 3 original (fp32, commit `3cadd1ee6394`), con los valores del sitio: 5 pasos, velocidad 1,05, semilla 1, y la normalización de números de la tarea 11.1.
- **Frases**: 10 por idioma, naturales y equivalentes entre idiomas (horarios, compras, una fecha, un año y un precio); están en el script (`SENTENCES`).
- **Transcripción**: el Whisper `base` del sitio (cuantizado a 8 bits, `onnx-community/whisper-base`), con el idioma fijado.
- **WER** (tasa de error de palabras) = (sustituciones + omisiones + inserciones) / palabras del texto original, sumado sobre las 10 frases (90–110 palabras por idioma). Antes de comparar, los números se pasan a palabras en los dos lados con la misma normalización del sitio (Whisper escribe dígitos), todo en minúsculas, sin puntuación ni tildes (Whisper a veces las omite).
- **Recomendada**: la de menor WER; si empatan, la duración total más cercana a la mediana del idioma (ni apurada ni lenta).
- **Repetir**: `SUPERTONIC_DIR=… WHISPER_DIR=… node scripts/tts/wer.mjs` (un proceso por idioma en paralelo: `--langs=es --out=fp32-es`, …, y después `--merge=fp32`). Resultados completos, con cada frase mal transcrita, en `docs/tts-wer/fp32.json`. Con `--onnx=<carpeta>` se evalúa otra versión de los ONNX (tarea 11.3).

## Resultados (WER y duración total de las 10 frases)

| Voz | es | en | pt | fr |
|---|---:|---:|---:|---:|
| F1 | 6.2 % (40.4 s) | 0.0 % (33.2 s) | 13.0 % (39.2 s) | 7.1 % (37.6 s) |
| F2 | 8.2 % (38 s) | 1.1 % (31 s) | 10.9 % (37.1 s) | 14.3 % (35.2 s) |
| F3 | 6.2 % (41.7 s) | 1.1 % (34.2 s) | 12.0 % (40.4 s) | 8.2 % (38.8 s) |
| F4 | 7.2 % (35.4 s) | 0.0 % (29 s) | 17.4 % (34.9 s) | 15.3 % (32.5 s) |
| F5 | 5.2 % (39.1 s) **★** | 1.1 % (32 s) | 4.3 % (38 s) **★** | 8.2 % (36.3 s) |
| M1 | 6.2 % (40.4 s) | 1.1 % (33.1 s) | 6.5 % (39.2 s) | 10.2 % (37.7 s) |
| M2 | 8.2 % (39.5 s) | 0.0 % (32.3 s) **★** | 9.8 % (38.4 s) | 11.2 % (36.8 s) |
| M3 | 7.2 % (34.7 s) | 1.1 % (28.4 s) | 8.7 % (34.1 s) | 12.2 % (31.8 s) |
| M4 | 6.2 % (37.9 s) | 0.0 % (30.9 s) | 10.9 % (36.9 s) | 10.2 % (35.1 s) |
| M5 | 6.2 % (40.3 s) | 5.6 % (33 s) | 4.3 % (39.1 s) | 6.1 % (37.5 s) **★** |

★ = recomendada: **español F5 (Mujer 5, 5,2 %)**, **inglés M2 (Hombre 2, 0,0 %)**, **portugués F5 (Mujer 5, 4,3 %)**, **francés M5 (Hombre 5, 6,1 %)**. En inglés empatan en 0 % F1, F4, M2 y M4: gana M2 por duración. En portugués empatan F5 y M5: gana F5 por duración.

Promedio de las 10 voces: inglés 1,1 %, español 6,7 %, portugués 9,8 %, francés 10,3 %.

## Cómo leerlo

- Con ~100 palabras por idioma, **un error es ~1 punto**: diferencias de 1–2 puntos entre voces no son significativas. La recomendación sirve para elegir un buen punto de partida, no para decir que las otras voces sean malas.
- Parte del error es de Whisper `base` y no de la voz (nombres propios, acentos, "veintiséis" oído como "veintidós"); afecta por igual a todas las voces, así que la comparación entre voces sigue siendo justa.
- El modelo es mucho más claro en inglés que en los otros idiomas, con cualquier voz.
- La recomendación está fijada en `RECOMMENDED_VOICE` (`src/lib/tts/recommended.ts`); si el modelo cambia (tarea 11.3), se repite la medición.
- Las versiones livianas del modelo de la tarea 11.3 se midieron igual: `docs/tts-wer/fp16.json`, `int8*.json`; comparación en `docs/tts-modelo-liviano.md`.
