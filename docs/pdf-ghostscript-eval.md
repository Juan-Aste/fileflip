# Comprimir PDF: evaluación de Ghostscript (tarea 12.5)

Fecha: 2026-11-01. Conclusión: **no se integra**. Ghostscript no logra el 20 % adicional pedido sobre nuestra compresión «Fuerte» en los PDF con imágenes a calidad comparable, y costaría ~11 MB de descarga extra.

## Qué se comparó
- **Método actual** (`src/lib/pdf/compress.ts`): vuelve a codificar las fotos del PDF como JPEG (mozjpeg) con lado máximo 2400/1600/1100 px y calidad 80/65/45 (niveles «low», «recommended», «strong»); el texto y los vectores no se tocan. En la evaluación el codificador del navegador (`@jsquash/jpeg`, mozjpeg) se reemplaza por `sharp` con `mozjpeg: true`, de la misma familia.
- **Ghostscript** `pdfwrite` con `-dPDFSETTINGS=/printer` (300 ppp), `/ebook` (150 ppp) y `/screen` (72 ppp).
- Build WASM candidato: [`@okathira/ghostpdl-wasm`](https://github.com/okathira/ghostpdl-wasm) 1.1.0 (AGPL-3.0-or-later, GhostPDL 10.06.0, con procedencia de npm): `gs.wasm` de 15,5 MB, **10,6 MB con gzip** (sha256 `e8aaf3af…f667e6`). Alternativas en npm: `@jspawn/ghostscript-wasm` 0.0.2 (2022, sin mantenimiento) y `ghostscript-wasm-esm` 1.0.1, del mismo tamaño.
- La medición se hizo con el binario `gs` 10.02.1 de Ubuntu (el mismo motor `pdfwrite` que compilan los builds WASM; el entorno de esta ejecución no permitió correr el WASM descargado). Las diferencias de versión 10.02 → 10.06 no cambian los parámetros de remuestreo ni de JPEG de estos ajustes.

Script reproducible: `npx vite-node scripts/pdf/eval-ghostscript.ts` (necesita `gs` y poppler-utils). Los PDF se generan en el script, sin archivos externos:
- **scanned**: 4 páginas A4 escaneadas a 300 ppp en gris (texto impreso con ruido de papel), con capa de texto invisible como la de nuestro OCR.
- **photos**: 4 páginas con una foto de 4000×3000 (JPEG 92) y un epígrafe.
- **mixed**: 4 páginas de informe con texto y dos fotos chicas (2000×1500 JPEG y 1200×900 PNG) mostradas a 240×180 pt.
- **text**: 12 páginas solo texto (Helvetica).

«Texto igual» compara `pdftotext` del original y del resultado. PSNR: página 1 renderizada a 100 ppp con `pdftoppm` contra el original (más alto = más parecido).

## Resultados

| PDF | método | tamaño | vs. original | vs. nuestro «strong» | texto igual | PSNR pág. 1 (dB) | tiempo |
|---|---|---|---|---|---|---|---|
| scanned | original | 11451 KB | — | — | — | — | — |
| scanned | actual «low» | 2816 KB | 75.4 % | -657.5 % | sí | 25.8 | 3.0 s |
| scanned | actual «recommended» | 955 KB | 91.7 % | -156.9 % | sí | 22.5 | 1.4 s |
| scanned | actual «strong» | 372 KB | 96.8 % | 0.0 % | sí | 20.9 | 0.7 s |
| scanned | gs /printer (300 dpi) | 11459 KB | -0.1 % | -2982.9 % | sí | 20.2 | 0.5 s |
| scanned | gs /ebook (150 dpi) | 1652 KB | 85.6 % | -344.4 % | sí | 20.2 | 0.7 s |
| scanned | gs /screen (72 dpi) | 569 KB | 95.0 % | -53.0 % | sí | 17.8 | 0.8 s |
| photos | original | 12082 KB | — | — | — | — | — |
| photos | actual «low» | 552 KB | 95.4 % | -1048.3 % | sí | 49.0 | 1.6 s |
| photos | actual «recommended» | 110 KB | 99.1 % | -129.7 % | sí | 47.1 | 1.0 s |
| photos | actual «strong» | 48 KB | 99.6 % | 0.0 % | sí | 45.0 | 0.5 s |
| photos | gs /printer (300 dpi) | 1817 KB | 85.0 % | -3677.1 % | sí | 47.7 | 3.1 s |
| photos | gs /ebook (150 dpi) | 214 KB | 98.2 % | -344.0 % | sí | 42.6 | 1.1 s |
| photos | gs /screen (72 dpi) | 62 KB | 99.5 % | -28.6 % | sí | 42.6 | 0.6 s |
| mixed | original | 13034 KB | — | — | — | — | — |
| mixed | actual «low» | 1156 KB | 91.1 % | -966.1 % | sí | 54.7 | 1.9 s |
| mixed | actual «recommended» | 290 KB | 97.8 % | -167.8 % | sí | 51.5 | 1.2 s |
| mixed | actual «strong» | 108 KB | 99.2 % | 0.0 % | sí | 49.3 | 0.8 s |
| mixed | gs /printer (300 dpi) | 884 KB | 93.2 % | -714.8 % | sí | 54.3 | 0.4 s |
| mixed | gs /ebook (150 dpi) | 88 KB | 99.3 % | 18.9 % | sí | 46.4 | 0.6 s |
| mixed | gs /screen (72 dpi) | 36 KB | 99.7 % | 66.9 % | sí | 44.6 | 0.5 s |
| text | original | 17 KB | — | — | — | — | — |
| text | actual (los 3 niveles) | 17 KB | 0.0 % | 0.0 % | sí | ∞ | 0.0 s |
| text | gs /printer (300 dpi) | 17 KB | 3.9 % | 3.9 % | sí | 84.6 | 0.1 s |
| text | gs /ebook (150 dpi) | 10 KB | 43.6 % | 43.6 % | sí | 84.6 | 0.1 s |
| text | gs /screen (72 dpi) | 10 KB | 43.1 % | 43.1 % | sí | 84.6 | 0.2 s |

## Lectura
- **Escaneados y fotos** (el caso típico de un PDF pesado): nuestro «strong» queda **más chico** que el ajuste más agresivo de Ghostscript (`/screen`, 72 ppp) y con mejor PSNR. No hay ganancia.
- **Mixto** (fotos chicas dentro de un informe): `/ebook` gana 18,9 % (menos del 20 % pedido) con peor PSNR (46,4 contra 49,3 dB); `/screen` gana 67 % pero bajando las fotos a 72 ppp (PSNR 44,6 dB, visiblemente borrosas al imprimir o hacer zoom). La ventaja viene de que Ghostscript remuestrea según el tamaño **mostrado** en la página, no según los píxeles de la imagen.
- **Solo texto**: Ghostscript ahorra ~7 KB en un PDF de 17 KB (recomprime los flujos). Irrelevante en la práctica.
- El texto seleccionable se mantuvo en todos los casos, incluida la capa invisible del OCR.
- Costo: ~10,6 MB (gzip) de WASM a descargar la primera vez, más un componente AGPL a documentar. No se justifica.

## Para el futuro
La única idea útil es la de Ghostscript en el caso mixto: limitar cada imagen a una resolución efectiva (por ejemplo 200 ppp en «strong») según su tamaño en la página, además del lado máximo actual. Se puede hacer en `compress.ts` sin Ghostscript, leyendo la matriz `cm` de los flujos de contenido; queda anotado, no se implementa en esta tarea.
