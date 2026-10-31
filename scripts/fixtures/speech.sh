#!/bin/sh
# Spoken audio for the transcription tests (tests/fixtures/speech-*.ogg):
# espeak-ng's synthetic voices (the program is GPL; the audio it outputs is
# ours), then Opus at 24 kbps, 16 kHz mono, to stay under 200 KB.
# Run: sh scripts/fixtures/speech.sh   (needs espeak-ng and ffmpeg)
set -e
out="$(dirname "$0")/../../tests/fixtures"
tmp="$(mktemp -d)"
espeak-ng -v en -s 160 -w "$tmp/en.wav" "Hello, this is a short transcription test. The quick brown fox jumps over the lazy dog."
espeak-ng -v es -s 135 -w "$tmp/es.wav" "Hola, esta es una prueba de transcripción de Fileflect. El veloz murciélago hindú comía feliz cardillo y kiwi. La cigüeña tocaba el saxofón detrás del palenque de paja. Hoy es un buen día para convertir archivos en el navegador, sin subir nada a ningún servidor. Los números uno, dos, tres, cuatro y cinco se dicen en voz alta. Gracias por escuchar esta grabación de prueba, que dura un poco más de treinta segundos para probar los trozos."
for l in en es; do ffmpeg -v error -y -i "$tmp/$l.wav" -ac 1 -ar 16000 -c:a libopus -b:a 24k "$out/speech-$l.ogg"; done
rm -r "$tmp"
