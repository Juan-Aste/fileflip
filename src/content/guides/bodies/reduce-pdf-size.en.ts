const body = `
A PDF that's too large is a practical problem: the email bounces, the upload form asks for «under 2 MB», or the person you send it to on WhatsApp has to spend their mobile data to open it. The good news is that it can almost always be shrunk a lot without becoming hard to read. The key is understanding **what takes up the space** inside the PDF.

## Why a PDF is so large

A text PDF, like one saved from Word with nothing but words, is tiny: a page takes a few kilobytes. What makes a PDF weigh megabytes is almost always **the images inside it**, and especially photos taken with a phone.

The typical case: you «scanned» a contract by photographing it with your phone and put the photos together in a PDF. Each photo has 12 megapixels or more, far more resolution than you need to read a page, and the PDF ends up at 1 to 3 MB per page.

That's why our tool [Compress PDF](tool:compress-pdf) works on the images: it saves them again with less resolution and more compression, and leaves the text, fonts and vector drawings untouched. The text stays sharp and can still be selected and searched.

## How to compress a PDF, step by step

1. Open [Compress PDF](tool:compress-pdf) and drag the file in, or tap to choose it.
2. Choose the compression level: **Low** (best quality), **Recommended** or **Strong** (smallest file).
3. Press **Compress PDF**.
4. Look at the result: the tool shows the size before and after. If it works for you, download it; if not, try another level.

![Compress PDF with the recommended level and the result](shot:comprimir-pdf-resultado "The tool shows how much the PDF weighed and how much it weighs now.")

The PDF is processed in your own browser: it's never uploaded to a server, so you can compress documents with personal data safely. It accepts files up to 200 MB.

## Which level to choose: what we measured

To give you a real idea, we built a 4-page PDF from images that imitate phone photos of a contract: 3024 × 4032 pixels each, like most phones produce, with uneven lighting and grain. It weighed 4.6 MB. These are the results at each level:

| Level | Size | Reduction | What it does with the photos |
| --- | --- | --- | --- |
| Low | 687 KB | 85% | Longest side up to 2400 pixels, high quality |
| Recommended | 286 KB | 94% | Longest side up to 1600 pixels, medium quality |
| Strong | 131 KB | 97% | Longest side up to 1100 pixels, low quality |

At the strong level, the contract text was still perfectly readable when viewing the whole page on screen. What you lose is fine detail: if the PDF has photos that matter in themselves (a product catalog, a plan with very small print, a report with photographs), stick with the low or recommended level.

A practical tip: **start with Recommended**. For email or WhatsApp it's usually enough. If an upload form asks for a smaller file, go to Strong.

## Why it sometimes barely shrinks

If your PDF is mostly text, or its images are already well compressed, there's little to shrink. A text PDF of a few pages weighs a few kilobytes and there's no point compressing it. If the tool can't reduce it, it tells you, and it never hands you a file larger than the original.

The same happens with PDFs that have already been through another compressor, or with images in formats we don't recompress so as not to risk the quality (for example, some pure black-and-white scans or images in print colors). If the PDF is still large after compressing, try the other ideas in this guide.

## Other ways to make a PDF smaller

**Remove the pages you don't need.** Often the PDF has blank pages, attachments nobody needs or the same page twice. With [Delete pages from a PDF](tool:delete-pdf-pages) you see a thumbnail of every page and remove the ones you don't want. The rest keeps the same quality.

**Split it into parts.** If the form accepts several files but each one with a maximum size, [Split PDF](tool:split-pdf) separates the document into page ranges (for example, 1-5 and 6-10), and each part is smaller.

**Shrink the photos before building the PDF.** If you're going to create the PDF from photos, you can do it with [Images to PDF](tool:images-to-pdf) and then compress the result; or reduce the photos first with [Compress image](tool:compress-image), which lets you set an exact size for each photo.

**Scan better.** If the PDF comes from photos of paper, [Scan document](tool:scan-document) straightens the page and makes the paper white and the text black: the result looks like a real scan, more legible than the original photo.

## How small it needs to be to send it

There's no single number, but there are useful references:

- **Email**: many email services reject attachments over 20 or 25 MB (in Gmail, the limit is 25 MB). Besides, a small file is kinder to whoever receives it: for a document of a few pages, under 2 MB is reasonable.
- **WhatsApp**: it accepts large documents, but the recipient has to download them, sometimes over mobile data. If you send it as a document (not as a photo), the PDF arrives exactly as it is.
- **Forms and online applications**: they usually state the maximum size next to the upload button. Limits of 1, 2 or 5 MB per file are common. Check that figure before compressing, so you can choose the right level.

## Common mistakes

- **Compressing the same PDF several times.** Each pass loses some quality and, from the second one on, barely reduces the size. Better to go back to the original and choose a stronger level.
- **Turning the PDF into images to shrink it.** Converting each page to JPG and rebuilding the PDF means the text is no longer text: it can't be searched or copied, and the file often ends up larger.
- **Adding a password before compressing.** Compress first, then protect. If the PDF already has an opening password, remove it with [Remove a PDF password](tool:unlock-pdf), compress it and protect it again with [Password protect a PDF](tool:protect-pdf).

## Summary

- What makes a PDF heavy is the photos; text takes almost no space.
- [Compress PDF](tool:compress-pdf) recompresses the photos and leaves the text intact, in your browser.
- Start with the recommended level; use Strong if you're asked for a very small file.
- If that's not enough, remove pages, split the PDF or improve the scan.
- If you're going to edit the PDF afterwards, the guide [How to convert a PDF to an editable Word document](guide:pdf-to-word) explains what is kept in the conversion.
`;

export default body;
