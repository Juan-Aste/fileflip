# Comparación con la competencia (fase 3, tarea 3A.4)

Relevado el 2026-10-20 con WebFetch de las páginas públicas. **Solo funcionalidades** (categorías, herramientas, formatos), para decidir qué ofrecer; no se copian textos, diseño ni marca. Los formatos de fileflip.org se deducen del nombre de cada herramienta (su portada no los detalla).

## fileflip.org

Filtros: Imágenes, PDF, Herramientas, Utilidades, Desarrolladores, CAD, Video, Audio, Redes sociales y 3D. Unas 80 herramientas, más "próximamente".

| Categoría | Herramientas | ¿Fileflect lo tiene? |
|---|---|---|
| Imágenes | Comprimir, redimensionar, HEIC→JPG, JPG↔PNG, WebP↔JPG, imagen→WebP, BMP→JPG, TIFF→JPG, SVG→PNG | ✅ (y más pares: 88 combinaciones verificadas) |
| Imágenes | Recortar, quitar fondo, agregar texto, generador de favicon | ❌ (favicon: solo como salida ICO) |
| PDF | Unir, dividir, extraer páginas, reordenar, rotar, comprimir, PDF→JPG/PNG, imágenes/JPG/PNG→PDF | ✅ |
| PDF | Marca de agua, numerar páginas, desbloquear, proteger, PDF/A, PDF→texto | ❌ |
| Oficina | Word/Excel/PowerPoint/CSV→PDF, PDF→Word | ✅ (servidor) |
| Oficina | PDF→Excel, PDF→PowerPoint, Excel↔CSV, Markdown→PDF | ❌ |
| Video | Recortar, comprimir, redimensionar, unir, bucle, silenciar, velocidad, agregar audio, video→MP3, GIF↔MP4 | ❌ |
| Audio | Recortar, audio→MP3, conversor de audio | ❌ |
| Redes sociales | Redimensionar imagen para redes | ⚠️ parcial (páginas de cola larga con tamaños predefinidos) |
| 3D | Visor STL, OBJ→STL, imagen→litofanía | ❌ |
| CAD | Visor DXF, DWG→PDF, DXF→PDF | ❌ |
| Desarrolladores | Formateador JSON, Base64, codificar URL, hashes, formateador SQL | ❌ |
| Utilidades | Crear ZIP, cifrar archivo, OCR de imagen, QR, contraseñas, contador de palabras, mayúsculas/minúsculas, lorem ipsum, selector de color, unidades, edad, propinas, comparar | ❌ |

Observación: una entrada de su catálogo mostraba una clave de traducción sin traducir ("tools.compare.label"): justo lo que el registro "solo herramientas verificadas" de 3B debe evitar en Fileflect.

## iLovePDF (referencia de herramientas PDF)

33 herramientas. Además de las que ya tenemos: eliminar páginas, escanear a PDF, reparar, OCR, HTML→PDF, PDF→PowerPoint/Excel, PDF/A, numerar páginas, marca de agua, recortar PDF, editar, formularios, desbloquear, proteger, firmar, censurar (redactar), comparar, resumir con IA, traducir y PDF→Markdown.

## CloudConvert (referencia de amplitud de formatos)

Categorías con cantidad de formatos: documentos 23 (abw, djvu, doc, docm, docx, dot, dotx, html, hwp, hwpx, lwp, md, odt, pages, pdf, rst, rtf, sdw, tex, txt, wpd, wps, zabw), imágenes 42, video 28, audio 21, hojas de cálculo 8, presentaciones 11, libros electrónicos 22, comprimidos 39, vectores 10, CAD 3, fuentes 5. Procesa todo en servidor (pago por uso); no es modelo para nuestro enfoque "primero el navegador", pero marca el techo de formatos.

## Conclusiones para la auditoría (3A.5)

1. **Huecos más baratos de cerrar** (JS puro en el navegador, sin motor pesado): desarrolladores (JSON/Base64/URL/hashes/formateadores), utilidades (QR, contraseñas, contador, mayúsculas, color, unidades), Excel↔CSV, Markdown→PDF/HTML, crear ZIP. Coinciden con las prioridades 1, 2, 7 y 9 del plan.
2. **PDF**: marca de agua, numerar, eliminar/extraer páginas y PDF→texto salen con pdf-lib/pdf.js (ya cargados); proteger/desbloquear necesita qpdf-wasm (Apache-2.0); firmar dibujando es diferencial para LatAm.
3. **Imágenes**: recortar, texto, favicon (paquete de tamaños) y quitar metadatos son baratos con canvas; quitar fondo depende de la licencia del modelo.
4. **Audio/video, 3D y CAD**: fileflip.org los cubre; requieren ffmpeg.wasm (LGPL, un solo hilo), three.js (MIT) y un parser DXF. DWG probablemente no viable (formato cerrado, motores con licencias restrictivas): se evalúa en 3A.5.
5. **Lo que nadie de los tres destaca** y encaja con LatAm: foto carnet por país, comprimir a un peso exacto (p. ej. límites de trámites públicos), firmar PDF dibujando. Se proponen en `docs/audit.md`.
