const body = `
Someone sends you a PDF and you need to change something: fix a date, add your name on a line, mark a paragraph, put a logo on it or cover a phone number before forwarding it. Many programs that promise to “edit PDFs” want you to install them, create an account or pay to download the result. This guide explains how to do it for free in your browser, on a computer or a phone, and above all what can and can't be changed in a PDF, so you don't waste time looking for a feature no online editor does well.

## What you can edit in a PDF (and what you can't)

A PDF isn't a Word document. It doesn't store paragraphs that reflow as you type, but letters drawn at fixed positions on the page. That's why there are two very different kinds of editing:

- **Adding things on top of the page**: new text, highlights, arrows, boxes, an image or a white box that covers something. This is what [Edit PDF](tool:edit-pdf) does, and it's what you need most of the time.
- **Changing the text already in the PDF**: rewriting a sentence and having the rest of the paragraph adjust by itself. Our tool **doesn't do this**. For that you have to turn the PDF into a Word document, edit it there and save it as a PDF again; we explain how, and when it's worth it, further down.

With Edit PDF you can:

- Type **text** anywhere, over several lines, in Helvetica (regular or bold), Times or Courier, from 4 to 144 points and in any color.
- **Highlight** sentences with a see-through color that keeps the text below readable.
- **Draw** freehand and add **rectangles**, **lines** and **arrows**, from 1 to 20 points thick.
- Place a PNG or JPG **image** of up to 10 MB, such as a logo, a stamp or your signature saved as an image.
- **Cover** parts of the page with a white box.

Everything happens in your browser: the PDF and what you add never leave your device.

## How to edit a PDF, step by step

1. Open [Edit PDF](tool:edit-pdf) and drag the PDF into the box, or tap it to choose the file.
2. Pick the page from the thumbnails and use **Zoom in** to work precisely.
3. In the toolbar, choose what you want to add: **Text**, **Highlight**, **Draw**, **Rectangle**, **Line**, **Arrow**, **Cover** or **Image**.
4. To write, choose the **Font**, the **Size (pt)** and the **Color**, tap the page where the text goes and type it in the **Text** box that appears above.
5. To fix something, choose **Select**, tap the item and drag it; **Delete** removes it, and **Undo** and **Redo** step through your changes.
6. Press **Save PDF**, then **Download**.

![The editor with a PDF notice: a highlighted date, a red arrow and the corrected time](shot:editar-pdf-texto "The old time is covered with a white box and the new one is typed on top. The font, size and text of the selected item are adjusted above the page.")

A few details that save time:

- On images, highlights and white boxes, the **small square in the corner** resizes them. Text doesn't have that square: you make it bigger or smaller with **Size (pt)**.
- Each tool remembers its own color: text starts in black, highlights in yellow and shapes in red. **Other color** lets you pick any shade.
- You can edit several pages before saving: the thumbnails of pages with changes show a dot.
- On a phone it works with your finger. On a computer, Ctrl+Z undoes and Ctrl+Y redoes (Cmd on a Mac).

## Fixing text that's already in the PDF

This is what people look for most: changing a date, an amount, a misspelled name. Since the original text can't be rewritten, the trick is to **cover it and type on top**:

1. Choose **Cover** and drag over the word or figure you want to change.
2. Choose **Text** and tap exactly where the old text started.
3. Type the new one, with a font and size close to the original.

To make it blend in: **Helvetica** looks like Arial and most sans-serif typefaces; **Times** looks like the serif type of more formal documents. In nearly every document, body text is between 10 and 12 points. With the zoom at 200% or 300%, getting the position right is easy.

This trick works well for single words, figures and short lines. If you need to rewrite whole paragraphs, the new text won't fit in the gap left by the old one. In that case, convert the PDF with [PDF to Word](conv:pdf-docx), edit it like any document and convert it back with [Word to PDF](conv:docx-pdf). Keep in mind that this conversion runs on our server and that the resulting Word file is a clean document, not an exact copy of the layout: the guide [How to convert a PDF to Word](guide:pdf-to-word) explains what's kept and what isn't.

## Covering isn't deleting: careful with private data

This matters if you're going to share the PDF. A white box **only hides things from view**: the text below is still in the file, and anyone can select it, copy it or find it with the PDF reader's search. The editor reminds you with a note as soon as you use **Cover**.

If what you're covering must not reach anyone (an ID number, a bank account, an address), do this:

1. With **Select**, tap the white box.
2. Tick **Really hide (turns this page into an image)**.
3. Save the PDF.

![A selected white box with the Really hide box ticked](shot:editar-pdf-tapar "With “Really hide” ticked, the page is saved as an image and whatever was covered is gone from the file.")

When you save, that page is replaced by a high-quality image of itself: whatever was under the box is gone from the file. The trade-off is that the text on that page can no longer be selected or searched, and the PDF usually gets bigger. The other pages stay as they were, so tick it only on the pages that need it.

## What to know before you save

- **What you add is permanent.** It's drawn into the page, not added as a comment: it looks the same in every reader and when printed, but afterwards it can't be moved or deleted, not even if you open the PDF in Edit PDF again. Check everything before pressing **Save PDF** and keep the original.
- **If you reload the page before saving, your changes are lost.** The editor doesn't store anything anywhere.
- **Accents and other scripts.** Accented letters such as é, ñ or ç are typed in the chosen font. Text in scripts those fonts don't cover, such as Chinese, and emoji are added as an image using your device's fonts: they look right, but can't be selected.
- **Scanned PDFs.** You can type, highlight and cover just as on any PDF. If you also want their text to be searchable and copyable, run them through [OCR scanned PDF](tool:ocr-pdf) first.

## Other edits: which tool to use

Sometimes “editing a PDF” means something else. For these cases there are more direct tools:

- **Filling in a form with fields** (text boxes, checkboxes, lists): [Fill PDF form](tool:fill-pdf-form) finds them and lets you complete them; the guide [How to fill in a PDF form](guide:fill-pdf-form) walks you through it. If the form is just a drawing with lines, use Edit PDF.
- **Signing**: [Sign PDF](tool:sign-pdf) places your drawn signature or a photo of it; see [How to sign a PDF without printing it](guide:sign-pdf).
- **Reordering, rotating or removing pages**: [Organize PDF pages](tool:organize-pdf), [Rotate PDF](tool:rotate-pdf) or [Delete pages from a PDF](tool:delete-pdf-pages).
- **Adding pages from another PDF**: [Merge PDF](tool:merge-pdf).
- **Putting the same text on every page**: Edit PDF works one page at a time. For a DRAFT or CONFIDENTIAL stamp on all of them, use [Add a watermark to a PDF](tool:pdf-watermark); to number them, [Add page numbers to a PDF](tool:pdf-page-numbers).
- **Protecting the result**: [Password protect a PDF](tool:protect-pdf) adds a password to open it.

## Summary

- [Edit PDF](tool:edit-pdf) adds text, highlights, drawings, shapes, images and white boxes, for free and without uploading the file.
- It doesn't change the original text: to fix a word, cover it and type on top; to rewrite paragraphs, convert the PDF to Word.
- Covering with white doesn't delete: if the data is private, tick “Really hide”.
- What you add becomes permanent when you save: check first and keep the original.
- For forms, signatures, pages, watermarks or passwords, use the dedicated tool.
`;

export default body;
