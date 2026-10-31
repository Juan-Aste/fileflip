# Quitar fondo: evaluación de un modelo mejor (tarea 12.3)

Estado al 2026-10-31: **en espera de una decisión del dueño** (licencia del dataset) y sin set de prueba todavía.

## Candidato: @imgly/background-removal

- Paquete `@imgly/background-removal` 1.7.0: **AGPL-3.0** (aceptable desde la fase 12). Dependencias zod, ndarray y lodash-es (MIT). Usa onnxruntime-web 1.21 (el sitio ya tiene 1.30).
- Modelos que sirve IMG.LY (`staticimgly.com/@imgly/background-removal-data/1.7.0/dist/`, en trozos de 4 MB con sha256), entrada 1024 × 1024, normalización `(x − 128) / 256`, salida 0–1:

| Modelo | Tamaño | sha256 |
|---|---|---|
| isnet_quint8 | 44,3 MB | `d1ca3535c21b53d08fa3b640e5949389f82e764f6376a0502d44982c35cae482` |
| isnet_fp16 (por defecto) | 88,2 MB | `2eb4b5dda7ec41c617e59706e5aafa1f978c9a5f983d2518d9f0ae4d6eb04f20` |
| isnet | 176,1 MB | — |

- Su `ThirdPartyLicenses.json` atribuye el modelo a [IS-Net / DIS](https://github.com/xuebinqin/DIS) («MIT»; el repositorio en realidad tiene `LICENSE.md` Apache-2.0). El código y los pesos publicados son Apache-2.0.
- **Problema**: IS-Net se entrena con el dataset **DIS5K**, cuyos *Terms of Use* (PDF incluido en el dataset) dicen: «available for non-commercial use in research or educational purpose […] Without permission from the original authors, **commercial use of this dataset is prohibited even after copying, editing, processing or any operations** of this database». Es la misma situación que las voces Piper ajustadas desde lessac (`docs/tts-piper.md`): la licencia del modelo es libre, pero proviene de datos solo no comerciales. Con la regla del dueño se descarta por precaución.
- Otras opciones generales de mejor calidad que u2netp (BiRefNet, MIT) también se entrenan con DIS5K. MediaPipe Selfie Segmenter (Apache-2.0, datos propios de Google) solo sirve para personas.
- Nota: el u2netp actual se entrenó con DUTS-TR (sin licencia explícita de uso comercial); quedó aceptado en la fase 3. Si el dueño pide la regla estricta también para los datasets de entrenamiento, conviene revisarlo.

## Set de prueba (pendiente)

Plan: fotos con máscara de referencia exacta hechas por nosotros, componiendo recortes con canal alfa (personas, productos, mascotas, pelo) de licencia libre sobre fondos complejos; IoU (máscara binaria a 128) y error medio del alfa, más tiempo con un hilo en PC y en Chromium con la CPU 4× más lenta (celular simulado).

En esta ejecución no se pudo armar: la API de Wikimedia Commons respondía 429 (límite de pedidos de la IP compartida de la nube) y el servidor del dataset Oxford-IIIT Pet (CC-BY-SA 4.0, con máscaras) cortaba la conexión. Se reintentará en la próxima ejecución si el dueño decide seguir con IS-Net.

## Decisión pendiente del dueño

1. Aceptar modelos con licencia libre entrenados con datasets no comerciales (IS-Net/DIS5K aquí, lessac en Piper): se sigue con la evaluación y, si gana, la integración con u2netp como opción «rápida».
2. Regla estricta: no se integra; u2netp sigue siendo el único modelo (se documenta).
