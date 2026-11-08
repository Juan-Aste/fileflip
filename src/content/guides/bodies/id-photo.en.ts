const body = `
A passport, a visa, a driver’s license or an online application almost always asks for the same thing: a photo taken from the front, on a light background, at an exact size. With your phone, a plain wall and good light you can take it at home, crop it to the right size and print several copies on a single 4 × 6 in photo. This guide explains how, and what to watch for so it doesn’t get rejected.

## First: which size you need

Each office sets its own requirements (size, background, head size, whether glasses are allowed), and they vary by country and procedure. Before taking the photo, look up the official instructions for your application or ask the office. Many ID cards are also photographed on site, so you don’t need to bring anything.

Our tool has the most requested sizes:

| Size | Typical use |
| --- | --- |
| 3 × 4 cm | Brazil (RG, CNH, work card) and many procedures in Chile, Colombia and other countries |
| 4 × 4 cm | Many procedures in Argentina |
| 3.5 × 4.5 cm | Passports and visas following the international ICAO standard, such as Mexico’s and European ones |
| 2.5 × 3 cm | Mexico’s “tamaño infantil” |
| 2 × 2 inches (5.1 × 5.1 cm) | US passport and visa |

If your application asks for another size, this tool doesn’t have it: you can crop the photo to any proportion with [Crop image](tool:crop-image) and bring it to the exact pixels with [Resize image](tool:resize-image).

## How to take the photo with your phone

These tips work for almost any document; the details are set by the office that asks for it.

- **Even light from the front**: daylight while facing a window works best. Avoid light from above (it leaves dark circles under the eyes) and light from one side only (half the face in shadow). A direct flash tends to leave shine on the skin and a hard shadow on the wall.
- **A plain, light background**: a white or light gray wall, with no pictures, doors or outlets behind you. Stand half a meter or more away from the wall so your shadow doesn’t fall on it.
- **Have someone else take it**: with the camera at eye level and a meter or more away. A selfie at arm’s length is too close and distorts the face (the nose looks bigger). If you’re alone, rest the phone on something steady and use the timer.
- **A neutral expression**: facing the camera, mouth closed and both eyes open. No cap or sunglasses, and no hair covering the face.
- **No filters**: turn off portrait mode, beauty mode and filters. Many offices don’t accept retouched photos, and the tool doesn’t retouch anything either.
- **Several shots**: take a few and keep the sharpest. You don’t need to frame precisely: leave room around the head and shoulders, since cropping comes later.

## How to make an ID photo step by step

1. Open the [ID photo maker](tool:id-photo) and choose the photo. It accepts JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF and iPhone HEIC, up to 50 MB.
2. Under **Size**, pick the one you need, for example **2 × 2 in (5.1 × 5.1 cm, US)** or **3.5 × 4.5 cm (passport, ICAO)**.
3. Move the box and drag its corners so the head sits inside the oval and the eyes on the dotted line.
4. Press **Make ID photo**.
5. Download both files with **Download**, or together with **Download all as ZIP**.

![An illustrated photo with the 3.5 × 4.5 cm box and the face guide oval](shot:foto-carnet-encuadrar "The box keeps the proportions of the chosen size; the oval and the dotted line show where the head and eyes go.")

Everything happens in your browser: the photo isn’t uploaded to any server.

Pick the size before framing: when you change it, the box is centered again with the new proportions and you’ll have to adjust it again.

## Framing the face

The box always has the proportions of the chosen size, so stretching it can’t distort the face. To adjust it:

- **With your finger or the mouse**: drag the box to move it and its corners to make it bigger or smaller.
- **With the keyboard**: the arrows move it and **Shift** + arrows resize it.
- **With numbers**: the **X**, **Y**, **Width** and **Height** fields (in pixels) are for fine adjustments.

The crown of the head goes near the top of the oval and the chin at its bottom edge. What matters most is the height, from crown to chin: it’s normal for hair or ears to stick out a little at the sides. The vertical line helps you check that the head is centered and straight.

The oval takes up 72 % of the photo’s height: about 37 mm (1.44 in) in 2 × 2 inches, 32 mm in 3.5 × 4.5 cm, and 29 mm in 3 × 4 and 4 × 4 cm. If your application’s instructions say how big the head should be, compare it with these figures and make the box smaller or bigger as needed.

## The files you download

![Both files ready: the single photo and the 4 × 6 in sheet with 8 copies](shot:foto-carnet-resultado "The single photo at 600 dpi and a 4 × 6 in sheet with as many copies as fit.")

- **The single photo**, a JPG at 600 dpi (for example, 1205 × 1205 pixels in 2 × 2 inches, or 827 × 1063 in 3.5 × 4.5 cm). This is the one you upload to an online application or print at its real size.
- **A 4 × 6 in (10 × 15 cm) sheet** at 300 dpi, with as many copies as fit, spaced apart with grey cutting lines: 9 copies of 3 × 4 cm, 6 of 4 × 4 cm, 8 of 3.5 × 4.5 cm, 15 of 2.5 × 3 cm or 2 of 2 × 2 inches.

If the framed area has too little resolution to print sharp (under 300 dpi), the tool warns you. It happens when the face takes up very little of the original photo: better take it again from closer.

## How to print it

Take the sheet to a photo lab, a photo kiosk or a photo printer and order a 4 × 6 in (10 × 15 cm) print, **without cropping or fitting**: the sheet already has that size and the copies come out exact. Then cut along the grey lines with scissors or, better, a craft knife and a ruler.

If you print the single photo at home, choose **actual size** or 100 % in the printer settings, not “fit to page”: the file carries its resolution so it prints at the exact size.

## If the wall isn’t plain

The tool crops and scales the photo as it is: it doesn’t change the background or retouch the face. If you don’t have a light wall at hand, [Remove image background](tool:remove-background) can help: in **People (automatic)** mode it finds the person, and you can download the result on a **White** background or another **Color**, as a JPG the same size as the original. Then open that JPG in the ID photo maker. The guide [How to remove the background from a photo](guide:remove-background) explains it in detail.

Check the edge of the hair carefully before using it, and keep in mind that some offices reject photos with a replaced background. If you can, a light wall is still the safest choice. If you leave a PNG’s background transparent, the ID photo maker fills it with white.

## If you’re uploading it to an online application

Online portals usually set a format, pixel dimensions and a maximum file size. The photo you download is a JPG at 600 dpi:

- If they ask for **other pixel dimensions**, adjust it with [Resize image](tool:resize-image).
- If it’s **larger than allowed**, shrink it with [Compress image](tool:compress-image).
- If your photo is an iPhone **HEIC**, the ID photo maker opens it directly. If you also need the original as a JPG, the guide [How to convert HEIC photos to JPG](guide:heic-to-jpg) explains how.

The files the ID photo maker produces are created anew from the pixels, so they don’t carry the original photo’s EXIF data, such as the phone model or the location. If you’re going to send the original photo as is, you can strip that data with [Remove EXIF metadata](tool:remove-exif).

## Summary

- Check the size and requirements with the office that asks for the photo: they vary by country and procedure.
- Take it from the front, in even light, against a plain light wall, from a meter or more away and with no filters.
- In the [ID photo maker](tool:id-photo), pick the size, frame the head in the oval with the eyes on the line, and download.
- You get the photo at 600 dpi to upload and a 4 × 6 in sheet with several copies to print without fitting.
- If the wall won’t do, try [Remove image background](tool:remove-background), knowing that some offices don’t accept replaced backgrounds.
`;

export default body;
