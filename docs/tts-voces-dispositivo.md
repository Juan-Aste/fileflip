# Lector: cómo se elige la voz del dispositivo (tarea 13.2)

El modo por defecto del lector es **«Escuchar» con las voces del dispositivo** (Web Speech API): empieza al instante y no descarga nada. Como cada navegador y sistema trae voces distintas (algunas muy robóticas y otras neuronales), el lector ordena las voces del idioma de mejor a peor y empieza con la primera. La lista completa sigue en el selector «Voz» y la elegida se recuerda por idioma (`localStorage`), por encima de la heurística.

Código: `voicesFor` y `voiceQuality` en `src/lib/tts/voices.ts`; tests en `src/lib/tts/voices.test.ts` y en `tests/e2e/tts-tools.spec.ts` (con `speechSynthesis` simulado).

## Heurística (en este orden)
1. **Calidad según el nombre** (`voiceQuality`):
   - 3: «Natural» o «Neural» (voces neuronales de Edge y Windows 11, p. ej. «Microsoft Elena Online (Natural) - Spanish (Argentina)»).
   - 2: «Premium», «Enhanced» (y «Mejorada», «Aprimorada», «Améliorée»): voces descargables de Apple.
   - 1: «Online» o «Google» (voces en línea de Chrome, p. ej. «Google español de Estados Unidos»).
   - 0: el resto.
   - −1: voces de fantasía de Apple (Bells, Zarvox, Bad News, Whisper…), al final.
2. **Región** del código de idioma (`es-AR`, `es_AR` de Android, `cmn-Hans-CN`…):
   - Español: **es-AR**, después es-419, es-US, es-MX y el resto de Latinoamérica, después **es-ES**, después las demás.
   - Portugués: pt-BR, pt-PT. Inglés: en-US, en-GB. Francés: fr-FR, fr-CA. Chino: zh-CN (Hans), zh-TW (Hant).
3. La voz **predeterminada** del navegador.
4. Las voces **del dispositivo** antes que las en línea (a igual calidad y región).
5. Por nombre.

Consecuencias:
- En **Edge** con español, quedan primero «Elena» y «Tomás» (Natural, es-AR), después las Natural de otras regiones y al final las voces viejas (Helena, Sabina).
- En **Chrome** de escritorio, «Google español de Estados Unidos» queda antes que «Google español» (España) y que las voces locales de Windows.
- En Safari/macOS/iOS, una voz «Premium» o «Mejorada» descargada por el usuario queda antes que la básica.

## Voces «en línea»
Las voces en línea (las de Google en Chrome y las «Online (Natural)» de Microsoft en Edge) envían el texto a su proveedor para generar el audio. Se siguen marcando como «(en línea)» en el selector y con la nota que lo explica debajo. Como suelen ser las más naturales, la heurística las pone primero cuando las hay; quien prefiera que el texto no salga del dispositivo puede elegir otra voz (se recuerda) o el modo privado.
