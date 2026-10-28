const body = `
Un archivo CSV parece una planilla, se abre con Excel y tiene filas y columnas. Pero no es un Excel, y muchas de las sorpresas que da («todo me quedó en una sola columna», «los acentos salen como símbolos raros», «se me borraron los ceros del código») vienen de esa diferencia. Esta guía explica qué es cada formato, cuándo conviene usar uno u otro y cómo abrir un CSV sin romper los datos.

## Qué es un CSV y qué es un archivo de Excel

Un **CSV** («valores separados por comas») es un archivo de texto plano. Cada línea es una fila y los valores de cada fila van separados por un carácter, normalmente una coma. Si lo abres con el Bloc de notas, ves algo así:

\`\`\`
Cliente,Ciudad,Importe
Muñoz,Córdoba,1250.50
Pereira,Montevideo,980
\`\`\`

Un archivo de **Excel** (XLSX, o XLS en versiones antiguas) es un formato binario mucho más rico: puede tener varias hojas, fórmulas, formatos de número y de fecha, colores, anchos de columna, gráficos y filtros.

| | CSV | Excel (XLSX) |
| --- | --- | --- |
| Hojas | Una sola tabla | Varias hojas |
| Fórmulas | No: solo valores | Sí |
| Formato (colores, anchos, negritas) | No | Sí |
| Tipos de dato | Todo es texto; el programa que lo abre interpreta | Números, fechas y texto se guardan como tales |
| Lo abre | Cualquier programa, base de datos o lenguaje de programación | Excel, LibreOffice, Google Sheets, Numbers |

## Cuándo usar cada uno

Usa **CSV** cuando los datos van a otro sistema: importar contactos, subir un catálogo a una tienda en línea, cargar datos en una base de datos o en un programa contable. Es el formato de intercambio universal justamente porque es simple.

Usa **Excel** cuando una persona va a trabajar con los datos: mirarlos, calcular, filtrar, compartir un informe. Y siempre que el archivo tenga varias hojas, fórmulas o formato que quieras conservar.

## Los tres problemas típicos al abrir un CSV con Excel

### 1. Todo queda en una sola columna

El separador del CSV no coincide con el que espera tu Excel. En los países donde la coma es el separador decimal (España, la mayor parte de Latinoamérica, Francia, Brasil), Excel usa por defecto el **punto y coma** para separar valores. Si le das un CSV con comas, pone toda la línea en la columna A.

### 2. Los acentos y la ñ se ven mal

Si «Muñoz» aparece como «MuÃ±oz» o «Córdoba» como «CÃ³rdoba», el problema es la codificación. La mayoría de los sistemas actuales guardan los CSV en UTF-8, pero Excel en Windows, si el archivo no lo indica, lo lee como si estuviera en la codificación antigua de Windows, y cada letra acentuada se convierte en dos símbolos.

La forma de indicarlo es una marca invisible al principio del archivo, llamada **BOM**. Con ella, Excel muestra bien los acentos, la ñ y también otros alfabetos.

### 3. Se pierden ceros, dígitos o se cambian valores

Excel interpreta cada valor al abrir el CSV, y a veces se equivoca:

- Los **códigos con ceros adelante** (007, un código postal 01234) pierden los ceros porque Excel los toma como números.
- Los **números largos**, como un número de tarjeta, de cuenta o de documento de más de 15 cifras, se redondean o aparecen en notación científica: Excel solo guarda 15 cifras significativas.
- Algunos valores se convierten en **fechas** sin que lo pidas: un «1-2» puede terminar como 1 de febrero.

Lo grave es que, si después guardas el archivo desde Excel, esos cambios quedan guardados y los datos originales se pierden.

## Cómo abrir un CSV sin romperlo

### Opción 1: convertirlo a Excel antes de abrirlo

[CSV a Excel](tool:csv-to-excel) lee el CSV en tu navegador y genera un XLSX que Excel abre bien:

- Detecta solo el separador (coma, punto y coma, tabulador o barra vertical) y la codificación, incluida la de Windows que usan los CSV guardados por Excel.
- Convierte en números de verdad los valores numéricos, también los que tienen coma decimal en un CSV con punto y coma.
- Deja como texto los códigos con ceros adelante y los números de más de 15 cifras, para que no se pierdan.
- Deja las fechas tal como vienen, como texto, para no reinterpretarlas mal.

Es la opción más segura si recibiste el CSV de un banco, una tienda en línea o un sistema de facturación y solo quieres verlo y trabajar con él.

### Opción 2: importarlo desde Excel

En las versiones actuales de Excel, en lugar de abrir el CSV con doble clic, ve a **Datos → Obtener datos → Desde texto/CSV** (en algunas versiones, **Datos → Desde texto/CSV**). Se abre una ventana donde puedes elegir el **origen del archivo** (65001: Unicode UTF-8) y el **delimitador**, y ver una vista previa antes de cargar. Si una columna tiene códigos con ceros adelante, en **Transformar datos** puedes indicar que es texto.

### Opción 3: Google Sheets o LibreOffice

Google Sheets lee bien los CSV en UTF-8 y te deja elegir el separador al importar. LibreOffice Calc muestra un diálogo con la codificación, el separador y el tipo de cada columna antes de abrir el archivo.

## Cómo guardar un CSV que se abra bien en Excel

Si eres tú quien genera el CSV para que lo abra otra persona con Excel, [Excel a CSV](tool:excel-to-csv) te deja elegir:

1. Elige el archivo de Excel. Si tiene varias hojas, elige cuál convertir, o todas (un CSV por hoja).
2. En **Separador del CSV**, elige **Punto y coma** si quien lo recibe tiene Excel en español, portugués o francés; **Coma** si el CSV va a otro sistema.
3. Deja marcado **UTF-8 con BOM**.
4. Pulsa **Convertir a CSV** y descarga el archivo.

![Opciones de Excel a CSV: hoja, separador y UTF-8 con BOM](shot:excel-csv-opciones "Con punto y coma y BOM, el CSV se abre con doble clic en un Excel en español con cada valor en su columna y los acentos bien.")

Los números salen con todos sus decimales (no redondeados como se ven en pantalla) y los códigos con ceros adelante se conservan. La conversión se hace en tu navegador, sin subir el archivo.

Un detalle: si el CSV va a un sistema y no a una persona, consulta qué espera ese sistema. Algunos programas no esperan el BOM y lo toman como parte del primer nombre de columna; en ese caso, desmarca la opción.

## Otras conversiones útiles

- [Excel a JSON](tool:excel-to-json) y [JSON a Excel](tool:json-to-excel), para datos que van o vienen de una aplicación web.
- [Unir Excel](tool:merge-excel), para juntar varios CSV o planillas en un solo libro.
- [PDF a Excel](tool:pdf-to-excel), si la tabla te llegó en PDF. La guía [Cómo pasar una tabla de un PDF a Excel](guide:pdf-table-to-excel) explica cómo revisar el resultado.

## Resumen

- CSV es texto plano para intercambiar datos; Excel es una planilla con hojas, fórmulas y formato.
- Si todo queda en una columna, es el separador; si los acentos se ven mal, es la codificación (falta el BOM).
- Abrir un CSV con doble clic puede borrar ceros y redondear números largos: conviértelo antes con [CSV a Excel](tool:csv-to-excel) o impórtalo desde **Datos → Desde texto/CSV**.
- Para generar un CSV que se abra bien en Excel en español: punto y coma y UTF-8 con BOM.
`;

export default body;
