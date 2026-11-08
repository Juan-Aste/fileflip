const body = `
An enrollment form, a scholarship application, a sworn statement or a new-client sheet: lots of paperwork arrives as a PDF you have to fill in and send back. Printing it, writing on it by hand and scanning it works, but the result is often hard to read. If the PDF is a form with fields, you can fill it in right on your computer or phone and return it with typed answers. This guide shows how, explains what “flattening” a form means and covers what to do when the PDF has no fields at all.

## Before you start: does your PDF have fields?

Not every PDF form is the same:

- **A form with fields** (also called an AcroForm): when you open it in a PDF reader, you can click into the boxes and type. Most downloadable forms from government agencies, banks and schools are like this.
- **A “flat” form**: it only has lines or boxes drawn on the page. It's a scanned paper or a document exported without fields. There's nothing to fill in, so you have to write on top of it.
- **An XFA form**: an old Adobe format (LiveCycle) that only Adobe Acrobat fills in properly. It's rare, but some agencies still use it.

You don't need to work this out beforehand: when you open the PDF, the tool tells you how many fields it found, or lets you know if there are none or if it's an XFA form.

## How to fill in a PDF form, step by step

1. Open [Fill PDF form](tool:fill-pdf-form) and choose the PDF, or drag it onto the box.
2. Wait for the “We found… fields” message. The fields are listed by page (**Page 1**, **Page 2**…), with the PDF page shown next to them.
3. Fill in each field. When you select one, its box is highlighted in the preview; you can also tap a box in the preview to jump straight to that field.
4. If you want the answers to be fixed on the page, tick **Flatten the form**. Otherwise, leave it unticked.
5. Press **Save PDF** and then **Download**.

![An enrollment form with the name, date of birth, email, session and level filled in, next to a preview of the page](shot:rellenar-formulario-campos "Each field of the PDF appears as a normal form field; the preview highlights the one you're filling in.")

Everything happens in your browser: neither the PDF nor your answers are uploaded to any server. The downloaded file keeps its original name with “-filled” at the end, or “-flattened” if you flattened it.

## Which kinds of fields you can fill in

The tool recognizes the standard fields of a PDF form and shows each one with the matching control:

- **Text boxes**, single-line or multi-line (for comments or addresses). If the form's author set a character limit, you'll see “Up to… characters” below the box and can't type more than that.
- **Checkboxes**, such as “I accept the terms”.
- **Radio buttons**, when you have to pick a single option (session, marital status, yes or no). If you picked one by mistake, **Clear choice** leaves it blank.
- **Dropdowns** and **list boxes**. “— None —” leaves the list empty; in lists that allow several choices, each option gets its own checkbox.

**Read-only** fields are shown but can't be changed: they keep the value the form's author gave them.

Each field's name is the help text the form's author wrote. If there isn't any, the tool falls back to the field's internal name, which can be something unhelpful like “Text1” or “field 7”. In that case, let the preview guide you: when you select the field, you'll see where it sits on the page.

## Flatten it or keep it editable

When you save, you have two options:

- **Not flattened**: the PDF is still a form. You can open it again (in this tool or any reader) to fix an answer, or send it to someone else to fill in their part.
- **Flattened**: what you typed becomes part of the page's drawing. It looks the same in every viewer and when printed, and nobody can change the answers with a click.

Flatten the form when it's finished and you're about to hand it in. Before you do, also save a copy without flattening: if you spot a mistake later, you can fix it there instead of starting over.

One detail: the answers are drawn with the form's standard font, which only covers the Latin alphabet. Accented letters are fine, but if a field contains Chinese characters or emoji, the PDF is saved with the answers but not flattened, and the tool tells you which fields are affected. Chrome, Firefox, Acrobat and Preview still show them.

## Filling in a PDF form on your phone

The tool works in your phone's browser, with no app to install:

- **Choosing the file**: tapping the box lets you open the PDF from Downloads, Files or Google Drive. If you got it by WhatsApp or email, download it first.
- **Filling it in**: on narrow screens, the list of fields comes first and the page preview sits below it. Type into the fields in the list; it's much easier than aiming at the boxes on the page.
- **Saving**: when you tap **Download**, the PDF goes to your phone's downloads folder, ready to attach or share.

## If it says the PDF has no fields

![A notice saying the PDF has no form fields, with a link to open Edit PDF](shot:rellenar-formulario-sin-campos "If the PDF has no fields, the tool says so and points you to Edit PDF.")

This is what happens with scanned forms or forms made only of lines. In that case, use [Edit PDF](tool:edit-pdf): tap the spot on the page where you want to write and add the text on top, on one page or several. Our guide on [editing a PDF for free without installing anything](guide:edit-pdf) walks you through it.

If the form is a sheet of paper in your hand, first turn it into a PDF with [Scan document](tool:scan-document), then add your answers with Edit PDF.

## XFA forms, password-protected PDFs and signature fields

- **XFA**: if the PDF is XFA only, the tool tells you and offers **Open Edit PDF** so you can write on the page. If the PDF also includes the standard version of the fields, it fills that one in and removes the XFA part, so nobody sees old data in Acrobat.
- **A password to open it**: the tool can't read the PDF until the password is removed. Do that with [Remove a PDF password](tool:unlock-pdf), which asks you for the password, then open the unlocked PDF. PDFs that only have permission restrictions, with no password to open them (very common in official forms), open without you having to do anything.
- **A digital signature field**: the tool detects it but doesn't fill it in, because a digital signature needs a certificate. If what you're asked for is your handwritten signature, use [Sign PDF](tool:sign-pdf) once the answers are in.

## Signing and sending it

The recommended order is: fill in, flatten, sign. That way both the answers and the signature are fixed on the page. To sign without printing, follow the guide [How to sign a PDF without printing it](guide:sign-pdf).

Before sending it, open the downloaded PDF and check that every answer is where it should be. If it's too big to email, [Compress PDF](tool:compress-pdf) shrinks it; the guide [How to reduce a PDF's size](guide:reduce-pdf-size) explains which level to pick.

## Summary

- [Fill PDF form](tool:fill-pdf-form) fills in the text fields, checkboxes, options and lists of a PDF in your browser, without uploading it.
- The preview shows where each field is on the page.
- Flatten the form once it's finished, and keep an editable copy as well.
- If the PDF has no fields or is an XFA form, write on the page with Edit PDF.
- If it has a password, remove it first; to sign it, use Sign PDF after filling it in.
`;

export default body;
