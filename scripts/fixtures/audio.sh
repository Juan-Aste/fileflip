#!/usr/bin/env bash
# Audio fixtures for the audio tools, made with the system's ffmpeg (an
# independent encoder; it is a test tool only and is not shipped):
# `bash scripts/fixtures/audio.sh`.
# A 2-second stereo tone (left 440 Hz, right 660 Hz) in every input format,
# plus damaged files in corrupt/.
set -euo pipefail
cd "$(dirname "$0")/../../tests/fixtures"
FF=(ffmpeg -hide_banner -loglevel error -y -bitexact)
SRC=(-f lavfi -i "sine=frequency=440:sample_rate=22050:duration=2" -f lavfi -i "sine=frequency=660:sample_rate=22050:duration=2" -filter_complex "[0:a][1:a]join=inputs=2:channel_layout=stereo[a]" -map "[a]" -map_metadata -1)
"${FF[@]}" "${SRC[@]}" -c:a pcm_s16le audio.wav
"${FF[@]}" "${SRC[@]}" -c:a libmp3lame -b:a 64k audio.mp3
"${FF[@]}" "${SRC[@]}" -c:a flac audio.flac
"${FF[@]}" "${SRC[@]}" -c:a libvorbis -q:a 2 audio.ogg
"${FF[@]}" "${SRC[@]}" -ar 48000 -c:a libopus -b:a 48k audio.opus
"${FF[@]}" "${SRC[@]}" -c:a aac -b:a 64k audio.m4a
"${FF[@]}" "${SRC[@]}" -ar 48000 -c:a libopus -b:a 48k audio.webm
# AIFF (16-bit big-endian), 1 s of 24-bit AIFF, and AIFF-C with little-endian samples ("sowt").
"${FF[@]}" "${SRC[@]}" -c:a pcm_s16be audio.aiff
"${FF[@]}" "${SRC[@]}" -t 1 -c:a pcm_s24be audio-24.aif
"${FF[@]}" "${SRC[@]}" -c:a pcm_s16le -f aiff audio.aifc
# An M4A whose index (moov, written at the end) is cut off, and text named .mp3.
head -c "$(( $(stat -c %s audio.m4a) / 2 ))" audio.m4a > corrupt/audio-truncated.m4a
# One second of digital silence (nothing to normalize).
"${FF[@]}" -f lavfi -i "anullsrc=r=8000:cl=mono" -t 1 -c:a pcm_s16le silence.wav
# An AIFF cut in half, and a μ-law AIFF-C (compressed: refused).
head -c "$(( $(stat -c %s audio.aiff) / 2 ))" audio.aiff > corrupt/audio-truncated.aiff
"${FF[@]}" "${SRC[@]}" -c:a pcm_mulaw -f aiff corrupt/audio-ulaw.aifc
printf 'This is not audio, just text with an .mp3 name.\n%.0s' {1..40} > corrupt/not-audio.mp3
