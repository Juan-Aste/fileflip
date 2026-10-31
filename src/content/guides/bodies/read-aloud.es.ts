const body = `
Que la computadora o el teléfono te lean un texto sirve para mucho más de lo que parece: revisar un escrito y encontrar errores que al leer en silencio se te escapan, descansar la vista después de un día frente a la pantalla, escuchar un informe mientras cocinas o caminas, practicar la pronunciación de otro idioma, o simplemente leer con más comodidad si tienes dislexia o baja visión. Esta guía repasa las opciones que ya trae tu sistema y cómo hacerlo con nuestra herramienta [Leer texto en voz alta](tool:text-to-speech), que además lee archivos PDF, Word y fotos de documentos.

## Opción 1: lo que ya trae tu sistema

Todos los sistemas operativos actuales tienen una función para leer texto en voz alta. Conviene conocerlas porque funcionan en cualquier programa:

- **Windows**: el navegador Edge tiene **Leer en voz alta** (en el menú o con Ctrl + Mayús + U) para páginas web y para los PDF que abres con él. Para todo el sistema está el **Narrador** (Ctrl + Windows + Enter), pensado para personas ciegas, con muchos atajos.
- **Mac**: en **Ajustes del Sistema → Accesibilidad → Contenido leído**, activa **Leer selección**. Después seleccionas cualquier texto y pulsas Opción + Esc.
- **iPhone y iPad**: en **Ajustes → Accesibilidad → Contenido leído**, activa **Leer selección** (aparece «Leer» al seleccionar texto) y **Leer pantalla** (deslizas dos dedos hacia abajo desde arriba de la pantalla).
- **Android**: en **Ajustes → Accesibilidad**, activa **Seleccionar para pronunciar**. Los nombres pueden cambiar un poco según la marca del teléfono.
- **Microsoft Word**: en la pestaña **Revisar**, **Leer en voz alta** lee el documento desde donde está el cursor.

Estas funciones son prácticas para leer un párrafo suelto, pero tienen límites: no todas leen archivos que no estén abiertos, no resaltan la frase que se lee o no permiten guardar el audio.

## Opción 2: Leer texto en voz alta, en el navegador

[Leer texto en voz alta](tool:text-to-speech) reúne lo que suele faltar en una sola página:

- Lee **texto pegado** o **archivos**: TXT, Markdown, HTML, PDF con texto, Word (DOCX), EPUB y también fotos o escaneos de una página, cuyo texto reconoce con OCR.
- **Resalta la frase** que se está leyendo, para que sigas la lectura con la vista.
- Puedes **pausar**, volver a la frase anterior, saltar a la siguiente y elegir la **velocidad**, de 0,5× a 2×.
- Detecta el **idioma** del texto (español, inglés, portugués, francés o chino) y elige una voz en ese idioma.
- Con la **voz IA**, puedes **descargar la lectura como MP3**.

### Paso a paso

1. Abre [Leer texto en voz alta](tool:text-to-speech).
2. Pega el texto en el recuadro, o pulsa **Abrir archivo** y elige un PDF, un Word, un EPUB o una foto.
3. Elige el **tipo de voz**: **Voces del dispositivo** o **Voz IA**.
4. Revisa el idioma, la voz y la velocidad.
5. Pulsa **Reproducir**. Con la barra espaciadora pausas y reanudas.

![La herramienta Leer texto en voz alta con un texto pegado y la voz IA elegida](shot:leer-en-voz-alta "Puedes leer con las voces de tu dispositivo o con una voz IA más natural que además permite descargar MP3.")

El texto se extrae y se lee en tu dispositivo: el archivo no se sube a ningún servidor. Admite hasta 50.000 caracteres por lectura, unas 15 a 20 páginas de texto corrido; si el texto es más largo, se recorta y te avisa.

## Voces del dispositivo o voz IA

**Voces del dispositivo**: son las que trae tu sistema o tu navegador. Empiezan a leer al instante y no descargan nada. Su calidad depende mucho del equipo: en un Mac o un iPhone suelen sonar bien; en algunos Windows o Android, más robóticas. Si en tu idioma no hay ninguna voz instalada, la herramienta te lo avisa y puedes instalar voces desde la configuración de tu sistema.

Un detalle de privacidad: algunas voces del navegador, marcadas como **«en línea»** (como las de Google o Microsoft en Chrome y Edge), envían el texto a ese proveedor para generar el audio. Si el texto es privado, elige una voz que no diga «en línea».

**Voz IA**: es un modelo de síntesis de voz (Supertonic 3) que funciona dentro de tu navegador. Suena más natural, tiene 10 voces y permite **descargar MP3**. A cambio:

- La primera vez descarga unos 400 MB (después queda guardado en el navegador).
- Genera el audio con el procesador de tu equipo: en una computadora tarda más o menos lo mismo que dura el audio; en un celular, bastante más.
- Está disponible en español, inglés, portugués y francés. El chino se lee con las voces del dispositivo.

Si vas a escuchar algo una vez, en el momento, las voces del dispositivo alcanzan. Si quieres un audio para escuchar después, en el auto o en el teléfono sin conexión, usa la voz IA y descarga el MP3.

## Cómo escuchar un PDF

Abre el PDF con **Abrir archivo**. Si el PDF tiene texto digital, se extrae al instante. Algunos consejos:

- Los **encabezados y números de página** que se repiten en cada hoja aparecen en el texto. Puedes borrarlos en el recuadro antes de reproducir.
- Si el PDF es **escaneado**, no tiene texto y la herramienta te lo avisa. Pásalo antes por [OCR de PDF escaneado](tool:ocr-pdf) y abre el PDF que te devuelve, o sácale una foto a la página y ábrela directamente: la herramienta reconoce el texto de imágenes.
- Un **libro en EPUB** se abre directamente, salvo que tenga protección anticopia (DRM), como muchos libros comprados en tiendas.

## Usos que vale la pena probar

- **Corregir lo que escribiste**: escuchar un texto propio a velocidad normal revela palabras repetidas, frases demasiado largas y errores que la vista se saltea.
- **Estudiar**: escuchar un apunte mientras lo sigues con la vista ayuda a fijarlo. A 1,25× o 1,5× rinde más el tiempo.
- **Idiomas**: elige la voz del idioma que estudias y baja la velocidad para escuchar la pronunciación.
- **Accesibilidad**: para personas con dislexia, baja visión o fatiga visual, la lectura con resaltado de la frase hace más cómodos los textos largos.

## Si publicas el audio

Puedes usar el MP3 generado con la voz IA, pero la licencia del modelo pide indicar que es una voz generada por inteligencia artificial y prohíbe usarlo para suplantar a personas, difamar, acosar o engañar. El enlace a la licencia completa está junto al botón de descarga.

## El camino inverso

Si lo que necesitas es lo contrario, pasar a texto lo que alguien dijo en un audio o una nota de voz, la guía [Cómo transcribir un audio o una nota de voz a texto gratis](guide:transcribe-audio) explica cómo hacerlo con [Transcribir audio a texto](tool:audio-to-text), también en tu navegador.

## Resumen

- Tu sistema ya trae lectura en voz alta: Edge y Narrador en Windows, «Contenido leído» en Mac y iPhone, «Seleccionar para pronunciar» en Android.
- [Leer texto en voz alta](tool:text-to-speech) lee texto, PDF, Word, EPUB y fotos, resalta la frase y deja elegir la velocidad, sin subir el archivo.
- Las voces del dispositivo empiezan al instante; la voz IA suena más natural y permite descargar MP3.
- Evita las voces «en línea» si el texto es privado.
`;

export default body;
