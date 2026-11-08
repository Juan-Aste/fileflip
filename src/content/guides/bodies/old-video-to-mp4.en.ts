const body = `
Somewhere on an old drive or USB stick you have videos from fifteen or twenty years ago: a birthday filmed on a compact photo camera, a wedding someone edited in Windows Movie Maker, clips from your first phone with a camera. You copy them to your phone or TV and they won’t open, or you hear the sound but see nothing. The fix is to convert them to MP4, the format that plays on practically every phone, TV, computer and social network. This guide explains how to do it in your browser, without installing anything, and what to expect from the result.

## Why your phone or TV won’t open your old videos

A video file has two layers: the **container** (what the extension tells you: AVI, WMV, MP4…) and the **codecs**, the way the picture and the sound are compressed inside it. Old videos usually combine the two in ways that hardly anything supports today:

- **AVI**: the Windows format of the 1990s and 2000s, with DivX or Xvid video (MPEG-4 Part 2) and MP3 sound. Many compact cameras used it, as did the movie downloads of the time.
- **WMV**: the Windows Media and Movie Maker format, with Microsoft’s own codecs.
- **3GP**: the format of phones from before smartphones, with H.263 video and AMR sound, made for tiny screens.
- **MOV**: the format of QuickTime, the iPhone and many cameras. It usually opens on Apple devices, but not always on Android or a TV. If it’s a modern MOV, with H.264 or HEVC, it becomes an MP4 without re-encoding, in seconds.
- **FLV**, **MPG**, **VOB** and **RM**: Flash videos from websites of years ago, the MPEG-1 and MPEG-2 of camcorders and DVDs, and RealMedia.

Today’s phones, smart TVs and browsers no longer include those codecs. An MP4 with **H.264** video and **AAC** sound, on the other hand, plays everywhere. That’s what you get when you convert.

## How to convert an old video to MP4, step by step

1. Open the [Video converter](tool:video-converter) and drop your videos on the box, or click to choose them. You can add several at once.
2. Under **Convert to**, keep **MP4** selected (it’s the default).
3. Click **Convert video**. While it works you’ll see a **Processing…** bar; if you picked the wrong file, click **Cancel**.
4. When **Your file is ready** appears, click **Download** next to each video, or **Download all as ZIP** if you converted several.
5. Copy the MP4 files to your phone, upload them to your cloud storage or put them on a USB stick for the TV.

![Three old videos (AVI, WMV and 3GP) loaded in the Video converter, with MP4 chosen as the output format](shot:video-viejo-mp4-elegir.en "An AVI, a WMV and a 3GP ready to become MP4 in a single batch.")

Everything happens in your browser: the videos aren’t uploaded to any server. That matters with family videos, and it also saves you waiting for a large file to upload.

## Why the first time takes a little longer

Your browser can read MP4, MOV, MKV and WebM, but not these older formats. When it spots one, the tool downloads an FFmpeg engine (about 31 MB, from our own domain) that runs inside the page. The conversion then happens in two stages:

1. FFmpeg reads the old video and turns it into an intermediate format the browser understands.
2. That intermediate file goes through the normal conversion: it’s encoded to H.264 with your browser’s encoder, and the sound becomes AAC.

That’s why the progress bar moves in two stretches and why converting is slower than with a modern MP4. As a reference, in our test on a desktop computer a one-minute AVI at 640 × 480 took about half a minute, including the engine download. On a phone or an older computer it takes longer. Later conversions reuse the engine that’s already downloaded.

When it’s done, each video says what was done with it: with old formats you’ll see **Video re-encoded to H.264.**, because the picture is always compressed again, at high quality.

![Conversion result: three MP4 files ready to download, each one re-encoded to H.264](shot:video-viejo-mp4-resultado.en "Each file says which codec it ended up with; with several, you can download them all in a ZIP.")

## Limits worth knowing

- **Size**: up to 200 MB per file and up to 50 files per batch.
- **Length**: with older formats, the maximum is 20 minutes of video per file, because the FFmpeg engine is slower and works in the browser’s memory. An MP4, MOV, MKV or WebM can be up to 2 hours.
- **Time**: if a video takes more than 30 minutes to convert, it’s stopped so it doesn’t lock up your device.
- **Tracks**: the main video track and the main audio track are kept. Subtitles and extra audio tracks, such as a DVD’s second language, aren’t copied.
- **DVDs**: the VOB files on a DVD are usually close to 1 GB each, more than the limit, and they come split into parts. The tool works for small VOB files, but not for converting a whole DVD.
- **Browser**: to get H.264, use Chrome, Edge or Safari. In browsers without an H.264 encoder (such as Chromium or Firefox on Linux) you’ll see a notice and the MP4 will be made with VP9 or AV1, which play in Chrome, Edge, Firefox and on Android, but maybe not on an iPhone or every TV.

## What converting can’t fix

Converting changes the format, not the picture. A 2008 phone video recorded at 176 × 144 is still that size: it will play on the TV, but small and blurry, just like the original. The tool doesn’t raise the resolution or clean up the noise of an old camera, and it can’t rescue a damaged file either: if the video cuts off halfway on your computer, so will the MP4.

There are also some videos that, for now, can’t be read even though the extension looks familiar. In our tests, very old QuickTime MOV files (with codecs such as Sorenson or Cinepak) failed, as did MP4 files from some old cameras that use MPEG-4 Part 2 instead of H.264. In those cases you’ll see a message saying the browser can’t read the video in the file.

## After converting

Once you have the MP4, you can carry on with other tools, which handle MP4 just like the converter:

- **To send it on WhatsApp or by email**: if it’s too big, [Compress video](tool:compress-video) lowers the quality or the resolution.
- **To keep just one part**: [Trim video](tool:trim-video) cuts the beginning and the end, like the minutes when the camera was pointing at the floor.
- **To make one video out of several clips**: [Join videos](tool:join-videos) puts them together in the order you choose, for example all the 3GP clips from a trip.
- **For slow motion or speed-up**: [Change video speed](tool:video-speed) goes from 0.25× to 4×.
- **To keep only the sound**: [Extract audio from video](tool:extract-audio) saves it as MP3, M4A, WAV, FLAC or OGG.
- **To turn what’s said into text**: [Audio to text](tool:audio-to-text) accepts the MP4; the guide [How to transcribe audio or a voice message to text](guide:transcribe-audio) explains how.
- **To share a short moment**: [Video to GIF](tool:video-to-gif) turns a few seconds into an animation.

If what won’t open on your phone are photos rather than videos, the guide [How to convert iPhone HEIC photos to JPG](guide:heic-to-jpg) covers the same problem with iPhone pictures.

## Summary

- AVI, WMV, 3GP, FLV, MPG, VOB and RM videos don’t open on many phones and TVs because they use codecs that are no longer included.
- The [Video converter](tool:video-converter) turns them into MP4 with H.264 and AAC, in your browser and without uploading them.
- The first time it downloads an engine of about 31 MB and it’s slower than with an MP4; the maximum is 20 minutes and 200 MB per file.
- Converting doesn’t improve the picture: a low-resolution video stays low resolution.
- For H.264, use Chrome, Edge or Safari.
`;

export default body;
