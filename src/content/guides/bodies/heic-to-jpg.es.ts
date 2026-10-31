const body = `
Si tienes un iPhone, tus fotos casi seguro están en formato HEIC. En el teléfono no lo notas, pero aparece en cuanto las pasas a una computadora con Windows, las subes a un formulario web o intentas mandarlas a alguien que no tiene un Apple: el archivo no abre, no se ve la miniatura o el sitio dice «formato no admitido». Esta guía explica qué es HEIC, cómo convertir las fotos a JPG sin instalar nada y cómo evitar el problema desde el propio iPhone.

## Qué es HEIC y por qué lo usa el iPhone

HEIC es el nombre que usa Apple para las imágenes guardadas con el formato HEIF y el códec de video HEVC. Desde iOS 11, la cámara del iPhone guarda las fotos así por una razón práctica: a calidad parecida, un HEIC ocupa aproximadamente la mitad que un JPG, y en un teléfono con miles de fotos eso es mucho espacio.

El problema es la compatibilidad. JPG lo abre cualquier programa, navegador, red social o formulario desde hace décadas; HEIC no. Windows puede necesitar extensiones de la Microsoft Store para mostrarlo, muchos sistemas de trámites y empresas no lo aceptan y algunos programas de edición antiguos no lo reconocen.

## Cómo convertir fotos HEIC a JPG

1. Abre [HEIC a JPG](conv:heic-jpg) y arrastra las fotos, o tócalas para elegirlas. Puedes elegir muchas a la vez.
2. Comprueba que en «Convertir a» esté elegido **JPG**.
3. Si quieres que pesen menos, abre **Opciones** y baja la calidad o el tamaño. Si no, deja los valores que vienen.
4. Pulsa **Convertir** y descarga cada foto, o todas juntas con **Descargar todo en ZIP**.

![El conversor con una foto HEIC lista para pasar a JPG](shot:heic-convertir "Las fotos HEIC se convierten en tu navegador: no se suben a ningún servidor.")

La conversión se hace dentro de tu navegador: las fotos no se suben a ningún servidor, algo importante cuando son fotos personales o de documentos. Funciona en Chrome, Edge, Firefox y Safari, en la computadora o en el mismo teléfono, con hasta 50 fotos por vez.

La foto mantiene su orientación: si la sacaste en vertical, el JPG queda vertical, aunque el archivo original guarde la rotación aparte.

## Desde el celular o desde la computadora

**Desde el iPhone**: abre la página en Safari, toca el recuadro para elegir archivos y luego «Fototeca». Al terminar, descarga el JPG; Safari lo guarda en la app Archivos, en la carpeta Descargas, desde donde puedes mandarlo o guardarlo en Fotos.

**Desde una computadora con Windows**: primero pasa las fotos del iPhone a la computadora (por cable, por la nube o por correo). Después arrástralas todas juntas al conversor. Si son muchas, el ZIP te ahorra descargarlas de a una.

**Desde Android**: si alguien te mandó fotos HEIC y tu teléfono no las abre, el procedimiento es el mismo que en el iPhone: elige los archivos desde el navegador y descarga los JPG.

## Lo que conviene saber antes de convertir

**Los datos de la foto no pasan al JPG.** Los HEIC del iPhone guardan, además de la imagen, información como la fecha y hora, el modelo del teléfono y, si tienes activada la ubicación de la cámara, las coordenadas GPS de dónde la sacaste. Nuestro conversor dibuja la imagen y la guarda de nuevo, así que el JPG resultante no lleva esos datos. Para compartir fotos con desconocidos es una ventaja: no revelas dónde estabas. Pero si después vas a ordenar las fotos por fecha en un programa, ten en cuenta que esa información no estará en el archivo.

Si lo que quieres es quitar la ubicación de fotos que ya están en JPG, [Quitar metadatos EXIF](tool:remove-exif) lo hace sin volver a convertirlas.

**El JPG pesa más que el HEIC.** Es normal: HEIC comprime mejor. Con la calidad que viene elegida, el JPG puede pesar bastante más que el original. Si el formulario te pide un peso máximo (por ejemplo, «menos de 500 KB»), usa después [Comprimir imagen](tool:compress-image), que te deja indicar ese peso exacto.

**Las Live Photos son una foto y un video corto.** Al convertir una Live Photo obtienes solo la foto fija. El movimiento se pierde, igual que cuando la mandas por correo como foto normal.

## Cómo hacer que el iPhone saque fotos en JPG

Si siempre necesitas JPG, puedes cambiar el formato de la cámara:

1. Abre **Ajustes** en el iPhone.
2. Entra en **Cámara** y luego en **Formatos**.
3. Elige **Más compatible**.

Desde ese momento, las fotos nuevas se guardan en JPG y los videos en H.264. Las fotos que ya tenías siguen en HEIC. A cambio, las fotos nuevas ocupan más espacio en el teléfono; si tienes poco espacio libre, quizás te convenga dejar HEIC y convertir solo las fotos que necesites mandar.

## Cómo pasar las fotos a una computadora ya en JPG

El iPhone tiene otra opción, pensada para cuando conectas el teléfono por cable a una computadora: en **Ajustes → Fotos**, al final, la sección **Transferir a Mac o PC**. Con **Automático**, el iPhone convierte las fotos a un formato compatible al copiarlas; con **Conservar originales**, las copia en HEIC.

Esta opción solo afecta a la copia por cable. Si pasas las fotos por la nube, por una app de mensajería o por correo, el formato depende de cada servicio: algunos convierten a JPG y otros mandan el archivo tal cual. Si el destinatario no puede abrirlas, conviértelas antes de mandarlas.

## Otros formatos de destino

JPG es la opción más segura, pero no la única:

- **PNG**: no pierde calidad, pero una foto en PNG pesa muchísimo más. Solo tiene sentido si vas a editar la imagen varias veces. Puedes usar [HEIC a PNG](conv:heic-png).
- **WebP**: pesa menos que el JPG y lo abren los navegadores actuales, pero no todos los formularios lo aceptan.
- **PDF**: si tienes que mandar varias fotos de un documento (un DNI de frente y dorso, una factura de varias hojas), [Imágenes a PDF](tool:images-to-pdf) acepta HEIC directamente y arma un solo PDF con una foto por página.

La guía [JPG, PNG, WebP o AVIF: cuál usar](guide:image-formats) explica las diferencias entre estos formatos con pesos medidos.

## Resumen

- HEIC es el formato del iPhone: ocupa menos, pero no todo lo abre.
- Para convertir, usa [HEIC a JPG](conv:heic-jpg): en tu navegador, sin subir las fotos, de a muchas a la vez.
- El JPG no conserva la fecha ni la ubicación de la foto, y pesa más que el HEIC.
- Para que el iPhone saque fotos en JPG: **Ajustes → Cámara → Formatos → Más compatible**.
- Para copiar por cable ya convertidas: **Ajustes → Fotos → Transferir a Mac o PC → Automático**.
`;

export default body;
