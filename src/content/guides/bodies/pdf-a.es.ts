const body = `
Si alguna vez un sistema de trámites, un juzgado o la biblioteca de una universidad rechazó tu PDF con un mensaje como «el archivo debe estar en formato PDF/A», esta guía es para ti. Explica qué es PDF/A, por qué lo piden, qué versión elegir y cómo convertir un PDF común con [PDF a PDF/A](tool:pdf-to-pdfa).

## Qué es PDF/A

PDF/A es una versión del PDF pensada para **archivar documentos a largo plazo**. Es una norma internacional (ISO 19005) que define un subconjunto del PDF con una garantía: el documento tiene que verse exactamente igual dentro de muchos años, en cualquier programa, sin depender de nada externo.

Para lograrlo, un PDF/A:

- **Incrusta todas las fuentes** dentro del archivo, para que el texto se vea igual aunque la computadora que lo abra no tenga esas tipografías.
- **Fija los colores** con un perfil de color, para que no cambien según la pantalla o la impresora.
- **Guarda los metadatos** (título, autor, fechas) dentro del archivo, en un formato estándar.
- **No admite** lo que podría dejar de funcionar o cambiar con el tiempo: contraseñas y cifrado, contenido que se carga de internet, JavaScript, audio y video.

Un PDF común puede cumplir casi todo eso por casualidad, pero un PDF/A lo garantiza y lo declara dentro del archivo.

## Quién lo pide y por qué

Lo piden las instituciones que tienen que **guardar documentos durante años** y no pueden arriesgarse a que un archivo deje de abrirse o se vea distinto:

- Organismos públicos y sistemas de trámites en línea.
- Poderes judiciales y sistemas de presentación de escritos.
- Universidades, para el depósito de tesis en sus repositorios.
- Archivos, bibliotecas y algunos sistemas de facturación electrónica.

Cada institución indica qué versión acepta. Si el trámite dice solo «PDF/A», la más segura suele ser PDF/A-2b.

## Las versiones: 1b, 2b, 3b (y qué significa la letra)

El número indica la versión de la norma:

| Versión | Basada en | Para qué |
| --- | --- | --- |
| PDF/A-1 | PDF 1.4 | La primera. Para sistemas que solo aceptan esta versión. No admite transparencias: se aplanan. |
| PDF/A-2 | PDF 1.7 | La más aceptada hoy. Admite transparencias, capas y compresión moderna. |
| PDF/A-3 | PDF 1.7 | Como la 2, pero permite adjuntar cualquier archivo dentro del PDF (se usa, por ejemplo, en facturas electrónicas que llevan los datos en XML). |

La letra indica el nivel de cumplimiento:

- **b** (básico): garantiza que el documento **se ve** igual. Es el nivel que piden casi todos los trámites.
- **a** (accesible): además exige que el documento tenga estructura etiquetada (títulos, párrafos, orden de lectura), para que lo puedan leer los lectores de pantalla. Requiere que el documento original se haya creado con esa estructura.
- **u** (Unicode): además del nivel b, garantiza que el texto se puede extraer y buscar correctamente.

Nuestra herramienta genera PDF/A-1b, 2b y 3b, que cubren lo que piden la gran mayoría de los trámites.

## Cómo convertir un PDF a PDF/A

1. Abre [PDF a PDF/A](tool:pdf-to-pdfa) y elige uno o varios PDF (hasta 5 a la vez, de hasta 15 MB cada uno).
2. Elige la **versión de PDF/A**: si el trámite no indica otra, **PDF/A-2b**.
3. Pulsa **Convertir a PDF/A** y descarga el resultado.

![La herramienta PDF a PDF/A con un documento elegido y la versión 2b marcada](shot:pdfa-opciones "PDF/A-2b viene elegida por defecto: es la más aceptada en trámites.")

La conversión se hace en **nuestro servidor**, no en tu navegador, porque necesita convertir fuentes y colores con LibreOffice. El archivo viaja por una conexión cifrada y se procesa en memoria, sin guardarse. En nuestras pruebas, los archivos que genera pasan la validación de veraPDF, el validador de referencia de PDF/A.

## Qué puede cambiar al convertir

El contenido y las páginas se mantienen, pero hay detalles que el formato no admite:

- **Contraseña**: un PDF/A no puede estar cifrado. Si tu PDF tiene contraseña, quítala primero con [Quitar contraseña de PDF](tool:unlock-pdf).
- **Enlaces y formularios interactivos**: pueden perderse. Si el PDF es un formulario, complétalo primero con [Rellenar formulario PDF](tool:fill-pdf-form) y guárdalo aplanado.
- **Transparencias en PDF/A-1b**: se aplanan. En la práctica casi no se nota, pero si el documento tiene efectos de transparencia, PDF/A-2b los conserva.
- **Firmas digitales con certificado**: convertir el PDF modifica el archivo, y una firma digital previa deja de ser válida. Si tienes que firmar digitalmente, convierte primero a PDF/A y firma después.

## Cómo saber si un PDF ya es PDF/A

Al abrir un PDF/A con Adobe Acrobat Reader, aparece una barra arriba que avisa que el archivo dice cumplir con el estándar PDF/A y que se abrió en modo de solo lectura. Otros lectores lo muestran en las propiedades del documento.

Ojo: esa barra indica que el archivo **declara** ser PDF/A, no que lo sea de verdad. Para comprobarlo, la herramienta de referencia es veraPDF, un validador gratuito y de código abierto que analiza el archivo contra la norma y lista cualquier incumplimiento.

## Consejos para un trámite sin rechazos

- **Comprime antes, no después**: si el trámite tiene un límite de peso, reduce el PDF con [Comprimir PDF](tool:compress-pdf) y luego conviértelo a PDF/A. Si comprimes un PDF/A con una herramienta que no lo tiene en cuenta, puede dejar de cumplir la norma.
- **Une antes de convertir**: si tienes que presentar varios documentos en uno, júntalos con [Unir PDF](tool:merge-pdf) y convierte el resultado.
- **Escaneos**: si el documento es escaneado, hazle antes el [OCR](tool:ocr-pdf) para que el texto se pueda buscar, y luego conviértelo.
- **Firma manuscrita**: si tienes que firmar a mano, pon la firma con [Firmar PDF](tool:sign-pdf) antes de convertir.

## Resumen

- PDF/A es un PDF para archivar: incrusta fuentes, fija colores y prohíbe lo que puede dejar de funcionar.
- Lo piden organismos públicos, juzgados, universidades y archivos.
- Si no te indican versión, usa **PDF/A-2b**; **1b** solo para sistemas antiguos, **3b** si necesitas adjuntos.
- [PDF a PDF/A](tool:pdf-to-pdfa) convierte en nuestro servidor, sin guardar el archivo.
- Quita la contraseña, completa los formularios, comprime y une **antes** de convertir.
`;

export default body;
