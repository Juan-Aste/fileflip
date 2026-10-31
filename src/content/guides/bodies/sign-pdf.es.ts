const body = `
Te mandan un contrato, una autorización o un formulario en PDF y te piden que lo devuelvas firmado. El camino clásico es imprimirlo, firmarlo a mano, escanearlo o sacarle una foto y volver a armar el PDF. Funciona, pero lleva tiempo y el resultado suele verse torcido y gris. Esta guía explica cómo poner tu firma directamente en el PDF, desde la computadora o el celular, y qué diferencia hay entre esta firma y una firma digital con certificado.

## Antes de empezar: qué tipo de firma te piden

Conviene aclararlo primero, porque son cosas distintas:

- **Firma manuscrita en el PDF**: es la imagen de tu firma colocada sobre la página, igual que si firmaras el papel y lo escanearas. Es lo que hace nuestra herramienta y lo que alcanza en muchos acuerdos privados, autorizaciones, constancias y formularios.
- **Firma digital con certificado**: usa un certificado emitido por una entidad autorizada (en un token, una tarjeta o una app oficial) y queda registrada criptográficamente dentro del PDF. Cualquier cambio posterior la invalida. La piden muchos trámites oficiales y algunos contratos.

La validez legal de cada una depende del país y del trámite. Si el organismo o la empresa te pide «firma digital», una imagen de tu firma no la reemplaza; si te pide que «firmes y devuelvas el PDF», la firma manuscrita suele ser suficiente. Ante la duda, pregunta a quien te lo pidió.

## Cómo firmar un PDF paso a paso

1. Abre [Firmar PDF](tool:sign-pdf) y elige el PDF.
2. En **Tu firma**, elige **Dibujarla** y firma con el dedo, el mouse o un lápiz en el recuadro; o elige **Subir una foto o imagen** de tu firma en papel.
3. Elige el **color de la tinta** (azul o negro) y pulsa **Usar esta firma**.
4. Ve a la página donde va la firma con las flechas y **toca el lugar** donde quieres ponerla, o arrástrala.
5. Ajusta el **tamaño de la firma** con el control deslizante.
6. Pulsa **Firmar y descargar**.

![Una firma dibujada colocada sobre la línea de firma de una autorización](shot:firmar-pdf-colocar "La firma se coloca tocando la página; después puedes moverla y cambiar su tamaño.")

Todo se hace en tu navegador: ni el documento ni tu firma salen de tu dispositivo, y no guardamos tu firma. Por eso, la próxima vez tendrás que dibujarla o subirla de nuevo.

## Dibujarla o subir una foto

**Dibujarla** es lo más rápido. En el celular, con el dedo, queda bastante natural; con el mouse cuesta más. Si tienes una tableta con lápiz, es la mejor opción.

**Subir una foto** da el resultado más parecido a tu firma en papel:

1. Firma sobre una hoja **blanca y lisa**, con un bolígrafo de tinta oscura (azul o negra).
2. Sácale una foto **con buena luz**, de frente y sin sombras.
3. Súbela con **Subir una foto o imagen** y deja marcado **Quitar el fondo blanco del papel**.

La herramienta quita el blanco del papel y recorta los bordes para que quede solo el trazo, con fondo transparente. Así la firma se ve limpia sobre la línea del documento, sin un recuadro blanco alrededor. Acepta PNG, JPG o WEBP de hasta 10 MB.

## Colocarla bien

- **Tamaño**: una firma real ocupa entre un cuarto y un tercio del ancho de una hoja A4. El control indica el tamaño como porcentaje del ancho de la página.
- **Posición**: apunta a que el trazo quede apoyado sobre la línea de firma, no flotando encima.
- **Con el teclado**: selecciona la firma con Tab y muévela con las flechas; con Mayús se mueve más rápido. Es útil para ajustar al milímetro.

## Firmar varias páginas

La herramienta pone la firma en una página por vez. Si el documento pide firma en varias hojas (por ejemplo, en cada página de un contrato), firma la primera, descarga el PDF y vuelve a abrir ese PDF ya firmado para firmar la siguiente.

Si además tienes que poner tus **iniciales** en cada página o agregar texto como tu nombre, tu número de documento o la fecha, usa [Editar PDF](tool:edit-pdf): permite escribir texto en cualquier lugar de la página, en varias páginas, y también agregar una imagen, como tu firma guardada como PNG.

## Si el PDF es un formulario

Muchos formularios en PDF tienen campos para completar (casillas, cuadros de texto, listas). Completa primero los datos con [Rellenar formulario PDF](tool:fill-pdf-form) y guarda el PDF aplanado, y después fírmalo. Así los datos y la firma quedan fijos en la página y se ven igual en cualquier lector o impresora.

Si el formulario no tiene campos, sino solo líneas para escribir a mano, completa los datos con [Editar PDF](tool:edit-pdf).

## Después de firmar

- **Revisa el resultado** antes de mandarlo: abre el PDF descargado y comprueba que la firma esté en la página y el lugar correctos.
- **Si pesa demasiado** para mandarlo por correo, [Comprimir PDF](tool:compress-pdf) lo reduce. La guía [Cómo reducir el peso de un PDF](guide:reduce-pdf-size) explica qué nivel elegir.
- **Si es confidencial**, puedes agregarle una contraseña de apertura con [Proteger PDF](tool:protect-pdf) y mandar la contraseña por otro medio.

La firma queda dibujada sobre la página como una imagen, así que se ve igual en cualquier lector de PDF y al imprimir. Ten en cuenta que, a diferencia de una firma digital con certificado, no impide que alguien modifique el documento después: guarda una copia del PDF que enviaste.

## Resumen

- [Firmar PDF](tool:sign-pdf) pone tu firma manuscrita en el PDF, sin imprimir ni escanear, y sin subir nada.
- Dibuja la firma o sube una foto sobre papel blanco: el fondo se quita solo.
- Firma una página por vez; para más páginas, vuelve a abrir el PDF firmado.
- Completa los formularios antes de firmar, con Rellenar formulario PDF o Editar PDF.
- Una firma manuscrita en el PDF no es una firma digital con certificado: si te piden esa, no la reemplaza.
`;

export default body;
