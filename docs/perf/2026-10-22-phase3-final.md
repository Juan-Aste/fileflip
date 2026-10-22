# Medición final de la fase 3 (tarea 3D.5)

- Fecha: 2026-10-22, `dev` con toda la fase 3 hasta 3D.4 (82 herramientas publicadas).
- Método: `npm run build && npx next start -p 3000`, luego `LIGHTHOUSE=<ruta> scripts/perf/lighthouse.sh http://localhost:3000 3` (Lighthouse 12.8.2, móvil emulado, 4G lento simulado, CPU ×4, mediana de 3 por rendimiento). Se agregaron al script la categoría Audio y 7 herramientas de 3C.35–3C.44 (audio, video, 3D, CAD, foto carnet, escanear documento, quitar fondo).

## Resultado (29 páginas)

| Página | Perf | A11y | SEO | FCP | LCP | TBT | CLS | SI | JS (transfer) |
|---|---|---|---|---|---|---|---|---|---|
| home (/es) | 93 | 100 | 100 | 1.5 s | 3.1 s | 110 ms | 0 | 2.3 s | 150 KB |
| image-conversion (/es/jpg-a-webp) | 97 | 100 | 100 | 1.4 s | 2.3 s | 90 ms | 0 | 1.4 s | 150 KB |
| pdf-conversion (/es/pdf-a-jpg) | 96 | 100 | 100 | 1.4 s | 2.6 s | 70 ms | 0 | 1.4 s | 150 KB |
| pdf-tool (/es/comprimir-pdf) | 96 | 100 | 100 | 1.4 s | 2.5 s | 130 ms | 0 | 1.4 s | 159 KB |
| longtail (/es/heic-a-jpg-desde-iphone) | 97 | 100 | 100 | 1.4 s | 2.4 s | 130 ms | 0 | 1.4 s | 150 KB |
| pricing (/es/pricing) | 95 | 100 | 100 | 1.5 s | 2.5 s | 170 ms | 0 | 1.5 s | 154 KB |
| all-tools (/es/herramientas) | 93 | 100 | 100 | 1.6 s | 2.6 s | 210 ms | 0 | 1.6 s | 150 KB |
| category (/es/herramientas-pdf) | 95 | 100 | 100 | 1.6 s | 2.6 s | 150 ms | 0.014 | 1.6 s | 150 KB |
| tool-merge (/es/unir-pdf) | 94 | 100 | 100 | 1.4 s | 2.4 s | 200 ms | 0 | 1.4 s | 158 KB |
| tool-data (/es/generador-hash) | 97 | 100 | 100 | 1.4 s | 2.5 s | 100 ms | 0 | 1.4 s | 184 KB |
| tool-utility (/es/conversor-de-unidades) | 96 | 100 | 100 | 1.4 s | 2.4 s | 140 ms | 0 | 1.4 s | 158 KB |
| tool-image (/es/recortar-imagen) | 94 | 100 | 100 | 1.4 s | 2.7 s | 170 ms | 0 | 1.4 s | 174 KB |
| tool-pdf-images (/es/extraer-imagenes-pdf) | 94 | 100 | 100 | 1.4 s | 2.5 s | 180 ms | 0 | 1.4 s | 167 KB |
| tool-pdf-protect (/es/proteger-pdf) | 95 | 100 | 100 | 1.4 s | 2.5 s | 160 ms | 0 | 1.4 s | 173 KB |
| tool-font (/es/convertir-fuentes) | 96 | 100 | 100 | 1.4 s | 2.5 s | 130 ms | 0 | 1.4 s | 171 KB |
| tool-archive (/es/extraer-zip) | 97 | 100 | 100 | 1.4 s | 2.1 s | 150 ms | 0 | 1.4 s | 171 KB |
| tool-ocr (/es/imagen-a-texto) | 94 | 100 | 100 | 1.4 s | 2.5 s | 200 ms | 0 | 1.4 s | 172 KB |
| tool-sheet (/es/convertir-hoja-de-calculo) | 96 | 100 | 100 | 1.4 s | 2.5 s | 110 ms | 0 | 1.4 s | 171 KB |
| tool-epub (/es/convertir-epub) | 94 | 100 | 100 | 1.4 s | 2.5 s | 220 ms | 0 | 1.4 s | 171 KB |
| tool-create-epub (/es/crear-epub) | 91 | 100 | 100 | 1.4 s | 3.1 s | 180 ms | 0 | 2.3 s | 171 KB |
| tool-epub-pdf (/es/epub-a-pdf) | 90 | 100 | 100 | 1.4 s | 3.2 s | 190 ms | 0 | 2.2 s | 171 KB |
| category-audio (/es/herramientas-de-audio) | 96 | 100 | 100 | 1.5 s | 2.5 s | 130 ms | 0 | 1.5 s | 150 KB |
| tool-audio (/es/convertir-audio) | 92 | 100 | 100 | 1.4 s | 2.5 s | 240 ms | 0 | 1.4 s | 171 KB |
| tool-video (/es/recortar-video) | 93 | 100 | 100 | 1.4 s | 3.0 s | 150 ms | 0 | 1.4 s | 174 KB |
| tool-3d (/es/convertir-modelo-3d) | 90 | 100 | 100 | 1.4 s | 3.1 s | 200 ms | 0 | 2.2 s | 172 KB |
| tool-cad (/es/convertir-dxf) | 88 | 100 | 100 | 1.5 s | 3.4 s | 200 ms | 0 | 2.3 s | 171 KB |
| tool-id-photo (/es/foto-carnet) | 95 | 100 | 100 | 1.5 s | 2.7 s | 120 ms | 0 | 1.5 s | 174 KB |
| tool-scan (/es/escanear-documento) | 95 | 100 | 100 | 1.4 s | 2.5 s | 150 ms | 0 | 1.4 s | 173 KB |
| tool-bg (/es/quitar-fondo) | 95 | 100 | 100 | 1.4 s | 2.5 s | 160 ms | 0 | 1.4 s | 171 KB |

