const body = `
El extracto del banco, la lista de precios de un proveedor, el informe que te mandaron: muchas tablas llegan en PDF, y para sumar, filtrar u ordenar los datos hay que pasarlas a una planilla. Copiar y pegar desde el lector de PDF casi nunca funciona bien: todo cae en una sola columna, o los números quedan como texto y Excel no los suma. Esta guía muestra cómo hacerlo con [PDF a Excel](tool:pdf-to-excel), cómo revisar el resultado y qué hacer cuando el PDF es escaneado.

## Por qué copiar y pegar no alcanza

Un PDF no guarda tablas. Guarda textos sueltos con su posición en la página: «84,35» está a tantos milímetros del borde, «Supermercado» un poco más a la izquierda. Las líneas que ves como bordes de celdas son dibujos que no tienen relación con el texto. Cuando copias, el lector de PDF te da los textos en algún orden, y la estructura de filas y columnas se pierde.

Nuestra herramienta reconstruye la tabla a partir de esas posiciones: arma las filas con los textos que están a la misma altura y las columnas según cómo se alinean, igual que lo haría una persona mirando la página.

## Antes de empezar: comprueba que el PDF tenga texto

Abre el PDF e intenta seleccionar un número con el mouse. Si se selecciona, el PDF tiene texto y la herramienta va a funcionar: es lo habitual en los PDF que genera un banco, un sistema de facturación o un programa como Excel o Word.

Si en cambio se selecciona toda la página como una imagen, el PDF es un escaneo o una foto. Sigue leyendo: más abajo explicamos qué hacer en ese caso.

## Cómo pasar una tabla de PDF a Excel paso a paso

1. Abre [PDF a Excel](tool:pdf-to-excel) y elige el PDF.
2. Espera unos segundos: la herramienta busca las tablas y te dice cuántas encontró.
3. Revisa la **vista previa**. Si hay varias tablas, elígelas en la lista para verlas una por una.
4. Elige el formato: **Excel (XLSX)** o **CSV**.
5. Elige cómo repartir las tablas en **Hojas**: una hoja por página, una por tabla o todo en una sola hoja.
6. Pulsa **Convertir a Excel** y descarga el archivo.

![Vista previa de una tabla detectada en un extracto en PDF](shot:pdf-excel-vista-previa "La herramienta detectó dos tablas en un extracto de dos páginas y muestra la primera antes de descargar.")

Todo se hace en tu navegador: el PDF no se sube a ningún servidor, algo importante con extractos bancarios y facturas. Acepta PDF de hasta 100 MB.

## Revisa la vista previa antes de descargar

La vista previa es el paso más importante. Como las columnas se deducen de la alineación, hay casos en los que el resultado necesita una mirada:

- **Celdas con texto en dos líneas**: una descripción larga partida en dos renglones puede salir como dos filas. En la planilla basta con unir esas celdas.
- **Celdas que ocupan varias columnas**: un título que abarca toda la tabla puede quedar en una sola celda, a la izquierda.
- **Columnas muy juntas**: si dos columnas casi se tocan en el PDF, sus valores pueden quedar en la misma celda.

En la captura de arriba, el extracto de ejemplo salió perfecto: la fecha, el concepto, el débito y el crédito en su columna, y las celdas vacías (un movimiento tiene débito pero no crédito) quedaron vacías, sin correr los valores de lugar.

## Números de verdad, con coma o con punto decimal

Lo que más tiempo ahorra es que los importes salen como números, no como texto: puedes sumarlos con una fórmula sin hacer nada más.

La herramienta detecta, tabla por tabla, cómo están escritos los números:

- Con **coma decimal**, como en España y casi toda Latinoamérica: 1.234,56.
- Con **punto decimal**, como en México, Estados Unidos o el Reino Unido: 1,234.56.
- Con **espacio como separador de miles**, como en Francia: 1 250,5.

Si la detección se equivoca (pasa en tablas con pocos números, donde un valor como 1,250 podría ser mil doscientos cincuenta o uno coma veinticinco), elige el separador a mano en **Separador decimal de los números**.

Hay datos que se dejan como texto a propósito: los códigos con ceros adelante (como 007, para no perder los ceros), las fechas, los porcentajes y los importes con el símbolo de la moneda pegado. Se ven igual que en el PDF y, si los necesitas como números o fechas, Excel los convierte con **Datos → Texto en columnas**.

## Una hoja por página, por tabla o todo junto

- **Una hoja por página** es lo más natural para un documento corto o cuando cada página trata de algo distinto.
- **Una hoja por tabla** sirve cuando una página tiene varias tablas separadas, como un resumen y un detalle.
- **Todo en una hoja** es la mejor opción para un extracto de varias páginas: todos los movimientos quedan uno debajo de otro, con una fila vacía entre una tabla y la siguiente. Si el encabezado se repite en cada página, aparece varias veces: borra esas filas y las vacías, y ya puedes ordenar o filtrar todo de una sola vez.

Si eliges CSV, cada hoja se convierte en un archivo CSV aparte. Para abrir esos archivos con Excel sin problemas de acentos, deja marcada la opción **UTF-8 con BOM**; la guía [CSV o Excel: diferencias y cómo abrir un CSV con acentos](guide:csv-vs-excel) explica por qué.

## Si el PDF es escaneado

Un PDF escaneado no tiene texto, solo una imagen de cada página, así que la herramienta te avisa que no puede detectar tablas. El camino es:

1. Pasa el PDF por [OCR de PDF escaneado](tool:ocr-pdf), eligiendo el idioma del documento. El OCR reconoce las letras y agrega una capa de texto invisible.
2. Usa el PDF que te devuelve en [PDF a Excel](tool:pdf-to-excel).

Funciona, pero con una advertencia importante: **el OCR puede confundir caracteres**, y en una tabla de números eso es grave (un 8 que se lee como 3, una coma que se pierde). Revisa los números de la vista previa contra el original, sobre todo los totales. Con escaneos nítidos y derechos los errores son pocos; con fotos torcidas o borrosas, muchos. Si el documento es una foto sacada con el celular, pásala primero por [Escanear documento](tool:scan-document) para enderezarla y limpiar el fondo.

## Después: trabajar con la planilla

Con los datos ya en Excel puedes ordenar, filtrar, sumar o hacer una tabla dinámica. Algunas herramientas que pueden servirte después:

- [Unir Excel](tool:merge-excel), si convertiste varios extractos (uno por mes) y quieres todos los movimientos en un solo archivo, uno debajo de otro.
- [Excel a CSV](tool:excel-to-csv), si tienes que cargar los datos en otro sistema que pide CSV.
- [PDF a Word](conv:pdf-docx), si además de la tabla necesitas el texto del documento para editarlo.

## Resumen

- Un PDF no guarda tablas: hay que reconstruirlas por la posición del texto.
- [PDF a Excel](tool:pdf-to-excel) lo hace en tu navegador, con vista previa y números de verdad.
- Revisa la vista previa: las celdas de dos líneas y las columnas muy juntas pueden necesitar un retoque.
- Si los números salen como texto, elige el separador decimal a mano.
- Si el PDF es escaneado, primero OCR, y revisa los números con cuidado.
`;

export default body;
