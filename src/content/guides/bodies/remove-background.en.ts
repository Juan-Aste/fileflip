const body = `
A product photo on a white background looks cleaner in an online shop; a portrait without its background works for a résumé, a badge or a profile picture; an object or a logo with no background can go on top of any design. This guide explains how to remove the background from a photo for free without uploading it anywhere, when to use each mode of the tool, how to fix the edges and which format to download depending on where the picture is going.

## Which mode to choose: people or objects

[Remove image background](tool:remove-background) has two modes, and picking the right one matters more than anything else:

- **People (automatic)**: for portraits, selfies and photos of one or more people. As soon as you choose the photo, an AI model (Google’s MediaPipe Selfie Segmenter) finds the person and removes the background on its own. The first time, about 4 MB are downloaded from Fileflect (they then stay in the browser cache), and it needs WebGL. It only recognizes people: if there is no clear person in the photo, it tells you so and offers **Use the rectangle mode**.
- **Objects and products (rectangle)**: for everything else, such as a product on a table, an object, a photographed logo or a pet. You draw a rectangle around the subject and a classic method (GrabCut, no model at all) separates its colors from those of the background. It downloads nothing and works best when the subject’s colors stand out from the background.

In both modes the photo is processed in your browser: neither the photo nor the result leaves your device.

## How to remove the background step by step

These are the steps for a product photo; with a person it is the same, except the first cutout happens on its own and there is no rectangle.

1. Open [Remove image background](tool:remove-background), choose the **Objects and products (rectangle)** mode and pick the photo.
2. Adjust the rectangle on the **Original photo** so it surrounds the object with a little margin. Anything outside it is removed.
3. Check the **Result**. If some background is left, choose **Brush: remove** and paint over it; if part of the object went missing, choose **Brush: keep** and paint over it. The cutout is recalculated after each stroke.
4. Under **Background**, choose **Transparent**, **White** or **Color**, and under **Format**, PNG, WEBP or JPG.
5. Press **Remove background** and download the picture. It keeps the original size and its name ends in “-no-background”.

![A mug photographed on a table, inside the rectangle, and the result without a background on the checkerboard](shot:quitar-fondo-producto.en "The rectangle marks the object; on the right, the result with a transparent background on the checkerboard.")

The status line tells you how much of the photo is kept (for example, “Cutout ready: 15% of the photo is kept.”). If the number is much higher than you expected, some of the background was probably left in.

## Fixing the edges

An automatic cutout is rarely perfect on the first try. The tool has two kinds of brush, and they do different things:

- **Brush: keep** and **Brush: remove** are hints: they tell the method “this is the subject” or “this is background”, and the cutout is recalculated from them. Use them for large areas, like a label the same color as the wall or a shadow stuck to the object. One stroke across the area is enough; you don’t need to fill it in.
- **Eraser** and **Restore** change exactly the pixels you paint, without recalculating anything. They are for details: leftovers in corners, the gap inside a mug’s handle, the space between fingers. You can set the **Brush edge**: **Soft** for natural edges or **Hard** for clean cuts.

To work precisely, zoom in (mouse wheel, pinching with two fingers or the buttons, up to 800%) and move around by holding the space bar, with **Hand (move)** or by sliding with two fingers. The [ and ] keys change the **Brush size**, and **Undo** and **Redo** (Ctrl + Z and Ctrl + Y) step through every change.

A handy trick: under **View on**, switch the view to **Black** or **Magenta**. On a strong color, light leftovers and the halo of the old background stand out at once, while on the checkerboard they go unnoticed. This only changes the preview, not the picture you download.

Keep one limit in mind: the cutout is calculated on a reduced copy of the photo (480 pixels on its longest side) and applied to the original size with a softened edge. The crisp edges of a product come out well, but loose hair or the fuzz of a stuffed toy end up softened, not cut out strand by strand.

## A white background for an online shop

Many shops and marketplaces prefer or require product photos on a plain white background. With this tool:

1. Choose **White** under **Background** (or **Color** and the shade you want in **Background color**).
2. Choose JPG or WEBP as the format: for a photo they are much smaller than PNG.
3. Check the result with **Chosen background**, which shows how the downloaded picture will look.

![The same mug with the white background and the JPG format selected](shot:quitar-fondo-blanco.en "With “White” and JPG, the preview shows the photo exactly as it will be downloaded.")

If you choose JPG while the background is set to **Transparent**, the tool switches to **White** by itself, because JPG cannot store transparency.

A few tips for a professional look:

- **Take the photo with the cutout in mind**: a plain background in a color different from the product (a sheet of card, a wall) makes the job much easier. Avoid backgrounds the same color as the object.
- **Watch the shadow**: a soft shadow on the table can stay attached to the product. Remove it with **Brush: remove** or the **Eraser**.
- **Keep the product centered with some margin**: afterwards you can make it square with [Crop image](tool:crop-image) and bring it to the size the shop asks for with [Resize image](tool:resize-image).
- **Mind the file size**: if the shop limits it, or you want the page to load fast, [Compress image](tool:compress-image) makes the file smaller without changing its dimensions.

## A transparent background: which format to download

If you are going to place the picture on another design (a presentation, a catalog, a web page), download it with a **Transparent** background as a PNG, the most widely supported format with transparency. JPG has no transparency. The differences between formats are explained in [JPG, PNG, WebP or AVIF: which one to use](guide:image-formats).

For a round profile picture, run the transparent PNG through [Round image](tool:round-image).

A special case is the **fake transparent background**: pictures downloaded from the internet that show the gray and white checkerboard but actually have it drawn into their pixels. If you open one of those, the tool detects it and offers **Remove fake background**, which turns that checkerboard into real transparency with no manual cutting.

## A white background for an ID photo

For an ID or passport photo on a white background, remove the background in **People (automatic)** mode, choose **White** and download the picture; then open it in [ID photo maker](tool:id-photo) to frame it to the size you need and build the sheet of copies. The ID photo maker does not change the background by itself. The guide [How to make an ID photo](guide:id-photo) explains framing and printing.

Before you do this, check the requirements: some offices don’t accept edited photos or want the background from the original shot. In that case, the safest option is to take the photo in front of a white wall, or one of the color they ask for.

## Limits and formats

- One photo at a time, up to 30 MB and 40 megapixels.
- It accepts JPG, PNG, WEBP, AVIF, GIF (first frame only) and BMP. iPhone HEIC photos need to be converted to JPG first with [HEIC to JPG](conv:heic-jpg).
- The download keeps the pixel size of the original photo.

## Summary

- For people, use **People (automatic)**; for products, objects and pets, **Objects and products (rectangle)**.
- Fix large areas with **Brush: keep** and **Brush: remove**, and details with **Eraser** and **Restore**, zoomed in.
- Check the edge by viewing it on **Black** or **Magenta**.
- A white or colored background in JPG or WEBP for shops; a transparent background in PNG for designs.
- Everything happens on your device: the photo is not uploaded.
`;

export default body;
