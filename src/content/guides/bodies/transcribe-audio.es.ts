const body = `
Pasar a texto una nota de voz larga, la grabación de una clase o una entrevista era hasta hace poco un trabajo de escucha y tipeo, o un servicio pago al que había que subir el audio. Hoy un modelo de reconocimiento de voz puede hacerlo en tu propia computadora o teléfono, gratis y sin que el audio salga de tu dispositivo. Esta guía explica cómo usar nuestra herramienta [Transcribir audio a texto](tool:audio-to-text), qué esperar del resultado y cómo sacar el archivo de audio de WhatsApp o del iPhone.

## Cómo funciona: Whisper en tu navegador

La herramienta usa **Whisper**, el modelo de reconocimiento de voz que publicó OpenAI con licencia libre. En lugar de mandar tu audio a un servidor, el modelo se descarga una vez a tu navegador y la transcripción se hace con el procesador de tu equipo.

Eso tiene dos consecuencias prácticas:

- **Privacidad**: el audio no se sube a ningún lado. Lo único que se descarga es el modelo, desde Hugging Face, la primera vez que lo usas; después queda guardado en el navegador.
- **Velocidad variable**: depende de tu equipo. Una computadora actual transcribe más rápido que lo que dura el audio; un celular, más despacio.

## Paso a paso

1. Abre [Transcribir audio a texto](tool:audio-to-text) y elige el archivo de audio o de video. Verás su duración.
2. Elige el **modelo**: **Rápido** o **Preciso (más lento)**. Al lado se ve cuánto pesa la descarga, o «ya descargado» si ya lo usaste.
3. Elige el **idioma del audio**, o deja **Detectar automáticamente**.
4. Pulsa **Transcribir**. Verás el progreso y el tiempo que falta; puedes cancelar cuando quieras.
5. Revisa el texto, corrige lo que haga falta y cópialo o descárgalo como **TXT**, **SRT** o **VTT**.

![Una nota de voz transcrita, con el texto editable y los botones para descargar](shot:transcribir-resultado "Un audio de 36 segundos transcrito con el modelo rápido: cada línea es una frase con su tiempo.")

Acepta audio (MP3, WAV, M4A, OGG, OPUS, FLAC y otros) y video (MP4, MOV, MKV, WEBM; se transcribe su sonido), hasta 30 minutos por archivo.

## Rápido o preciso: cuál elegir

| | Rápido | Preciso |
| --- | --- | --- |
| Modelo | Whisper tiny | Whisper base |
| Descarga (una sola vez) | unos 43 MB | unos 79 MB |
| En una computadora de escritorio | unos 3,8 minutos de audio por minuto | unos 2,3 minutos de audio por minuto |
| En un celular de gama media (estimado) | casi 1 minuto de audio por minuto | medio minuto de audio por minuto |

Medimos estas velocidades con 3 minutos de voz en español en nuestro equipo de pruebas; en el tuyo pueden ser distintas. Un audio de 10 minutos, entonces, tarda unos 3 minutos en una computadora con el modelo rápido, y alrededor de 10 en un celular.

Empieza con el **rápido**, sobre todo en el celular. Si el resultado tiene muchos errores, porque hay ruido de fondo, acentos marcados o palabras técnicas, vuelve a transcribir con el **preciso**.

## Qué tan bueno es el resultado

Con voz clara, una sola persona hablando y poco ruido, el texto sale casi listo. En la captura de arriba, el modelo rápido acertó casi todas las palabras de las seis frases, pero se equivocó en lo más difícil: «transcripción de Fileflect» quedó como «Transcription de File Efect», «después queda guardado» como «después que ha guardado», y en otra frase escribió «en ningún servidor» donde el audio dice «a ningún servidor». Son errores típicos: nombres propios, marcas, palabras poco comunes y frases que suenan parecido. En nuestras pruebas, el modelo preciso transcribió ese mismo audio con menos errores.

Otros límites que conviene conocer:

- **No separa quién habla.** En una entrevista o una reunión, el texto sale corrido, sin indicar qué dijo cada persona.
- **Cifras y siglas** pueden salir escritas de distintas formas.
- **Música fuerte, ruido o varias personas hablando a la vez** empeoran mucho el resultado.
- **Silencios largos**: el modelo puede saltearlos o, raras veces, repetir una frase. Revisa el texto antes de usarlo en algo importante.

Si el idioma detectado no es el correcto (pasa con audios muy cortos o con mezcla de idiomas), elige el idioma a mano y vuelve a transcribir.

## Cómo sacar el audio de WhatsApp o del iPhone

**Notas de voz de WhatsApp**: mantén apretada la nota de voz y usa la opción de compartir o reenviar para guardarla en Archivos o mandártela por correo. Los menús cambian un poco entre iPhone y Android, pero el resultado es un archivo .opus u .ogg, que la herramienta acepta directamente.

**Notas de voz del iPhone**: en la app Notas de Voz, toca la grabación, luego los tres puntos y **Compartir**, y elige **Guardar en Archivos**. Obtienes un archivo .m4a.

**Grabaciones de una reunión o un video**: si tienes el video, no hace falta extraer el sonido; la herramienta lo hace sola. Si solo quieres el audio para guardarlo o mandarlo, [Extraer audio de un video](tool:extract-audio) lo separa.

Si tu navegador no puede leer el archivo (pasa con algunos M4A en ciertos navegadores), prueba con Chrome, Edge o Safari, o conviértelo antes con [Convertir audio](tool:audio-converter).

## Audios de más de 30 minutos

El límite está para que la transcripción no tarde demasiado ni agote la memoria del navegador. Para un audio más largo, córtalo en partes con [Recortar audio](tool:trim-audio) y transcribe cada una. Un truco: corta en una pausa, no en medio de una frase, para que el modelo no pierda palabras en el corte.

## Usar la transcripción como subtítulos

El archivo **SRT** o **VTT** tiene cada frase con su tiempo de inicio y de fin, en líneas cortas, listo para cargar en un reproductor de video, YouTube o un editor. Si corriges palabras en el texto sin unir ni separar líneas, los subtítulos usan tu corrección.

Si los subtítulos quedan adelantados o atrasados respecto del video, [Sincronizar subtítulos](tool:subtitle-sync) los corre en bloque. Y si necesitas otro formato, [Convertir subtítulos](tool:subtitle-converter) pasa de SRT a VTT, ASS y otros.

## El camino inverso: de texto a voz

Si lo que necesitas es lo contrario, que la computadora te lea un texto o un documento, [Leer texto en voz alta](tool:text-to-speech) lo hace con las voces de tu sistema o con una voz de IA, también en tu navegador. La guía [Cómo hacer que la computadora te lea un texto o un PDF](guide:read-aloud) lo explica en detalle.

## Resumen

- [Transcribir audio a texto](tool:audio-to-text) usa Whisper dentro de tu navegador: gratis y sin subir el audio.
- Empieza con el modelo rápido; si hay muchos errores, usa el preciso.
- Revisa siempre nombres propios, cifras y frases que suenan parecido.
- Acepta notas de voz de WhatsApp (.opus, .ogg), del iPhone (.m4a) y videos, hasta 30 minutos.
- Descarga TXT para el texto, SRT o VTT para subtítulos.
`;

export default body;
