const body = `
Someone sends you a contract, an authorization or a form as a PDF and asks you to return it signed. The classic route is to print it, sign it by hand, scan it or photograph it and rebuild the PDF. It works, but it takes time and the result usually looks crooked and gray. This guide explains how to put your signature directly on the PDF, from a computer or a phone, and how this signature differs from a digital signature with a certificate.

## Before you start: what kind of signature is required

It's worth clarifying first, because they're different things:

- **Handwritten signature on the PDF**: an image of your signature placed on the page, just as if you signed the paper and scanned it. This is what our tool does, and it's enough for many private agreements, authorizations, statements and forms.
- **Digital signature with a certificate**: it uses a certificate issued by an authorized provider (on a token, a card or an official app) and is recorded cryptographically inside the PDF. Any later change invalidates it. Many official procedures and some contracts require it.

The legal validity of each depends on the country and the procedure. If the organization or company asks for a «digital signature», an image of your signature doesn't replace it; if they ask you to «sign and return the PDF», a handwritten signature is usually enough. If in doubt, ask whoever requested it.

## How to sign a PDF, step by step

1. Open [Sign PDF](tool:sign-pdf) and choose the PDF.
2. Under **Your signature**, choose **Draw it** and sign with your finger, the mouse or a stylus in the box; or choose **Upload a photo or image** of your signature on paper.
3. Choose the **Ink color** (blue or black) and press **Use this signature**.
4. Go to the page where the signature belongs with the arrows and **tap the spot** where you want it, or drag it.
5. Adjust the **signature size** with the slider.
6. Press **Sign and download**.

![A drawn signature placed on the signature line of an authorization](shot:firmar-pdf-colocar "You place the signature by tapping the page; then you can move it and change its size.")

Everything happens in your browser: neither the document nor your signature leaves your device, and we don't store your signature. So next time you'll need to draw it or upload it again.

## Draw it or upload a photo

**Drawing it** is the quickest. On a phone, with your finger, it looks fairly natural; with a mouse it's harder. If you have a tablet with a stylus, that's the best option.

**Uploading a photo** gives the result closest to your signature on paper:

1. Sign on a **plain white** sheet with a dark ink pen (blue or black).
2. Take a photo of it **in good light**, straight on and without shadows.
3. Upload it with **Upload a photo or image** and leave **Remove the white paper background** ticked.

The tool removes the white of the paper and trims the edges so only the stroke remains, on a transparent background. That way the signature looks clean on the document's line, without a white box around it. It accepts PNG, JPG or WEBP up to 10 MB.

## Placing it well

- **Size**: a real signature takes up between a quarter and a third of the width of an A4 or Letter page. The slider shows the size as a percentage of the page width.
- **Position**: aim for the stroke to rest on the signature line, not float above it.
- **With the keyboard**: select the signature with Tab and move it with the arrow keys; with Shift it moves faster. Handy for fine adjustments.

## Signing several pages

The tool places the signature on one page at a time. If the document needs a signature on several pages (for example, on every page of a contract), sign the first one, download the PDF and open that signed PDF again to sign the next.

If you also need to **initial** every page or add text such as your name, your ID number or the date, use [Edit PDF](tool:edit-pdf): it lets you type text anywhere on the page, on several pages, and also add an image, such as your signature saved as a PNG.

## If the PDF is a form

Many PDF forms have fields to fill in (checkboxes, text boxes, lists). Fill in the data first with [Fill PDF Form](tool:fill-pdf-form) and save the PDF flattened, then sign it. That way the data and the signature are fixed on the page and look the same in any reader or printer.

If the form has no fields, just lines to write on by hand, fill in the data with [Edit PDF](tool:edit-pdf).

## After signing

- **Check the result** before sending it: open the downloaded PDF and make sure the signature is on the right page and in the right place.
- **If it's too large** to email, [Compress PDF](tool:compress-pdf) shrinks it. The guide [How to reduce the size of a PDF](guide:reduce-pdf-size) explains which level to choose.
- **If it's confidential**, you can add an opening password with [Password protect a PDF](tool:protect-pdf) and send the password through another channel.

The signature is drawn on the page as an image, so it looks the same in any PDF reader and when printed. Keep in mind that, unlike a digital signature with a certificate, it doesn't stop anyone from changing the document afterwards: keep a copy of the PDF you sent.

## Summary

- [Sign PDF](tool:sign-pdf) puts your handwritten signature on the PDF, without printing or scanning, and without uploading anything.
- Draw your signature or upload a photo on white paper: the background is removed automatically.
- Sign one page at a time; for more pages, open the signed PDF again.
- Fill in forms before signing, with Fill PDF Form or Edit PDF.
- A handwritten signature on a PDF is not a digital signature with a certificate: if that's what's required, it doesn't replace it.
`;

export default body;