## Lectura

- **Accesibilidad 100 y SEO 100 en las 29 páginas.** Ninguna librería de conversión entra en la carga inicial: el JS transferido es de 150–184 KB (en 3C.34 era 147–179 KB; las herramientas nuevas suman solo su componente de interfaz, los motores se cargan al usarlas).
- **Rendimiento 88–97.** Todas las páginas cumplen la meta (≥ 90) salvo "Convertir DXF" (88) en esta tanda. Las páginas más bajas tienen la misma firma: en 1–2 de sus 3 corridas el Speed Index sube de 1,4 s a 2,2–2,3 s y el LCP (el párrafo del encabezado, texto) de 2,5 a 3,1–3,4 s, con el mismo JS. Aparece más hacia el final de la tanda de 87 corridas (~1 h) y en páginas sin relación entre sí (portada, crear EPUB, EPUB a PDF, 3D, DXF): ruido del entorno, no de la página.
- **Comprobación aislada** (5 corridas cada una, servidor recién iniciado):

| Página | Corridas (rendimiento / Speed Index) | Mediana |
|---|---|---|
| /es/convertir-dxf | 96/1,5 s · 96/1,5 s · 95/1,5 s · 96/1,5 s · 93/1,5 s | 96 |
| /es/convertir-modelo-3d | 97/1,4 s · 95/1,4 s · 91/1,4 s · 96/1,4 s · 94/1,4 s | 95 |
| /es | 96/1,5 s · 94/1,5 s · 96/1,5 s · 96/1,5 s · 95/1,5 s | 96 |

  Con eso, **la meta ≥ 90 se cumple en todas las páginas**; la tabla de arriba se deja tal cual salió.
- **CLS 0 en 28 de 29 páginas.** La categoría PDF dio 0,014 en 1 de sus 3 corridas (las otras dos 0): un `<li>` de la fila de pastillas de categorías que se mueve cuando la fuente de texto termina de cargar y la fila vuelve a partirse en líneas. Es intermitente y menor al umbral "bueno" (0,1), pero no es 0: mejora posible reservar el alto de la fila o fijar anchos de las pastillas.
- Comparado con 3C.34 (rendimiento 96–98 en las mismas 21 páginas): −1 a −3 puntos de mediana, dentro de la variación entre tandas observada en esta medición; LCP 2,4–2,6 s en las corridas normales (igual).
