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

## Conclusión y decisión pendiente del dueño

- Con la regla estricta, las únicas voces Piper aptas son **fr_FR-mls** (francés) y las inglesas de dominio público. **No queda ninguna en español ni en portugués** (todas se ajustaron desde lessac) **ni en chino**.
- El inglés ya tiene WER 0 % con Supertonic (fase 11), así que Piper solo podría mejorar el francés (Supertonic M5: 6,1 %).
- Opciones para el dueño (anotadas en «Pendiente del dueño» de `PROGRESS.md`):
  1. **Aceptar el riesgo** de las voces ajustadas desde lessac (su licencia declarada es CC0/CC-BY/CC-BY-SA y son de uso muy extendido, pero la base viene de un dataset solo para investigación). Con esto entran es_AR-daniela, es_ES-davefx, es_MX-ald, pt_BR-faber/cadu/jeff, pt_PT-tugão, y la tarea 12.2 sigue como está planificada.
  2. **Mantener la regla estricta**: Piper solo para francés (fr_FR-mls, si mejora el WER de Supertonic) y se documenta que no hay voces es/pt/zh aptas.
  3. **Entrenar una voz argentina propia desde cero** con OpenSLR 61 (CC-BY-SA 4.0, voces argentinas) con Piper: requiere GPU durante días y queda fuera de lo que puede hacer esta rutina.
- Hasta la respuesta, las subtareas 12.2b–12.2e quedan en espera y se avanza con las tareas independientes (12.3, 12.4, 12.5).
