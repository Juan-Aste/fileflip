const body = `
Te mandan un PDF y tienes que cambiarle algo: corregir una fecha, agregar tu nombre en una línea, marcar un párrafo, poner un logo o tapar un número de teléfono antes de reenviarlo. Muchos programas que prometen «editar PDF» piden instalarse, crear una cuenta o pagar para descargar el resultado. Esta guía explica cómo hacerlo gratis desde el navegador, en la computadora o en el celular, y sobre todo qué se puede cambiar en un PDF y qué no, para que no pierdas tiempo buscando una función que ningún editor en línea hace bien.

## Qué se puede editar en un PDF (y qué no)

Un PDF no es un documento de Word. No guarda párrafos que se reacomodan al escribir, sino letras dibujadas en posiciones fijas de la página. Por eso hay dos tipos de edición muy distintos:

- **Agregar cosas encima de la página**: texto nuevo, resaltados, flechas, recuadros, una imagen o un recuadro blanco que tape algo. Es lo que hace [Editar PDF](tool:edit-pdf), y es lo que necesitas en la mayoría de los casos.
- **Cambiar el texto que ya tiene el PDF**: reescribir una frase y que el resto del párrafo se acomode solo. Nuestra herramienta **no hace esto**. Para eso hay que pasar el PDF a Word, editarlo allí y volver a guardarlo como PDF; más abajo explicamos cómo y cuándo conviene.

Con Editar PDF puedes:

- Escribir **texto** en cualquier lugar, en varias líneas, con Helvetica (normal o negrita), Times o Courier, de 4 a 144 puntos y en el color que quieras.
- **Resaltar** frases con un color translúcido que deja leer el texto de abajo.
- **Dibujar** a mano alzada y trazar **rectángulos**, **líneas** y **flechas**, con un grosor de 1 a 20 puntos.
- Pegar una **imagen** PNG o JPG de hasta 10 MB, como un logo, un sello o tu firma guardada como imagen.
- **Tapar** partes de la página con un recuadro blanco.

Todo se hace en tu navegador: el PDF y lo que agregas no salen de tu dispositivo.

## Cómo editar un PDF paso a paso

1. Abre [Editar PDF](tool:edit-pdf) y arrastra el PDF al recuadro, o tócalo para elegirlo.
2. Elige la página en las miniaturas y usa **Acercar** para trabajar con precisión.
3. En la barra de herramientas, elige lo que quieres agregar: **Texto**, **Resaltar**, **Dibujar**, **Rectángulo**, **Línea**, **Flecha**, **Tapar** o **Imagen**.
4. Para escribir, elige la **Fuente**, el **Tamaño (pt)** y el **Color**, toca la página donde va el texto y escríbelo en el cuadro **Texto** que aparece arriba.
5. Para corregir algo, elige **Seleccionar**, toca el elemento y arrástralo; con **Borrar** lo quitas, y **Deshacer** y **Rehacer** recorren tus cambios.
6. Pulsa **Guardar PDF** y después **Descargar**.

![El editor con un aviso en PDF: una fecha resaltada, una flecha roja y la hora corregida](shot:editar-pdf-texto "La hora vieja quedó tapada con un recuadro blanco y la nueva está escrita encima. Arriba se ajustan la fuente, el tamaño y el texto del elemento elegido.")

Algunos detalles que ahorran tiempo:

- En las imágenes, los resaltados y los recuadros blancos, el **cuadradito de la esquina** cambia el tamaño. El texto no tiene ese cuadradito: se agranda o se achica con el **Tamaño (pt)**.
- Cada herramienta recuerda su color: el texto empieza en negro, el resaltado en amarillo y las formas en rojo. Con **Otro color** eliges cualquier tono.
- Puedes editar varias páginas antes de guardar: las miniaturas de las páginas con cambios llevan un punto.
- En el celular funciona con el dedo. En la computadora, Ctrl+Z deshace y Ctrl+Y rehace.

## Corregir un texto que ya está en el PDF

Es lo que más se busca: cambiar una fecha, un importe, un nombre mal escrito. Como no se puede reescribir el texto original, el truco es **tapar y escribir encima**:

1. Elige **Tapar** y arrastra sobre la palabra o la cifra que quieres cambiar.
2. Elige **Texto** y toca justo donde empezaba el texto viejo.
3. Escribe el nuevo, con una fuente y un tamaño parecidos al original.

Para que no se note: **Helvetica** se parece a Arial y a la mayoría de las letras sin remate; **Times**, a las letras con remate de los documentos más formales. En casi todos los documentos el texto normal mide entre 10 y 12 puntos. Con el zoom al 200 % o 300 % es fácil ajustar la posición.

Este truco funciona bien para palabras sueltas, cifras y líneas cortas. Si tienes que reescribir párrafos enteros, el texto nuevo no va a entrar en el hueco del viejo. En ese caso conviene pasar el PDF a Word con [PDF a Word](conv:pdf-docx), editarlo como cualquier documento y volver a convertirlo con [Word a PDF](conv:docx-pdf). Ten en cuenta que esa conversión se hace en nuestro servidor y que el Word resultante es un documento limpio, no una copia exacta del diseño: la guía [Cómo pasar un PDF a Word](guide:pdf-to-word) explica qué se conserva y qué no.

## Tapar no es borrar: cuidado con los datos privados

Este punto es importante si vas a compartir el PDF. Un recuadro blanco **solo oculta a la vista**: el texto de abajo sigue en el archivo, y cualquiera puede seleccionarlo, copiarlo o encontrarlo con el buscador del lector de PDF. El editor te lo recuerda con un aviso en cuanto usas **Tapar**.

Si lo que tapas es un dato que no debe llegar a nadie (un número de documento, una cuenta bancaria, una dirección), haz esto:

1. Con **Seleccionar**, toca el recuadro blanco.
2. Marca **Ocultar de verdad (convierte esta página en imagen)**.
3. Guarda el PDF.

![Un recuadro blanco elegido, con la casilla Ocultar de verdad marcada](shot:editar-pdf-tapar "Con «Ocultar de verdad» marcado, la página se guarda como imagen y lo tapado desaparece del archivo.")

Al guardar, esa página se convierte en una imagen de alta calidad de sí misma: lo que estaba debajo del recuadro desaparece del archivo. A cambio, el texto de esa página ya no se puede seleccionar ni buscar, y el PDF suele pesar más. Las demás páginas quedan como estaban. Por eso conviene marcarlo solo en las páginas que lo necesitan.

## Lo que conviene saber antes de guardar

- **Lo que agregas queda fijo.** Se dibuja dentro de la página, no como un comentario: se ve igual en cualquier lector y al imprimir, pero después ya no se puede mover ni borrar, tampoco si vuelves a abrir el PDF en Editar PDF. Revisa todo antes de pulsar **Guardar PDF** y conserva el original.
- **Si recargas la página antes de guardar, pierdes los cambios.** El editor no guarda nada en ningún lado.
- **Acentos y otros alfabetos.** Las letras con tilde, la ñ y la ç se escriben con la fuente elegida. El texto en alfabetos que esas fuentes no tienen, como el chino, o los emojis se agrega como imagen con las fuentes de tu dispositivo: se ve bien, pero no se puede seleccionar.
- **PDF escaneados.** Puedes escribir, resaltar y tapar igual que en cualquier PDF. Si además quieres que su texto se pueda buscar y copiar, pásalo antes por [OCR de PDF escaneado](tool:ocr-pdf).

## Otras ediciones: qué herramienta usar

«Editar un PDF» a veces significa otra cosa. Para estos casos hay herramientas más directas:

- **Completar un formulario con campos** (cuadros de texto, casillas, listas): [Rellenar formulario PDF](tool:fill-pdf-form) los encuentra y te deja completarlos; la guía [Cómo rellenar un formulario PDF](guide:fill-pdf-form) lo explica. Si el formulario es solo un dibujo con líneas, usa Editar PDF.
- **Firmar**: [Firmar PDF](tool:sign-pdf) coloca tu firma dibujada o una foto de ella; lo cuenta la guía [Cómo firmar un PDF sin imprimirlo](guide:sign-pdf).
- **Ordenar, girar o quitar páginas**: [Ordenar páginas de PDF](tool:organize-pdf), [Rotar PDF](tool:rotate-pdf) o [Eliminar páginas de un PDF](tool:delete-pdf-pages).
- **Agregar páginas de otro PDF**: [Unir PDF](tool:merge-pdf).
- **Poner el mismo texto en todas las páginas**: Editar PDF trabaja página por página. Para un BORRADOR o CONFIDENCIAL en todas, usa [Agregar marca de agua a un PDF](tool:pdf-watermark); para numerarlas, [Numerar páginas de un PDF](tool:pdf-page-numbers).
- **Proteger el resultado**: [Proteger PDF con contraseña](tool:protect-pdf) le pone una contraseña de apertura.

## Resumen

- [Editar PDF](tool:edit-pdf) agrega texto, resaltados, dibujos, formas, imágenes y recuadros blancos, gratis y sin subir el archivo.
- No cambia el texto original: para corregir una palabra, tápala y escribe encima; para reescribir párrafos, pasa el PDF a Word.
- Tapar con blanco no borra: si el dato es privado, marca «Ocultar de verdad».
- Lo que agregas queda fijo al guardar: revisa antes y conserva el original.
- Para formularios, firmas, páginas, marcas de agua o contraseñas, usa la herramienta específica.
`;

export default body;
