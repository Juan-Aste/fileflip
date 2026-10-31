const body = `
If an online filing system, a court or a university library has ever rejected your PDF with a message like «the file must be in PDF/A format», this guide is for you. It explains what PDF/A is, why it's required, which version to choose and how to convert an ordinary PDF with [PDF to PDF/A](tool:pdf-to-pdfa).

## What PDF/A is

PDF/A is a version of PDF designed for **long-term archiving**. It's an international standard (ISO 19005) that defines a subset of PDF with one guarantee: the document must look exactly the same many years from now, in any program, without depending on anything external.

To achieve that, a PDF/A file:

- **Embeds all fonts** in the file, so the text looks the same even if the computer opening it doesn't have those typefaces.
- **Fixes the colors** with a color profile, so they don't change depending on the screen or printer.
- **Stores the metadata** (title, author, dates) inside the file, in a standard format.
- **Doesn't allow** anything that could stop working or change over time: passwords and encryption, content loaded from the internet, JavaScript, audio and video.

An ordinary PDF may happen to meet most of that, but a PDF/A guarantees it and declares it inside the file.

## Who requires it and why

It's required by institutions that have to **keep documents for years** and can't risk a file no longer opening or looking different:

- Government agencies and online application systems.
- Courts and electronic filing systems.
- Universities, for depositing theses in their repositories.
- Archives, libraries and some electronic invoicing systems.

Each institution states which version it accepts. If the requirement just says «PDF/A», the safest choice is usually PDF/A-2b.

## The versions: 1b, 2b, 3b (and what the letter means)

The number is the version of the standard:

| Version | Based on | Used for |
| --- | --- | --- |
| PDF/A-1 | PDF 1.4 | The first one. For systems that only accept this version. No transparency: it gets flattened. |
| PDF/A-2 | PDF 1.7 | The most widely accepted today. Supports transparency, layers and modern compression. |
| PDF/A-3 | PDF 1.7 | Like 2, but lets you attach any file inside the PDF (used, for example, in electronic invoices that carry their data as XML). |

The letter is the conformance level:

- **b** (basic): guarantees the document **looks** the same. This is the level almost every procedure asks for.
- **a** (accessible): also requires the document to have a tagged structure (headings, paragraphs, reading order), so screen readers can read it. It needs the original document to have been created with that structure.
- **u** (Unicode): on top of level b, guarantees the text can be extracted and searched correctly.

Our tool produces PDF/A-1b, 2b and 3b, which cover what the vast majority of procedures require.

## How to convert a PDF to PDF/A

1. Open [PDF to PDF/A](tool:pdf-to-pdfa) and choose one or more PDFs (up to 5 at a time, up to 15 MB each).
2. Choose the **PDF/A version**: if the procedure doesn't specify another, **PDF/A-2b**.
3. Press **Convert to PDF/A** and download the result.

![The PDF to PDF/A tool with a document chosen and version 2b selected](shot:pdfa-opciones "PDF/A-2b is selected by default: it's the most widely accepted.")

The conversion runs on **our server**, not in your browser, because it needs to convert fonts and colors with LibreOffice. The file travels over an encrypted connection and is processed in memory, without being stored. In our tests, the files it produces pass validation with veraPDF, the reference PDF/A validator.

## What may change in the conversion

The content and the pages are kept, but there are details the format doesn't allow:

- **Password**: a PDF/A can't be encrypted. If your PDF has a password, remove it first with [Remove a PDF password](tool:unlock-pdf).
- **Links and interactive forms**: they may be lost. If the PDF is a form, fill it in first with [Fill PDF Form](tool:fill-pdf-form) and save it flattened.
- **Transparency in PDF/A-1b**: it gets flattened. In practice you hardly notice, but if the document uses transparency effects, PDF/A-2b keeps them.
- **Digital signatures with a certificate**: converting the PDF modifies the file, and an earlier digital signature becomes invalid. If you need to sign digitally, convert to PDF/A first and sign afterwards.

## How to tell whether a PDF is already PDF/A

When you open a PDF/A in Adobe Acrobat Reader, a bar at the top says the file claims compliance with the PDF/A standard and has been opened read-only. Other readers show it in the document properties.

Note: that bar means the file **claims** to be PDF/A, not that it really is. To check, the reference tool is veraPDF, a free, open-source validator that tests the file against the standard and lists any failures.

## Tips for a submission that isn't rejected

- **Compress before, not after**: if the procedure has a size limit, shrink the PDF with [Compress PDF](tool:compress-pdf) and then convert it to PDF/A. If you compress a PDF/A with a tool that doesn't account for it, it may stop complying with the standard.
- **Merge before converting**: if you have to submit several documents as one, combine them with [Merge PDF](tool:merge-pdf) and convert the result.
- **Scans**: if the document is scanned, run [OCR](tool:ocr-pdf) on it first so the text is searchable, then convert it.
- **Handwritten signature**: if you have to sign by hand, add the signature with [Sign PDF](tool:sign-pdf) before converting.

## Summary

- PDF/A is a PDF for archiving: it embeds fonts, fixes colors and forbids anything that could stop working.
- Government agencies, courts, universities and archives require it.
- If no version is specified, use **PDF/A-2b**; **1b** only for older systems, **3b** if you need attachments.
- [PDF to PDF/A](tool:pdf-to-pdfa) converts on our server, without storing the file.
- Remove the password, fill in forms, compress and merge **before** converting.
`;

export default body;
