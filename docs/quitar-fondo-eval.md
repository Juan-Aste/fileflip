# Quitar fondo: evaluación de un modelo mejor (tarea 12.3)

Estado al 2026-11-02: u2netp se reemplaza por recorte asistido (GrabCut propio); ver «Fase 14» al final.

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

## Fase 14 — Verificación de candidatos (tarea 14.1, 2026-11-02)

El dueño decidió reemplazar u2netp (2026-11-02). Regla: un modelo solo se usa si su licencia **y** la de los datos con que se entrenó (incluido el modelo de partida) permiten el uso comercial; si es dudoso o no verificable, no se usa.

| Candidato | Licencia del modelo | Datos de entrenamiento (según la fuente oficial) | ¿Cumple? |
|---|---|---|---|
| MediaPipe **Selfie Segmenter** (general y landscape, Google, 2021) | Apache-2.0 ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf), pág. 1) | La tarjeta dice solo: «trained and evaluated on images, **including** consented images of people using a mobile AR application captured with smartphone cameras» (pág. 2) y «the majority dataset images were captured on […] smartphone cameras […] via an AR application» (pág. 3). No dice quién recolectó el resto («including», «majority»), con qué licencia, si el consentimiento cubre el uso comercial del modelo ni con qué pesos se inicializó (arquitectura «MobileNetV3-like»; los MobileNetV3 públicos parten de ImageNet). El dataset no es público | **No (no verificable)** |
| MediaPipe **Selfie Multiclass** 256 × 256 (Google, 2023) | Apache-2.0 ([model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf), pág. 1) | Solo «trained on thousands of samples with diverse identities […] various blendshape combinations» (pág. 2). No dice el origen de las imágenes, su licencia ni el consentimiento; es un Vision Transformer sin datos de preentrenamiento declarados | **No (no verificable)** |
| BRIA **RMBG-1.4 / 2.0** | 1.4: uso no comercial (comercial con acuerdo pago); 2.0: CC BY-NC 4.0 ([1.4](https://huggingface.co/briaai/RMBG-1.4)) | Imágenes con licencia propia de BRIA | **No (licencia del modelo no comercial)** |
| **S3OD** (Kupyn et al., 2025; datos sintéticos) | No publicada en el artículo | Imágenes generadas con FLUX-dev / FLUX-Krea [dev] (licencia FLUX.1 [dev] no comercial) y máscaras con rasgos de DINOv3 (licencia propia de Meta, datos web LVD); encoder inicializado con DINOv3 ([arXiv 2510.21605](https://arxiv.org/html/2510.21605v1)) | **No** |
| Modelos entrenados con **COCO** (YOLO-seg, Mask R-CNN, DeepLab-COCO…) | varias (AGPL-3.0, Apache-2.0) | Anotaciones CC BY 4.0, pero las imágenes son de Flickr con licencias mezcladas, incluidas CC BY-NC y BY-NC-SA ([COCO terms](https://cocodataset.org/#termsofuse)); además casi todos parten de un backbone preentrenado en ImageNet | **No** |
| Modelos entrenados **solo con Open Images V7** (máscaras CC BY 4.0, imágenes listadas como CC BY 2.0, [hechos](https://storage.googleapis.com/openimages/web/factsfigures_v7.html)) | — | No encontré ninguno publicado que no parta de pesos ImageNet; los del TF Model Zoo entrenados con Open Images usan backbones preentrenados en ImageNet/COCO | **No hay candidato** (entrenarlo nosotros sería la opción B: GPU y datos, fuera de esta fase) |
| SAM / SA-1B, IS-Net/BiRefNet (DIS5K), u2netp (DUTS), modelos de matting (P3M, AIM-500) | — | Datasets solo investigación / no comerciales | **Descartados de entrada** |
| **Recorte asistido con GrabCut** (Rother, Kolmogorov y Blake, 2004) | Implementación propia (AGPL-3.0-or-later, como el resto del sitio); el algoritmo está publicado ([SIGGRAPH 2004](https://doi.org/10.1145/1015706.1015720)) y OpenCV lo implementa bajo Apache-2.0 | **Ninguno**: modela los colores de cada imagen con mezclas gaussianas en el momento y corta con flujo máximo | **Sí, siempre** |

Búsquedas hechas: model cards oficiales de MediaPipe (descargadas y leídas completas), Hugging Face (RMBG, ISNet, U²-Net en ONNX), artículos de segmentación con datos sintéticos (S3OD) y modelos entrenados con Open Images.

### Decisión (14.1)

- **No hay modelo de personas limpio verificable.** MediaPipe es el más cercano (Google es dueño de los datos y publica el modelo con Apache-2.0), pero su tarjeta no permite verificar el origen de *todas* las imágenes ni que el consentimiento cubra el uso comercial, ni el modelo de partida: con la regla «si es dudoso o no verificable, no se usa», se descarta. Si el dueño, con esta información, quiere aceptarlo explícitamente, se puede agregar después como modo «Personas» (tarea 14.2d quedaría para eso).
- La herramienta nueva usa **solo recorte asistido** (GrabCut propio, sin dependencias nuevas ni descargas): rectángulo + pinceles «mantener»/«quitar», y lo dice con honestidad en la página (no es automático).
- Se implementa GrabCut en TypeScript (mezclas gaussianas de 5 componentes por clase + corte mínimo Boykov–Kolmogorov sobre la grilla de 8 vecinos) en vez de OpenCV.js: el build de OpenCV.js con GrabCut pesa varios MB y requiere compilar con Emscripten; la versión propia pesa unos KB y corre en un worker.
