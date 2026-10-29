# Voz IA: modelo más liviano (fase 11.3)

Medido el 2026-10-29 (tarea 11.3a). Objetivo: bajar los ~398 MB de Supertonic 3 (desde Hugging Face llegan a ~0,4 MB/s en Latinoamérica) sin empeorar la voz: como máximo +10 % relativo de WER y sin una diferencia audible evidente.

## Versiones oficiales

No hay. Supertone publica solo los ONNX en float32 (`Supertone/supertonic-3`). Las versiones de terceros que existen en Hugging Face (onnx-community, sherpa-onnx, CoreML, MLX…) usan otros grafos, otras rutas o no tienen versión fija ni licencia clara; no se usan. Las versiones de abajo las generamos nosotros a partir de los archivos fijados (commit `3cadd1ee6394`, SHA-256 verificados).

## Cómo se generan

`scripts/models/onnx-light.mjs` (Node puro, sin dependencias: edita los campos de ONNX que hacen falta y copia el resto byte por byte, así el resultado y su SHA-256 son iguales en cualquier máquina; se comprobó que da archivos idénticos a los de las librerías oficiales `onnx`/`onnxruntime` de Python, Apache-2.0/MIT):

- **fp16w**: cada peso grande (≥ 1024 valores) se guarda en float16 con un `Cast` a float32 delante. Las entradas, las salidas y todas las operaciones siguen en float32 (el backend WASM de onnxruntime-web casi no tiene operaciones en float16); onnxruntime pliega los `Cast` al cargar, así que la inferencia es igual de rápida y usa la misma memoria.
- **int8w**: cada peso grande en int8 con `DequantizeLinear` y una escala por canal de salida (cálculo en float32). Un cuarto del tamaño.
- **int8 dinámico** (`onnxruntime.quantization.quantize_dynamic`, MatMul/Gemm/Conv con pesos de 8 bits y activaciones cuantizadas al vuelo): se probó con la herramienta de Python, una sola vez, porque es la única variante que además acelera la inferencia. `int8` dinámico solo en MatMul/Gemm casi no reduce nada (el grueso de los pesos está en convoluciones).

```
node scripts/models/onnx-light.mjs <original>.onnx <salida>.onnx fp16w|int8w
```

## Cómo se comparan

1. **WER con Whisper** (mismo método que la tarea 11.2, `docs/tts-wer.md`): las 10 voces × 4 idiomas × 10 frases, con `node scripts/tts/wer.mjs --onnx=<carpeta>`. Resultados completos en `docs/tts-wer/<versión>.json`.
2. **Métricas de audio** (`node scripts/tts/compare.mjs <carpeta>`): misma frase, voz y semilla con el original y con la versión liviana (3 frases por idioma con números y fechas, voz recomendada). Como el ruido inicial es el mismo, una versión fiel da casi la misma onda:
   - **LSD** (distancia log-espectral, dB, STFT de 1024): 0 = idéntico. Referencia: dos tomas del **mismo modelo original con otra semilla** están a ~12,8 dB (es "otra lectura" de la misma voz, que se oye igual de bien).
   - Diferencia de duración y tiempo de síntesis relativo al original (1 hilo, como en el navegador).

## Resultados

| Versión | Tamaño de los 4 ONNX | WER medio (es/en/pt/fr) | Δ WER | LSD vs original | Tiempo |
|---|---:|---|---:|---:|---:|
| Original float32 | **398,1 MB** | 6,98 % (6,70 / 1,11 / 9,78 / 10,31) | — | 0 dB | 1,00× |
| **fp16w (todo)** | **200,0 MB** | 7,04 % (6,91 / 1,11 / 10,33 / 9,80) | **+1 %** | **0,6 dB** | 1,00× |
| int8w en el estimador, fp16w el resto | 136,7 MB | 7,78 % (7,01 / 1,33 / 11,74 / 11,02) | +11 % | 3,6 dB | 1,03× |
| int8w salvo el vocoder (fp16w) | 127,0 MB | 7,83 % (7,53 / 1,44 / 11,63 / 10,71) | +12 % | 4,4 dB | 1,02× |
| int8w (todo) | 101,9 MB | 7,81 % (6,91 / 1,44 / 12,28 / 10,61) | +12 % | 8,8 dB | 1,02× |
| int8 dinámico en el estimador, fp16w el resto | 136,6 MB | 8,27 % (7,22 / 1,33 / 12,61 / 11,94) | +19 % | 8,1 dB | 0,63× |
| int8 dinámico (todo) | 110,1 MB | (no se midió) | — | 21,7 dB | 0,56× |

Δ WER = cambio relativo del promedio de los 4 idiomas frente al original. Duración total de las 400 frases: igual en todas (±0,2 %). Por modelo, int8w en el vocoder sola da 7,8 dB y en el codificador de texto + predictor de duración 3,6 dB.

## Conclusión

- **Se adopta fp16w** (tarea 11.3b): **398 MB → 200 MB** (−50 %), WER +1 % relativo (dentro del ruido de la medición: con ~100 palabras por idioma, un error ≈ 1 punto), audio prácticamente idéntico al original (0,6 dB contra 12,8 dB entre dos tomas del original) y misma velocidad.
- Todas las variantes int8 superan el límite de +10 % de WER (sobre todo en portugués e inglés) y la de int8 dinámico en todo el modelo cambia el audio más que otra toma del original (21,7 dB): se descartan, aunque la dinámica sea ~40 % más rápida.
- La voz recomendada por idioma se mantiene (medida con el original): con fp16w la tabla cambia de ganador en es, pt y fr por 1–2 errores, que es ruido (el audio es casi el mismo); ver `docs/tts-wer/fp16.json`.

## Archivos fp16w (fijados)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `onnx/duration_predictor.onnx` | 1.993.709 | `6f53e96d47917a28918ed0970abf393089e3bc6d7d6bf7b115342a1bdae89c36` |
| `onnx/text_encoder.onnx` | 18.474.768 | `cbf2c872a22b7d1d99303425c249ee1eca1198db11fe1459aec53921073159a0` |
| `onnx/vector_estimator.onnx` | 128.735.277 | `0e3c8d92896ad6642036a5a856f4311a087f712dffcaf2e4c0f412a64aded6a4` |
| `onnx/vocoder.onnx` | 50.810.904 | `8ea6955582b93eb4ac5d8746549e49cb4d6b5ffaa844f8506f8d9fa0ab9a4309` |

`tts.json`, `unicode_indexer.json` y las voces no cambian.

## Desde dónde se sirve

Supertone no publica estos archivos, así que no están en Hugging Face. Se sirven desde el almacenamiento propio de la tarea 11.4 (Cloudflare R2, `NEXT_PUBLIC_MODELS_BASE_URL`), donde `scripts/models/sync-r2.mjs` los genera a partir de los originales verificados, comprueba los SHA-256 de arriba y los sube. Sin esa variable (o si R2 falla), el sitio descarga los originales float32 de Hugging Face como hasta ahora. Los pesos convertidos siguen bajo la licencia OpenRAIL-M de Supertonic (son una modificación: se indica en Créditos y en `docs/tts-voz-ia.md`, punto 4.c de la licencia).
