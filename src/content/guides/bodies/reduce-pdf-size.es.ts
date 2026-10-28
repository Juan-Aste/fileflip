const body = `
Un PDF demasiado pesado es un problema práctico: el correo lo rechaza, el formulario de un trámite pide «menos de 2 MB» o la persona que lo recibe por WhatsApp tiene que gastar sus datos para abrirlo. La buena noticia es que casi siempre se puede achicar mucho, y sin que el documento deje de leerse bien. La clave está en entender **qué es lo que pesa** dentro del PDF.

## Por qué un PDF pesa tanto

Un PDF de texto, como uno que sale de Word con solo letras, pesa muy poco: una página son unos pocos kilobytes. Lo que hace que un PDF pese megas son casi siempre **las imágenes que tiene adentro**, y en especial las fotos sacadas con el celular.

El caso típico: escaneaste un contrato sacándole fotos con el teléfono y las juntaste en un PDF. Cada foto tiene 12 megapíxeles o más, mucha más resolución de la que hace falta para leer una hoja, y el PDF termina pesando entre 1 y 3 MB por página.

Por eso nuestra herramienta [Comprimir PDF](tool:compress-pdf) trabaja sobre las imágenes: las vuelve a guardar con menos resolución y más compresión, y deja intactos el texto, las fuentes y los dibujos vectoriales. El texto sigue nítido y se puede seleccionar y buscar.

## Cómo comprimir un PDF paso a paso

1. Abre [Comprimir PDF](tool:compress-pdf) y arrastra el archivo, o tócalo para elegirlo.
2. Elige el nivel de compresión: **Baja** (mejor calidad), **Recomendada** o **Fuerte** (archivo más liviano).
3. Pulsa **Comprimir PDF**.
4. Mira el resultado: la herramienta te muestra el peso antes y después. Si te sirve, descárgalo; si no, prueba con otro nivel.

![Comprimir PDF con el nivel recomendado elegido y el resultado](shot:comprimir-pdf-resultado "La herramienta muestra cuánto pesaba el PDF y cuánto pesa ahora.")

El PDF se procesa en tu propio navegador: no se sube a ningún servidor, así que puedes comprimir documentos con datos personales con tranquilidad. Acepta archivos de hasta 200 MB.

## Qué nivel elegir: lo que medimos

Para darte una idea real, armamos un PDF de 4 páginas con imágenes que imitan fotos de un contrato sacadas con el celular: 3024 × 4032 píxeles cada una, como las de la mayoría de los teléfonos, con luz despareja y grano. Pesaba 4,9 MB. Estos son los resultados con cada nivel:

| Nivel | Peso | Reducción | Qué hace con las fotos |
| --- | --- | --- | --- |
| Baja | 786 KB | 85 % | Lado mayor de hasta 2400 píxeles, calidad alta |
| Recomendada | 334 KB | 93 % | Lado mayor de hasta 1600 píxeles, calidad media |
| Fuerte | 151 KB | 97 % | Lado mayor de hasta 1100 píxeles, calidad baja |

Con el nivel fuerte, el texto del contrato se seguía leyendo sin problema viendo la página entera en la pantalla. Lo que se pierde es detalle fino: si el PDF tiene fotos que importan por sí mismas (un catálogo de productos, un plano con letra muy chica, un informe con fotografías), quédate con el nivel bajo o el recomendado.

Una sugerencia práctica: **empieza por el recomendado**. Para mandar por correo o por WhatsApp suele bastar. Si el formulario de un trámite te pide un peso menor, pasa al fuerte.

## Por qué a veces casi no se reduce

Si tu PDF tiene sobre todo texto, o sus imágenes ya están bien comprimidas, hay poco que achicar. Un PDF de texto de pocas páginas pesa unos pocos kilobytes y no tiene sentido comprimirlo. Si no logra reducirlo, la herramienta te lo avisa, y nunca te entrega un archivo más grande que el original.

También pasa con PDF que ya pasaron por otro compresor, o con imágenes en formatos que no recomprimimos para no arriesgar la calidad (por ejemplo, ciertos escaneos en blanco y negro puro o con colores de imprenta). Si después de comprimir el PDF sigue pesado, prueba las otras ideas de esta guía.

## Otras formas de achicar un PDF

**Quitar las páginas que sobran.** Muchas veces el PDF tiene páginas en blanco, anexos que no hacen falta o la misma hoja dos veces. Con [Eliminar páginas de un PDF](tool:delete-pdf-pages) ves una miniatura de cada página y quitas las que no quieres. El resto queda con la misma calidad.

**Dividirlo en partes.** Si el formulario acepta varios archivos pero cada uno con un peso máximo, [Dividir PDF](tool:split-pdf) separa el documento en rangos de páginas (por ejemplo, 1-5 y 6-10), y cada parte pesa menos.

**Achicar las fotos antes de armar el PDF.** Si vas a crear el PDF a partir de fotos, puedes hacerlo con [Imágenes a PDF](tool:images-to-pdf) y después comprimir el resultado; o reducir antes las fotos con [Comprimir imagen](tool:compress-image), que te deja fijar un peso exacto por foto.

**Escanear mejor.** Si el PDF viene de fotos de papeles, [Escanear documento](tool:scan-document) endereza la hoja y deja el papel blanco y el texto negro: el resultado se ve como un escaneo de verdad, más legible que la foto original.

## Cuánto tiene que pesar para mandarlo

No hay un número único, pero sí algunas referencias útiles:

- **Correo electrónico**: muchos servicios de correo rechazan adjuntos de más de 20 o 25 MB (en Gmail, el límite es de 25 MB). Además, a quien lo recibe le conviene un archivo chico: para un documento de pocas páginas, menos de 2 MB es razonable.
- **WhatsApp**: acepta documentos grandes, pero quien lo recibe tiene que descargarlo, a veces con datos móviles. Si lo envías como documento (y no como foto), el PDF llega tal cual.
- **Formularios y trámites**: suelen indicar el peso máximo junto al botón para subir el archivo. Es común que pidan 1, 2 o 5 MB por archivo. Revisa ese dato antes de comprimir, para elegir el nivel adecuado.

## Errores comunes

- **Comprimir varias veces el mismo PDF.** Cada pasada pierde algo de calidad y, a partir de la segunda, casi no reduce el peso. Mejor vuelve al original y elige un nivel más fuerte.
- **Convertir el PDF en imágenes para achicarlo.** Pasar cada página a JPG y volver a armar el PDF hace que el texto deje de ser texto: ya no se puede buscar ni copiar, y muchas veces el archivo termina pesando más.
- **Usar una contraseña para protegerlo antes de comprimirlo.** Primero comprime, después protege. Si el PDF ya tiene contraseña de apertura, quítala con [Quitar contraseña de PDF](tool:unlock-pdf), comprímelo y vuelve a protegerlo con [Proteger PDF](tool:protect-pdf).

## Resumen

- Lo que pesa en un PDF son las fotos; el texto casi no ocupa lugar.
- [Comprimir PDF](tool:compress-pdf) recomprime las fotos y deja el texto intacto, en tu navegador.
- Empieza por el nivel recomendado; usa el fuerte si te piden un peso muy bajo.
- Si no alcanza, quita páginas, divide el PDF o mejora el escaneo.
- Si el PDF lo vas a editar después, la guía [Cómo pasar un PDF a Word editable](guide:pdf-to-word) explica qué se conserva al convertirlo.
`;

export default body;
