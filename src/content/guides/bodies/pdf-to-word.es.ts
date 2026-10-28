const body = `
Pasar un PDF a Word sirve para una cosa concreta: **volver a editar el texto** de un documento del que no tienes el archivo original. Un contrato que te mandaron en PDF y que tienes que corregir, un currículum viejo, un apunte que quieres reescribir. Lo que no conviene esperar de ninguna conversión es que el Word quede idéntico al PDF: un PDF no guarda párrafos ni tablas, sino letras dibujadas en posiciones fijas de la página, y el programa que convierte tiene que adivinar cómo era el documento.

En esta guía verás cómo hacerlo con nuestro conversor, qué se conserva y qué no, y qué herramienta usar en los tres casos en los que una conversión directa no alcanza: los PDF escaneados, las tablas y las imágenes.

## Antes de empezar: ¿tu PDF tiene texto?

Abre el PDF y trata de seleccionar una palabra con el mouse (o mantén el dedo apretado sobre ella en el celular). Hay dos posibilidades:

- **Se selecciona la palabra**: el PDF tiene texto digital. Es lo habitual en los PDF que salen de Word, de un sistema de facturación o de un banco. La conversión a Word funciona directamente.
- **Se selecciona un rectángulo o nada**: el PDF es una imagen, como un escaneo o una foto guardada como PDF. No hay letras que pasar a Word, solo píxeles. En ese caso salta a la sección sobre PDF escaneados.

Esta comprobación de diez segundos te ahorra la frustración más común: un Word vacío o un mensaje de error.

## Cómo pasar un PDF a Word paso a paso

1. Abre [PDF a Word](conv:pdf-docx) y arrastra el PDF al recuadro, o tócalo para elegirlo desde tu dispositivo.
2. Comprueba que en «Convertir a» esté elegido **Word**.
3. Pulsa **Convertir** y espera unos segundos.
4. Descarga el archivo .docx con su botón y ábrelo en Word, LibreOffice Writer, Google Docs o Pages.

![El conversor con un PDF listo para pasar a Word](shot:pdf-a-word-convertir "Con el PDF elegido, el formato de salida es Word y basta con pulsar Convertir.")

Puedes convertir hasta 5 PDF a la vez, de hasta 15 MB cada uno. Esta conversión, a diferencia de la mayoría de nuestras herramientas, **se hace en nuestro servidor**: el archivo viaja cifrado, se convierte y se borra automáticamente en menos de una hora. Si el documento es muy delicado, ten en cuenta este detalle antes de subirlo.

## Qué se conserva y qué no

Nuestro conversor lee el texto del PDF con su posición y su tamaño, y lo reconstruye como un documento de Word normal:

- **Se conserva**: todo el texto, de arriba hacia abajo, los párrafos (las líneas se unen en párrafos aunque en el PDF estén cortadas), los títulos (las líneas con letra más grande pasan a ser títulos de Word, con su estilo), el tamaño de letra aproximado, los saltos de página (cada página del PDF empieza una página nueva en Word) y el tamaño de la hoja.
- **Puede cambiar o perderse**: las columnas (en un texto a dos columnas, las líneas que están a la misma altura se juntan y conviene revisarlo), las tablas (sus celdas quedan como líneas de texto), las imágenes, los colores, los tipos de letra exactos y los encabezados o pies de página, que quedan como texto normal dentro de cada página.

![El PDF ya convertido, con el botón para descargar el documento de Word](shot:pdf-a-word-resultado "Al terminar aparece el botón para descargar el .docx. El aviso de arriba resume qué se conserva.")

El resultado es un documento **limpio y fácil de editar**, no una copia visual del PDF. Para corregir un texto, reescribir partes o reutilizar párrafos, es justo lo que necesitas: no vas a pelear con cuadros de texto superpuestos ni con saltos de línea en mitad de cada frase.

## Si el PDF es escaneado

Un PDF escaneado no tiene texto, así que el conversor responde con un aviso en lugar de darte un Word vacío. Primero hay que reconocer las letras de la imagen, lo que se llama OCR:

1. Abre [OCR de PDF escaneado](tool:ocr-pdf), elige el PDF y el **idioma en el que está escrito** (es importante: con el idioma equivocado se confunden acentos y letras).
2. Descarga el PDF que te devuelve. Se ve igual que el original, pero ahora tiene una capa de texto invisible encima de cada palabra.
3. Pasa ese PDF nuevo por [PDF a Word](conv:pdf-docx).

El OCR se hace en tu navegador, sin subir el escaneo, y puede tardar unos segundos por página. Su precisión depende de la calidad del escaneo: con una hoja bien iluminada y derecha casi no hay errores, mientras que con una foto torcida o borrosa aparecen letras cambiadas. Si solo necesitas el texto para copiarlo en otro lado, el OCR también te da directamente un archivo .txt y te ahorras el paso por Word.

Si el documento es una foto que sacaste con el celular, pásala antes por [Escanear documento](tool:scan-document): endereza la perspectiva y deja el papel blanco, lo que mejora mucho el reconocimiento.

## Si lo que necesitas son las tablas

Si el PDF es un extracto bancario, una lista de precios o un informe con números, lo que quieres casi siempre es una planilla y no un Word. En ese caso usa [PDF a Excel](tool:pdf-to-excel): arma las filas y las columnas por la alineación del texto, convierte los importes como 1.234,56 en números de verdad para que puedas sumarlos y te muestra la tabla detectada antes de descargar. Después puedes copiar la tabla de Excel y pegarla en Word, donde queda como una tabla editable.

La guía [Cómo pasar una tabla de un PDF a Excel](guide:pdf-table-to-excel) explica ese camino en detalle.

## Si necesitas las imágenes

Las fotos y los logos del PDF no pasan al Word. Para recuperarlas, [Extraer imágenes de un PDF](tool:extract-pdf-images) te da cada imagen con su resolución original, sin pérdida de calidad, y luego las insertas en Word donde las necesites. Si lo que quieres es una página entera como imagen (por ejemplo, un plano o un gráfico dibujado en vectores), usa [PDF a JPG](conv:pdf-jpg).

## Cuándo no hace falta pasar el PDF a Word

Muchas veces la conversión es un rodeo. Antes de convertir, piensa qué quieres hacer en realidad:

- **Completar un formulario**: si el PDF tiene campos, [Rellenar formulario PDF](tool:fill-pdf-form) te los muestra como un formulario normal. Si es un formulario sin campos (solo líneas para escribir), con [Editar PDF](tool:edit-pdf) escribes encima de la página.
- **Cambiar una palabra o una fecha**: en Editar PDF puedes tapar el texto viejo con un recuadro blanco y escribir el nuevo encima, sin tocar el resto del diseño. Ten en cuenta que tapar no borra: el texto de abajo sigue en el archivo, salvo que marques «Ocultar de verdad».
- **Copiar un párrafo**: [PDF a texto](tool:pdf-to-text) te da todo el texto en un .txt, sin el paso por Word.
- **Firmar**: no hace falta imprimir ni convertir; con [Firmar PDF](tool:sign-pdf) agregas tu firma directamente.

## Después de editar: volver a PDF

Cuando termines de corregir el documento en Word, lo normal es mandarlo otra vez en PDF, para que se vea igual en cualquier dispositivo. Puedes usar «Guardar como PDF» en Word o pasar el .docx por [Word a PDF](conv:docx-pdf). Si el resultado pesa demasiado para mandarlo por correo, la guía [Cómo reducir el peso de un PDF](guide:reduce-pdf-size) explica qué hacer.

## Resumen

- Comprueba primero si el PDF tiene texto seleccionable.
- Con texto: [PDF a Word](conv:pdf-docx) te da un documento editable con los párrafos, títulos y saltos de página; las columnas, tablas e imágenes pueden cambiar.
- Escaneado: primero [OCR de PDF escaneado](tool:ocr-pdf), luego PDF a Word.
- Tablas: [PDF a Excel](tool:pdf-to-excel). Imágenes: [Extraer imágenes de un PDF](tool:extract-pdf-images).
- Si solo tienes que completar, corregir una línea o firmar, edita el PDF directamente y evita la conversión.
`;

export default body;
