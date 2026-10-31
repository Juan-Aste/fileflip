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

## Decisión del dueño (2026-10-31): sin @imgly ni modelos entrenados con DIS5K

No se integra `@imgly/background-removal` ni ningún modelo entrenado con DIS5K u otros datos no comerciales (BiRefNet, IS-Net, etc.). La tarea 12.3 pasa a ser revisar el u2netp actual con la regla estricta.

## Revisión del u2netp actual (tarea 12.3)

| Qué | Resultado | Fuente |
|---|---|---|
| Código y pesos | Apache-2.0 (repositorio `xuebinqin/U-2-Net`; no hay licencia aparte para `u2netp.pth`) | [GitHub](https://github.com/xuebinqin/U-2-Net) |
| ONNX que servimos | publicado por rembg (MIT), sha256 `309c8469…4ddd8` | `src/lib/bg-remove/assets.ts` |
| Datos de entrenamiento | **DUTS-TR** (10 553 imágenes). El artículo (Qin et al., *Pattern Recognition* 2020, sección 4.1) dice que U²-Net y U²-Net† (u2netp) se entrenan con DUTS-TR; el README lo repite («u2net trained with DUTS-TR dataset») | [arXiv 2005.09007](https://arxiv.org/abs/2005.09007), [GitHub](https://github.com/xuebinqin/U-2-Net) |
| Licencia de DUTS | **Ninguna licencia de uso**. La página solo dice «Copyright claim of the ground-truth annotation: All rights reserved by the original authors of DUTS Image Dataset» y pide citar el artículo «if you use our dataset in your research» | [saliencydetection.net/duts](http://saliencydetection.net/duts/) |
| Origen de las imágenes | «All training images are collected from the ImageNet DET training/val sets». Los términos de ImageNet permiten usar las imágenes **solo para investigación no comercial y educación** | [DUTS](http://saliencydetection.net/duts/), [términos de ImageNet](https://image-net.org/download.php) |

**Conclusión: no cumple la regla estricta.** Las máscaras de DUTS tienen «todos los derechos reservados» sin licencia comercial y las imágenes vienen de ImageNet (solo investigación no comercial). Es la misma situación que DIS5K y lessac. **BLOQUEANTE para el dueño**: por la regla no se quita la herramienta por cuenta de la rutina; decide el dueño.

### Alternativas que cumplen la regla estricta

| Opción | Licencia del modelo / datos | Calidad esperada | Costo |
|---|---|---|---|
| A. **MediaPipe Selfie Segmenter** (Google) | Apache-2.0 según su [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf); datos propios de Google (fotos de cámaras de celular; la tarjeta no publica un dataset con otra licencia). Verificable solo hasta ahí: conviene que el dueño lo acepte explícitamente | buena **solo con personas** (retratos, selfies); no sirve para productos ni mascotas | ~250 KB, rápido; reutiliza onnxruntime-web (hay ONNX) o `@mediapipe/tasks-vision` (Apache-2.0) |
| B. **Entrenar un u2netp propio** con [Open Images V7](https://storage.googleapis.com/openimages/web/factsfigures_v7.html) (máscaras CC BY 4.0 de Google, ~2,8 M; imágenes listadas como CC BY 2.0) | Apache-2.0 (código) + datos que permiten uso comercial con crédito | similar a hoy para objetos y personas (misma red); sin datos de saliencia exactos, hay que armar la máscara del «sujeto principal» uniendo las instancias grandes | GPU 1–3 días (una RTX 3090/A10G) más armado de datos; crédito a Open Images en créditos |
| C. **Sin aprendizaje automático**: recorte por color de fondo (fondo liso, tipo «chroma») + GrabCut con un rectángulo que marca el usuario | sin datos de entrenamiento | buena con fondos lisos; floja con fondos complejos | código propio, sin descarga de modelo |
| D. Quitar la herramienta | — | — | se pierde la página (`/quitar-fondo` y sus traducciones) |

Recomendación: **A + C** de inmediato si el dueño quiere seguir con la herramienta sin u2netp (personas con MediaPipe, el resto con recorte por color), y **B** a mediano plazo para recuperar la calidad general.

Comparación de calidad medida: no se hizo en esta ejecución. Las fuentes externas de fotos con máscara (Wikimedia Commons, Oxford-IIIT Pet) fallaron en la ejecución anterior, y un set sintético (formas sobre fondos generados) no compara bien modelos entrenados con fotos reales. Queda para cuando el dueño elija una alternativa: se medirá IoU contra u2netp con fotos propias o de dominio público.
