# Voces Piper: inventario y licencias (tarea 12.2a)

Revisión del 2026-10-31 del repositorio [`rhasspy/piper-voices`](https://huggingface.co/rhasspy/piper-voices) (commit `b4e358ffcb232591bf73a540e70f7de528e4174a`, `voices.json` del 2026-10-30) y de modelos de la comunidad en Hugging Face. Para cada voz se leyó su `MODEL_CARD` (dataset, licencia y **de qué modelo se entrenó**), solo calidad `medium` o `high`, idiomas es, pt, fr, en y zh.

## El problema de «lessac»

La mayoría de las voces Piper **no se entrenaron desde cero**: se ajustaron (fine-tuning) a partir de la voz inglesa `en_US-lessac`. Esa voz base se entrenó con el dataset **Lessac / Blizzard Challenge 2013**, cuya licencia ([texto](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)) es una *Research Licence Agreement*: solo «Research Purposes», y excluye expresamente «using the Materials for any commercial purpose, including the development, marketing, commercialisation, sale or licencing of voice synthesis […] products or services»; además prohíbe sublicenciar y redistribuir.

Fileflect es un servicio con anuncios (uso comercial). Una voz ajustada desde `lessac` contiene pesos aprendidos de ese dataset, así que su licencia declarada (CC0, CC-BY, etc., la de los datos *nuevos*) no basta: la cadena de origen tiene una restricción no comercial. Con la regla del dueño («descarta las no comerciales o sin licencia clara») **se descartan por precaución** hasta que el dueño decida otra cosa. Esto incluye la única voz argentina (`es_AR-daniela-high`).

## Inventario

Leyenda: ✅ apta (licencia y origen claros y compatibles) · ⚠️ licencia propia compatible pero ajustada desde `lessac` (descartada por precaución) · ❌ descartada.

### Español

| Voz | Calidad | Tamaño ONNX | Dataset y licencia | Entrenamiento | Estado |
|---|---|---|---|---|---|
| es_AR-daniela | high | 114,2 MB | [OpenSLR 61](https://www.openslr.org/61/) (CC-BY-SA 4.0) | ajustada desde lessac high | ⚠️ |
| es_ES-davefx | medium | 63,2 MB | OHF voice-datasets (CC0) | ajustada desde lessac medium | ⚠️ |
| es_ES-sharvard | medium | 76,7 MB | Sharvard (CC-BY 3.0) | ajustada desde lessac medium | ⚠️ |
| es_MX-ald | medium | 63,2 MB | Ald (Unlicense) | ajustada desde davefx (→ lessac) | ⚠️ |
| es_MX-claude | high | 63,1 MB | sin dataset documentado (la licencia apache-2.0 es del Space de la demo, no de los datos; el mismo Space tiene una voz «cortana») | no documentado | ❌ sin licencia clara |
| HirCoir/piper-checkpoint-es-ar-elena | — | — | acceso restringido, sin licencia ni ONNX | — | ❌ |

### Portugués

| Voz | Calidad | Tamaño ONNX | Dataset y licencia | Entrenamiento | Estado |
|---|---|---|---|---|---|
| pt_BR-cadu | medium | 63,0 MB | OHF voice-datasets (CC0) | ajustada desde lessac | ⚠️ |
| pt_BR-faber | medium | 63,2 MB | OHF voice-datasets (CC0) | ajustada desde lessac | ⚠️ |
| pt_BR-jeff | medium | 63,0 MB | OHF voice-datasets (CC0) | ajustada desde lessac | ⚠️ |
| pt_PT-tugão | medium | 63,2 MB | OHF voice-datasets (CC0) | ajustada desde lessac | ⚠️ |
| OpenVoiceOS/pipertts_pt-BR_miro, _dii | — | — | CC-BY-NC-ND 4.0 | — | ❌ no comercial |
| freds0/piper-ptbr-brspeech-medium | — | — | solo checkpoints, sin licencia | — | ❌ |

### Francés

| Voz | Calidad | Tamaño ONNX | Dataset y licencia | Entrenamiento | Estado |
|---|---|---|---|---|---|
| fr_FR-mls | medium (125 hablantes) | 76,7 MB | [MLS, OpenSLR 94](http://openslr.org/94/) (CC-BY 4.0) | desde cero | ✅ |
| fr_FR-tom | medium (44,1 kHz) | 63,5 MB | frases propias del autor; modelo bajo **AGPL-3.0** ([repo](https://git.bksp.space/Tjiho/French-tts-model-piper)) | no declarado (el README no dice si partió de lessac) | ⚠️ dudosa: preguntar al autor |
| fr_FR-siwis | medium | 63,2 MB | SIWIS (CC-BY 4.0) | ajustada desde lessac | ⚠️ |
| fr_FR-upmc | medium | 76,7 MB | UPMC (CC-BY-SA 4.0) | ajustada desde lessac | ⚠️ |

### Inglés (solo las que no dependen de lessac ni son no comerciales)

| Voz | Calidad | Tamaño ONNX | Dataset y licencia | Entrenamiento | Estado |
|---|---|---|---|---|---|
| en_GB-cori | medium / high | 63,5 / 114,2 MB | LibriVox (dominio público) | desde cero ([Bryce Beattie](https://brycebeattie.com/files/tts/)) | ✅ |
| en_US-ljspeech | medium / high | 63,5 / 114,2 MB | LJ Speech (dominio público) | desde cero | ✅ |
| en_US-kristin | medium | 63,5 MB | LibriVox (dominio público) | desde cero | ✅ |
| en_US-norman | medium | 63,5 MB | LibriVox (dominio público) | desde cero | ✅ |
| en_US-john | medium | 63,5 MB | LibriVox (dominio público) | ajustada desde kristin | ✅ |
| en_US-bryce | medium | 63,5 MB | voz del autor (dominio público) | ajustada desde una voz propia no publicada | ✅ |
| en_US-libritts | high (904 hablantes) | 136,7 MB | LibriTTS (CC-BY 4.0) | desde cero | ✅ |
| en_US-lessac | medium / high | — | Blizzard 2013 (solo investigación) | — | ❌ no comercial |
| ryan, hfc_female, hfc_male, l2arctic, semaine | — | — | CC-BY-NC(-SA) | — | ❌ no comercial |
| amy, alan, jenny_dioco, kusal, arctic, alba, aru, vctk, northern_english_male, joe, mike, reza_ibrahim, sam, libritts_r | — | — | varias (CC-BY, CC0, «ver URL») | ajustadas desde lessac | ⚠️ |

### Chino

| Voz | Calidad | Dataset y licencia | Estado |
|---|---|---|---|
| zh_CN-xiao_ya | medium | BZNSYP de DataBaker: **uso no comercial**; además necesita g2pW (solo la versión Python de Piper 1.4+) | ❌ |
| zh_CN-chaowen | medium | CC0, pero ajustada desde xiao_ya (no comercial) | ❌ |
| zh_CN-huayan | medium | licencia «Unknown» y ajustada desde lessac | ❌ |

**No hay voz Piper china compatible**: el chino sigue sin voz IA ni MP3.

## Motor

Independiente de las voces: [Piper](https://github.com/OHF-Voice/piper1-gpl) (GPL-3.0) usa modelos VITS en ONNX (se pueden correr con el `onnxruntime-web` que ya usa el sitio) y fonemiza con [espeak-ng](https://github.com/espeak-ng/espeak-ng) (GPL-3.0-or-later) compilado a WASM. Con la tarea 12.1 ambas licencias son aceptables, con su código fuente enlazado en créditos.

## Conclusión de licencias

- Con la regla estricta (licencia del modelo **y** de los datos de entrenamiento, incluido el modelo de partida), las únicas voces Piper aptas son **fr_FR-mls** (francés) y las inglesas de dominio público. **No queda ninguna en español ni en portugués**: todas (incluida `es_AR-daniela-high`) se ajustaron desde `en_US-lessac`, cuyo dataset (Blizzard 2013) es **solo para investigación**. Tampoco hay voz china apta.

## Decisión del dueño (2026-10-31): no integrar Piper

El dueño decidió que la voz IA de calidad se genere **en la nube** (Google Cloud Text-to-Speech, fase 13) y que la voz IA en el navegador (Supertonic) quede como «modo privado». Por eso **no se integran Piper ni espeak-ng**: las subtareas 12.2b–12.2e quedan resueltas con esta decisión y el sitio no cambia. Este documento queda como inventario.

## Para el futuro: voz argentina propia desde cero

Si algún día se quiere una voz es-AR propia en el navegador, la única vía que cumple la regla estricta es entrenarla **desde cero** (sin partir de lessac ni de otra voz) con datos de licencia comercial:

- **Datos**: [OpenSLR 61](https://www.openslr.org/61/) — «Crowdsourced high-quality Argentinian Spanish speech data set», grabado por voluntarios en Buenos Aires (Google). 5739 grabaciones WAV con transcripción: `es_ar_female.zip` (1,2 GB) y `es_ar_male.zip` (551 MB), `line_index_female.tsv`, `line_index_male.tsv`. Licencia verificada en la página: **«Attribution-ShareAlike 4.0 International»** (CC BY-SA 4.0).
- **Qué implica CC BY-SA 4.0**: permite el uso comercial. Un modelo entrenado con esos datos se trata, por precaución, como material adaptado: hay que **dar crédito** (OpenSLR 61, Google, enlace a la licencia, indicar cambios) y **publicar los pesos bajo CC BY-SA 4.0** (o una licencia compatible según la lista de Creative Commons; la GPL-3.0 es compatible en un solo sentido). El audio generado no es una copia de las grabaciones; aun así conviene mencionar el origen en créditos. No impide servir el modelo desde R2 ni usarlo en un sitio comercial.
- **Hablante**: Piper funciona mejor con una sola voz; el archivo femenino tiene varias hablantes, así que se elige una (la de más frases, por el identificador del nombre de archivo) o se entrena multi-hablante (`--num_speakers`).
- **Herramientas**: [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) (entrenamiento, GPL-3.0) y espeak-ng (fonemas `es-419`, GPL-3.0-or-later), ambos aceptables desde la tarea 12.1; exportar a ONNX y correrlo con el `onnxruntime-web` que ya usa el sitio (más espeak-ng en WASM).
- **GPU y tiempo aproximado**: una GPU de 24 GB (RTX 3090/4090 o A10G/L4 en la nube) para calidad `medium`. Desde cero, unas 3–6 horas de una sola voz necesitan del orden de 2000–3000 épocas: **1–2 semanas** en una RTX 3090/4090, o **4–7 días** en una A100 (a US$1–2 por hora, unos US$150–300 en la nube). Preparar los datos (filtrar, normalizar texto con la normalización de la fase 11) y evaluar con WER (Whisper `base`) agrega 1–2 días de trabajo.
- Queda fuera de lo que puede hacer esta rutina (necesita GPU durante días).
