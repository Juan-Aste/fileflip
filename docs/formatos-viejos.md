# Formatos de video y audio viejos (tarea 12.4)

## Qué hace

Las herramientas de video y audio usan mediabunny con WebCodecs (rápido, nativo). Cuando no pueden leer un archivo (contenedor desconocido, o un códec que el navegador no decodifica) **y** el archivo parece de un formato viejo (por sus primeros bytes o por la extensión), se usa un respaldo: **FFmpeg compilado a WebAssembly** (`@ffmpeg/core` 0.12.10, un solo hilo) en un worker. FFmpeg reescribe el archivo en un formato intermedio que mediabunny sí lee:

- video → **WebM con VP8 + Opus** (VP8 `realtime`, CRF 10, máx. 2,5 Mbit/s; píxeles cuadrados y medidas pares);
- audio → **WAV PCM 16 bits** (como mucho estéreo y 48 kHz, sin subir la frecuencia de origen).

Después sigue el camino normal (MP4/H.264 con el codificador del navegador, MP3 con LAME de mediabunny, etc.), así que todas las herramientas (convertir, comprimir, recortar, velocidad, extraer audio, unir, GIF, transcribir) aceptan los formatos viejos sin cambios propios. Código: `src/lib/legacy-media/` y `src/workers/legacy-media.worker.ts`; se engancha en `openVideo` / `openAudio`.

| Entrada | Contenedor / códecs probados en tests |
|---|---|
| AVI | MPEG-4 Part 2 + MP3 |
| WMV / ASF | WMV2 + WMA2 |
| FLV | Sorenson Spark (FLV1) + MP3 |
| MPG / MPEG | MPEG-1 + MP2 |
| VOB | MPEG-2 + AC-3 |
| 3GP | H.263 + AAC |
| RM | RealVideo 1 + AC-3 |
| WMA | WMA2 |
| AC-3 | AC-3 5.1 (se mezcla a estéreo) |
| MP2 | MPEG audio layer 2 |
| AMR | AMR-NB 12,2 kbit/s (archivo armado a mano en el test: no hay codificador AMR libre a mano) |

