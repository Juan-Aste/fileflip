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
    limits: ["La conversión se hace en tu navegador, sin subir las imágenes."],
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
    limits: ["La conversión se hace en tu navegador, sin subir las imágenes."],
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

  // Formatos de imagen comunes, íconos y SVG (19.2b3). Hechos: todo en el
  // navegador; calidad 82 por defecto en JPG/WEBP/AVIF; al recodificar no pasan
  // los metadatos; transparencia → blanco en JPG; GIF animado → primer cuadro;
  // TIFF de varias páginas → solo la primera (TIFF → PDF también); ICO de
  // salida: 16, 32, 48, 64, 128 y 256 px (solo los que no superan la imagen),
  // cuadrado centrado con relleno transparente; ICO → PNG: el navegador
  // decodifica el ícono (normalmente toma la imagen más grande); SVG: se dibuja
  // con el navegador al tamaño de width/height/viewBox (1024 px si no tiene),
  // agrandarlo no pierde nitidez, no carga imágenes ni fuentes externas;
  // SVG → PDF: el SVG se dibuja como imagen PNG dentro del PDF (no queda vectorial).
  "jpg>png": {
    when: [
      "Pasar un JPG a PNG conviene cuando vas a editar la imagen varias veces (recortar, agregar texto, retocar) y no quieres que cada guardado agregue más pérdida, o cuando un sistema pide PNG explícitamente, como algunas plataformas de diseño o tiendas en línea.",
      "Si lo que quieres es un fondo transparente, convertir a PNG no alcanza: el JPG no tiene transparencia que conservar. Para eso, usa Quitar fondo de imagen, que entrega un PNG con el fondo recortado.",
    ],
    differences: [
      "JPG comprime con pérdida: descarta detalles que el ojo casi no ve para que las fotos pesen poco. PNG comprime sin pérdida: guarda cada píxel exacto y admite transparencia, pero en fotos genera archivos mucho más pesados.",
      "Convertir de JPG a PNG no recupera la calidad que el JPG ya perdió; solo evita perder más a partir de ahí.",
    ],
    kept: [
      "La imagen exactamente como se ve en el JPG, píxel por píxel.",
      "La resolución y los colores.",
      "La orientación de la foto.",
    ],
    lost: [
      "No se pierde nada de la imagen, pero el archivo suele pesar entre 3 y 10 veces más.",
      "Los metadatos EXIF (fecha, cámara, GPS) no pasan al PNG.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes, y admite lotes con descarga en ZIP.",
    ],
    steps: [
      "Elige los JPG (o arrástralos).",
      "Deja PNG como formato de salida; si no necesitas el tamaño original, reduce el ancho para que pesen menos.",
      "Haz clic en Convertir y descarga los PNG o el ZIP.",
    ],
    faq: [
      {
        q: "¿Mejora la calidad al pasar de JPG a PNG?",
        a: "No. El PNG guarda exactamente lo que había en el JPG, con sus defectos de compresión incluidos. Lo que ganas es que las ediciones siguientes no sumen pérdida.",
      },
      {
        q: "¿El PNG tendrá fondo transparente?",
        a: "No, porque el JPG no tiene transparencia. Para recortar el fondo, usa Quitar fondo de imagen.",
      },
      {
        q: "¿Por qué el PNG pesa tanto más?",
        a: "Porque no descarta información. En fotos eso se nota mucho; en capturas de pantalla o gráficos simples, la diferencia es menor.",
      },
    ],
  },

  "png>jpg": {
    when: [
      "PNG a JPG es la forma más simple de achicar fotos y capturas pesadas: para mandarlas por correo, subirlas a un formulario con límite de tamaño o publicarlas en un sitio. Una foto guardada como PNG puede bajar a la décima parte de su peso en JPG sin diferencias visibles.",
      "No conviene si la imagen tiene transparencia (un logo, un ícono) o mucho texto fino: ahí es mejor dejarla en PNG o pasarla a WEBP.",
    ],
    differences: [
      "PNG guarda cada píxel exacto y admite transparencia; es ideal para gráficos, capturas y logos. JPG descarta detalles imperceptibles para pesar poco, y funciona muy bien con fotos, pero no tiene transparencia y deja pequeñas manchas alrededor de bordes nítidos como los de las letras.",
    ],
    kept: [
      "La resolución y el aspecto general de la imagen.",
      "Los colores, con una pérdida que no se nota con la calidad por defecto (82).",
    ],
    lost: [
      "La transparencia: las zonas transparentes quedan blancas.",
      "Algo de nitidez en bordes muy marcados, como textos chicos o líneas finas.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes. Puedes ajustar la calidad y el tamaño y convertir muchas a la vez.",
    ],
    steps: [
      "Elige los PNG.",
      "Deja JPG como formato de salida. Con calidad 75–85 las fotos se ven igual y pesan mucho menos; para capturas con texto, sube a 90.",
      "Haz clic en Convertir y descarga las imágenes o el ZIP.",
    ],
    faq: [
      {
        q: "¿Qué calidad elijo?",
        a: "Para fotos, entre 75 y 85 es un buen equilibrio. Para capturas de pantalla con texto, 90 o más, o directamente déjalas en PNG.",
      },
      {
        q: "¿Qué pasa con el fondo transparente?",
        a: "El JPG no lo admite, así que queda blanco. Si necesitas conservarlo y que pese menos, convierte a WEBP.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "jpg>webp": {
    when: [
      "JPG a WEBP es la conversión típica para que un sitio web cargue más rápido: con la misma calidad visual, las fotos pesan alrededor de un 25–35 % menos, y eso mejora el tiempo de carga y las métricas de Google. También sirve para ahorrar espacio en tiendas en línea, blogs y catálogos.",
      "Para mandar fotos por mensaje, imprimirlas o subirlas a sistemas viejos, mejor quedarse con JPG: algunos programas todavía no abren WEBP.",
    ],
    differences: [
      "WEBP es más moderno y comprime mejor que JPG; además admite transparencia y animación. Todos los navegadores actuales lo muestran, pero no todos los programas de escritorio o sistemas de carga de archivos lo aceptan.",
    ],
    kept: ["La resolución y el aspecto de la foto.", "La orientación."],
    lost: [
      "WEBP también comprime con pérdida: con calidad muy baja se notan manchas. Con la calidad por defecto (82) no se distingue del JPG.",
      "Los metadatos EXIF no pasan al WEBP.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las fotos, en lotes y con descarga en ZIP.",
    ],
    steps: [
      "Elige los JPG.",
      "Deja WEBP como formato de salida. Si son para un sitio web, reduce también el ancho al tamaño máximo en que se muestran (por ejemplo, 1600 px).",
      "Haz clic en Convertir y descarga los WEBP o el ZIP.",
    ],
    faq: [
      {
        q: "¿Cuánto pesa menos un WEBP?",
        a: "Depende de la foto, pero con la misma calidad visual suele pesar alrededor de un 25 a 35 % menos que el JPG. Reducir además el tamaño en píxeles es lo que más ahorra.",
      },
      {
        q: "¿WordPress y las tiendas en línea aceptan WEBP?",
        a: "La mayoría de las plataformas actuales sí. Si alguna no lo acepta, sube el JPG.",
      },
      {
        q: "¿WEBP o AVIF para mi sitio?",
        a: "AVIF comprime todavía más, pero tarda más en generarse. WEBP es la opción más compatible y rápida; AVIF conviene si quieres el menor peso posible.",
      },
    ],
  },

  "png>webp": {
    when: [
      "PNG a WEBP sirve para aligerar imágenes de un sitio web sin perder la transparencia: logos, íconos, productos recortados, capturas e ilustraciones. Es de las conversiones que más peso ahorran en una página.",
    ],
    differences: [
      "PNG es sin pérdida y pesa mucho con imágenes grandes o fotos. WEBP también admite transparencia, pero comprime con pérdida (calidad ajustable), y el resultado suele pesar una fracción del PNG.",
    ],
    kept: [
      "La transparencia, con bordes suaves.",
      "La resolución y el aspecto de la imagen.",
    ],
    lost: [
      "Con calidad baja pueden aparecer manchas alrededor de textos y líneas finas. Para gráficos con mucho texto, usa una calidad alta (90 o más).",
      "Los metadatos del PNG no pasan al WEBP.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes. La calidad se aplica igual a todo el lote.",
    ],
    steps: [
      "Elige los PNG.",
      "Deja WEBP como formato de salida y ajusta la calidad: 82 para fotos y productos, 90 o más para gráficos con texto.",
      "Haz clic en Convertir y descarga los WEBP o el ZIP.",
    ],
    faq: [
      {
        q: "¿Se mantiene el fondo transparente?",
        a: "Sí, WEBP admite transparencia y la conserva.",
      },
      {
        q: "¿Cuánto ahorro?",
        a: "En fotos y productos guardados como PNG, el WEBP suele pesar muchas veces menos. En íconos chicos o gráficos muy simples la diferencia es menor.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "jpg>avif": {
    when: [
      "JPG a AVIF conviene cuando quieres el menor peso posible para las fotos de un sitio web, una tienda o una galería: AVIF suele lograr la misma calidad visual con bastante menos peso que JPG y que WEBP.",
      "No lo uses para compartir por mensaje o subir a sistemas que no lo conocen: muchos programas todavía no abren AVIF.",
    ],
    differences: [
      "AVIF usa el códec de video AV1 para comprimir imágenes. Es más eficiente que JPG y WEBP, admite transparencia y HDR, y los navegadores actuales lo muestran. A cambio, crear un AVIF lleva más procesamiento que crear un JPG.",
    ],
    kept: ["La resolución y el aspecto de la foto.", "La orientación."],
    lost: [
      "AVIF comprime con pérdida; con calidad muy baja la imagen se ve «lavada» en zonas de textura fina. Con la calidad por defecto no se nota.",
      "Los metadatos EXIF no pasan al AVIF.",
    ],
    limits: [
      "La conversión se hace en tu navegador con un codificador incluido en la página. Es más lenta que a JPG o WEBP: unos segundos por foto grande, más en celulares.",
    ],
    steps: [
      "Elige los JPG.",
      "Deja AVIF como formato de salida y, si son para la web, reduce el ancho al tamaño en que se muestran.",
      "Haz clic en Convertir y espera: cada foto tarda un poco más que con otros formatos.",
      "Descarga los AVIF o el ZIP.",
    ],
    faq: [
      {
        q: "¿Por qué tarda más que convertir a WEBP?",
        a: "Porque codificar AVIF requiere mucho más cálculo. Ese esfuerzo es justamente lo que permite que el archivo pese menos.",
      },
      {
        q: "¿Todos los navegadores muestran AVIF?",
        a: "Las versiones actuales de Chrome, Edge, Firefox y Safari sí. Si tu público usa equipos muy viejos, ofrece también un JPG o WEBP de respaldo.",
      },
      {
        q: "¿Se suben mis fotos?",
        a: "No, el AVIF se genera en tu navegador.",
      },
    ],
  },

  "gif>png": {
    when: [
      "GIF a PNG sirve para sacar una imagen fija de un GIF (por ejemplo, un logo viejo, un ícono o un cuadro de una animación) y poder editarla o usarla en documentos sin la limitación de 256 colores del GIF.",
    ],
    differences: [
      "GIF admite animación, pero solo 256 colores por cuadro y transparencia de todo o nada. PNG es una imagen fija con millones de colores y transparencia con bordes suaves. Para gráficos y logos, PNG es el reemplazo moderno del GIF fijo.",
    ],
    kept: ["Los colores exactos del GIF y su transparencia.", "La resolución."],
    lost: [
      "La animación: si el GIF es animado, se convierte solo el primer cuadro.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos. Entrega siempre una imagen fija, aunque el GIF sea animado.",
    ],
    steps: [
      "Elige los GIF.",
      "Deja PNG como formato de salida.",
      "Haz clic en Convertir y descarga los PNG.",
    ],
    faq: [
      {
        q: "¿Qué pasa con la animación?",
        a: "Se convierte solo el primer cuadro: el PNG es una imagen fija.",
      },
      {
        q: "¿Se mantiene la transparencia?",
        a: "Sí. Las zonas transparentes del GIF siguen transparentes en el PNG.",
      },
      {
        q: "¿Mejora la calidad?",
        a: "No: el PNG guarda exactamente los colores que tenía el GIF. Lo que ganas es poder editarlo sin el límite de 256 colores.",
      },
    ],
  },

  "gif>jpg": {
    when: [
      "GIF a JPG es útil cuando un sitio o un formulario no acepta GIF y necesitas subir la imagen igual, o para guardar como foto fija el primer cuadro de un GIF.",
    ],
    differences: [
      "GIF es un formato con 256 colores como máximo, animación y transparencia simple. JPG es una imagen fija con millones de colores y compresión con pérdida, aceptada en todos lados, pero sin transparencia.",
    ],
    kept: [
      "La resolución del primer cuadro.",
      "Sus colores: un GIF tiene como máximo 256, y el JPG los reproduce sin problema.",
    ],
    lost: [
      "La animación: solo queda el primer cuadro.",
      "La transparencia, que se vuelve blanca.",
      "Algo de nitidez en bordes de dibujos y textos, por la compresión del JPG.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos. Si el GIF es un dibujo o logo con transparencia, conviértelo a PNG en lugar de JPG.",
    ],
    steps: [
      "Elige los GIF.",
      "Deja JPG como formato de salida; para dibujos con bordes nítidos, sube la calidad a 90.",
      "Haz clic en Convertir y descarga los JPG.",
    ],
    faq: [
      {
        q: "¿Puedo elegir qué cuadro del GIF se convierte?",
        a: "No, siempre se usa el primer cuadro.",
      },
      {
        q: "¿JPG o PNG para un GIF?",
        a: "PNG para logos, dibujos o imágenes con transparencia; JPG solo si el sitio lo exige o si el GIF es una foto.",
      },
      {
        q: "¿Se suben mis archivos?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "bmp>jpg": {
    when: [
      "Los BMP aparecen en capturas de programas viejos de Windows, escáneres, máquinas industriales y equipos médicos. Pesan muchísimo porque no tienen compresión. Pasarlos a JPG los deja listos para mandar por correo o subir a cualquier lado, con una fracción del peso.",
    ],
    differences: [
      "BMP guarda la imagen sin comprimir (o con una compresión mínima): una foto de 12 megapíxeles puede ocupar más de 30 MB. JPG comprime con pérdida y deja esa misma foto en unos pocos MB, compatible con todo.",
    ],
    kept: [
      "La resolución y el aspecto de la imagen.",
      "Los colores, con una pérdida que no se nota con la calidad por defecto.",
    ],
    lost: [
      "Algo de nitidez en textos y líneas finas por la compresión; para capturas con texto, mejor PNG.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes, en lotes.",
    ],
    steps: [
      "Elige los BMP.",
      "Deja JPG como formato de salida y ajusta la calidad si quieres.",
      "Haz clic en Convertir y descarga los JPG o el ZIP.",
    ],
    faq: [
      {
        q: "¿Cuánto pesa menos?",
        a: "Muchísimo: un BMP sin comprimir suele bajar a menos de la décima parte en JPG.",
      },
      {
        q: "¿BMP a JPG o a PNG?",
        a: "JPG para fotos; PNG para capturas de pantalla, planos o imágenes con texto, porque no pierde nada y también reduce mucho el peso del BMP.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "bmp>png": {
    when: [
      "BMP a PNG es ideal para capturas de pantalla, diagramas, imágenes de escáneres o de equipos técnicos que guardan en BMP: el PNG pesa mucho menos y conserva la imagen exactamente igual, sin la pérdida del JPG.",
    ],
    differences: [
      "Los dos formatos guardan cada píxel exacto, pero BMP casi no comprime y PNG sí (sin pérdida). El resultado es la misma imagen en un archivo varias veces más chico y compatible con la web, documentos y programas de diseño.",
    ],
    kept: [
      "La imagen exacta, píxel por píxel.",
      "La resolución y los colores.",
    ],
    lost: ["Nada de la imagen. Solo cambian el formato y el peso del archivo."],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos, en lotes.",
    ],
    steps: [
      "Elige los BMP.",
      "Deja PNG como formato de salida.",
      "Haz clic en Convertir y descarga los PNG o el ZIP.",
    ],
    faq: [
      {
        q: "¿Se pierde calidad?",
        a: "No. PNG comprime sin pérdida, así que la imagen es idéntica.",
      },
      {
        q: "¿Por qué el BMP pesaba tanto?",
        a: "Porque guarda cada píxel sin comprimir. El PNG aprovecha las zonas repetidas para guardar lo mismo en menos espacio.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "tiff>jpg": {
    when: [
      "Los TIFF vienen de escáneres, cámaras profesionales, imprentas y archivos de fotos. Son excelentes para guardar o imprimir, pero pesan mucho y casi ningún navegador ni red social los muestra. Pasarlos a JPG los deja listos para compartir o publicar.",
    ],
    differences: [
      "TIFF es un formato de archivo profesional: suele guardar la imagen sin pérdida, con mucha resolución y, a veces, varias páginas en un mismo archivo. JPG comprime con pérdida para pesar poco y se abre en cualquier dispositivo.",
    ],
    kept: [
      "La resolución de la imagen.",
      "Los colores, con una pérdida que no se nota con la calidad por defecto.",
    ],
    lost: [
      "Si el TIFF tiene varias páginas (por ejemplo, un fax o un escaneo de varias hojas), solo se convierte la primera.",
      "La transparencia y las capas, si las tiene.",
      "Los metadatos del archivo.",
    ],
    limits: [
      "La conversión se hace en tu navegador. Solo Safari lee TIFF por su cuenta; en los demás navegadores se usa un decodificador incluido en la página. Algunos TIFF poco comunes (por ejemplo, con 16 bits por canal o compresiones raras) pueden no abrirse.",
    ],
    steps: [
      "Elige los TIFF.",
      "Deja JPG como formato de salida; si las imágenes son enormes, reduce el ancho para compartirlas.",
      "Haz clic en Convertir y descarga los JPG o el ZIP.",
    ],
    faq: [
      {
        q: "Mi TIFF tiene varias páginas, ¿se convierten todas?",
        a: "No, solo la primera. Si necesitas todas, conviene escanear de nuevo cada página por separado o guardar el documento como PDF desde el programa del escáner.",
      },
      {
        q: "¿Se pierde calidad?",
        a: "Un poco, por la compresión del JPG, pero con la calidad por defecto no se nota en pantalla. Para imprimir, sube la calidad a 90–95.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "tiff>pdf": {
    when: [
      "TIFF a PDF sirve para entregar un escaneo o una imagen de archivo como documento: para adjuntarlo a un trámite, mandarlo por correo o guardarlo junto con otros PDF.",
    ],
    differences: [
      "TIFF es un formato de imagen profesional muy usado por escáneres; PDF es el formato universal para documentos. Al convertir, la imagen se coloca en una página del mismo tamaño, sin márgenes.",
    ],
    kept: [
      "La imagen de la primera página, con su resolución.",
      "Una calidad alta: la imagen se guarda como JPG de calidad 92 dentro del PDF.",
    ],
    lost: [
      "Solo se convierte la primera página de un TIFF de varias páginas.",
      "El texto de la imagen no se puede buscar ni seleccionar; para eso, pasa el PDF por «OCR de PDF escaneado».",
      "La transparencia, si la tiene.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos. Algunos TIFF poco comunes pueden no abrirse. Para juntar varias imágenes en un PDF, usa Imágenes a PDF.",
    ],
    steps: [
      "Elige el TIFF.",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF y, si pesa mucho, pásalo por Comprimir PDF.",
    ],
    faq: [
      {
        q: "¿Se convierten todas las páginas del TIFF?",
        a: "No, solo la primera. Para documentos de varias hojas, escanea directamente a PDF o junta las páginas como imágenes con Imágenes a PDF.",
      },
      {
        q: "¿El PDF queda con texto buscable?",
        a: "No, contiene una imagen. Usa «OCR de PDF escaneado» para agregarle texto reconocido.",
      },
      {
        q: "¿Se suben mis archivos?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "png>ico": {
    when: [
      "PNG a ICO es lo que necesitas para crear el favicon de un sitio web (el ícono de la pestaña del navegador) o un ícono de programa o acceso directo en Windows. Si tienes el logo en PNG con fondo transparente, es el mejor punto de partida.",
    ],
    differences: [
      "Un PNG es una sola imagen. Un ICO es un contenedor con varias versiones del mismo ícono en distintos tamaños, para que Windows y los navegadores usen la más adecuada en cada lugar (pestaña, barra de tareas, escritorio).",
    ],
    kept: [
      "La transparencia del PNG.",
      "El dibujo completo, centrado en un cuadrado si la imagen no es cuadrada.",
      "Tamaños de 16, 32, 48, 64, 128 y 256 px dentro del mismo archivo (solo los que no superan el tamaño de tu imagen).",
    ],
    lost: [
      "En los tamaños chicos (16 y 32 px) los detalles finos y los textos se vuelven ilegibles: es una limitación del tamaño, no del formato. Un ícono simple funciona mejor.",
      "Si la imagen no es cuadrada, quedan bordes transparentes a los costados o arriba y abajo.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir las imágenes. Para obtener además los PNG del favicon (como apple-touch-icon) y el código HTML, usa el «Generador de favicon».",
    ],
    steps: [
      "Prepara un PNG cuadrado de al menos 256 × 256 px, idealmente con fondo transparente.",
      "Elígelo y deja ICO como formato de salida.",
      "Haz clic en Convertir y descarga el .ico.",
      "Para un sitio web, súbelo a la raíz con el nombre favicon.ico.",
    ],
    faq: [
      {
        q: "¿Qué tamaño de imagen necesito?",
        a: "Lo ideal es 256 × 256 px o más, cuadrada. Con una imagen más chica, el ICO solo incluye los tamaños que no la superan.",
      },
      {
        q: "¿Se mantiene la transparencia?",
        a: "Sí, cada tamaño se guarda como PNG de 32 bits dentro del ICO.",
      },
      {
        q: "¿Funciona como ícono de Windows?",
        a: "Sí. El formato (con imágenes PNG adentro) es compatible con Windows Vista en adelante y con todos los navegadores actuales.",
      },
    ],
  },

  "jpg>ico": {
    when: [
      "JPG a ICO sirve para hacer un favicon o un ícono de Windows a partir de una foto o un logo que solo tienes en JPG, por ejemplo la foto de un perfil o el logo que te mandaron por mensaje.",
      "Si tienes el logo en PNG con fondo transparente, usa ese: el resultado se ve mucho mejor sobre pestañas oscuras.",
    ],
    differences: [
      "JPG es una foto sin transparencia; ICO es un contenedor de íconos con varios tamaños. Al convertir, la imagen se reduce a cada tamaño estándar y se guarda dentro del ICO.",
    ],
    kept: [
      "La imagen completa, centrada en un cuadrado.",
      "Tamaños de 16 a 256 px dentro del mismo archivo.",
    ],
    lost: [
      "El JPG no tiene transparencia, así que el fondo de la foto queda tal cual; si la imagen no es cuadrada, los bordes agregados quedan transparentes.",
      "En 16 y 32 px una foto se reduce a muy pocos píxeles y pierde detalle. Recorta antes la parte importante (una cara, la inicial del logo).",
    ],
    limits: ["La conversión se hace en tu navegador, sin subir las imágenes."],
    steps: [
      "Si hace falta, recorta la imagen a un cuadrado con Recortar imagen, dejando solo lo importante.",
      "Elige el JPG y deja ICO como formato de salida.",
      "Haz clic en Convertir y descarga el .ico.",
    ],
    faq: [
      {
        q: "¿Puedo quitarle el fondo antes?",
        a: "Sí. Pasa el JPG por Quitar fondo de imagen, descarga el PNG y conviértelo a ICO: el ícono quedará con fondo transparente.",
      },
      {
        q: "¿Por qué mi ícono se ve borroso en la pestaña?",
        a: "Porque en 16 px casi no hay lugar para detalles. Un dibujo simple o una letra grande se ven mucho mejor que una foto.",
      },
      {
        q: "¿Se suben mis imágenes?",
        a: "No, todo se procesa en tu navegador.",
      },
    ],
  },

  "ico>png": {
    when: [
      "ICO a PNG sirve para sacar la imagen de un favicon o de un ícono de Windows y usarla en otro lado: en una presentación, un documento, un diseño o para crear un ícono nuevo a partir del viejo.",
    ],
    differences: [
      "Un ICO contiene una o varias versiones de un ícono en distintos tamaños. Un PNG es una sola imagen, que cualquier programa abre y edita.",
    ],
    kept: ["La transparencia del ícono.", "Los colores exactos."],
    lost: [
      "Se obtiene una sola imagen: el navegador elige una de las versiones del ícono (normalmente la más grande). Las demás no se exportan.",
      "Un ícono que solo trae 16 o 32 px no gana detalle: agrandarlo después lo verá pixelado.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos. Los ICO muy antiguos con formatos de color poco comunes pueden no abrirse en todos los navegadores.",
    ],
    steps: [
      "Elige el archivo .ico.",
      "Deja PNG como formato de salida.",
      "Haz clic en Convertir y descarga el PNG.",
    ],
    faq: [
      {
        q: "¿Qué tamaño tendrá el PNG?",
        a: "El de la versión del ícono que use el navegador, normalmente la más grande que contiene el archivo (hasta 256 × 256 px).",
      },
      {
        q: "¿Puedo agrandarlo?",
        a: "Puedes con Redimensionar imagen, pero un ícono de pocos píxeles se verá pixelado o borroso al agrandarlo.",
      },
      {
        q: "¿Se suben mis archivos?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "svg>png": {
    when: [
      "SVG a PNG es necesario cuando tienes un logo o una ilustración vectorial y la tienes que usar donde no aceptan SVG: redes sociales, presentaciones, documentos de Word, apps de mensajería o plataformas que piden una imagen común.",
    ],
    differences: [
      "Un SVG es un dibujo descrito con formas y textos, así que se ve nítido a cualquier tamaño. Un PNG es una imagen de píxeles con un tamaño fijo. Al convertir, el SVG se «dibuja» al tamaño que elijas, y a partir de ahí ese es su máximo de nitidez.",
    ],
    kept: [
      "La transparencia del fondo.",
      "Las formas, colores y degradados tal como los dibuja el navegador.",
      "Nitidez total al tamaño elegido: puedes pedir un PNG grande sin que se vea borroso.",
    ],
    lost: [
      "La escalabilidad: el PNG ya no se puede agrandar sin perder nitidez.",
      "Las imágenes o fuentes que el SVG carga desde internet no se incluyen; los textos con fuentes no instaladas usan una fuente del sistema.",
      "Las animaciones y el código del SVG.",
    ],
    limits: [
      "La conversión se hace en tu navegador. El tamaño sale del ancho, el alto o el viewBox del SVG; si no tiene ninguno, se usa 1024 px. Si el texto del logo se ve con otra fuente, conviértelo a trazados en tu programa de diseño antes de exportar.",
    ],
    steps: [
      "Elige el SVG.",
      "Deja PNG como formato de salida y elige el tamaño: por ejemplo, 1000 px de ancho para redes o el doble del tamaño en que se va a mostrar.",
      "Haz clic en Convertir y descarga el PNG.",
    ],
    faq: [
      {
        q: "¿Qué tamaño de PNG elijo?",
        a: "El que necesites: como el SVG es vectorial, agrandarlo no pierde calidad. Para pantallas de alta densidad, elige el doble del tamaño en que se va a ver.",
      },
      {
        q: "El texto del logo sale con otra fuente, ¿por qué?",
        a: "Porque el SVG usa una fuente que no está incluida en el archivo ni instalada en tu equipo. En tu programa de diseño, convierte el texto a trazados (contornos) y exporta el SVG de nuevo.",
      },
      {
        q: "¿Se mantiene el fondo transparente?",
        a: "Sí, el PNG conserva la transparencia.",
      },
    ],
  },

  "svg>jpg": {
    when: [
      "SVG a JPG sirve cuando un sitio o un sistema solo acepta JPG y tienes un logo, un gráfico o una ilustración en SVG: formularios, perfiles, plataformas de anuncios o impresiones rápidas.",
      "Si el destino acepta PNG, es mejor opción: conserva la transparencia y los bordes quedan más limpios.",
    ],
    differences: [
      "SVG es un dibujo vectorial que se ve nítido a cualquier tamaño; JPG es una imagen de píxeles comprimida con pérdida, pensada para fotos y sin transparencia.",
    ],
    kept: [
      "Las formas y colores tal como los dibuja el navegador.",
      "La nitidez al tamaño que elijas.",
    ],
    lost: [
      "La transparencia: el fondo queda blanco.",
      "Algo de nitidez en bordes y textos por la compresión del JPG; sube la calidad a 90 para logos.",
      "Las imágenes o fuentes externas que cargue el SVG, y sus animaciones.",
    ],
    limits: [
      "La conversión se hace en tu navegador. El tamaño sale del ancho, el alto o el viewBox del SVG (1024 px si no tiene).",
    ],
    steps: [
      "Elige el SVG.",
      "Deja JPG como formato de salida, sube la calidad a 90 y elige el tamaño en píxeles.",
      "Haz clic en Convertir y descarga el JPG.",
    ],
    faq: [
      {
        q: "¿Puedo elegir el color de fondo en lugar del blanco?",
        a: "En esta conversión el fondo transparente queda blanco. Si necesitas otro color, cámbialo en el propio SVG (con un editor de diseño) antes de convertir, o convierte a PNG si el destino lo acepta.",
      },
      {
        q: "¿JPG o PNG para un logo?",
        a: "PNG casi siempre: conserva la transparencia y los bordes nítidos. JPG solo si te lo exigen.",
      },
      {
        q: "¿Se suben mis archivos?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },

  "svg>pdf": {
    when: [
      "SVG a PDF es útil para mandar un gráfico, un plano o una ilustración como documento, para adjuntarlo a un informe o para que alguien sin programas de diseño pueda abrirlo e imprimirlo.",
    ],
    differences: [
      "SVG es un formato vectorial para la web; PDF es un formato de documento que también puede tener vectores. En esta conversión, sin embargo, el SVG se dibuja como imagen (PNG) dentro de una página del mismo tamaño.",
    ],
    kept: [
      "El aspecto del dibujo, con sus colores y formas, al tamaño del SVG.",
      "La transparencia, que en el PDF se ve sobre fondo blanco.",
    ],
    lost: [
      "El PDF no queda vectorial: si lo amplías mucho o lo imprimes en gran formato, se ven los píxeles. Si necesitas un PDF vectorial (para una imprenta, por ejemplo), expórtalo desde tu programa de diseño.",
      "El texto del SVG no se puede seleccionar en el PDF.",
      "Las imágenes y fuentes externas del SVG.",
    ],
    limits: [
      "La conversión se hace en tu navegador, sin subir los archivos. La página tiene el tamaño del SVG (1024 px si no define uno); para más resolución, convierte primero a PNG en un tamaño grande y pasa ese PNG a PDF.",
    ],
    steps: [
      "Elige el SVG.",
      "Deja PDF como formato de salida y haz clic en Convertir.",
      "Descarga el PDF y revísalo con el zoom al tamaño en que se va a usar.",
    ],
    faq: [
      {
        q: "¿El PDF conserva los vectores?",
        a: "No: el dibujo se guarda como imagen dentro del PDF. Para documentos en pantalla o impresión normal alcanza; para imprenta, exporta un PDF vectorial desde el programa de diseño.",
      },
      {
        q: "¿Cómo consigo más resolución?",
        a: "Convierte el SVG a PNG eligiendo un tamaño grande (por ejemplo, 3000 px) y después pasa ese PNG a PDF.",
      },
      {
        q: "¿Se suben mis archivos?",
        a: "No, la conversión se hace en tu navegador.",
      },
    ],
  },
};
