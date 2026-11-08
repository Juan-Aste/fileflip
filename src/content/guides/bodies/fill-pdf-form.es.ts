const body = `
Una inscripción, una solicitud de beca, una declaración jurada o una ficha de cliente: muchos trámites llegan como un PDF que hay que completar y devolver. Imprimirlo, llenarlo a mano y escanearlo funciona, pero da un resultado difícil de leer. Si el PDF es un formulario con campos, puedes completarlo directamente en la computadora o en el celular y devolverlo con los datos escritos a máquina. Esta guía explica cómo hacerlo, qué significa «aplanar» el formulario y qué hacer cuando el PDF no tiene campos.

## Antes de empezar: ¿tu PDF tiene campos?

No todos los formularios en PDF son iguales:

- **Formulario con campos** (también llamado AcroForm): al abrirlo en un lector de PDF, los recuadros se pueden seleccionar y escribir en ellos. Es lo habitual en los formularios que publican organismos, bancos y escuelas para descargar.
- **Formulario «plano»**: solo tiene líneas o recuadros dibujados. Es un papel escaneado o un documento exportado sin campos. No hay nada que rellenar: hay que escribir encima.
- **Formulario XFA**: un formato antiguo de Adobe (LiveCycle) que solo Adobe Acrobat rellena bien. Es poco común, pero todavía aparece en algunos trámites.

No hace falta averiguarlo antes: al abrir el PDF, la herramienta te dice cuántos campos encontró, o te avisa si no tiene ninguno o si es XFA.

## Cómo rellenar un formulario PDF paso a paso

1. Abre [Rellenar formulario PDF](tool:fill-pdf-form) y elige el PDF, o arrástralo al recuadro.
2. Espera el mensaje «Encontramos… campos». Los campos aparecen ordenados por página (**Página 1**, **Página 2**…) y al lado se ve la página del PDF.
3. Completa cada campo. Al seleccionar uno, su recuadro se resalta en la vista previa; también puedes tocar un recuadro de la vista previa para ir directo a ese campo.
4. Si quieres que los datos queden fijos, marca **Aplanar el formulario**. Si no, déjalo sin marcar.
5. Pulsa **Guardar PDF** y después **Descargar**.

![Formulario de inscripción con el nombre, la fecha, el correo, el turno y el nivel completados, junto a la vista previa de la página](shot:rellenar-formulario-campos "Cada campo del PDF aparece como un campo normal; la vista previa marca el que estás completando.")

Todo ocurre en tu navegador: el PDF y tus datos no se suben a ningún servidor. El archivo descargado conserva el nombre original con «-filled» al final, o «-flattened» si lo aplanaste.

## Qué tipos de campos se pueden completar

La herramienta reconoce los campos estándar de un formulario PDF y los muestra con el control que corresponde:

- **Cuadros de texto**, de una línea o de varias (para comentarios o direcciones). Si el autor del formulario limitó la cantidad de caracteres, debajo aparece «Máximo… caracteres» y no se puede escribir más.
- **Casillas de verificación**, como «Acepto los términos».
- **Botones de opción**, cuando hay que elegir una sola alternativa (turno, estado civil, sí o no). Si marcaste una por error, **Quitar selección** la deja en blanco.
- **Listas desplegables** y **listas de selección**. «— Sin elegir —» deja la lista vacía; en las listas que admiten varias opciones, cada una aparece con su casilla.

Los campos de **solo lectura** se muestran, pero no se pueden cambiar: conservan el valor que puso quien hizo el formulario.

El nombre de cada campo es el texto de ayuda que escribió el autor del formulario. Si no escribió ninguno, se usa el nombre interno del campo, que a veces es algo poco claro como «Text1» o «campo 7». En ese caso, guíate por la vista previa: al seleccionar el campo verás en qué parte de la página está.

## Aplanar o dejarlo editable

Al guardar tienes dos opciones:

- **Sin aplanar**: el PDF sigue siendo un formulario. Puedes volver a abrirlo (en esta herramienta o en cualquier lector) para corregir un dato, o mandárselo a otra persona para que complete su parte.
- **Aplanado**: lo que escribiste pasa a formar parte del dibujo de la página. Se ve igual en cualquier lector y al imprimir, y ya nadie puede cambiar los valores con un clic.

Aplana el formulario cuando ya está terminado y lo vas a entregar. Antes de aplanar, guarda también una copia sin aplanar: si después encuentras un error, la corriges ahí en lugar de empezar de cero.

Un detalle: los valores se dibujan con la fuente estándar del formulario, que solo conoce el alfabeto latino. Los acentos y la ñ no dan problemas, pero si un campo tiene caracteres chinos o emojis, el PDF se guarda con los valores sin aplanar y la herramienta te avisa qué campos son. Chrome, Firefox, Acrobat y Vista Previa los muestran igual.

## Rellenar un formulario PDF desde el celular

La herramienta funciona en el navegador del celular, sin instalar ninguna app:

- **Elegir el archivo**: al tocar el recuadro puedes abrir el PDF desde Descargas, Archivos o Google Drive. Si te lo mandaron por WhatsApp o por correo, descárgalo primero.
- **Completar**: en pantallas angostas la lista de campos va primero y la vista previa de la página queda debajo. Escribe en los campos de la lista, que es más cómodo que apuntar a los recuadros de la página.
- **Guardar**: al tocar **Descargar**, el PDF queda en la carpeta de descargas del celular, listo para adjuntarlo o compartirlo.

## Si dice que el PDF no tiene campos

![Aviso de que el PDF no tiene campos de formulario, con el enlace para abrir Editar PDF](shot:rellenar-formulario-sin-campos "Si el PDF no tiene campos, la herramienta lo dice y te lleva a Editar PDF.")

Es lo que pasa con los formularios escaneados o hechos solo con líneas. En ese caso, usa [Editar PDF](tool:edit-pdf): tocas el lugar de la página donde quieres escribir y agregas el texto encima, en una o varias páginas. La guía [Cómo editar un PDF gratis sin instalar nada](guide:edit-pdf) lo explica paso a paso.

Si el formulario es un papel que tienes en la mano, primero conviértelo en PDF con [Escanear documento](tool:scan-document) y después completa los datos con Editar PDF.

## Formularios XFA, con contraseña o con campo de firma

- **XFA**: si el PDF es solo XFA, la herramienta te lo avisa y te ofrece **Abrir Editar PDF** para escribir sobre la página. Si el PDF trae además la versión estándar de los campos, completa esa y quita la parte XFA, para que nadie vea datos viejos en Acrobat.
- **Con contraseña de apertura**: no se puede leer hasta quitarla. Hazlo con [Quitar contraseña de un PDF](tool:unlock-pdf), que te pide la contraseña, y vuelve a abrir el PDF desbloqueado. Los PDF que solo tienen restricciones de permisos, sin contraseña de apertura (muy comunes en formularios oficiales), se abren sin que tengas que hacer nada.
- **Con campo de firma digital**: la herramienta lo detecta, pero no lo completa, porque una firma digital necesita un certificado. Si lo que te piden es tu firma manuscrita, usa [Firmar PDF](tool:sign-pdf) después de completar los datos.

## Firmarlo y mandarlo

El orden recomendado es: completar, aplanar y firmar. Así los datos y la firma quedan fijos en la página. Para firmar sin imprimir, sigue la guía [Cómo firmar un PDF sin imprimirlo](guide:sign-pdf).

Antes de mandarlo, abre el PDF descargado y revisa que todos los datos estén donde deben. Si pesa demasiado para el correo, [Comprimir PDF](tool:compress-pdf) lo achica; la guía [Cómo reducir el peso de un PDF](guide:reduce-pdf-size) explica qué nivel elegir.

## Resumen

- [Rellenar formulario PDF](tool:fill-pdf-form) completa los campos de texto, casillas, opciones y listas de un PDF en tu navegador, sin subirlo.
- La vista previa marca dónde está cada campo en la página.
- Aplana el formulario cuando esté terminado; guarda también una copia editable.
- Si el PDF no tiene campos o es XFA, escribe sobre la página con Editar PDF.
- Si tiene contraseña, quítala primero; para firmarlo, usa Firmar PDF después de completarlo.
`;

export default body;
