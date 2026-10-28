const body = `
JPG, PNG, WebP y AVIF sirven para lo mismo, guardar una imagen, pero cada uno resuelve un problema distinto. Elegir mal tiene consecuencias concretas: una foto en PNG que pesa diez veces más de lo necesario, un logo en JPG con manchas alrededor de las letras o una imagen en AVIF que el formulario de un trámite rechaza. Esta guía te ayuda a decidir con datos medidos con nuestras propias herramientas, no con generalidades.

## La respuesta corta

- **Fotos para mandar, subir a un formulario o imprimir**: JPG. Lo abre absolutamente todo.
- **Capturas de pantalla, logos, gráficos o imágenes con fondo transparente**: PNG.
- **Imágenes para una página web**: WebP, o AVIF si quieres el archivo más liviano posible.
- **Si no sabes qué programa o persona va a abrir el archivo**: JPG para fotos y PNG para todo lo demás.

El resto de la guía explica por qué y muestra cuánto cambia el peso en cada caso.

## Qué hace distinto a cada formato

**JPG** (o JPEG) usa compresión con pérdida: descarta detalles que el ojo casi no percibe y logra archivos chicos con fotos. Es el formato más compatible que existe, pero no admite transparencia y, en zonas con bordes nítidos, como letras o líneas finas, la compresión deja pequeñas manchas alrededor. Cada vez que vuelves a guardar un JPG pierde un poco más de calidad.

**PNG** no pierde nada: la imagen que sale es exactamente la que entró, píxel por píxel. Admite transparencia y conserva los bordes nítidos, por eso es el formato natural de las capturas de pantalla y los logos. El precio es el peso: con fotos, un PNG es enorme.

**WebP** es un formato más moderno que puede comprimir con o sin pérdida y admite transparencia. Con fotos pesa algo menos que un JPG de calidad parecida y lo abren todos los navegadores actuales. Algunos programas de escritorio y sitios todavía no lo aceptan.

**AVIF** es el más nuevo de los cuatro. Comprime bastante más que JPG y WebP, admite transparencia y lo abren los navegadores actuales, pero tarda más en generarse y es el que menos programas y formularios aceptan.

## Lo que medimos con una foto

Tomamos una foto de dominio público de la NASA, la llevamos al tamaño de una foto de celular (12 megapíxeles, 3024 × 4032) y guardada como JPG pesaba 2,4 MB. Después la convertimos con nuestro conversor (el mismo de [JPG a AVIF](conv:jpg-avif)) a cada formato, con la calidad que viene elegida por defecto (82 sobre 100):

| Formato | Peso | Comparado con el JPG |
| --- | --- | --- |
| JPG | 822 KB | — |
| WebP | 763 KB | 7 % menos |
| AVIF | 329 KB | 60 % menos |
| PNG | 23,4 MB | 28 veces más |

Mirando la foto entera en la pantalla no se distinguen. Ampliando al 100 %, el AVIF suaviza un poco el detalle fino de las zonas oscuras (el follaje, en esta foto); el JPG y el WebP lo conservan algo mejor. Para una foto que se va a ver en un celular o en una página web, esa diferencia no importa; para una foto que vas a recortar o imprimir en grande, sí.

El PNG es el ejemplo de lo que no hay que hacer: guarda cada píxel sin pérdida, incluido el ruido natural de la foto, y termina pesando más que el JPG original del que partió.

También medimos el tiempo, en una computadora de escritorio: el JPG y el WebP tardaron unos 3 segundos y el AVIF, 7,5. En un celular todo tarda más, y con AVIF se nota.

## Lo que medimos con una captura de pantalla

Con una captura de pantalla de nuestro sitio (texto, íconos y fondos lisos, 2560 × 1600 píxeles) el resultado se da vuelta. El PNG que genera el navegador pesaba 363 KB; convertida a JPG pesó 184 KB, a WebP 117 KB y a AVIF 68 KB.

Los formatos con pérdida pesan menos, pero en una captura los bordes de las letras son justo lo que la compresión con pérdida maltrata: ampliando se ven halos alrededor del texto. Por eso, si la captura es para documentar algo, para un tutorial o para que alguien lea lo que dice, conviene dejarla en PNG. Si es para una web donde el peso importa, WebP es un buen punto medio.

## Transparencia: cuándo el formato decide por ti

Si la imagen tiene fondo transparente, como un logo para poner sobre otro color, una firma recortada o una imagen a la que le [quitaste el fondo](tool:remove-background), **no la guardes en JPG**. JPG no tiene transparencia: nuestro conversor rellena el fondo de blanco y, si después la pones sobre un fondo oscuro, aparece un recuadro blanco.

Para transparencia usa PNG si la imagen va a un documento o a otro programa, y WebP o AVIF si va a una página web.

## Compatibilidad: quién abre cada formato

- **JPG y PNG**: cualquier computadora, celular, programa, impresora, red social o formulario.
- **WebP**: todos los navegadores actuales y la mayoría de las redes sociales. Algunos programas de edición antiguos y algunos formularios web no lo aceptan.
- **AVIF**: los navegadores actuales. Muchos programas y formularios todavía no lo reconocen.

Una regla práctica: si el archivo va a salir de tu control (lo mandas por correo, lo sube otra persona a un trámite, lo imprime una fotocopiadora), usa JPG o PNG. Los formatos nuevos dan su mejor resultado cuando tú controlas dónde se muestran, como en tu propia web.

## Cómo convertir entre formatos

1. Abre el conversor (por ejemplo, [JPG a WebP](conv:jpg-webp) o [PNG a JPG](conv:png-jpg)) y arrastra una o varias imágenes.
2. Elige el formato de salida.
3. Si quieres, abre **Opciones** para ajustar la calidad o achicar la imagen. Menos calidad significa un archivo más liviano.
4. Pulsa **Convertir** y descarga cada imagen, o todas juntas en un ZIP.

![El conversor de imágenes con una foto lista para convertir](shot:formatos-convertir "Las imágenes se convierten en tu navegador: no se suben a ningún servidor.")

La conversión se hace en tu propio navegador, así que las fotos no salen de tu dispositivo. Puedes convertir hasta 50 imágenes por vez.

## Si lo que quieres es que pese menos

Cambiar de formato es una forma de reducir el peso, pero no la única. Si un formulario te pide una foto de menos de 200 KB, [Comprimir imagen](tool:compress-image) te deja indicar ese peso exacto: busca la mejor calidad que entra en él y, si no alcanza, achica la imagen. También puedes [cambiar el tamaño](tool:resize-image) en píxeles: una foto de 12 megapíxeles es mucho más de lo que se necesita para verla en una pantalla, y bajarla a 2000 píxeles de ancho reduce el peso más que cualquier cambio de formato.

Si tus fotos vienen del iPhone en formato HEIC, primero hay que pasarlas a JPG, que es lo que aceptan casi todos los formularios. La guía [Cómo pasar fotos HEIC del iPhone a JPG](guide:heic-to-jpg) explica cómo hacerlo.

## Resumen

- Foto que va a cualquier lado: **JPG**.
- Captura, logo, gráfico o transparencia: **PNG**.
- Web propia: **WebP**, o **AVIF** para el menor peso.
- Nunca guardes una foto en PNG ni un logo con transparencia en JPG.
- Para un peso exacto, usa Comprimir imagen en lugar de probar formatos.
`;

export default body;
