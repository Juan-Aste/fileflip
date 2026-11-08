import type { ConversionContentMap } from "./types";

// Hechos que los textos deben respetar (revisar si cambia el motor):
// - Documentos de oficina → PDF: LibreOffice (Gotenberg) en nuestro servidor;
//   plan gratis: hasta 15 MB por archivo y 5 archivos por vez.
// - PDF → Word: se extrae el texto con pdf.js y se rearma en párrafos y títulos,
//   una página de Word por página del PDF, hasta 300 páginas; sin imágenes ni
//   tablas; un PDF escaneado da error (hay que pasarlo antes por OCR PDF).

export const es: ConversionContentMap = {
  "pdf>docx": {
    when: [
      "Pasar un PDF a Word sirve cuando necesitas reutilizar o corregir el texto: actualizar un currículum del que solo tienes el PDF, citar párrafos de un informe, traducir un documento o rearmar un contrato con cambios. Copiar y pegar desde el visor de PDF suele cortar las líneas en cualquier lado; aquí el texto llega ya unido en párrafos.",
      "Si solo quieres cambiar una palabra, agregar una firma o tapar un dato, no hace falta pasar por Word: es más rápido usar Editar PDF y mantener el diseño original intacto.",
    ],
    differences: [
      "Un PDF está pensado para verse igual en cualquier pantalla e impresora: cada letra tiene una posición fija en la página, y el archivo no sabe qué es un párrafo, una tabla o una lista. Un documento de Word, en cambio, guarda el texto como un flujo que se reacomoda cuando escribes.",
      "Por eso convertir de PDF a Word no es «abrir» el PDF, sino reconstruir el documento: hay que adivinar qué renglones forman un párrafo y cuáles son títulos. Esa reconstrucción funciona muy bien con documentos de texto corrido y peor con diseños complejos.",
    ],
    kept: [
      "Todo el texto seleccionable, en el orden de lectura.",
      "Los párrafos unidos (sin cortes a mitad de frase) y los títulos marcados como títulos de Word.",
      "El tamaño de letra aproximado y el tamaño de página del PDF.",
      "Un salto de página por cada página del PDF, para que sea fácil comparar con el original.",
    ],
    lost: [
      "Las imágenes, los logos y los gráficos no se incluyen.",
      "Las tablas y las columnas se convierten en párrafos sueltos: el texto está, pero hay que volver a darle forma.",
      "La tipografía exacta, los colores y los encabezados o pies de página repetidos pueden cambiar.",
    ],
    limits: [
      "Solo funciona con PDF que tienen texto. Si el PDF es una foto o un escaneo, no hay letras que extraer y la conversión avisa del error: pásalo primero por «OCR de PDF escaneado», que reconoce el texto, y después conviértelo a Word.",
      "Se convierten hasta 300 páginas por archivo. En el plan gratis, cada archivo puede pesar hasta 15 MB. Los PDF protegidos con contraseña de apertura hay que desbloquearlos antes (con «Quitar contraseña de un PDF», si conoces la contraseña).",
    ],
    steps: [
      "Elige el PDF (o arrástralo). Si quieres probar primero, abre el PDF y comprueba que puedes seleccionar el texto con el mouse: si no se puede, es un escaneo.",
      "Deja Word como formato de salida y haz clic en Convertir.",
      "Descarga el .docx y ábrelo en Word, LibreOffice o Google Docs.",
      "Revisa las tablas y las listas, que suelen necesitar un retoque, y vuelve a insertar las imágenes que necesites.",
    ],
    faq: [
      {
        q: "¿Por qué mi PDF no se convierte a Word?",
        a: "Casi siempre es porque el PDF es un escaneo o una foto: tiene una imagen de la página, no letras. Pásalo por «OCR de PDF escaneado» y convierte el resultado. También falla si el PDF está protegido con contraseña de apertura.",
      },
      {
        q: "¿El Word queda igual que el PDF?",
        a: "El texto sí; el diseño no del todo. Párrafos y títulos quedan bien, pero las tablas, columnas e imágenes no se reconstruyen. Para documentos de texto corrido (cartas, informes, contratos) el resultado se puede editar enseguida.",
      },
      {
        q: "¿Puedo editar un PDF sin pasarlo a Word?",
        a: "Sí. Para cambios chicos (agregar texto, una firma, tapar un dato o completar un formulario) usa Editar PDF: el diseño original queda intacto y no hace falta convertir.",
      },
      {
        q: "¿Se guardan mis documentos?",
        a: "La conversión de PDF a Word se hace en nuestro servidor porque necesita más procesamiento. El archivo viaja cifrado, no se usa para nada más y se borra en menos de 1 hora.",
      },
    ],
  },

  "docx>pdf": {
    when: [
      "Convertir un Word a PDF es lo habitual antes de enviar un currículum, entregar un trabajo práctico, presentar un trámite o mandar un presupuesto: el PDF se ve igual en cualquier computadora o celular, aunque la otra persona no tenga Word o tenga otra versión, y nadie lo modifica sin querer.",
      "También conviene cuando un portal solo acepta PDF o cuando quieres imprimir en otro lugar sin que se corran los márgenes.",
    ],
    differences: [
      "Un .docx es un documento editable: el texto se reacomoda según las fuentes instaladas, el tamaño de página y la versión del programa. Por eso un mismo Word puede verse distinto en dos computadoras.",
      "El PDF fija cada página tal como se ve en el momento de convertir, con sus fuentes incluidas. A cambio, deja de ser cómodo de editar: si después hay que cambiar algo, lo mejor es corregir el Word y volver a convertir.",
    ],
    kept: [
      "El texto con sus estilos, tablas, imágenes, listas, encabezados y pies de página.",
      "Los números de página y los saltos de página del documento.",
      "Los enlaces, que siguen funcionando en el PDF.",
      "El tamaño de papel y los márgenes configurados en el Word.",
    ],
    lost: [
      "Los comentarios y el control de cambios no se imprimen como en la vista de revisión de Word: acepta o rechaza los cambios antes de convertir para estar seguro del resultado.",
      "Si el documento usa una fuente poco común que no está en el servidor, se reemplaza por una de medidas parecidas y algún renglón puede quedar en otro lugar.",
      "Las macros y los campos que se actualizan solos no se ejecutan: el PDF muestra el último valor guardado.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis puedes convertir hasta 5 archivos a la vez, de hasta 15 MB cada uno.",
      "Los documentos protegidos con contraseña de apertura no se pueden convertir: quítale la contraseña en Word antes de subirlo.",
    ],
    steps: [
      "Guarda los últimos cambios en Word y, si usaste control de cambios, acéptalos o recházalos.",
      "Elige el archivo .docx (o varios) y deja PDF como formato de salida.",
      "Haz clic en Convertir y descarga el PDF.",
      "Ábrelo y revisa los saltos de página antes de enviarlo, sobre todo si usaste fuentes especiales.",
    ],
    faq: [
      {
        q: "¿Por qué el PDF tiene una fuente distinta a la de mi Word?",
        a: "Porque esa fuente no está instalada en el servidor y se reemplazó por una parecida. Las fuentes comunes (como Arial, Times New Roman o Calibri) tienen equivalentes de las mismas medidas. Si necesitas una fuente exacta, otra opción es exportar a PDF desde tu propio Word.",
      },
      {
        q: "¿Se puede volver a editar el PDF?",
        a: "Para cambios chicos, sí, con Editar PDF. Para cambios grandes conviene editar el Word original y volver a convertir; pasar el PDF a Word de nuevo pierde imágenes y tablas.",
      },
      {
        q: "¿Puedo hacer que el PDF pese menos?",
        a: "Sí. Si el documento tiene muchas fotos, pasa el PDF por Comprimir PDF: reduce las imágenes y suele bajar bastante el tamaño sin que el texto pierda calidad.",
      },
      {
        q: "¿Qué pasa con mi documento después de convertirlo?",
        a: "Se convierte en nuestro servidor por conexión cifrada, no se usa para nada más y se borra en menos de 1 hora.",
      },
    ],
  },

  "doc>pdf": {
    when: [
      "Los .doc son documentos de Word 97 a 2003. Siguen apareciendo en archivos viejos de oficinas, escuelas y estudios: modelos de contrato, notas, formularios que circulan desde hace años. Pasarlos a PDF es la forma más simple de compartirlos o archivarlos sin depender de que el otro tenga un programa que los abra bien.",
      "Si además vas a seguir editándolo, conviene abrirlo en Word o LibreOffice y guardarlo como .docx; para enviarlo o imprimirlo, alcanza con el PDF.",
    ],
    differences: [
      "El .doc es un formato binario antiguo, anterior al .docx (que es XML comprimido). Los programas actuales lo abren, pero cada uno interpreta algunos detalles a su manera, y por eso un .doc viejo puede verse un poco distinto en cada computadora.",
      "Al convertirlo a PDF, ese aspecto queda fijo: lo que ves en el PDF es lo que verá cualquiera que lo abra, en cualquier dispositivo.",
    ],
    kept: [
      "El texto, los estilos, las tablas, las imágenes y los encabezados y pies.",
      "La numeración de páginas y el tamaño de papel del documento.",
      "Las tildes y los caracteres especiales.",
    ],
    lost: [
      "Elementos de la época como WordArt, objetos incrustados de otros programas o dibujos hechos con las herramientas viejas pueden verse distintos o como una imagen fija.",
      "Las fuentes que no están en el servidor se reemplazan por otras de medidas parecidas.",
      "Las macros no se ejecutan.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice, que lee muy bien el formato .doc. En el plan gratis: hasta 5 archivos a la vez, de hasta 15 MB cada uno.",
      "Los .doc protegidos con contraseña no se pueden convertir.",
    ],
    steps: [
      "Elige el archivo .doc (o varios a la vez, por ejemplo una carpeta de modelos viejos).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga los PDF (con varios archivos, puedes bajarlos todos juntos en un ZIP).",
    ],
    faq: [
      {
        q: "¿Es lo mismo .doc que .docx?",
        a: "No. El .doc es el formato de Word hasta 2003 y el .docx el de Word 2007 en adelante. Los dos se convierten a PDF igual de bien; el .docx suele dar un resultado más fiel en diseños complicados.",
      },
      {
        q: "Mi .doc viejo se ve raro en el PDF, ¿qué hago?",
        a: "Si tiene WordArt u objetos incrustados, ábrelo en Word o LibreOffice, guárdalo como .docx y convierte ese archivo. Revisa también que no use fuentes muy raras.",
      },
      {
        q: "¿Se guardan mis archivos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora. No se usan para nada más.",
      },
    ],
  },

  "xlsx>pdf": {
    when: [
      "Pasar un Excel a PDF sirve para mandar una planilla que la otra persona solo tiene que leer: un presupuesto, una lista de precios, un horario, un informe de gastos o una liquidación. El PDF no se puede modificar sin querer, se abre en cualquier celular y se imprime igual en todas partes.",
      "Si la otra persona tiene que trabajar con los datos (filtrar, sumar, copiar), mándale el Excel o un CSV: en el PDF los números se ven, pero ya no son una tabla calculable.",
    ],
    differences: [
      "Una planilla de Excel no tiene páginas: es una grilla que puede ser mucho más ancha y larga que una hoja de papel, con fórmulas que se recalculan. El PDF, en cambio, se organiza en páginas fijas.",
      "Por eso, al convertir, la planilla se reparte en páginas según la configuración de impresión guardada en el archivo: orientación, área de impresión, márgenes y la opción de ajustar a una página de ancho. Lo que ves en la vista previa de impresión de Excel es lo más parecido al resultado.",
    ],
    kept: [
      "Los valores tal como se ven en las celdas (el resultado de las fórmulas, no la fórmula).",
      "Los formatos: bordes, colores de relleno, negritas, formatos de número y de fecha.",
      "Los gráficos y las imágenes insertadas.",
      "Todas las hojas con contenido, una después de otra.",
    ],
    lost: [
      "Las fórmulas, los filtros y las tablas dinámicas dejan de funcionar: queda la foto de los valores.",
      "Si la planilla es más ancha que la página y no está configurada para ajustarse, las columnas de la derecha pasan a páginas aparte.",
      "Las hojas ocultas, los comentarios y las macros no se incluyen.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis, hasta 5 archivos a la vez, de hasta 15 MB cada uno. Planillas enormes (decenas de miles de filas) pueden tardar o generar cientos de páginas.",
      "No se pueden convertir archivos protegidos con contraseña de apertura.",
    ],
    steps: [
      "En Excel, revisa la vista previa de impresión: elige horizontal si la tabla es ancha y «Ajustar todas las columnas en una página» para que no se corte. Guarda el archivo.",
      "Elige el .xlsx y deja PDF como formato de salida.",
      "Haz clic en Convertir y descarga el PDF.",
      "Si alguna columna quedó en otra página, ajusta la configuración de impresión en Excel y vuelve a convertir.",
    ],
    faq: [
      {
        q: "¿Por qué mi tabla quedó cortada en varias páginas?",
        a: "Porque la planilla es más ancha que la hoja. En Excel, en Diseño de página, elige orientación horizontal y ajusta a 1 página de ancho, guarda y vuelve a convertir.",
      },
      {
        q: "¿Puedo convertir una sola hoja?",
        a: "Se convierten todas las hojas con contenido. Si quieres solo una, guarda una copia del archivo con esa hoja o elige después las páginas que te interesan con Dividir PDF.",
      },
      {
        q: "¿Y si necesito el camino inverso, de PDF a Excel?",
        a: "Usa PDF a Excel: detecta las tablas de un PDF con texto y las pasa a celdas. Funciona mejor con tablas simples y alineadas.",
      },
      {
        q: "¿Se guardan mis planillas?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "xls>pdf": {
    when: [
      "El .xls es el formato de Excel hasta la versión 2003. Muchas oficinas todavía tienen planillas históricas, sistemas contables viejos que exportan .xls o modelos que pasan de mano en mano desde hace años. Convertirlas a PDF permite archivarlas o enviarlas sin preocuparse por la compatibilidad.",
      "Si vas a seguir actualizando los datos, guárdala como .xlsx en Excel o LibreOffice; para leer, imprimir o adjuntar a un trámite, alcanza con el PDF.",
    ],
    differences: [
      "El .xls es un formato binario con límites de su época: hasta 65.536 filas y 256 columnas por hoja. El .xlsx moderno es más grande en capacidad y más fácil de leer para los programas actuales.",
      "El PDF no tiene fórmulas ni celdas: es la planilla impresa en páginas, con la configuración de impresión que tenga guardada el archivo.",
    ],
    kept: [
      "Los valores visibles de las celdas, con sus formatos de número, fecha y moneda.",
      "Bordes, colores, fuentes y gráficos.",
      "Todas las hojas con contenido.",
    ],
    lost: [
      "Las fórmulas y las macros (muy comunes en planillas viejas) no se ejecutan: queda el último valor guardado.",
      "Las columnas que no entran en el ancho de la página pasan a páginas aparte si la planilla no está configurada para ajustarse.",
      "Las hojas ocultas y los comentarios no se incluyen.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis: hasta 5 archivos a la vez y 15 MB por archivo.",
      "No se pueden convertir archivos con contraseña de apertura.",
    ],
    steps: [
      "Si puedes, abre la planilla y revisa la configuración de impresión (orientación y ajuste a página). Si no tienes Excel, conviértela directamente y mira el resultado.",
      "Elige el .xls (o varios) y deja PDF como formato de salida.",
      "Haz clic en Convertir y descarga el PDF.",
    ],
    faq: [
      {
        q: "¿Los valores calculados salen bien si la planilla tiene macros?",
        a: "Sale el último valor que quedó guardado en el archivo. Las macros no se ejecutan durante la conversión, así que si la planilla necesita recalcularse con una macro, hazlo en Excel antes de convertir.",
      },
      {
        q: "¿Puedo pasar el .xls a un formato moderno?",
        a: "Sí: ábrelo en Excel o LibreOffice Calc y usa Guardar como .xlsx. Si solo necesitas los datos, también puedes exportarlos a CSV con Excel a CSV.",
      },
      {
        q: "¿Se guardan mis archivos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "pptx>pdf": {
    when: [
      "Convertir un PowerPoint a PDF es la forma más segura de compartir una presentación: para mandar las diapositivas después de una clase o una reunión, subirlas a un aula virtual o presentarlas desde una computadora ajena sin sorpresas de fuentes o versiones.",
      "El PDF pesa menos que muchas presentaciones, se abre en cualquier celular y no permite que alguien cambie el contenido sin querer.",
    ],
    differences: [
      "Una presentación .pptx tiene diapositivas con animaciones, transiciones, videos y notas del orador, y se muestra en modo presentación. El PDF es un documento estático: una página por diapositiva, tal como se ve al final de cada una.",
      "Para presentar en vivo con animaciones sigue usando el PowerPoint; para repartir o archivar, el PDF es más práctico.",
    ],
    kept: [
      "Una página por diapositiva, con su diseño, fondos, imágenes, gráficos y tablas.",
      "El texto, que sigue siendo seleccionable y se puede buscar.",
      "Los enlaces a sitios web.",
    ],
    lost: [
      "Animaciones y transiciones: cada diapositiva se ve en su estado final.",
      "Videos y audios incrustados: queda la imagen de portada, no se reproducen.",
      "Las notas del orador no se incluyen.",
      "Fuentes poco comunes que no están en el servidor se reemplazan por otras parecidas, y algún cuadro de texto puede quedar un poco distinto.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis, hasta 15 MB por archivo y 5 archivos a la vez: si tu presentación pesa más por los videos, quítalos o comprímelos antes.",
      "No se pueden convertir presentaciones con contraseña de apertura.",
    ],
    steps: [
      "Si la presentación tiene videos pesados, quítalos de una copia: en el PDF no se van a reproducir.",
      "Elige el .pptx y deja PDF como formato de salida.",
      "Haz clic en Convertir y descarga el PDF.",
      "Revisa las diapositivas con fuentes especiales; si algo se movió, prueba con una fuente común.",
    ],
    faq: [
      {
        q: "¿Se incluyen las notas del orador?",
        a: "No: el PDF tiene solo las diapositivas, una por página. Si necesitas repartir las notas, en PowerPoint puedes imprimir la vista de Página de notas a PDF.",
      },
      {
        q: "¿Las animaciones se pierden?",
        a: "Sí. Cada diapositiva queda como se ve al final, con todos los elementos visibles. Si una animación ocultaba algo, también va a aparecer.",
      },
      {
        q: "Mi PowerPoint pesa más de 15 MB, ¿qué hago?",
        a: "Casi siempre es por los videos o por fotos muy grandes. Quita los videos de una copia o, en PowerPoint, usa Comprimir imágenes; después conviértelo. Si el PDF también queda pesado, pásalo por Comprimir PDF.",
      },
      {
        q: "¿Se guardan mis presentaciones?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "ppt>pdf": {
    when: [
      "El .ppt es el formato de PowerPoint hasta 2003. Aparece en presentaciones de cursos y capacitaciones viejas que siguen circulando. Pasarlas a PDF permite verlas en cualquier dispositivo, incluso en celulares que no abren .ppt, y archivarlas sin depender de un programa.",
    ],
    differences: [
      "El .ppt es un formato binario antiguo; los programas actuales lo abren, pero a veces con pequeñas diferencias en diseños, fuentes o efectos. El .pptx lo reemplazó en 2007.",
      "El PDF deja cada diapositiva fija como una página: no hay animaciones ni modo presentación, pero se ve igual en todas partes.",
    ],
    kept: [
      "Una página por diapositiva, con textos, imágenes, fondos y tablas.",
      "El texto seleccionable.",
    ],
    lost: [
      "Animaciones, transiciones, sonidos y videos.",
      "Las notas del orador.",
      "Efectos y WordArt de la época pueden verse algo distintos; las fuentes que no están en el servidor se reemplazan por otras parecidas.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis, hasta 15 MB por archivo y 5 archivos a la vez.",
      "No se pueden convertir archivos con contraseña de apertura.",
    ],
    steps: [
      "Elige el archivo .ppt (o varios).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF y revisa que las diapositivas con efectos se vean bien.",
    ],
    faq: [
      {
        q: "¿Puedo pasar un .ppt a .pptx?",
        a: "Sí, abriéndolo en PowerPoint o en LibreOffice Impress y guardándolo como .pptx. Para compartirlo, el PDF suele ser suficiente.",
      },
      {
        q: "¿Por qué una diapositiva se ve distinta en el PDF?",
        a: "Los .ppt viejos a veces usan efectos o fuentes que hoy se dibujan de otra manera. Si es importante, ábrelo en PowerPoint, cambia ese elemento y convierte de nuevo.",
      },
      {
        q: "¿Se guardan mis archivos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "odt>pdf": {
    when: [
      "El .odt es el formato de texto de LibreOffice, OpenOffice y de muchos equipos de la administración pública y la educación. Convertirlo a PDF es útil para enviar el documento a alguien que usa Word o a un portal que solo acepta PDF.",
    ],
    differences: [
      "ODT (OpenDocument) es un formato abierto y estándar para documentos editables, como el .docx de Word. Word puede abrirlo, pero no siempre lo muestra igual que LibreOffice. El PDF, en cambio, se ve igual en todos lados.",
      "Como nuestra conversión usa justamente LibreOffice, el ODT es el formato que mejor se convierte: el resultado es igual a exportar a PDF desde LibreOffice Writer.",
    ],
    kept: [
      "Texto, estilos, tablas, imágenes, notas al pie, encabezados y pies de página.",
      "Índices y numeración de páginas.",
      "Los enlaces.",
    ],
    lost: [
      "Los comentarios y los cambios registrados no se imprimen como en la vista de revisión: acéptalos o recházalos antes.",
      "Las fuentes que no están en el servidor se reemplazan por otras parecidas.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor. En el plan gratis, hasta 15 MB por archivo y 5 archivos a la vez.",
      "No se pueden convertir documentos con contraseña.",
    ],
    steps: [
      "Elige el archivo .odt (o varios).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF.",
    ],
    faq: [
      {
        q: "¿Qué diferencia hay con exportar a PDF desde LibreOffice?",
        a: "Ninguna en el resultado: usamos el mismo motor. Esta página es útil cuando no tienes LibreOffice a mano, por ejemplo en un celular o en una computadora ajena.",
      },
      {
        q: "¿Puedo convertir hojas de cálculo o presentaciones de LibreOffice?",
        a: "Sí, también se convierten a PDF los .ods (hojas de cálculo) y los .odp (presentaciones).",
      },
      {
        q: "¿Se guardan mis documentos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "rtf>pdf": {
    when: [
      "El RTF (formato de texto enriquecido) aparece en documentos generados por sistemas de gestión, programas médicos o contables, y en archivos guardados con WordPad o TextEdit. Pasarlo a PDF es la forma de enviarlo o archivarlo con un aspecto fijo.",
    ],
    differences: [
      "RTF es un formato de texto con formato básico (negritas, cursivas, fuentes, tablas simples e imágenes) que casi cualquier procesador de texto puede abrir. Es muy compatible, pero cada programa lo interpreta un poco distinto.",
      "El PDF congela ese formato en páginas, con las fuentes incluidas.",
    ],
    kept: [
      "Texto con negritas, cursivas, subrayados, tamaños y colores.",
      "Tablas simples, imágenes y alineación de párrafos.",
      "Márgenes y tamaño de página si el archivo los define.",
    ],
    lost: [
      "Elementos que algunos programas agregan al RTF de forma propia (campos especiales, objetos incrustados) pueden no verse.",
      "Las fuentes que no están en el servidor se reemplazan por otras parecidas.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis, hasta 15 MB por archivo y 5 archivos a la vez.",
    ],
    steps: [
      "Elige el archivo .rtf (o varios).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF.",
    ],
    faq: [
      {
        q: "¿El RTF se puede abrir en Word?",
        a: "Sí, Word, LibreOffice y Google Docs lo abren. Pasarlo a PDF sirve cuando quieres que se vea siempre igual o cuando un sistema solo acepta PDF.",
      },
      {
        q: "Un sistema me genera muchos RTF, ¿puedo convertirlos todos juntos?",
        a: "Sí, elige varios a la vez (hasta 5 por tanda en el plan gratis) y descárgalos juntos en un ZIP.",
      },
      {
        q: "¿Se guardan mis archivos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  "txt>pdf": {
    when: [
      "Pasar un TXT a PDF sirve para entregar notas, registros, listados o código como un documento listo para imprimir o adjuntar, con páginas numeradas por el visor y un aspecto que no depende del programa con el que se abra.",
    ],
    differences: [
      "Un .txt tiene solo caracteres y saltos de línea: no guarda fuentes, tamaños ni márgenes, y cada programa lo muestra a su manera. El PDF lo pone en páginas con una tipografía y márgenes fijos.",
    ],
    kept: [
      "Todo el texto, con sus saltos de línea y líneas en blanco.",
      "Los caracteres con tilde y los de otros alfabetos si el archivo está guardado en UTF-8.",
    ],
    lost: [
      "No hay formato que conservar: el PDF usa una tipografía estándar y las líneas muy largas se cortan para entrar en el ancho de la página.",
      "Las tabulaciones pueden alinearse distinto que en tu editor.",
    ],
    limits: [
      "La conversión se hace en nuestro servidor con LibreOffice. En el plan gratis, hasta 15 MB por archivo (muchísimo texto) y 5 archivos a la vez.",
      "Si ves caracteres raros en lugar de las tildes, el archivo no está en UTF-8: ábrelo en tu editor, guárdalo con codificación UTF-8 y vuelve a convertir.",
    ],
    steps: [
      "Elige el archivo .txt (o varios).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF y comprueba que las tildes se vean bien.",
    ],
    faq: [
      {
        q: "¿Puedo elegir la fuente o el tamaño de letra?",
        a: "No en esta conversión. Si quieres darle formato (títulos, negritas, listas), escribe el texto en Markdown y usa Markdown a PDF, o pégalo en un procesador de texto.",
      },
      {
        q: "¿Por qué aparecen símbolos raros en lugar de las tildes?",
        a: "Porque el archivo está guardado en una codificación vieja. Ábrelo con el Bloc de notas u otro editor, guárdalo como UTF-8 y vuelve a convertir.",
      },
      {
        q: "¿Se guardan mis archivos?",
        a: "Se convierten en nuestro servidor por conexión cifrada y se borran en menos de 1 hora.",
      },
    ],
  },

  // Fotos e imágenes ↔ PDF (19.2b2). Hechos: todo en el navegador; HEIC con
  // libheif (WASM, ~2 MB, se baja la primera vez), imagen principal, rotación
  // aplicada; al convertir se decodifica y se vuelve a codificar, así que los
  // metadatos (fecha, GPS, cámara) no pasan al archivo nuevo; transparencia →
  // fondo blanco en JPG; calidad ajustable (82 por defecto) y tamaño; imagen →
  // PDF: una página del tamaño de la imagen, JPG y PNG sin recomprimir; PDF →
  // imagen: 72/150/300 ppp (150 por defecto), una imagen por página, ZIP si hay
  // varias; PDF con contraseña: hay que quitarla antes. Límite por archivo según
  // la memoria del dispositivo (100 MB en la mayoría; menos en celulares de
  // poca memoria).
  "heic>jpg": {
    when: [
      "El iPhone guarda las fotos en HEIC desde hace años. En el propio iPhone y en una Mac se ven sin problemas, pero muchos formularios web, sistemas de trámites, programas viejos de Windows y algunas apps de Android no las aceptan. Pasarlas a JPG es la forma más segura de que cualquier persona o sitio pueda abrirlas.",
      "Si solo vas a guardar las fotos o verlas en dispositivos de Apple, no hace falta convertirlas: el HEIC ocupa menos espacio con la misma calidad.",
    ],
    differences: [
      "HEIC usa un códec de video moderno (HEVC) para comprimir fotos: con la misma calidad visual, ocupa más o menos la mitad que un JPG. El JPG es de 1992 y es mucho menos eficiente, pero lo abre absolutamente todo: navegadores, celulares, impresoras, redes sociales y sistemas de gestión.",
      "Un HEIC también puede guardar cosas que el JPG no tiene, como varias imágenes en un mismo archivo o profundidad para el modo retrato.",
    ],
    kept: [
      "La foto principal con su resolución completa.",
      "La orientación: una foto vertical sigue vertical.",
      "Los colores, con una pérdida de calidad que no se nota con la calidad por defecto.",
    ],
    lost: [
      "Los metadatos (fecha, ubicación GPS, modelo de cámara) no pasan al JPG, lo que además protege tu privacidad si vas a compartir la foto.",
      "Las fotos en vivo (Live Photos) quedan como foto fija; los datos de profundidad del modo retrato no se guardan.",
      "El JPG pesa más que el HEIC original, por lo general entre 1,5 y 2 veces.",
    ],
    limits: [
      "La conversión se hace en tu navegador: las fotos no se suben a ningún servidor. La primera vez se descarga el decodificador de HEIC (unos 2 MB) y después queda en la memoria del navegador.",
      "Puedes convertir muchas fotos a la vez. En celulares con poca memoria, las fotos muy grandes pueden tardar más; si una falla, conviértela sola.",
    ],
    steps: [
      "Pasa las fotos del iPhone a la computadora (o ábrelas desde el mismo celular) y selecciónalas todas juntas.",
      "Deja JPG como formato de salida. Si quieres que pesen menos, baja la calidad a 70–80 o reduce el tamaño.",
      "Haz clic en Convertir.",
      "Descarga las fotos una por una o todas juntas en un ZIP.",
    ],
    faq: [
      {
        q: "¿Se pierde calidad al pasar de HEIC a JPG?",
        a: "Un poco, porque el JPG también comprime con pérdida, pero con la calidad por defecto no se nota a simple vista. Si vas a imprimir la foto o editarla mucho, sube la calidad a 90 o más, o conviértela a PNG.",
      },
      {
        q: "¿Cómo hago para que el iPhone saque las fotos directamente en JPG?",
        a: "En Ajustes → Cámara → Formatos, elige «Más compatible». Las fotos nuevas se guardarán en JPG y ocuparán más espacio; las que ya tienes en HEIC puedes convertirlas acá.",
      },
      {
        q: "¿Se conserva la ubicación de la foto?",
        a: "No: el JPG nuevo no lleva la fecha, el GPS ni los datos de la cámara. Es útil para compartir fotos sin revelar dónde se sacaron.",
      },
      {
        q: "¿Mis fotos se suben a internet?",
        a: "No. El HEIC se decodifica y se convierte en tu propio navegador; ningún servidor recibe las fotos.",
      },
    ],
  },

  "heic>png": {
    when: [
      "Pasar HEIC a PNG conviene cuando vas a editar la foto: recortarla varias veces, ponerle textos, usarla en un diseño o en una presentación. El PNG no pierde calidad cada vez que se guarda, así que es mejor punto de partida que un JPG para trabajar la imagen.",
      "Para mandar fotos por mensaje o subirlas a un formulario, en cambio, el JPG es mejor opción: pesa mucho menos.",
    ],
    differences: [
      "HEIC es un formato con compresión muy eficiente, pensado para guardar fotos ocupando poco. PNG es un formato sin pérdida: guarda cada píxel exactamente, a cambio de archivos mucho más grandes, sobre todo con fotos.",
      "PNG también admite transparencia, algo útil si después vas a recortar a la persona o al objeto de la foto.",
    ],
    kept: [
      "La foto principal en su resolución completa, píxel por píxel tal como se decodifica del HEIC.",
      "La orientación de la foto.",
      "La calidad: el PNG no agrega compresión con pérdida.",
    ],
    lost: [
      "El archivo crece mucho: una foto de 2 MB en HEIC puede pasar los 15 MB en PNG.",
      "Los metadatos (fecha, ubicación, cámara) no se copian.",
      "Las Live Photos quedan como foto fija.",
    ],
    limits: [
      "Todo se hace en tu navegador, sin subir las fotos. La primera vez se descarga el decodificador de HEIC (unos 2 MB).",
      "Como los PNG de fotos son pesados, en celulares con poca memoria conviene convertir de a pocas fotos.",
    ],
    steps: [
      "Elige las fotos HEIC.",
      "Elige PNG como formato de salida. Si no necesitas la resolución completa, reduce el tamaño para que el archivo pese menos.",
      "Haz clic en Convertir y descarga los PNG (o el ZIP).",
    ],
    faq: [
      {
        q: "¿PNG o JPG para mis fotos del iPhone?",
        a: "JPG para compartir y guardar (pesa mucho menos); PNG si vas a editar la foto o necesitas que no pierda nada de calidad en el camino.",
      },
      {
        q: "¿Por qué el PNG pesa tanto más que el HEIC?",
        a: "Porque PNG no descarta información: guarda cada píxel tal cual. En dibujos o capturas de pantalla eso da archivos chicos, pero en fotos con mucho detalle los archivos crecen mucho.",
      },
      {
        q: "¿Puedo quitarle el fondo después?",
        a: "Sí. Con el PNG, usa Quitar fondo: el resultado conserva la transparencia.",
      },
    ],
  },

  "heic>pdf": {
    when: [
      "HEIC a PDF sirve cuando sacaste fotos de un documento con el iPhone (un DNI, un recibo, una receta, una constancia) y tienes que enviarlo o subirlo a un sitio que solo acepta PDF.",
      "Si son varias fotos que forman un solo documento, usa Imágenes a PDF para juntarlas en un único archivo con las páginas en el orden que elijas. Si además quieres que la foto parezca un escaneo, prueba Escanear documento.",
    ],
    differences: [
      "Un HEIC es una foto; un PDF es un documento de páginas. Al convertir, la foto se pone dentro de una página del mismo tamaño que la imagen, así que se ve igual pero ahora se puede adjuntar donde piden un PDF.",
    ],
    kept: [
      "La foto completa, sin márgenes ni recortes.",
      "La orientación correcta.",
      "Buena calidad: la foto se pasa a JPG de alta calidad antes de entrar al PDF.",
    ],
    lost: [
      "El texto de la foto no se puede seleccionar ni buscar: el PDF tiene una imagen. Para que se pueda buscar, pásalo después por «OCR de PDF escaneado».",
      "Los metadatos de la foto no pasan al PDF.",
    ],
    limits: [
      "La conversión se hace en tu navegador: las fotos de tus documentos no se suben a ningún servidor.",
      "Cada foto se convierte en su propio PDF de una página. Para juntar varias, usa Imágenes a PDF.",
    ],
    steps: [
      "Elige la foto HEIC (o varias, si quieres un PDF por foto).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF. Si pesa demasiado para el sitio donde lo vas a subir, usa Comprimir PDF.",
    ],
    faq: [
      {
        q: "¿Cómo junto varias fotos en un solo PDF?",
        a: "Con Imágenes a PDF: eliges todas las fotos (también HEIC), las ordenas y sale un único PDF con una página por foto.",
      },
      {
        q: "El sitio me pide un PDF de menos de 1 o 2 MB, ¿qué hago?",
        a: "Pasa el PDF por Comprimir PDF, o antes de convertir reduce el tamaño de la foto con Redimensionar imagen. Para un documento, 1500 a 2000 píxeles del lado mayor suelen alcanzar para que se lea bien.",
      },
      {
        q: "¿Las fotos de mis documentos se suben a algún lado?",
        a: "No. Se convierten en tu navegador y no salen de tu dispositivo.",
      },
    ],
  },

  "webp>jpg": {
    when: [
      "Muchos sitios sirven sus imágenes en WEBP, así que cuando guardas una foto desde el navegador suele quedar con esa extensión. Pasarla a JPG conviene cuando un programa de edición viejo, una app, un formulario o una impresora no la reconoce.",
      "Si la imagen tiene partes transparentes (un logo, un ícono), conviértela a PNG en lugar de JPG, porque el JPG no admite transparencia.",
    ],
    differences: [
      "WEBP es un formato de Google pensado para la web: con la misma calidad, ocupa entre un 25 y un 35 % menos que un JPG y además admite transparencia y animación. El JPG es más antiguo y menos eficiente, pero lo acepta cualquier programa y dispositivo.",
    ],
    kept: [
      "La resolución de la imagen.",
      "Los colores, con una pérdida de calidad que no se nota con la calidad por defecto.",
    ],
    lost: [
      "La transparencia: las partes transparentes quedan blancas.",
      "Si el WEBP es animado, solo se convierte el primer cuadro.",
      "El JPG suele pesar algo más que el WEBP original.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes, y puedes convertir muchas a la vez.",
    ],
    steps: [
      "Elige los archivos WEBP (o arrástralos).",
      "Deja JPG como formato de salida y, si quieres, ajusta la calidad o el tamaño.",
      "Haz clic en Convertir y descarga las imágenes (o el ZIP).",
    ],
    faq: [
      {
        q: "¿Por qué las imágenes que guardo de internet son WEBP?",
        a: "Porque los sitios las sirven en ese formato para que carguen más rápido. El navegador guarda el archivo tal como lo recibió.",
      },
      {
        q: "¿Qué pasa con el fondo transparente?",
        a: "El JPG no admite transparencia, así que esas zonas quedan blancas. Si quieres conservarla, convierte el WEBP a PNG.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "webp>png": {
    when: [
      "WEBP a PNG es la conversión correcta cuando la imagen tiene transparencia (logos, íconos, stickers, recortes) y necesitas abrirla en un programa que no lee WEBP, o cuando vas a editarla y no quieres perder calidad en cada guardado.",
    ],
    differences: [
      "Los dos formatos admiten transparencia. WEBP comprime más (puede ser con o sin pérdida) y es ideal para publicar en la web; PNG es sin pérdida y lo abre cualquier editor de imágenes, procesador de texto o programa de diseño.",
      "Una regla práctica: para publicar en un sitio, WEBP; para editar, imprimir o insertar en un documento de Word o una presentación, PNG.",
    ],
    kept: [
      "La transparencia, con sus bordes suaves.",
      "La resolución y los colores tal como se ven en el WEBP.",
    ],
    lost: [
      "Si el WEBP es animado, solo se convierte el primer cuadro.",
      "El PNG suele pesar bastante más, sobre todo si la imagen es una foto.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes.",
    ],
    steps: [
      "Elige los archivos WEBP.",
      "Deja PNG como formato de salida.",
      "Haz clic en Convertir y descarga los PNG (o el ZIP).",
    ],
    faq: [
      {
        q: "¿Se pierde calidad al pasar de WEBP a PNG?",
        a: "No se agrega ninguna pérdida: el PNG guarda exactamente los píxeles que tiene el WEBP. Si el WEBP ya había perdido calidad al comprimirse, eso no se recupera.",
      },
      {
        q: "¿Por qué el PNG pesa tanto?",
        a: "Porque no descarta información. Si el archivo te queda muy pesado y no necesitas transparencia, conviértelo a JPG.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu dispositivo.",
      },
    ],
  },

  "avif>jpg": {
    when: [
      "AVIF es cada vez más común en sitios web y en algunos celulares y cámaras nuevas. Pasarlo a JPG sirve cuando un programa, una red social, una app de mensajería vieja o un sistema de trámites no lo acepta todavía.",
    ],
    differences: [
      "AVIF es un formato moderno basado en el códec de video AV1: a igual calidad, ocupa bastante menos que un JPG e incluso menos que un WEBP, y admite transparencia y más profundidad de color. El JPG es mucho más antiguo, pero es compatible con todo.",
    ],
    kept: [
      "La resolución de la imagen.",
      "Los colores, con una pérdida que no se nota con la calidad por defecto.",
    ],
    lost: [
      "La transparencia: queda blanca.",
      "Las imágenes AVIF con alto rango dinámico (HDR) se ven con el rango normal de un JPG.",
      "El JPG pesa más que el AVIF, a veces el doble o más.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes. Si tu navegador no puede decodificar AVIF por su cuenta, se usa un decodificador incluido en la página.",
    ],
    steps: [
      "Elige los archivos AVIF.",
      "Deja JPG como formato de salida y ajusta la calidad si quieres.",
      "Haz clic en Convertir y descarga las imágenes (o el ZIP).",
    ],
    faq: [
      {
        q: "¿Qué programas no abren AVIF?",
        a: "Los navegadores actuales sí lo abren, pero muchos programas de edición, visores de fotos de versiones viejas de Windows y sistemas de carga de archivos todavía no. Por eso el JPG sigue siendo la opción segura para compartir.",
      },
      {
        q: "¿AVIF a JPG o a PNG?",
        a: "JPG si es una foto y quieres un archivo liviano; PNG si la imagen tiene transparencia o vas a editarla.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "avif>png": {
    when: [
      "AVIF a PNG conviene cuando la imagen tiene transparencia o cuando vas a editarla en un programa que todavía no lee AVIF, como muchos editores y programas de diseño de escritorio.",
      "También sirve para guardar una copia de trabajo de una imagen descargada de la web: a partir del PNG puedes recortar, retocar y volver a exportar las veces que quieras sin sumar pérdida de calidad en cada paso.",
    ],
    differences: [
      "AVIF comprime de forma muy eficiente y está pensado para publicar; PNG guarda la imagen sin pérdida y es el formato universal para trabajar con imágenes con transparencia.",
    ],
    kept: [
      "La transparencia.",
      "La resolución y los colores tal como se ven en pantalla.",
    ],
    lost: [
      "Si el AVIF es HDR o tiene más de 8 bits por canal, el PNG se guarda con el rango y la profundidad normales (8 bits).",
      "Si el AVIF es animado, solo se convierte el primer cuadro.",
      "El archivo pesa bastante más.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes.",
    ],
    steps: [
      "Elige los archivos AVIF.",
      "Deja PNG como formato de salida.",
      "Haz clic en Convertir y descarga los PNG (o el ZIP).",
    ],
    faq: [
      {
        q: "¿Se mantiene el fondo transparente?",
        a: "Sí, el PNG conserva la transparencia del AVIF, incluidos los bordes suaves.",
      },
      {
        q: "¿Por qué el PNG pesa mucho más que el AVIF?",
        a: "AVIF es de los formatos que más comprimen; PNG no descarta nada. Es normal que el PNG pese varias veces más.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu dispositivo.",
      },
    ],
  },

  "jpg>pdf": {
    when: [
      "JPG a PDF sirve para enviar la foto de un documento, un comprobante o un dibujo a un lugar que solo acepta PDF: portales de trámites, aulas virtuales, formularios de empleo o de la obra social.",
      "Si tienes varias fotos que forman un solo documento (por ejemplo, el frente y el dorso de un DNI), usa Imágenes a PDF para juntarlas en un solo archivo.",
    ],
    differences: [
      "Un JPG es una imagen suelta; un PDF es un documento con páginas que se ve igual en todos lados y que los sistemas de trámites aceptan como documento.",
    ],
    kept: [
      "La foto con su calidad original: el JPG se coloca dentro del PDF sin volver a comprimirlo.",
      "La orientación (si la foto tiene la rotación guardada en los datos EXIF, se aplica).",
      "Una página del tamaño exacto de la imagen, sin bordes blancos.",
    ],
    lost: [
      "El texto de la foto no se puede seleccionar ni buscar. Para eso, pasa el PDF por «OCR de PDF escaneado».",
      "Los datos EXIF de la foto no se ven en el PDF.",
    ],
    limits: [
      "La conversión se hace en tu navegador: las fotos de tus documentos no se suben.",
      "Cada JPG da su propio PDF de una página. Para elegir tamaño A4 o Carta, márgenes o juntar varias imágenes, usa Imágenes a PDF.",
    ],
    steps: [
      "Elige la foto (o varias, si quieres un PDF por foto).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF. Si pesa demasiado, pásalo por Comprimir PDF.",
    ],
    faq: [
      {
        q: "¿Cómo pongo varias fotos en un solo PDF?",
        a: "Usa Imágenes a PDF: eliges todas las imágenes, las ordenas arrastrándolas y sale un único PDF.",
      },
      {
        q: "¿El PDF tiene el tamaño de una hoja A4?",
        a: "En esta conversión, la página tiene el tamaño de la foto. Si necesitas A4 o Carta con márgenes (para imprimir), usa Imágenes a PDF y elige el tamaño de página.",
      },
      {
        q: "¿Se pierde calidad?",
        a: "No. El JPG se guarda dentro del PDF tal cual, sin volver a comprimirlo.",
      },
    ],
  },

  "png>pdf": {
    when: [
      "PNG a PDF es útil para entregar capturas de pantalla, diagramas, planos, infografías o documentos escaneados en PNG en un formato de documento que cualquiera puede abrir e imprimir.",
    ],
    differences: [
      "PNG es una imagen sin pérdida, ideal para capturas y gráficos con texto nítido. El PDF la envuelve en una página de documento, sin cambiar los píxeles.",
    ],
    kept: [
      "La imagen sin pérdida de calidad: el PNG se guarda dentro del PDF tal cual.",
      "El texto y las líneas nítidas de capturas y diagramas.",
      "La transparencia (el PDF muestra lo que hay debajo, que en una página nueva es blanco).",
    ],
    lost: [
      "El texto de la imagen no se puede seleccionar. Para eso, pasa el PDF por «OCR de PDF escaneado».",
      "Una foto en PNG da un PDF pesado; si es una foto, conviértela antes a JPG o comprime el PDF.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes.",
      "Cada PNG da su propio PDF de una página, del tamaño de la imagen. Para juntar varias o elegir A4, usa Imágenes a PDF.",
    ],
    steps: [
      "Elige el PNG (o varios).",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF.",
    ],
    faq: [
      {
        q: "¿Se ve borrosa la captura en el PDF?",
        a: "No: el PNG entra al PDF sin recomprimir. Si se ve chica al imprimir, es porque la página tiene el tamaño de la imagen; usa Imágenes a PDF con tamaño A4 para que se ajuste a la hoja.",
      },
      {
        q: "¿Puedo juntar varias capturas en un PDF?",
        a: "Sí, con Imágenes a PDF.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "pdf>jpg": {
    when: [
      "PDF a JPG sirve para publicar una página de un PDF en redes sociales, insertarla en una presentación o en un documento como imagen, mandarla por WhatsApp para que se vea sin abrir nada, o subir una constancia a un sitio que solo acepta imágenes.",
    ],
    differences: [
      "Un PDF puede tener texto, vectores e imágenes, y se ve nítido a cualquier zoom. Un JPG es una foto de la página a una resolución fija: más fácil de compartir y ver en cualquier lado, pero sin texto seleccionable ni zoom infinito.",
    ],
    kept: [
      "El aspecto de cada página: texto, imágenes, colores y diseño, tal como se ve en un visor.",
      "Todas las páginas: una imagen por página.",
    ],
    lost: [
      "El texto deja de ser seleccionable y los enlaces dejan de funcionar.",
      "La nitidez infinita: la imagen tiene la resolución que elijas (72, 150 o 300 ppp).",
      "Las partes transparentes del PDF quedan blancas.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir el PDF.",
      "Con varias páginas, recibes un ZIP con una imagen por página. Si el PDF tiene contraseña de apertura, quítala antes con «Quitar contraseña de un PDF».",
    ],
    steps: [
      "Elige el PDF.",
      "Deja JPG como formato de salida y elige la resolución: 150 ppp para pantalla, 300 ppp si vas a imprimir o necesitas leer letra chica.",
      "Haz clic en Convertir.",
      "Descarga la imagen o el ZIP con todas las páginas.",
    ],
    faq: [
      {
        q: "¿Qué resolución elijo?",
        a: "150 ppp alcanza para verlo en pantalla o mandarlo por mensaje. 300 ppp da imágenes más grandes y nítidas, para imprimir o para documentos con letra chica. 72 ppp da archivos muy livianos.",
      },
      {
        q: "¿Puedo convertir solo una página?",
        a: "Se convierten todas. Si quieres una sola, primero sácala con Extraer páginas de un PDF y convierte ese archivo.",
      },
      {
        q: "¿JPG o PNG?",
        a: "JPG para páginas con fotos y para que pesen poco; PNG para páginas con texto, tablas o gráficos, porque las letras quedan más limpias.",
      },
      {
        q: "¿Y si lo que quiero son las fotos que hay dentro del PDF?",
        a: "Usa Extraer imágenes de un PDF: saca las imágenes originales sin la página alrededor.",
      },
    ],
  },

  "pdf>png": {
    when: [
      "PDF a PNG conviene cuando la página tiene texto, tablas, gráficos o planos y la vas a usar como imagen en una presentación, un documento, una wiki o un sitio web: el PNG mantiene las letras y las líneas limpias, sin el «ruido» que agrega el JPG alrededor de los bordes.",
    ],
    differences: [
      "El PDF es un documento de páginas con texto y vectores; el PNG es una imagen sin pérdida. Al convertir, cada página se dibuja como imagen a la resolución que elijas.",
    ],
    kept: [
      "El aspecto exacto de cada página, sin pérdida de calidad sobre lo que se dibuja.",
      "Las letras y las líneas nítidas.",
      "Todas las páginas, una imagen por página.",
    ],
    lost: [
      "El texto no se puede seleccionar y los enlaces no funcionan.",
      "Las páginas con muchas fotos dan PNG pesados; para eso, mejor JPG.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir el PDF.",
      "Con varias páginas recibes un ZIP. Los PDF con contraseña de apertura hay que desbloquearlos antes.",
    ],
    steps: [
      "Elige el PDF.",
      "Deja PNG como formato de salida y elige la resolución (300 ppp para que la letra chica se lea bien).",
      "Haz clic en Convertir y descarga la imagen o el ZIP.",
    ],
    faq: [
      {
        q: "¿Por qué el texto se ve mejor en PNG que en JPG?",
        a: "Porque el JPG comprime con pérdida y deja pequeñas manchas alrededor de los bordes marcados, como los de las letras. El PNG los guarda exactos.",
      },
      {
        q: "¿El PNG tiene fondo transparente?",
        a: "No: cada página se dibuja sobre fondo blanco, como se ve en un visor de PDF.",
      },
      {
        q: "¿Se sube mi PDF?",
        a: "No, se convierte en tu navegador.",
      },
    ],
  },
};