El build también decodifica WMV3/VC-1, RealVideo 3/4, Cook, ATRAC, DTS, WMA Pro/Lossless, AMR-WB, MPEG-TS, etc.; se aceptan las extensiones `ts`, `m2ts`, `mts`, `rmvb`, `awb`, `ra` y `3g2`, pero solo las de la tabla tienen test con archivo generado. **APE (Monkey's Audio) no se ofrece**: el build lo decodifica, pero no hay forma de generar un archivo de prueba sin el codificador de Monkey's Audio.

## Límites

- Video: **20 minutos** por archivo (`LEGACY_MAX_VIDEO_SECONDS`): el WebM intermedio vive en la memoria de WASM (máx. 2 GB); a 2,5 Mbit/s son menos de 400 MB. Mensaje propio `legacyVideoTooLong`.
- Audio: **1 hora** (`LEGACY_MAX_AUDIO_SECONDS`; ~10 MB por minuto de WAV estéreo a 48 kHz). Mensaje `legacyAudioTooLong`.
- Más lento que WebCodecs (un hilo): en PC, un video de 320×240 se reescribe unas 4 veces más rápido que su duración; con resoluciones altas puede tardar más que la duración. Los límites de tamaño y tiempo de cada herramienta siguen valiendo; cancelar termina el worker.
- La descarga de FFmpeg (31 MB, `public/ffmpeg/core-0.12.10/`, caché `immutable` de un año) se hace solo la primera vez que se convierte un archivo viejo; nunca al cargar la página (verificado en el test de navegador).
- Sin SharedArrayBuffer ni COOP/COEP (no se pueden activar por AdSense): build de un solo hilo.

## Problemas encontrados en el build

- `libopus` de este build **se cuelga** («memory access out of bounds») al codificar estéreo o al cambiar los canales. Por eso: audio mono → `libopus`; estéreo o más → el codificador Opus propio de FFmpeg (`-strict -2`, 192 kbit/s, mezcla a estéreo). Si igual falla algo dentro de WASM, el worker descarta el núcleo y la próxima conversión arranca uno nuevo.

## Licencias y código fuente

- `@ffmpeg/core` 0.12.10: **GPL-2.0-or-later** (FFmpeg n5.1.4 con `--enable-gpl`), usado bajo la GPL-3.0, compatible con la AGPL-3.0-or-later del sitio. Se publicó desde la etiqueta [`v12.15`](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15) de ffmpeg.wasm (commit `71aa99d`); su [Dockerfile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/Dockerfile) fija cada biblioteca:

| Componente | Versión | Licencia | Código |
|---|---|---|---|
| FFmpeg | n5.1.4 | GPL-2.0-or-later (por `--enable-gpl`) | https://github.com/FFmpeg/FFmpeg/tree/n5.1.4 |
| x264 | rama `4-cores` | GPL-2.0-or-later | https://github.com/ffmpegwasm/x264/tree/4-cores |
| x265 | rama `3.4` | GPL-2.0-or-later | https://github.com/ffmpegwasm/x265/tree/3.4 |
| LAME | rama `master` | LGPL-2.0-or-later | https://github.com/ffmpegwasm/lame |
| FriBidi | 1.0.9 | LGPL-2.1-or-later | https://github.com/fribidi/fribidi/tree/v1.0.9 |
| libvpx | 1.13.1 | BSD-3-Clause | https://github.com/ffmpegwasm/libvpx/tree/v1.13.1 |
| Opus 1.3.1, Vorbis 1.3.3, Ogg 1.3.4, Theora 1.1.1, libwebp 1.3.2 | — | BSD-3-Clause | repos `ffmpegwasm/*` |
| zlib 1.2.11 | — | Zlib | https://github.com/ffmpegwasm/zlib |
| FreeType 2.10.4 | — | FTL (o GPL-2.0) | https://github.com/ffmpegwasm/freetype2 |
| HarfBuzz 5.2.0 | — | MIT | https://github.com/harfbuzz/harfbuzz |
| libass 0.15.0 | — | ISC | https://github.com/libass/libass |
| zimg 3.0.5 | — | WTFPL | https://github.com/sekrit-twc/zimg |

- Créditos: entradas `gpl: true`/`lgpl: true` en `scripts/licenses/embedded.mjs` (FFmpeg, x264, x265, LAME y FriBidi del build) con código fuente y build enlazados; texto de la GPL-2.0 en `/licenses/GPL-2.0.txt` (copiado de gnu.org, sha256 `edaef632…b233f6`). `npm run licenses` pasa.
- Las ramas `4-cores`, `3.4` y `master` de los forks no fijan un commit: se marcan con `exactSource: false`.
- Si un día se quiere un binario más chico y sin código GPL de codificación, se puede compilar el mismo Dockerfile sin `--enable-libx264 --enable-libx265 --enable-gpl` (los decodificadores que usamos son de FFmpeg y quedan bajo LGPL).

## Patentes de códecs

- **No se codifica H.264/HEVC con x264/x265**: los argumentos del respaldo solo usan VP8, Opus y PCM (libres de regalías; test `only uses royalty-free encoders`). El MP4/H.264 final lo hace el codificador del navegador (con su licencia), como ya pasaba. Los codificadores x264/x265 vienen dentro del binario pero nunca se llaman.
- Decodificación: MPEG-1 y MP3 (patentes vencidas), MPEG-2 (pool MPEG LA vencido en 2018 en EE. UU. y casi todo el mundo), AC-3 (vencidas en 2017), WMA/WMV1-2 (decodificadores de FFmpeg por ingeniería inversa; WMA v1/v2 son de 1999), Sorenson/H.263 (1996–1998) y MPEG-4 Part 2 (el pool de MPEG LA sigue con algunas patentes vigentes en pocos países; se decodifica igual que lo hace cualquier reproductor libre como VLC).
- **AMR**: el build trae solo los **decodificadores propios de FFmpeg** (`amrnb`, `amrwb`), no OpenCORE ni VisualOn. AMR-NB es de 1999 (sus patentes esenciales ya vencieron en la práctica); AMR-WB (2001, pool de VoiceAge) puede tener alguna patente vigente en algunos países. Solo decodificamos, en el navegador del usuario, sin cobrar por el códec. Riesgo bajo; el dueño puede decidir quitar `amr`/`awb` de `LEGACY_AUDIO_EXTENSIONS` si quiere evitarlo del todo.
- No es asesoramiento legal.

## Tests

- `src/lib/legacy-media/run.test.ts` (Node, el mismo núcleo WASM): AVI, WMV, FLV, MPG, VOB, 3GP y RM → WebM (VP8 + Opus) validado con ffprobe; WMA, AC-3 5.1, MP2, audio de un AVI y AMR armado a mano → WAV; archivo falso, solo audio como video, audio de más de 1 hora y archivo cortado → errores claros; análisis del log de FFmpeg; firmas de contenedor.
- `tests/e2e/legacy-media.spec.ts` (Chromium): AVI, WMV, FLV y MPG → MP4 en «Convertir video» con imagen (rojo/azul) y sonido (440/660 Hz por canal) intactos; WMA, AC-3 y AMR → MP3 en «Convertir audio»; FFmpeg se descarga de nuestro dominio y solo al convertir; AVI falso → error. Sin llamadas al servidor.
