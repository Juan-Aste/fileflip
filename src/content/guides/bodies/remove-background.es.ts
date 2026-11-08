const body = `
Una foto de producto sobre fondo blanco se ve más prolija en una tienda online; un retrato sin fondo sirve para un currículum, una credencial o una foto de perfil; un logo o un objeto sin fondo se puede poner encima de cualquier diseño. Esta guía explica cómo quitar el fondo de una foto gratis y sin subirla a ningún servidor, cuándo conviene cada modo de la herramienta, cómo corregir los bordes y qué formato descargar según dónde vayas a usar la imagen.

## Qué modo elegir: personas u objetos

[Quitar fondo de imagen](tool:remove-background) tiene dos modos, y elegir bien es lo que más influye en el resultado:

- **Personas (automático)**: para retratos, selfies y fotos de una o más personas. Apenas eliges la foto, un modelo de inteligencia artificial (MediaPipe Selfie Segmenter, de Google) encuentra a la persona y quita el fondo solo. La primera vez se descargan unos 4 MB desde Fileflect (después quedan en la caché del navegador) y necesita WebGL. Solo reconoce personas: si en la foto no hay una persona clara, te avisa y te ofrece **Usar el modo rectángulo**.
- **Objetos y productos (rectángulo)**: para todo lo demás, como un producto sobre una mesa, un objeto, un logo fotografiado o una mascota. Encierras el sujeto en un rectángulo y un método clásico (GrabCut, sin ningún modelo) separa sus colores de los del fondo. No descarga nada y funciona mejor cuando el sujeto se distingue del fondo por el color.

En los dos modos la foto se procesa en tu navegador: ni la foto ni el resultado salen de tu dispositivo.

## Cómo quitar el fondo paso a paso

Este es el camino para una foto de producto; con una persona es igual, salvo que el recorte inicial sale solo y no hace falta el rectángulo.

1. Abre [Quitar fondo de imagen](tool:remove-background), elige el modo **Objetos y productos (rectángulo)** y elige la foto.
2. Ajusta el rectángulo de la **Foto original** para que encierre el objeto con un poco de margen. Todo lo que quede fuera se quita.
3. Mira el **Resultado**. Si quedó fondo, elige **Pincel: quitar** y pinta encima; si se perdió parte del objeto, elige **Pincel: mantener** y pinta encima. El recorte se recalcula con cada trazo.
4. En **Fondo**, elige **Transparente**, **Blanco** o **Color**, y en **Formato**, PNG, WEBP o JPG.
5. Pulsa **Quitar fondo** y descarga la imagen. Conserva el tamaño original y su nombre termina en «-sin-fondo».

![Una taza fotografiada sobre una mesa, encerrada en el rectángulo, y el resultado sin fondo sobre el damero](shot:quitar-fondo-producto "El rectángulo marca el objeto; a la derecha, el resultado con el fondo transparente sobre el damero.")

La línea de estado indica qué parte de la foto se conserva (por ejemplo, «Recorte listo: se conserva el 15 % de la foto»). Si el número es mucho más alto de lo que esperabas, probablemente quedó parte del fondo.

## Corregir los bordes

El recorte automático rara vez es perfecto a la primera. La herramienta tiene dos tipos de pincel, que hacen cosas distintas:

- **Pincel: mantener** y **Pincel: quitar** son indicaciones: le dicen al método «esto es sujeto» o «esto es fondo» y el recorte se vuelve a calcular a partir de ellas. Sirven para zonas grandes, como una etiqueta del mismo color que la pared o una sombra que quedó pegada al objeto. Basta con un trazo por la zona, no hace falta pintarla entera.
- **Borrador** y **Restaurar** cambian exactamente los píxeles que pintas, sin recalcular nada. Son para los detalles: restos en esquinas, el hueco del asa de una taza, el espacio entre los dedos. Puedes elegir el **Borde del pincel**: **Suave** para bordes naturales o **Duro** para cortes limpios.

Para trabajar con precisión, acércate con el zoom (rueda del mouse, pellizco con dos dedos o los botones, hasta 800 %) y muévete con la barra espaciadora, con **Mano (mover)** o deslizando con dos dedos. Las teclas [ y ] cambian el **Tamaño del pincel**, y **Deshacer** y **Rehacer** (Ctrl + Z y Ctrl + Y) recorren todos los pasos.

Un truco útil: en **Ver sobre**, cambia la vista a **Negro** o **Magenta**. Sobre un fondo de color fuerte se notan enseguida los restos claros y el halo del fondo anterior que sobre el damero pasan desapercibidos. Esto solo cambia la vista previa, no la imagen que descargas.

Ten en cuenta un límite: el recorte se calcula sobre una copia reducida de la foto (480 píxeles de lado mayor) y se aplica al tamaño original con el borde suavizado. Los bordes nítidos de un producto quedan bien, pero el pelo suelto o la pelusa de un peluche quedan suavizados, no recortados pelo por pelo.

## Fondo blanco para una tienda online

Muchas tiendas y marketplaces prefieren o exigen fotos de producto sobre fondo blanco liso. Con esta herramienta:

1. Elige **Blanco** en **Fondo** (o **Color** y el tono que quieras en **Color del fondo**).
2. Elige JPG o WEBP como formato: ocupan mucho menos que PNG en una foto.
3. Mira el resultado con **Fondo elegido**, que muestra cómo quedará la imagen descargada.

![La misma taza con el fondo blanco elegido y el formato JPG](shot:quitar-fondo-blanco "Con «Blanco» y JPG, la vista previa muestra la foto tal como se descargará.")

Si eliges JPG con el fondo en **Transparente**, la herramienta cambia sola a **Blanco**, porque JPG no guarda transparencia.

Algunos consejos para que el resultado se vea profesional:

- **Saca la foto pensando en el recorte**: un fondo liso y de un color distinto al del producto (una cartulina, una pared) facilita mucho el trabajo. Evita fondos con el mismo color que el objeto.
- **Cuida la sombra**: una sombra suave sobre la mesa puede quedar pegada al producto. Quítala con **Pincel: quitar** o con el **Borrador**.
- **Deja el producto centrado y con margen**: después puedes llevarlo a un formato cuadrado con [Recortar imagen](tool:crop-image) y a la medida que pide la tienda con [Redimensionar imagen](tool:resize-image).
- **Controla el peso**: si la tienda limita el tamaño del archivo o quieres que la página cargue rápido, [Comprimir imagen](tool:compress-image) lo reduce sin cambiar la medida.

## Fondo transparente: qué formato descargar

Si vas a poner la imagen sobre otro diseño (una presentación, un catálogo, una página web), descárgala con fondo **Transparente** en PNG, el formato más compatible con transparencia. JPG no admite transparencia. Las diferencias entre formatos están explicadas en [JPG, PNG, WebP o AVIF: cuál usar](guide:image-formats).

Para una foto de perfil redonda, pasa el PNG sin fondo por [Redondear imagen](tool:round-image).

Un caso aparte es el **fondo transparente falso**: imágenes descargadas de internet que muestran el cuadriculado gris y blanco, pero que en realidad lo tienen dibujado en los píxeles. Si abres una de esas, la herramienta lo detecta y te ofrece **Quitar fondo falso**, que convierte ese cuadriculado en transparencia real sin tener que recortar nada a mano.

## Fondo blanco para una foto de documento

Para una foto carnet o de pasaporte con fondo blanco, quita el fondo en el modo **Personas (automático)**, elige **Blanco** y descarga la imagen; después ábrela en [Foto carnet](tool:id-photo) para encuadrarla a la medida del trámite y armar la hoja de copias. Foto carnet no cambia el fondo por sí sola. La guía [Cómo hacer una foto carnet](guide:id-photo) explica el encuadre y la impresión.

Antes de hacerlo, revisa los requisitos del trámite: algunas oficinas no aceptan fotos retocadas o piden que el fondo sea el de la toma original. En ese caso, lo más seguro es sacar la foto delante de una pared blanca o del color que pidan.

## Límites y formatos

- Una foto por vez, de hasta 30 MB y 40 megapíxeles.
- Acepta JPG, PNG, WEBP, AVIF, GIF (solo el primer cuadro) y BMP. Las fotos HEIC del iPhone hay que pasarlas antes a JPG con [HEIC a JPG](conv:heic-jpg).
- La descarga conserva el tamaño en píxeles de la foto original.

## Resumen

- Para personas, usa **Personas (automático)**; para productos, objetos y mascotas, **Objetos y productos (rectángulo)**.
- Corrige zonas grandes con **Pincel: mantener** y **Pincel: quitar**, y los detalles con **Borrador** y **Restaurar**, con zoom.
- Revisa el borde con la vista sobre **Negro** o **Magenta**.
- Fondo blanco o de color en JPG o WEBP para tiendas; fondo transparente en PNG para diseños.
- Todo ocurre en tu dispositivo: la foto no se sube.
`;

export default body;
