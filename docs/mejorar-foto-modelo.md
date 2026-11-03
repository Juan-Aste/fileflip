# «Mejorar foto»: modelo de IA (fase 17)

El modo «Ampliar con IA» (×2 y ×4) usa **Real-ESRGAN `realesr-general-x4v3`**, el modelo compacto oficial del proyecto [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (arquitectura SRVGGNetCompact: 34 convoluciones 3×3 de 64 canales con PReLU, pixel shuffle ×4 y una suma con la imagen agrandada por vecino más cercano). Se ejecuta en el navegador con ONNX Runtime Web (`onnxruntime-web` 1.30.0): WebGPU si el navegador tiene un adaptador, si no WASM en un solo hilo (sin COOP/COEP, que romperían AdSense).

## Licencias

- **Código y pesos**: BSD-3-Clause (repositorio xinntao/Real-ESRGAN, archivo `LICENSE`); los pesos se publican en las *releases* del mismo repositorio bajo esa licencia. Uso comercial permitido con el aviso de copyright (créditos del sitio y `public/third-party-notices.txt`).
- **Datos de entrenamiento**: el informe de Real-ESRGAN describe entrenamiento con DIV2K, Flickr2K y OutdoorSceneTraining, cuyas condiciones no permiten verificar el uso comercial de cada imagen. **Excepción aprobada por el dueño el 2026-11-03**, solo para «Mejorar foto» (como la de MediaPipe Selfie Segmenter en la fase 15). No alcanza a otros modelos: nada de restauración de caras (CodeFormer y GFPGAN descartados).
- **ONNX Runtime Web**: MIT (Microsoft), ya usado por la voz con IA y la transcripción.

## Origen del archivo

| | |
|---|---|
| Archivo oficial | `realesr-general-x4v3.pth`, release **v0.2.5.0** de xinntao/Real-ESRGAN: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth |
| sha256 del `.pth` | `8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292` (4 885 111 bytes) |
| Archivo servido | `public/models/realesr-general-x4v3.onnx` (en el repo, se sirve desde nuestro dominio en `/models/`) |
| sha256 del `.onnx` | `70514693fab82d17286b0b9a4a98470e680d55020d591cedb8208ba35e51ef23` (4 866 414 bytes, float32) |

El proyecto oficial no publica un ONNX de este modelo, así que se convirtió con **`scripts/enhance/convert-realesrgan.py`**:

```bash
python -m venv venv
venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0
venv/bin/pip install onnx==1.23.2 onnxruntime==1.31.1 numpy onnxscript
curl -L -o realesr-general-x4v3.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
venv/bin/python scripts/enhance/convert-realesrgan.py realesr-general-x4v3.pth public/models/realesr-general-x4v3.onnx
```

El script comprueba el sha256 del `.pth`, declara la red igual que `realesrgan/archs/srvgg_arch.py` (`num_feat=64, num_conv=32, upscale=4, act_type='prelu'`), carga los pesos con `strict=True`, exporta a ONNX (opset 17, alto y ancho dinámicos; entrada `input` y salida `output`, RGB float32 NCHW en [0, 1]) y compara la salida de ONNX Runtime con la de PyTorch en un recorte aleatorio de otro tamaño (diferencia máxima medida: 8,9 × 10⁻⁷). La conversión es determinista: dos corridas dan el mismo sha256.

## Comprobaciones

- **Build**: `scripts/enhance/check-model.mjs` (en `prebuild`/`predev`) compara tamaño y sha256 del archivo con `src/lib/enhance/model.ts`; si no coinciden, el build falla.
- **Navegador**: el worker descarga el modelo solo al ampliar con IA, verifica tamaño y sha256 antes de usarlo y lo guarda en la Cache API (`fileflect-enhance-705146…`); además `/models/` se sirve con `Cache-Control: immutable`.
- **Tests** (`src/lib/enhance/upscale.test.ts`, con el modelo real en Node): los tiles con 24 px de margen dan el mismo resultado que la imagen entera (73,8 dB de PSNR; sin margen, 33,2 dB: se notarían las uniones); ×4 y ×2 dan 4× y 2× las dimensiones; la varianza del laplaciano es mucho mayor que con bicúbico (227 contra 11 en el retrato de prueba reducido 4×).

## Rendimiento y límites

Unas 2,5 MFLOP por píxel de entrada. En esta máquina (CPU, un hilo, ONNX Runtime nativo) un tile de 128 × 128 tarda ~0,44 s; con WASM es 2–3 veces más lento y en celulares más. Por eso el modo IA acepta hasta **1 MP de entrada** (`enhanceLimits` en `src/config/limits.ts`, igual para todos mientras Pro esté oculto; preparado para diferenciarlo por plan). Tiles de 256 px con WebGPU y 128 px con WASM (progreso más fino y menos memoria), cada uno con 24 px de contexto.
