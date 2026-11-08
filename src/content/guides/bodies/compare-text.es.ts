const body = `
Te devuelven un contrato «con unos pequeños ajustes», un compañero te pasa la versión final del trabajo práctico o sale la nueva redacción de un reglamento. Leer las dos versiones una al lado de la otra y buscar las diferencias a ojo es lento y poco fiable: un número cambiado o un «no» agregado se pasan por alto con facilidad. Esta guía explica cómo comparar dos textos y ver exactamente qué se agregó, qué se quitó y qué cambió, y qué hacer cuando las versiones vienen en PDF o en Word.

## Cómo comparar dos textos paso a paso

1. Abre [Comparar textos](tool:compare-text).
2. Pega la versión anterior en **Texto original** y la versión nueva en **Texto nuevo**. Si las tienes como archivo de texto, usa **Abrir archivo** encima de cada cuadro.
3. En **Comparar por**, elige **Líneas** o **Palabras** (más abajo se explica cuándo conviene cada uno).
4. Si quieres, marca **No distinguir mayúsculas de minúsculas** o **Ignorar espacios de más**.
5. Pulsa **Comparar** y revisa el resultado en **Diferencias**.

![Dos versiones de un contrato comparadas por líneas: los montos, el plazo y una cláusula nueva aparecen marcados](shot:comparar-textos-lineas "Por líneas: en rojo lo que estaba en el texto original, en verde lo que trae el texto nuevo.")

Arriba del resultado aparece un resumen, por ejemplo «3 líneas cambiadas, 1 agregada y ninguna eliminada», que sirve para saber de un vistazo cuánto se tocó. Si los dos textos coinciden, dice «Los textos son iguales.».

La comparación se hace en tu navegador: los textos no se suben a ningún servidor. El resultado no se actualiza solo: si corriges algo en uno de los cuadros, vuelve a pulsar **Comparar**.

## Cómo leer el resultado

La herramienta marca las diferencias con dos colores y, en las palabras, también con tachado y subrayado, para que se distingan aunque no veas bien los colores:

- **Rojo** (las palabras, además, tachadas): lo que estaba en el texto original y ya no está.
- **Verde** (las palabras, además, subrayadas): lo que aparece en el texto nuevo.
- Sin marca: lo que no cambió.

En el modo **Líneas**, cada renglón lleva dos números: a la izquierda, su número en el texto original; a la derecha, en el texto nuevo. Las líneas con «−» y fondo rojo son del original; las que tienen «+» y fondo verde, del nuevo. Cuando una línea cambió, la herramienta muestra la versión vieja y la nueva y, dentro de ellas, resalta solo las palabras que cambiaron; una línea agregada o quitada entera aparece solo con su fondo de color. En la captura, de la cláusula 2 solo están marcados «200» → «500» y «dos» → «tres».

El botón **Intercambiar** pasa el texto original al otro cuadro y viceversa. Sirve si los pegaste al revés; después vuelve a pulsar **Comparar**.

## ¿Por líneas o por palabras?

**Líneas** es el modo de siempre en los comparadores de código y el mejor cuando el texto está organizado en renglones: listas, cláusulas numeradas, artículos de una ley, código, datos o subtítulos.

**Palabras** muestra el texto nuevo completo, como un párrafo corrido, con las palabras quitadas y agregadas marcadas en su lugar. Los saltos de línea y los espacios no cuentan como cambios. Es el modo más cómodo para prosa: un ensayo, un artículo, un trabajo práctico, una carta. También es el que conviene cuando el texto sale de un PDF, porque ahí los renglones se cortan donde terminaba la línea en la página, y si una versión se reacomodó, en el modo por líneas parecería que cambió todo. El resumen, en este modo, cuenta palabras agregadas y eliminadas.

![Un párrafo comparado por palabras: se ven las palabras quitadas tachadas y las agregadas subrayadas](shot:comparar-textos-palabras "Por palabras: el texto nuevo con los cambios marcados en su lugar.")

## Las dos opciones para ignorar diferencias

- **No distinguir mayúsculas de minúsculas**: «Contrato» y «CONTRATO» cuentan como iguales. Útil si en una versión se pusieron los títulos en mayúsculas y no quieres que eso tape los cambios de contenido.
- **Ignorar espacios de más**: en el modo **Líneas**, no cuentan los espacios al principio y al final de cada renglón ni los espacios dobles dentro de él. Es la opción para código reindentado o para un texto copiado de un lugar que agrega espacios. En el modo **Palabras** los espacios ya no cuentan, así que esta casilla no cambia nada.

## Si las versiones están en PDF o en Word

**Abrir archivo** acepta solo archivos de texto: .txt, .md, .csv, .tsv, .json, .html, .xml, .srt, .vtt y .log, de hasta 2 millones de caracteres, y detecta la codificación automáticamente. No abre PDF ni Word directamente, así que primero hay que sacar el texto:

- **PDF con texto seleccionable** (el que genera un procesador de textos o un sistema): pásalo por [PDF a texto](tool:pdf-to-text). Acepta varios PDF a la vez; descarga el .txt de cada versión y ábrelo con **Abrir archivo**. Si activas **Marcar el comienzo de cada página**, el texto incluye una marca por página, lo que ayuda a ubicar en qué hoja está cada cambio.
- **PDF escaneado** (las páginas son fotos): usa [OCR de PDF escaneado](tool:ocr-pdf), elige el **Idioma del texto** y, en **Resultado**, **Solo el texto (.txt)**. Procesa hasta 100 páginas por PDF.
- **Foto de una hoja impresa**: [Imagen a texto (OCR)](tool:image-to-text) saca el texto de la imagen.
- **Word**: abre el documento, selecciona todo (Ctrl+A), cópialo y pégalo en el cuadro. Un párrafo de Word queda como una línea, así que con párrafos largos el modo **Palabras** se lee mejor.

Con texto reconocido por OCR, ten en cuenta que el reconocimiento puede confundir algún carácter («l» por «1», una coma por un punto). Si aparece un cambio raro, revísalo en el documento original antes de darlo por cierto.

Cuando encuentres lo que hay que corregir en un PDF, puedes hacerlo con [Editar PDF](tool:edit-pdf); la guía [Cómo pasar un PDF a Word](guide:pdf-to-word) explica qué hacer si prefieres editarlo en Word.

## Casos de uso concretos

- **Un contrato que te devuelven corregido**: compara por **Líneas** o por **Palabras** y concéntrate en montos, fechas, plazos y palabras como «no», «solo» o «salvo», que cambian el sentido con muy poco. Antes de firmar, la guía [Cómo firmar un PDF](guide:sign-pdf) explica el paso siguiente.
- **Un trabajo práctico o una tesis**: compara la versión que entregaste con la corregida por **Palabras** para ver todo lo que tocó tu docente o tu compañero.
- **Un texto legal o un reglamento**: con artículos numerados, el modo **Líneas** muestra qué artículos se agregaron, cuáles se quitaron y qué palabras cambiaron en cada uno.
- **Código o archivos de configuración**: compara por **Líneas**, marca **Ignorar espacios de más** si cambió la indentación y, si necesitas compartir el cambio, pulsa **Descargar .diff**. Ese archivo está en el formato unificado que leen git y las herramientas de revisión. Ojo: el .diff registra todos los cambios, también los de mayúsculas o espacios que hayas pedido ignorar en pantalla.
- **Dos listas** (de invitados, de productos): ordénalas primero con [Quitar líneas duplicadas](tool:remove-duplicate-lines), con **A → Z** en **Ordenar**, y luego compáralas por líneas. Así ves qué elementos faltan en una u otra sin que el orden distinto ensucie el resultado.

Si los textos casi no tienen nada en común, la comparación por líneas se detiene y muestra un aviso: en ese caso, compara por partes más cortas, por ejemplo capítulo por capítulo.

## Otras herramientas útiles

- [Contador de palabras y caracteres](tool:word-counter): para comprobar si la versión nueva sigue dentro del límite de palabras de una entrega o de un formulario.
- [Convertir mayúsculas y minúsculas](tool:case-converter): para unificar títulos en mayúsculas o en minúsculas en la versión final.

## Resumen

- Pega las dos versiones en [Comparar textos](tool:compare-text) y pulsa **Comparar**: en rojo tachado lo que se quitó, en verde subrayado lo que se agregó.
- **Líneas** para listas, cláusulas y código; **Palabras** para prosa y para texto sacado de un PDF.
- Para PDF o Word, saca primero el texto con PDF a texto, OCR de PDF escaneado o copiando y pegando.
- Todo se hace en tu navegador, sin subir los textos.
`;

export default body;
