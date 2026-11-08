const body = `
En algún disco o pendrive tienes videos de hace quince o veinte años: el cumpleaños grabado con una cámara de fotos compacta, la boda que alguien editó con Windows Movie Maker, los clips del primer celular con cámara. Los pasas al celular o a la tele y no abren, o se oye el sonido pero no se ve nada. La solución es convertirlos a MP4, el formato que reproduce prácticamente cualquier celular, televisor, computadora y red social. Esta guía explica cómo hacerlo en el navegador, sin instalar programas, y qué esperar del resultado.

## Por qué el celular o la tele no abren tus videos viejos

Un archivo de video tiene dos capas: el **contenedor** (lo que indica la extensión: AVI, WMV, MP4…) y los **códecs**, que son la forma en que están comprimidos la imagen y el sonido dentro. Los videos viejos suelen combinar ambas cosas de una manera que hoy casi nadie soporta:

- **AVI**: el formato de Windows de los 90 y 2000, con video DivX o Xvid (MPEG-4 Part 2) y sonido MP3. Lo usaban muchas cámaras compactas y las películas descargadas de esa época.
- **WMV**: el de Windows Media y Movie Maker, con códecs propios de Microsoft.
- **3GP**: el de los celulares de antes de los smartphones, con video H.263 y sonido AMR, pensado para pantallas diminutas.
- **MOV**: el de QuickTime, el iPhone y muchas cámaras. Suele abrir en equipos de Apple, pero no siempre en Android ni en la tele. Si es un MOV moderno, con H.264 o HEVC, pasa a MP4 sin recomprimir, en segundos.
- **FLV**, **MPG**, **VOB** y **RM**: los videos de Flash de los sitios de hace años, el MPEG-1 y MPEG-2 de las cámaras y los DVD, y RealMedia.

Los celulares, los televisores inteligentes y los navegadores actuales dejaron de incluir esos códecs. Un MP4 con video **H.264** y sonido **AAC**, en cambio, se reproduce en todos lados. Eso es lo que obtienes al convertir.

## Cómo convertir un video viejo a MP4 paso a paso

1. Abre [Convertir video](tool:video-converter) y arrastra tus videos al recuadro, o haz clic para elegirlos. Puedes agregar varios a la vez.
2. En **Convertir a**, deja elegido **MP4** (es la opción predeterminada).
3. Pulsa **Convertir video**. Mientras trabaja verás una barra de **Procesando…**; si te equivocaste de archivo, pulsa **Cancelar**.
4. Cuando aparezca **Tu archivo está listo**, pulsa **Descargar** junto a cada video, o **Descargar todo en ZIP** si convertiste varios.
5. Copia los MP4 al celular, súbelos a tu nube o ponlos en un pendrive para la tele.

![Tres videos viejos (AVI, WMV y 3GP) cargados en Convertir video, con MP4 elegido como formato de salida](shot:video-viejo-mp4-elegir "Un AVI, un WMV y un 3GP listos para pasar a MP4 en una sola tanda.")

Todo pasa en tu navegador: los videos no se suben a ningún servidor. Eso importa con videos familiares, y además evita esperar a que se suba un archivo pesado.

## Por qué la primera vez tarda un poco más

Tu navegador sabe leer MP4, MOV, MKV y WebM, pero no estos formatos antiguos. Cuando reconoce uno, la herramienta descarga un motor FFmpeg (unos 31 MB, desde nuestro propio dominio) que corre dentro de la página. La conversión se hace entonces en dos etapas:

1. FFmpeg lee el video viejo y lo pasa a un formato intermedio que el navegador entiende.
2. Ese intermedio sigue la conversión normal: se codifica a H.264 con el codificador de tu navegador y el sonido pasa a AAC.

Por eso la barra de progreso avanza en dos tramos y la conversión es más lenta que la de un MP4 moderno. Como referencia, en nuestra prueba en una computadora de escritorio, un AVI de un minuto a 640 × 480 tardó alrededor de medio minuto, contando la descarga del motor. En un celular o una computadora vieja tarda más. Las siguientes conversiones reutilizan el motor ya descargado.

Al terminar, cada video indica qué se hizo con él: con los formatos viejos verás **Video recodificado en H.264.**, porque la imagen siempre se vuelve a comprimir, en calidad alta.

![Resultado de la conversión: tres MP4 listos para descargar, cada uno recodificado en H.264](shot:video-viejo-mp4-resultado "Cada archivo dice con qué códec quedó; con varios, puedes bajarlos todos en un ZIP.")

## Límites que conviene conocer

- **Tamaño**: hasta 200 MB por archivo y hasta 50 archivos por tanda.
- **Duración**: con los formatos antiguos, el máximo es de 20 minutos de video por archivo, porque el motor FFmpeg es más lento y trabaja en la memoria del navegador. Un MP4, MOV, MKV o WebM puede durar hasta 2 horas.
- **Tiempo**: si un video tarda más de 30 minutos en convertirse, se detiene para no bloquear tu dispositivo.
- **Pistas**: se conservan la pista de video y la de audio principales. Los subtítulos y los audios alternativos, como el segundo idioma de un DVD, no se copian.
- **DVD**: los archivos VOB de un DVD suelen medir cerca de 1 GB cada uno, más que el límite, y además vienen cortados en partes. La herramienta sirve para VOB chicos, pero no para pasar un DVD entero.
- **Navegador**: para obtener H.264 usa Chrome, Edge o Safari. En navegadores sin codificador H.264 (como Chromium o Firefox en Linux) verás un aviso y el MP4 se creará con VP9 o AV1, que se ven en Chrome, Edge, Firefox y Android, pero quizá no en un iPhone ni en todos los televisores.

## Qué no puede arreglar la conversión

Convertir cambia el formato, no la imagen. Un video de celular de 2008 grabado a 176 × 144 sigue midiendo eso: se verá en la tele, pero pequeño y borroso, igual que en el original. La herramienta no aumenta la resolución ni quita el ruido de una cámara vieja, y tampoco recupera un archivo dañado: si el video se corta a la mitad en tu computadora, el MP4 también.

Hay además algunos videos que, por ahora, no se pueden leer aunque la extensión parezca conocida. En nuestras pruebas fallaron los MOV muy antiguos de QuickTime (con códecs como Sorenson o Cinepak) y los MP4 de algunas cámaras viejas que usan MPEG-4 Part 2 en lugar de H.264. En esos casos verás un mensaje de que el navegador no puede leer el video del archivo.

## Después de convertir

Una vez que tienes el MP4, puedes seguir con otras herramientas, que trabajan con MP4 igual que el convertidor:

- **Para mandarlo por WhatsApp o correo**: si pesa demasiado, [Comprimir video](tool:compress-video) baja la calidad o la resolución.
- **Para quedarte con un pedazo**: [Recortar video](tool:trim-video) corta el principio y el final, como los minutos en los que la cámara apuntaba al piso.
- **Para armar un solo video con varios clips**: [Unir videos](tool:join-videos) los junta en el orden que elijas, por ejemplo todos los 3GP de un viaje.
- **Para cámara lenta o acelerada**: [Cambiar velocidad del video](tool:video-speed) va de 0,25× a 4×.
- **Para guardar solo el sonido**: [Extraer audio de un video](tool:extract-audio) lo saca como MP3, M4A, WAV, FLAC u OGG.
- **Para pasar a texto lo que se dice**: [Transcribir audio a texto](tool:audio-to-text) acepta el MP4; la guía [Cómo transcribir un audio o una nota de voz a texto](guide:transcribe-audio) explica cómo.
- **Para compartir un momento corto**: [Video a GIF](tool:video-to-gif) convierte unos segundos en una animación.

Si lo que no abre en tu celular son fotos y no videos, la guía [Cómo pasar fotos HEIC del iPhone a JPG](guide:heic-to-jpg) cuenta el mismo problema con las imágenes del iPhone.

## Resumen

- Los videos AVI, WMV, 3GP, FLV, MPG, VOB y RM no abren en muchos celulares y televisores porque usan códecs que ya no se incluyen.
- [Convertir video](tool:video-converter) los pasa a MP4 con H.264 y AAC, en el navegador y sin subirlos.
- La primera vez descarga un motor de unos 31 MB y es más lento que con un MP4; el máximo es de 20 minutos y 200 MB por archivo.
- La conversión no mejora la imagen: un video de baja resolución sigue siéndolo.
- Para H.264, usa Chrome, Edge o Safari.
`;

export default body;
