#!/usr/bin/env bash
# Video fixtures for the video tools, made with the system's ffmpeg (an
# independent encoder; it is a test tool only and is not shipped):
# `bash scripts/fixtures/video.sh`.
# 2 seconds, 320×240 at 24 fps: red during the first second and blue during the
# second, with a stereo tone (left 440 Hz, right 660 Hz); plus damaged files.
set -euo pipefail
cd "$(dirname "$0")/../../tests/fixtures"
FF=(ffmpeg -hide_banner -loglevel error -y -bitexact)
SRC=(-f lavfi -i "color=c=red:s=320x240:r=24:d=1,format=yuv420p" -f lavfi -i "color=c=blue:s=320x240:r=24:d=1,format=yuv420p"
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=2" -f lavfi -i "sine=frequency=660:sample_rate=48000:duration=2"
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a][3:a]join=inputs=2:channel_layout=stereo[a]" -map "[v]" -map "[a]" -map_metadata -1 -g 24)
"${FF[@]}" "${SRC[@]}" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 64k -movflags +faststart video.mp4
"${FF[@]}" "${SRC[@]}" -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 64k video.mov
"${FF[@]}" "${SRC[@]}" -c:v libvpx-vp9 -b:v 150k -deadline realtime -cpu-used 8 -c:a libopus -b:a 48k video.webm
"${FF[@]}" "${SRC[@]}" -c:v libvpx -b:v 150k -deadline realtime -cpu-used 8 -c:a libvorbis -q:a 2 video.mkv
# 640×480 with grain (hard to compress, for "Compress video"), red then blue, same tones.
"${FF[@]}" -f lavfi -i "color=c=red:s=640x480:r=24:d=1,noise=alls=3:allf=t" -f lavfi -i "color=c=blue:s=640x480:r=24:d=1,noise=alls=3:allf=t" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=2" -f lavfi -i "sine=frequency=660:sample_rate=48000:duration=2" \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v];[2:a][3:a]join=inputs=2:channel_layout=stereo[a]" -map "[v]" -map "[a]" -map_metadata -1 -g 24 \
  -c:v libvpx-vp9 -crf 20 -b:v 0 -deadline realtime -cpu-used 8 -c:a libopus -b:a 48k video-640.webm
# The 320×240 picture in VP9 inside MP4, marked to be shown rotated 90° (a phone held upright).
"${FF[@]}" -display_rotation 90 -i video.webm -c copy video-rotated.mp4
# The same picture without sound (for "Extract audio").
"${FF[@]}" -f lavfi -i "color=c=red:s=320x240:r=24:d=1" -c:v libvpx-vp9 -b:v 100k -deadline realtime -cpu-used 8 -map_metadata -1 video-no-audio.webm
# An MP4 cut in half (frames missing) and text named .mp4.
head -c "$(( $(stat -c %s video.mp4) / 2 ))" video.mp4 > corrupt/video-truncated.mp4
printf 'This is not a video, just text with an .mp4 name.\n%.0s' {1..40} > corrupt/not-video.mp4
