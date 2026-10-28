const body = `
Turning a long voice message, a recorded lecture or an interview into text used to mean listening and typing, or paying a service you had to upload the audio to. Today a speech recognition model can do it on your own computer or phone, for free and without the audio leaving your device. This guide explains how to use our tool [Audio to text (transcription)](tool:audio-to-text), what to expect from the result and how to get the audio file out of WhatsApp or an iPhone.

## How it works: Whisper in your browser

The tool uses **Whisper**, the speech recognition model OpenAI released under an open license. Instead of sending your audio to a server, the model is downloaded once to your browser and the transcription runs on your device's processor.

That has two practical consequences:

- **Privacy**: the audio isn't uploaded anywhere. The only thing downloaded is the model, from Hugging Face, the first time you use it; after that it stays saved in the browser.
- **Variable speed**: it depends on your device. A current computer transcribes faster than the audio lasts; a phone, more slowly.

## Step by step

1. Open [Audio to text](tool:audio-to-text) and choose the audio or video file. You'll see its length.
2. Choose the **Model**: **Fast** or **Precise (slower)**. Next to each one you can see the download size, or «downloaded» if you've already used it.
3. Choose the **Language of the audio**, or leave **Detect automatically**.
4. Press **Transcribe**. You'll see the progress and the time left; you can cancel at any moment.
5. Check the text, fix what's needed and copy it or download it as **TXT**, **SRT** or **VTT**.

![A recording transcribed, with the editable text and the download buttons](shot:transcribir-resultado "A 7-second recording transcribed with the fast model: each line is a sentence with its timing.")

It accepts audio (MP3, WAV, M4A, OGG, OPUS, FLAC and others) and video (MP4, MOV, MKV, WEBM; the soundtrack is transcribed), up to 30 minutes per file.

## Fast or precise: which one to choose

| | Fast | Precise |
| --- | --- | --- |
| Model | Whisper tiny | Whisper base |
| Download (once) | about 43 MB | about 79 MB |
| On a desktop computer | about 3.8 minutes of audio per minute | about 2.3 minutes of audio per minute |
| On a mid-range phone (estimate) | almost 1 minute of audio per minute | half a minute of audio per minute |

We measured these speeds with 3 minutes of Spanish speech on our test machine; yours may differ. A 10-minute recording therefore takes about 3 minutes on a computer with the fast model, and around 10 on a phone.

Start with the **fast** one, especially on a phone. If the result has many mistakes, because of background noise, strong accents or technical words, transcribe again with the **precise** one.

## How good is the result

With a clear voice, a single speaker and little noise, the text comes out nearly ready. The short English recording in the screenshot above came out word for word. Longer or harder audio is a different story: on a 36-second Spanish recording in our tests, the fast model got almost every word right but stumbled on the hardest parts. It wrote the brand name «Fileflect» as «File Efect» and swapped a couple of words in phrases that sound alike. Those are the typical errors: proper names, brands, unusual words and phrases that sound similar. In our tests, the precise model transcribed that same audio with fewer errors.

Other limits worth knowing:

- **It doesn't separate speakers.** In an interview or a meeting, the text comes out as one stream, without saying who said what.
- **Numbers and acronyms** may be written in different ways.
- **Loud music, noise or several people talking at once** make the result much worse.
- **Long silences**: the model may skip them or, rarely, repeat a sentence. Check the text before using it for anything important.

If the detected language is wrong (it happens with very short recordings or mixed languages), choose the language yourself and transcribe again.

## How to get the audio out of WhatsApp or an iPhone

**WhatsApp voice messages**: press and hold the voice message and use the share or forward option to save it to Files or email it to yourself. The menus differ slightly between iPhone and Android, but the result is an .opus or .ogg file, which the tool accepts directly.

**iPhone Voice Memos**: in the Voice Memos app, tap the recording, then the three dots and **Share**, and choose **Save to Files**. You get an .m4a file.

**Meeting recordings or videos**: if you have the video, there's no need to extract the sound; the tool does it. If you just want the audio to keep or send, [Extract Audio from Video](tool:extract-audio) separates it.

If your browser can't read the file (it happens with some M4A files in certain browsers), try Chrome, Edge or Safari, or convert it first with the [Audio Converter](tool:audio-converter).

## Recordings longer than 30 minutes

The limit is there so the transcription doesn't take too long or run out of browser memory. For a longer recording, cut it into parts with [Trim audio](tool:trim-audio) and transcribe each one. A tip: cut at a pause, not in the middle of a sentence, so the model doesn't lose words at the cut.

## Using the transcript as subtitles

The **SRT** or **VTT** file has each sentence with its start and end time, in short lines, ready to load into a video player, YouTube or an editor. If you correct words in the text without joining or splitting lines, the subtitles use your correction.

If the subtitles run ahead of or behind the video, [Sync subtitles](tool:subtitle-sync) shifts them all at once. And if you need another format, [Convert subtitles](tool:subtitle-converter) turns SRT into VTT, ASS and others.

## The other way round: text to speech

If what you need is the opposite, having the computer read a text or a document to you, [Text to speech](tool:text-to-speech) does it with your system's voices or an AI voice, also in your browser. The guide [How to make your computer read a text or a PDF aloud](guide:read-aloud) explains it in detail.

## Summary

- [Audio to text](tool:audio-to-text) runs Whisper inside your browser: free and without uploading the audio.
- Start with the fast model; if there are many mistakes, use the precise one.
- Always check proper names, numbers and phrases that sound alike.
- It accepts WhatsApp voice messages (.opus, .ogg), iPhone recordings (.m4a) and videos, up to 30 minutes.
- Download TXT for the text, SRT or VTT for subtitles.
`;

export default body;
