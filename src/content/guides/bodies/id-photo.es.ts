const body = `
Para el pasaporte, una visa, la licencia de conducir o un trámite en línea te piden casi siempre lo mismo: una foto de frente, sobre fondo claro y de una medida exacta. Con el celular, una pared lisa y buena luz puedes sacarla en casa, recortarla a la medida justa e imprimir varias copias en una sola foto de 10 × 15 cm. Esta guía explica cómo hacerlo y en qué fijarte para que no te la rechacen.

## Primero: qué medida te piden

Cada organismo fija sus propios requisitos (medida, fondo, tamaño de la cabeza, si se aceptan lentes), y cambian según el país y el trámite. Antes de sacar la foto, busca las instrucciones oficiales del trámite o pregunta en la oficina. Muchos documentos de identidad, además, ya se fotografían en el lugar y no necesitan que lleves nada.

Nuestra herramienta trae las medidas más pedidas:

| Medida | Uso habitual |
| --- | --- |
| 3 × 4 cm | Brasil (RG, CNH, carteira de trabalho) y muchos trámites en Chile, Colombia y otros países |
| 4 × 4 cm | Muchos trámites en Argentina (la «foto 4x4») |
| 3,5 × 4,5 cm | Pasaportes y visas que siguen el estándar internacional de la OACI, como el mexicano y los europeos |
| 2,5 × 3 cm | El «tamaño infantil» de México |
| 2 × 2 pulgadas (5,1 × 5,1 cm) | Pasaporte y visa de EE. UU. |

Si tu trámite pide otra medida, esta herramienta no la tiene: puedes recortar la foto a la proporción que quieras con [Recortar imagen](tool:crop-image) y llevarla a los píxeles exactos con [Redimensionar imagen](tool:resize-image).

## Cómo sacar la foto con el celular

Estos consejos sirven para casi cualquier documento; los detalles los define el organismo que la pide.

- **Luz pareja y de frente**: lo mejor es la luz de día, mirando hacia una ventana. Evita la luz de arriba (deja ojeras) y la que viene de un solo costado (media cara en sombra). El flash directo suele dejar brillos en la piel y una sombra marcada en la pared.
- **Fondo liso y claro**: una pared blanca o gris claro, sin cuadros, puertas ni enchufes detrás. Sepárate medio metro o más de la pared, así tu sombra no cae sobre ella.
- **Que te la saque otra persona**: con la cámara a la altura de los ojos y a un metro o más. Una selfie con el brazo estirado queda demasiado cerca y deforma la cara (la nariz se ve más grande). Si estás solo, apoya el celular en algo firme y usa el temporizador.
- **Expresión neutra**: de frente, mirando a la cámara, con la boca cerrada y los dos ojos bien abiertos. Sin gorra ni lentes oscuros, y con el pelo sin tapar la cara.
- **Sin filtros**: apaga el modo retrato, el embellecimiento y los filtros. Muchos organismos no aceptan fotos retocadas, y la herramienta tampoco retoca nada.
- **Varias tomas**: saca varias y quédate con la más nítida. No hace falta encuadrar con precisión: deja aire alrededor de la cabeza y los hombros, que el recorte se hace después.

## Cómo hacer la foto carnet paso a paso

1. Abre [Foto carnet](tool:id-photo) y elige la foto. Acepta JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF y el HEIC del iPhone, de hasta 50 MB.
2. En **Medida**, elige el tamaño que te piden, por ejemplo **4 × 4 cm** o **3,5 × 4,5 cm (pasaporte, OACI)**.
3. Mueve el recuadro y arrastra sus esquinas para que la cabeza quede dentro del óvalo y los ojos sobre la línea punteada.
4. Pulsa **Crear foto carnet**.
5. Descarga los dos archivos con **Descargar**, o juntos con **Descargar todo en ZIP**.

![Una foto ilustrada con el recuadro de 3,5 × 4,5 cm y el óvalo de guía sobre la cara](shot:foto-carnet-encuadrar "El recuadro mantiene la proporción de la medida elegida; el óvalo y la línea punteada indican dónde van la cabeza y los ojos.")

Todo se hace en tu navegador: la foto no se sube a ningún servidor.

Elige la medida antes de encuadrar: al cambiarla, el recuadro vuelve a centrarse con la nueva proporción y tendrás que ajustarlo otra vez.

## Encuadrar bien la cara

El recuadro siempre tiene la proporción de la medida elegida, así que no se puede deformar la cara al estirarlo. Para ajustarlo:

- **Con el dedo o el mouse**: arrastra el recuadro para moverlo y sus esquinas para agrandarlo o achicarlo.
- **Con el teclado**: las flechas lo mueven y **Mayús** + flechas cambian el tamaño.
- **Con números**: los campos **X**, **Y**, **Ancho** y **Alto** (en píxeles) sirven para ajustes finos.

La coronilla va cerca del borde superior del óvalo y la barbilla en el borde inferior. Lo que más importa es la altura, de la coronilla a la barbilla: es normal que el pelo o las orejas sobresalgan un poco por los costados. La línea vertical te ayuda a ver si la cabeza está centrada y derecha.

El óvalo ocupa el 72 % del alto de la foto: unos 32 mm en 3,5 × 4,5 cm, 29 mm en 3 × 4 y en 4 × 4 cm, y 37 mm en 2 × 2 pulgadas. Si las instrucciones de tu trámite indican cuánto debe medir la cabeza, compáralo con estos números y achica o agranda el recuadro según haga falta.

## Qué archivos descargas

![Los dos archivos listos: la foto sola y la hoja de 10 × 15 cm con 8 copias](shot:foto-carnet-resultado "La foto sola a 600 ppp y una hoja de 10 × 15 cm con todas las copias que entran.")

- **La foto sola**, en JPG a 600 ppp (por ejemplo, 827 × 1063 píxeles en 3,5 × 4,5 cm). Es la que subes a un trámite en línea o imprimes a su tamaño real.
- **Una hoja de 10 × 15 cm** a 300 ppp, con todas las copias que entran, separadas y con líneas grises de corte: 9 copias de 3 × 4 cm, 6 de 4 × 4 cm, 8 de 3,5 × 4,5 cm, 15 de 2,5 × 3 cm o 2 de 2 × 2 pulgadas.

Si la zona que encuadraste tiene poca resolución para imprimirse nítida (menos de 300 ppp), la herramienta te avisa. Pasa cuando la cara ocupa muy poco de la foto original: mejor vuelve a sacarla más de cerca.

## Cómo imprimirla

Lleva la hoja a un laboratorio, un kiosco de fotos o una impresora fotográfica y pide una copia de 10 × 15 cm (o 4 × 6 pulgadas), **sin recortar ni ajustar**: la hoja ya tiene esa medida y las copias salen exactas. Después corta por las líneas grises con tijera o, mejor, con cúter y regla.

Si imprimes la foto suelta en tu casa, elige **tamaño real** o 100 % en las opciones de la impresora, no «ajustar a la página»: el archivo lleva su resolución para que salga a la medida exacta.

## Si la pared no es lisa

La herramienta recorta y escala la foto tal como está: no cambia el fondo ni retoca la cara. Si no tienes una pared clara a mano, [Quitar fondo de imagen](tool:remove-background) puede ayudarte: en el modo **Personas (automático)** encuentra a la persona, y puedes descargarla con fondo **Blanco** o de otro **Color**, en JPG y del mismo tamaño que el original. Luego abre ese JPG en Foto carnet. La guía [Cómo quitar el fondo de una foto](guide:remove-background) lo explica en detalle.

Revisa bien el borde del pelo antes de usarla y ten en cuenta que algunos organismos rechazan fotos con el fondo cambiado. Si puedes, una pared clara sigue siendo la opción más segura. Si dejas el fondo transparente en un PNG, Foto carnet lo rellena de blanco.

## Si la vas a subir a un trámite en línea

Los portales suelen fijar un formato, unas medidas en píxeles y un peso máximo. La foto que descargas es un JPG a 600 ppp:

- Si piden **otras medidas en píxeles**, ajústala con [Redimensionar imagen](tool:resize-image).
- Si **pesa más de lo permitido**, redúcela con [Comprimir imagen](tool:compress-image).
- Si la foto que tienes es **HEIC** del iPhone, Foto carnet la abre directamente. Si además necesitas el original en JPG, la guía [Cómo pasar fotos HEIC a JPG](guide:heic-to-jpg) explica cómo.

Los archivos que genera Foto carnet se crean de nuevo a partir de los píxeles, así que no llevan los datos EXIF de la foto original, como el modelo del celular o la ubicación. Si vas a mandar la foto original tal cual, puedes quitárselos con [Quitar metadatos EXIF](tool:remove-exif).

## Resumen

- Confirma la medida y los requisitos con el organismo que pide la foto: cambian según el país y el trámite.
- Sácala de frente, con luz pareja, sobre una pared lisa y clara, a un metro o más y sin filtros.
- En [Foto carnet](tool:id-photo), elige la medida, encuadra la cabeza en el óvalo con los ojos en la línea y descarga.
- Obtienes la foto a 600 ppp para subir y una hoja de 10 × 15 cm con varias copias para imprimir sin ajustar.
- Si la pared no sirve, prueba [Quitar fondo de imagen](tool:remove-background), sabiendo que algunos organismos no aceptan fondos cambiados.
`;

export default body;
