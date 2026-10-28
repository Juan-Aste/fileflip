const body = `
Having your computer or phone read a text aloud is useful for much more than it seems: proofreading something you wrote and catching mistakes your eyes skip over, resting your eyes after a day in front of a screen, listening to a report while you cook or walk, practicing the pronunciation of another language, or simply reading more comfortably if you have dyslexia or low vision. This guide covers the options your system already has and how to do it with our [Text to speech](tool:text-to-speech) tool, which also reads PDF and Word files and photos of documents.

## Option 1: what your system already has

Every current operating system has a feature to read text aloud. They're worth knowing because they work in any program:

- **Windows**: the Edge browser has **Read aloud** (in the menu or with Ctrl + Shift + U) for web pages and PDFs you open in it. For the whole system there's **Narrator** (Ctrl + Windows + Enter), designed for blind users, with many shortcuts.
- **Mac**: in **System Settings → Accessibility → Spoken Content**, turn on **Speak selection**. Then select any text and press Option + Esc.
- **iPhone and iPad**: in **Settings → Accessibility → Spoken Content**, turn on **Speak Selection** («Speak» appears when you select text) and **Speak Screen** (swipe down with two fingers from the top of the screen).
- **Android**: in **Settings → Accessibility**, turn on **Select to Speak**. Names may vary slightly depending on the phone's brand.
- **Microsoft Word**: on the **Review** tab, **Read Aloud** reads the document from where the cursor is.

These features are handy for reading a single paragraph, but they have limits: not all of them read files that aren't open, they don't highlight the sentence being read, or they don't let you save the audio.

## Option 2: Text to speech, in the browser

[Text to speech](tool:text-to-speech) brings together what's usually missing, on one page:

- It reads **pasted text** or **files**: TXT, Markdown, HTML, PDF with text, Word (DOCX), EPUB and also photos or scans of a page, whose text it recognizes with OCR.
- It **highlights the sentence** being read, so you can follow along with your eyes.
- You can **pause**, go back to the previous sentence, skip to the next one and choose the **speed**, from 0.5× to 2×.
- It detects the text's **language** (English, Spanish, Portuguese, French or Chinese) and picks a voice in that language.
- With the **AI voice**, you can **download the reading as an MP3**.

### Step by step

1. Open [Text to speech](tool:text-to-speech).
2. Paste the text into the box, or press **Open file** and choose a PDF, a Word file, an EPUB or a photo.
3. Choose the type of voice: **Device voices** or **AI voice**.
4. Check the language, the voice and the speed.
5. Press **Play**. The space bar pauses and resumes.

![The Text to speech tool with pasted text and the AI voice selected](shot:leer-en-voz-alta "You can listen with your device's voices or with a more natural AI voice that also lets you download an MP3.")

The text is extracted and read on your device: the file is never uploaded to a server. It accepts up to 50,000 characters per reading, about 15 to 20 pages of running text; if the text is longer, it's cut and you're told.

## Device voices or AI voice

**Device voices**: the ones that come with your system or browser. They start reading instantly and don't download anything. Their quality depends a lot on the device: on a Mac or an iPhone they usually sound good; on some Windows or Android devices, more robotic. If no voice is installed for your language, the tool tells you and you can install voices from your system settings.

A privacy detail: some browser voices, marked **«online»** (such as Google's or Microsoft's in Chrome and Edge), send the text to that provider to generate the audio. If the text is private, choose a voice that isn't marked «online».

**AI voice**: a speech synthesis model (Supertonic 3) that runs inside your browser. It sounds more natural, has 10 voices and lets you **download an MP3**. In exchange:

- The first time, it downloads about 400 MB (after that it stays saved in the browser).
- It generates the audio on your device's processor: on a computer it takes about as long as the audio lasts; on a phone, considerably longer.
- It's available in English, Spanish, Portuguese and French. Chinese is read with the device voices.

If you're going to listen to something once, right now, the device voices are enough. If you want audio to listen to later, in the car or on your phone offline, use the AI voice and download the MP3.

## How to listen to a PDF

Open the PDF with **Open file**. If the PDF has digital text, it's extracted instantly. A few tips:

- **Headers and page numbers** that repeat on every page show up in the text. You can delete them in the box before playing.
- If the PDF is **scanned**, it has no text and the tool tells you so. Run it through [OCR scanned PDF](tool:ocr-pdf) first and open the PDF it returns, or take a photo of the page and open it directly: the tool recognizes text in images.
- An **EPUB book** opens directly, unless it has copy protection (DRM), like many books bought from stores.

## Uses worth trying

- **Proofreading your own writing**: hearing your text at normal speed reveals repeated words, sentences that are too long and mistakes your eyes skip.
- **Studying**: listening to notes while following them with your eyes helps them stick. At 1.25× or 1.5× you get more out of your time.
- **Languages**: choose the voice of the language you're learning and lower the speed to hear the pronunciation.
- **Accessibility**: for people with dyslexia, low vision or eye strain, reading with the sentence highlighted makes long texts more comfortable.

## If you publish the audio

You can use the MP3 generated with the AI voice, but the model's license asks you to state that it's an AI-generated voice and forbids using it to impersonate people, defame, harass or deceive. The link to the full license is next to the download button.

## The other way round

If what you need is the opposite, turning what someone said in a recording or a voice message into text, the guide [How to transcribe audio or a voice message to text for free](guide:transcribe-audio) explains how to do it with [Audio to text](tool:audio-to-text), also in your browser.

## Summary

- Your system already reads aloud: Edge and Narrator on Windows, «Spoken Content» on Mac and iPhone, «Select to Speak» on Android.
- [Text to speech](tool:text-to-speech) reads text, PDF, Word, EPUB and photos, highlights the sentence and lets you choose the speed, without uploading the file.
- Device voices start instantly; the AI voice sounds more natural and lets you download an MP3.
- Avoid «online» voices if the text is private.
`;

export default body;
