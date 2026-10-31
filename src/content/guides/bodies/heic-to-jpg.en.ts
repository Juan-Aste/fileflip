const body = `
If you have an iPhone, your photos are almost certainly in HEIC format. You don't notice on the phone, but it shows up as soon as you move them to a Windows computer, upload them to a web form or try to send them to someone without an Apple device: the file won't open, there's no thumbnail, or the site says «unsupported format». This guide explains what HEIC is, how to convert the photos to JPG without installing anything and how to avoid the problem on the iPhone itself.

## What HEIC is and why the iPhone uses it

HEIC is the name Apple uses for images stored with the HEIF format and the HEVC video codec. Since iOS 11, the iPhone camera saves photos this way for a practical reason: at similar quality, a HEIC file takes up roughly half the space of a JPG, and on a phone with thousands of photos that's a lot of storage.

The problem is compatibility. JPG has been opened by every program, browser, social network and form for decades; HEIC hasn't. Windows may need extensions from the Microsoft Store to display it, many government and company systems don't accept it, and some older editing programs don't recognize it.

## How to convert HEIC photos to JPG

1. Open [HEIC to JPG](conv:heic-jpg) and drag the photos in, or tap to choose them. You can pick many at once.
2. Check that **JPG** is selected under «Convert to».
3. If you want them smaller, open **Options** and lower the quality or the size. Otherwise, keep the defaults.
4. Press **Convert** and download each photo, or all of them together with **Download all as ZIP**.

![The converter with a HEIC photo ready to turn into JPG](shot:heic-convertir "HEIC photos are converted in your browser: they're never uploaded to a server.")

The conversion happens inside your browser: the photos are never uploaded to a server, which matters when they're personal photos or pictures of documents. It works in Chrome, Edge, Firefox and Safari, on a computer or on the phone itself, with up to 50 photos at a time.

The photo keeps its orientation: if you took it upright, the JPG is upright too, even though the original file stores the rotation separately.

## From your phone or from a computer

**On the iPhone**: open the page in Safari, tap the box to choose files and then «Photo Library». When it's done, download the JPG; Safari saves it in the Files app, in the Downloads folder, from where you can send it or save it to Photos.

**On a Windows computer**: first copy the photos from the iPhone to the computer (by cable, through the cloud or by email). Then drag them all onto the converter at once. If there are many, the ZIP saves you downloading them one by one.

**On Android**: if someone sent you HEIC photos and your phone won't open them, the process is the same as on the iPhone: choose the files from the browser and download the JPGs.

## Worth knowing before you convert

**The photo's data doesn't carry over to the JPG.** iPhone HEIC files store, besides the image, information such as the date and time, the phone model and, if camera location is turned on, the GPS coordinates of where you took it. Our converter draws the image and saves it again, so the resulting JPG doesn't carry that data. When sharing photos with strangers that's an advantage: you don't reveal where you were. But if you plan to sort the photos by date in a program later, bear in mind that information won't be in the file.

If what you want is to remove the location from photos that are already JPGs, [Remove EXIF metadata](tool:remove-exif) does it without converting them again.

**The JPG is larger than the HEIC.** That's normal: HEIC compresses better. At the default quality, the JPG can be noticeably larger than the original. If the form asks for a maximum size (for example, «under 500 KB»), use [Compress image](tool:compress-image) afterwards, which lets you set that exact size.

**Live Photos are a photo plus a short video.** Converting a Live Photo gives you only the still photo. The motion is lost, just as when you email it as a normal photo.

## How to make the iPhone take photos in JPG

If you always need JPG, you can change the camera format:

1. Open **Settings** on the iPhone.
2. Go to **Camera** and then **Formats**.
3. Choose **Most Compatible**.

From then on, new photos are saved as JPG and videos as H.264. The photos you already have stay in HEIC. In exchange, new photos take more space on the phone; if you're short on storage, you may prefer to keep HEIC and convert only the photos you need to send.

## How to copy photos to a computer already as JPG

The iPhone has another option, meant for when you connect it to a computer by cable: in **Settings → Photos**, at the bottom, the **Transfer to Mac or PC** section. With **Automatic**, the iPhone converts photos to a compatible format while copying them; with **Keep Originals**, it copies them as HEIC.

This option only affects copying by cable. If you move the photos through the cloud, a messaging app or email, the format depends on each service: some convert to JPG and others send the file as it is. If the recipient can't open them, convert them before sending.

## Other target formats

JPG is the safest choice, but not the only one:

- **PNG**: loses no quality, but a photo as PNG is far larger. It only makes sense if you're going to edit the image many times. You can use [HEIC to PNG](conv:heic-png).
- **WebP**: smaller than JPG and current browsers open it, but not every form accepts it.
- **PDF**: if you need to send several photos of a document (the front and back of an ID card, a multi-page invoice), [Images to PDF](tool:images-to-pdf) accepts HEIC directly and builds a single PDF with one photo per page.

The guide [JPG, PNG, WebP or AVIF: which one to use](guide:image-formats) explains the differences between these formats with measured sizes.

## Summary

- HEIC is the iPhone's format: smaller files, but not everything opens it.
- To convert, use [HEIC to JPG](conv:heic-jpg): in your browser, without uploading the photos, many at a time.
- The JPG doesn't keep the photo's date or location, and it's larger than the HEIC.
- To make the iPhone take JPG photos: **Settings → Camera → Formats → Most Compatible**.
- To copy them by cable already converted: **Settings → Photos → Transfer to Mac or PC → Automatic**.
`;

export default body;
