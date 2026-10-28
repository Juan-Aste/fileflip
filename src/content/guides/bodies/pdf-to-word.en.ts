const body = `
Converting a PDF to Word is useful for one specific thing: **editing the text again** when you don't have the original file. A contract someone sent you as a PDF that you need to correct, an old résumé, notes you want to rewrite. What no converter can promise is a Word file identical to the PDF: a PDF doesn't store paragraphs or tables, only letters drawn at fixed positions on the page, so the converter has to work out what the document looked like.

This guide shows how to do it with our converter, what is kept and what isn't, and which tool to use in the three cases where a direct conversion falls short: scanned PDFs, tables and images.

## Before you start: does your PDF contain text?

Open the PDF and try to select a word with the mouse (or press and hold on it on a phone). There are two possibilities:

- **The word gets selected**: the PDF has digital text. That's the norm for PDFs saved from Word, an invoicing system or a bank. Converting to Word works directly.
- **A rectangle or nothing gets selected**: the PDF is an image, like a scan or a photo saved as PDF. There are no letters to send to Word, only pixels. In that case, skip to the section on scanned PDFs.

This ten-second check saves you the most common frustration: an empty Word file or an error message.

## How to convert a PDF to Word, step by step

1. Open [PDF to Word](conv:pdf-docx) and drag the PDF onto the box, or tap it to choose the file from your device.
2. Check that **Word** is selected under «Convert to».
3. Press **Convert** and wait a few seconds.
4. Download the .docx file with its button and open it in Word, LibreOffice Writer, Google Docs or Pages.

![The converter with a PDF ready to turn into Word](shot:pdf-a-word-convertir "With the PDF chosen, the output format is Word: just press Convert.")

You can convert up to 5 PDFs at once, up to 15 MB each. Unlike most of our tools, this conversion **runs on our server**: the file travels encrypted, is converted and is automatically deleted within an hour. If the document is very sensitive, keep that in mind before uploading it.

## What is kept and what isn't

Our converter reads the PDF's text with its position and size and rebuilds it as a regular Word document:

- **Kept**: all the text, from top to bottom; paragraphs (lines are joined into paragraphs even when the PDF breaks them); headings (lines in larger type become Word headings, with their style); the approximate font size; page breaks (each PDF page starts a new page in Word); and the paper size.
- **May change or be left out**: columns (in two-column text, lines at the same height get merged, so check it); tables (their cells become lines of text); images; colors; exact fonts; and headers or footers, which end up as normal text on each page.

![The PDF already converted, with the button to download the Word document](shot:pdf-a-word-resultado "When it's done, a button lets you download the .docx. The note above sums up what is kept.")

The result is a **clean, easy-to-edit** document, not a visual copy of the PDF. To correct text, rewrite parts or reuse paragraphs, that's exactly what you need: no fighting with overlapping text boxes or line breaks in the middle of every sentence.

## If the PDF is scanned

A scanned PDF has no text, so the converter shows a message instead of handing you an empty Word file. First the letters in the image have to be recognized, which is called OCR:

1. Open [OCR scanned PDF](tool:ocr-pdf), choose the PDF and the **language it's written in** (this matters: with the wrong language, accented letters and characters get mixed up).
2. Download the PDF it returns. It looks the same as the original, but now it has an invisible text layer over every word.
3. Run that new PDF through [PDF to Word](conv:pdf-docx).

The OCR runs in your browser, without uploading the scan, and can take a few seconds per page. Its accuracy depends on the scan: with a well-lit, straight page there are hardly any mistakes; with a crooked or blurry photo, letters get swapped. If you only need the text to paste somewhere else, the OCR can also give you a .txt file directly, so you can skip Word.

If the document is a photo taken with your phone, run it through [Scan document](tool:scan-document) first: it straightens the perspective and makes the paper white, which greatly improves recognition.

## If what you need are the tables

If the PDF is a bank statement, a price list or a report full of numbers, what you almost always want is a spreadsheet, not a Word file. In that case use [PDF to Excel](tool:pdf-to-excel): it builds rows and columns from the alignment of the text, turns amounts like 1,234.56 into real numbers you can add up, and shows you the detected table before downloading. You can then copy the table from Excel and paste it into Word, where it becomes an editable table.

The guide [How to convert a table from a PDF to Excel](guide:pdf-table-to-excel) explains that route in detail.

## If you need the images

Photos and logos in the PDF don't make it into the Word file. To get them back, [Extract images from a PDF](tool:extract-pdf-images) gives you every image at its original resolution, with no loss of quality, and you can then insert them in Word wherever you need them. If what you want is a whole page as an image (for example, a floor plan or a chart drawn with vectors), use [PDF to JPG](conv:pdf-jpg).

## When you don't need to convert the PDF to Word

Converting is often a detour. Before you do it, think about what you actually need:

- **Fill in a form**: if the PDF has fields, [Fill PDF Form](tool:fill-pdf-form) shows them as a normal form. If it's a form without fields (just lines to write on), [Edit PDF](tool:edit-pdf) lets you type on the page.
- **Change a word or a date**: in Edit PDF you can cover the old text with a white box and type the new text on top, without touching the rest of the layout. Keep in mind that covering doesn't erase: the text underneath is still in the file unless you tick «Really hide».
- **Copy a paragraph**: [PDF to text](tool:pdf-to-text) gives you all the text in a .txt file, without going through Word.
- **Sign it**: there's no need to print or convert; [Sign PDF](tool:sign-pdf) adds your signature directly.

## After editing: back to PDF

When you finish correcting the document in Word, you'll usually want to send it as a PDF again so it looks the same on any device. You can use «Save as PDF» in Word or run the .docx through [Word to PDF](conv:docx-pdf). If the result is too heavy to send by email, the guide [How to reduce the size of a PDF](guide:reduce-pdf-size) explains what to do.

## Summary

- First check whether the PDF has selectable text.
- With text: [PDF to Word](conv:pdf-docx) gives you an editable document with paragraphs, headings and page breaks; columns, tables and images may change.
- Scanned: first [OCR scanned PDF](tool:ocr-pdf), then PDF to Word.
- Tables: [PDF to Excel](tool:pdf-to-excel). Images: [Extract images from a PDF](tool:extract-pdf-images).
- If you only need to fill in, fix a line or sign, edit the PDF directly and skip the conversion.
`;

export default body;
