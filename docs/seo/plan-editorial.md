# Plan editorial de guías

Plan para seguir publicando guías después de la fase 19, **de a 1 o 2 por semana**, con constancia (Google valora más un sitio que se actualiza seguido que una tanda de golpe). Cada guía sigue las reglas de la fase 10E y de la 19.4:

- Útil y original: responde la pregunta de la búsqueda con pasos **verificados contra nuestra herramienta** (etiquetas reales de los botones, límites reales de `src/config/`), sin relleno ni promesas que la herramienta no cumpla. Si algo no se puede hacer, se dice y se remite a la herramienta que sí.
- 800–1500 palabras (1400–3600 caracteres en chino), al menos 3 secciones `##`, la primera lista numerada son los pasos.
- 1 o 2 capturas reales con `scripts/guides/screenshots.mjs` (muestras generadas al vuelo, nada personal), en los 5 idiomas.
- Escrita en español y traducida con naturalidad a en, pt, fr y zh.
- En `src/content/guides/meta.ts`: `published`/`updated` con la fecha real, `tools`, `related` y `mainFor` (las páginas de herramienta o conversión que la enlazan en «Guías paso a paso»).
- Después de publicar: en Search Console, inspeccionar la URL nueva en español y pedir la indexación.

Ya publicadas (16): PDF a Word, JPG/PNG/WebP/AVIF, reducir el peso de un PDF, HEIC a JPG, tabla de PDF a Excel, CSV o Excel, transcribir audio, leer en voz alta, firmar un PDF, PDF/A, editar un PDF, rellenar un formulario PDF, quitar el fondo de una foto, videos viejos a MP4, comparar dos textos y foto carnet.

## Próximas 12 guías (en este orden)

| # | Título (es) | Búsqueda objetivo | Herramientas | Puntos clave |
|---|---|---|---|---|
| 1 | Cómo unir varios PDF en uno solo (y en qué orden) | «unir pdf», «juntar pdf» | Unir PDF, Ordenar PDF, Comprimir PDF | Ordenar archivos y páginas antes de unir; PDF con contraseña (quitarla antes); mezclar escaneos y documentos; si el resultado pesa mucho, comprimir; todo en el navegador. |
| 2 | Cómo escanear un documento con el celular y guardarlo en PDF | «escanear documento con el celular», «foto a pdf» | Escanear documento, Imágenes a PDF, Comprimir PDF | Luz y fondo para la foto; recorte de bordes y perspectiva; varias páginas en un PDF; qué tamaño esperar; cuándo conviene el OCR para poder buscar texto. |
| 3 | Cómo sacar el texto de una foto o de una captura | «pasar imagen a texto», «copiar texto de una imagen» | Imagen a texto (OCR), OCR de PDF escaneado | Idiomas que reconoce; qué fotos funcionan y cuáles no (manuscrito, poca luz); revisar errores típicos; PDF escaneado → PDF con texto buscable. |
| 4 | Cómo reducir el tamaño de una foto sin que se note | «reducir tamaño de imagen», «comprimir foto» | Comprimir imagen, Redimensionar imagen, conversiones a WEBP | Peso vs. resolución; cuántos píxeles hacen falta para WhatsApp, correo o una web; calidad recomendada con números medidos; formatos (enlazar la guía de formatos). |
| 5 | Cómo sacar el audio de un video (MP4 a MP3) | «extraer audio de video», «mp4 a mp3» | Extraer audio de video, Convertir audio, Recortar audio | MP3 vs. M4A vs. WAV; calidad y bitrate; recortar el fragmento; videos de varias pistas; límites de tamaño en el navegador. |
| 6 | Cómo hacer un GIF a partir de un video | «video a gif», «hacer gif» | Video a GIF, Recortar video | Duración y tamaño razonables; cuadros por segundo y ancho; por qué un GIF pesa más que el video; alternativa en WEBP/MP4 para webs y chats. |
| 7 | Cómo poner contraseña a un PDF (y cómo quitarla si la sabes) | «poner contraseña a un pdf», «quitar contraseña pdf» | Proteger PDF, Quitar contraseña de PDF | Contraseña de apertura vs. de permisos; cómo compartir la contraseña; qué no se puede hacer (romper una contraseña que no conoces); compatibilidad con lectores. |
| 8 | Cómo quitar la ubicación y otros datos ocultos de una foto antes de compartirla | «quitar metadatos foto», «borrar exif» | Quitar metadatos EXIF, HEIC a JPG | Qué guarda una foto (GPS, fecha, modelo de cámara); qué redes los quitan y cuáles no; cómo comprobarlo; orientación de la imagen. |
| 9 | Cómo crear un código QR gratis (para un enlace, el wifi o una tarjeta) | «crear código qr», «qr wifi» | Generador de código QR, Leer código QR | Tipos de contenido; tamaño mínimo para imprimir; contraste y colores; QR estático (no caduca) vs. servicios «dinámicos»; probarlo antes de imprimir. |
| 10 | Subtítulos desfasados: cómo sincronizarlos y convertirlos (SRT, VTT, ASS) | «sincronizar subtítulos», «srt a vtt» | Sincronizar subtítulos, Convertir subtítulos, Transcribir audio | Desfase fijo vs. progresivo (distinta velocidad de cuadros); codificación de caracteres (tildes rotas); formatos que acepta cada reproductor. |
| 11 | Cómo numerar las páginas de un PDF y agregarle una marca de agua | «numerar páginas pdf», «marca de agua pdf» | Numerar páginas PDF, Marca de agua PDF, Eliminar páginas PDF | Posición y formato del número («Página 1 de 10»); empezar desde otra página; marca de agua de texto o imagen y su transparencia; orden recomendado de los pasos. |
| 12 | Cómo crear un libro electrónico (ePub) para leer en el lector o el celular | «crear epub», «convertir a epub» | Crear ePub, Convertir ePub, ePub a PDF | ePub vs. PDF en pantallas chicas; de Word/Markdown/HTML a ePub; portada y capítulos; qué lectores aceptan ePub; cuándo conviene PDF. |

## Después de estas 12

Ideas para seguir, según lo que muestre Search Console (pestaña Rendimiento → Consultas) cuando haya impresiones: priorizar las búsquedas por las que ya aparecemos en la página 2 o 3 y que todavía no tienen guía; actualizar (`updated`) las guías que bajen de posición, con información nueva real y no solo con la fecha cambiada.
