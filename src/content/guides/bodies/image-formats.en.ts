const body = `
JPG, PNG, WebP and AVIF all do the same job, storing an image, but each one solves a different problem. Choosing the wrong one has concrete consequences: a photo saved as PNG that weighs ten times more than it should, a logo saved as JPG with smudges around the letters, or an AVIF image that a government form refuses. This guide helps you decide with figures measured with our own tools, not generalities.

## The short answer

- **Photos to send, upload to a form or print**: JPG. Absolutely everything opens it.
- **Screenshots, logos, charts or images with a transparent background**: PNG.
- **Images for a website**: WebP, or AVIF if you want the smallest possible file.
- **If you don't know which program or person will open the file**: JPG for photos and PNG for everything else.

The rest of the guide explains why and shows how much the file size changes in each case.

## What makes each format different

**JPG** (or JPEG) uses lossy compression: it throws away details the eye barely notices and gets small files from photos. It's the most compatible format there is, but it doesn't support transparency and, around sharp edges such as letters or thin lines, the compression leaves small smudges. Every time you save a JPG again it loses a little more quality.

**PNG** loses nothing: the image that comes out is exactly the one that went in, pixel by pixel. It supports transparency and keeps edges sharp, which makes it the natural format for screenshots and logos. The price is size: with photos, a PNG is huge.

**WebP** is a more modern format that can compress with or without loss and supports transparency. With photos it's somewhat smaller than a JPG of similar quality, and every current browser opens it. Some desktop programs and websites still don't accept it.

**AVIF** is the newest of the four. It compresses considerably better than JPG and WebP, supports transparency and current browsers open it, but it takes longer to create and fewer programs and forms accept it.

## What we measured with a photo

We took a public-domain NASA photo, scaled it to the size of a phone photo (12 megapixels, 3024 × 4032) and saved it as a 2.4 MB JPG. Then we converted it with our converter (the same one behind [JPG to AVIF](conv:jpg-avif)) to each format, at the default quality (82 out of 100):

| Format | Size | Compared with the JPG |
| --- | --- | --- |
| JPG | 822 KB | — |
| WebP | 763 KB | 7% smaller |
| AVIF | 329 KB | 60% smaller |
| PNG | 23.4 MB | 28 times larger |

Looking at the whole photo on screen, you can't tell them apart. Zoomed in to 100%, the AVIF softens some fine detail in the dark areas (the foliage, in this photo); the JPG and the WebP keep it slightly better. For a photo that will be viewed on a phone or a web page, that difference doesn't matter; for a photo you're going to crop or print large, it does.

The PNG is the example of what not to do: it stores every pixel without loss, including the photo's natural noise, and ends up larger than the JPG it started from.

We also timed it on a desktop computer: the JPG and the WebP took about 3 seconds and the AVIF 7.5. On a phone everything takes longer, and with AVIF you notice it.

## What we measured with a screenshot

With a screenshot of our site (text, icons and flat backgrounds, 2560 × 1600 pixels) the result flips. The PNG produced by the browser was 363 KB; converted to JPG it was 184 KB, to WebP 117 KB and to AVIF 68 KB.

The lossy formats are smaller, but in a screenshot the edges of the letters are exactly what lossy compression mistreats: zoom in and you'll see halos around the text. So if the screenshot is meant to document something, for a tutorial or for someone to read what it says, keep it as PNG. If it's for a website where size matters, WebP is a good middle ground.

## Transparency: when the format decides for you

If the image has a transparent background, like a logo to place over another color, a cut-out signature or an image whose [background you removed](tool:remove-background), **don't save it as JPG**. JPG has no transparency: our converter fills the background with white and, if you then put it on a dark background, a white box appears.

For transparency, use PNG if the image goes into a document or another program, and WebP or AVIF if it goes on a web page.

## Compatibility: who opens each format

- **JPG and PNG**: any computer, phone, program, printer, social network or form.
- **WebP**: all current browsers and most social networks. Some older editing programs and some web forms don't accept it.
- **AVIF**: current browsers. Many programs and forms don't recognize it yet.

A practical rule: if the file is going out of your hands (you email it, someone else uploads it to a form, a print shop prints it), use JPG or PNG. The newer formats shine when you control where they're displayed, such as on your own website.

## How to convert between formats

1. Open the converter (for example, [JPG to WebP](conv:jpg-webp) or [PNG to JPG](conv:png-jpg)) and drag one or more images onto it.
2. Choose the output format.
3. If you want, open **Options** to adjust the quality or shrink the image. Lower quality means a smaller file.
4. Press **Convert** and download each image, or all of them together as a ZIP.

![The image converter with a photo ready to convert](shot:formatos-convertir "Images are converted in your browser: they're never uploaded to a server.")

The conversion happens in your own browser, so the photos never leave your device. You can convert up to 50 images at a time.

## If what you want is a smaller file

Changing format is one way to reduce size, but not the only one. If a form asks for a photo under 200 KB, [Compress image](tool:compress-image) lets you set that exact size: it finds the best quality that fits and, if that's not enough, it scales the image down. You can also [resize](tool:resize-image) it in pixels: a 12-megapixel photo is far more than you need to view it on a screen, and bringing it down to 2000 pixels wide reduces the size more than any format change.

If your photos come from an iPhone in HEIC format, you first need to convert them to JPG, which is what almost every form accepts. The guide [How to convert iPhone HEIC photos to JPG](guide:heic-to-jpg) explains how.

## Summary

- A photo that can go anywhere: **JPG**.
- Screenshot, logo, chart or transparency: **PNG**.
- Your own website: **WebP**, or **AVIF** for the smallest size.
- Never save a photo as PNG or a transparent logo as JPG.
- For an exact file size, use Compress image instead of trying formats.
`;

export default body;
