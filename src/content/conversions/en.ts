import type { ConversionContentMap } from "./types";

// Facts these texts must respect (review if the engine changes):
// - Office documents → PDF: LibreOffice (Gotenberg) on our server;
//   free plan: up to 15 MB per file and 5 files at a time.
// - PDF → Word: text is extracted with pdf.js and rebuilt into paragraphs and
//   headings, one Word page per PDF page, up to 300 pages; no images or
//   tables; a scanned PDF fails (it has to go through OCR scanned PDF first).

export const en: ConversionContentMap = {
  "pdf>docx": {
    when: [
      "Turning a PDF into Word is useful when you need to reuse or fix the text: updating a résumé you only have as a PDF, quoting paragraphs from a report, translating a document, or reworking a contract. Copying and pasting from a PDF viewer tends to break lines in random places; here the text comes out already joined into paragraphs.",
      "If you just want to change a word, add a signature or black out a detail, there’s no need to go through Word: it’s faster to use Edit PDF and keep the original layout intact.",
    ],
    differences: [
      "A PDF is designed to look the same on any screen and printer: every letter has a fixed position on the page, and the file has no idea what a paragraph, a table or a list is. A Word document, on the other hand, stores text as a flow that rearranges itself as you type.",
      "That’s why converting PDF to Word isn’t just “opening” the PDF, it’s rebuilding the document: the converter has to work out which lines make up a paragraph and which ones are headings. That rebuild works very well for documents with running text and less well for complex layouts.",
    ],
    kept: [
      "All selectable text, in reading order.",
      "Paragraphs joined back together (no breaks mid-sentence) and headings marked as Word headings.",
      "The approximate font size and the PDF’s page size.",
      "A page break for every PDF page, so it’s easy to compare with the original.",
    ],
    lost: [
      "Images, logos and charts aren’t included.",
      "Tables and columns turn into separate paragraphs: the text is there, but you’ll need to reformat it.",
      "The exact typeface, colors, and repeated headers or footers may change.",
    ],
    limits: [
      "It only works with PDFs that contain text. If the PDF is a photo or a scan, there are no letters to extract and the conversion will show an error: run it through “OCR scanned PDF” first, which recognizes the text, and then convert it to Word.",
      "Up to 300 pages per file are converted. On the free plan, each file can be up to 15 MB. PDFs protected with an open password have to be unlocked first (with “Remove a PDF password”, if you know the password).",
    ],
    steps: [
      "Choose the PDF (or drag it in). If you want to check first, open the PDF and make sure you can select the text with your mouse: if you can’t, it’s a scan.",
      "Leave Word as the output format and click Convert.",
      "Download the .docx and open it in Word, LibreOffice or Google Docs.",
      "Look over tables and lists, which usually need some touching up, and re-insert any images you need.",
    ],
    faq: [
      {
        q: "Why won’t my PDF convert to Word?",
        a: "Almost always because the PDF is a scan or a photo: it holds an image of the page, not letters. Run it through “OCR scanned PDF” and convert the result. It also fails if the PDF is protected with an open password.",
      },
      {
        q: "Will the Word file look just like the PDF?",
        a: "The text will; the layout, not entirely. Paragraphs and headings come out fine, but tables, columns and images aren’t rebuilt. For documents with running text (letters, reports, contracts) you can start editing the result right away.",
      },
      {
        q: "Can I edit a PDF without converting it to Word?",
        a: "Yes. For small changes (adding text or a signature, blacking out a detail, or filling in a form) use Edit PDF: the original layout stays intact and there’s no need to convert.",
      },
      {
        q: "Are my documents stored?",
        a: "PDF to Word conversion happens on our server because it needs more processing power. The file is sent encrypted, isn’t used for anything else, and is deleted in less than 1 hour.",
      },
    ],
  },

  "docx>pdf": {
    when: [
      "Converting a Word file to PDF is the usual step before sending a résumé, turning in an assignment, submitting paperwork for an application, or sending a quote: a PDF looks the same on any computer or phone, even if the other person doesn’t have Word or has a different version, and nobody can change it by accident.",
      "It’s also the way to go when a website only accepts PDFs or when you want to print somewhere else without the margins shifting.",
    ],
    differences: [
      "A .docx is an editable document: the text reflows depending on the installed fonts, the page size and the version of the program. That’s why the same Word file can look different on two computers.",
      "A PDF locks each page exactly as it looks at the moment of conversion, with its fonts embedded. The trade-off is that it’s no longer convenient to edit: if something needs to change later, the best approach is to fix the Word file and convert it again.",
    ],
    kept: [
      "Text with its styles, tables, images, lists, headers and footers.",
      "The document’s page numbers and page breaks.",
      "Links, which still work in the PDF.",
      "The paper size and margins set in the Word file.",
    ],
    lost: [
      "Comments and tracked changes aren’t printed the way they appear in Word’s review view: accept or reject the changes before converting to be sure of the result.",
      "If the document uses an uncommon font that isn’t on the server, it’s replaced with one of similar metrics, and a line here and there may end up in a different place.",
      "Macros and auto-updating fields don’t run: the PDF shows the last saved value.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan you can convert up to 5 files at a time, up to 15 MB each.",
      "Documents protected with an open password can’t be converted: remove the password in Word before uploading.",
    ],
    steps: [
      "Save your latest changes in Word and, if you used Track Changes, accept or reject them.",
      "Choose the .docx file (or several) and leave PDF as the output format.",
      "Click Convert and download the PDF.",
      "Open it and check the page breaks before sending it, especially if you used special fonts.",
    ],
    faq: [
      {
        q: "Why does the PDF use a different font than my Word file?",
        a: "Because that font isn’t installed on the server and was replaced with a similar one. Common fonts (such as Arial, Times New Roman or Calibri) have equivalents with the same metrics. If you need an exact font, another option is to export to PDF from your own copy of Word.",
      },
      {
        q: "Can I edit the PDF again?",
        a: "For small changes, yes, with Edit PDF. For bigger changes it’s better to edit the original Word file and convert again; turning the PDF back into Word loses images and tables.",
      },
      {
        q: "Can I make the PDF smaller?",
        a: "Yes. If the document has lots of photos, run the PDF through Compress PDF: it shrinks the images and usually cuts the size quite a bit without hurting the quality of the text.",
      },
      {
        q: "What happens to my document after it’s converted?",
        a: "It’s converted on our server over an encrypted connection, isn’t used for anything else, and is deleted in less than 1 hour.",
      },
    ],
  },

  "doc>pdf": {
    when: [
      "A .doc is a Word 97–2003 document. They still turn up in old files from offices, schools and firms: contract templates, letters, forms that have been passed around for years. Converting them to PDF is the simplest way to share or archive them without relying on the other person having a program that opens them properly.",
      "If you’re going to keep editing it, it’s better to open it in Word or LibreOffice and save it as .docx; for sending or printing, a PDF is all you need.",
    ],
    differences: [
      "A .doc is an old binary format that predates .docx (which is compressed XML). Today’s programs can open it, but each one interprets some details its own way, which is why an old .doc can look slightly different on each computer.",
      "Converting it to PDF locks that look in place: what you see in the PDF is what anyone who opens it will see, on any device.",
    ],
    kept: [
      "Text, styles, tables, images, headers and footers.",
      "The document’s page numbering and paper size.",
      "Accented letters and special characters.",
    ],
    lost: [
      "Elements from that era such as WordArt, objects embedded from other programs, or drawings made with the old tools may look different or show up as a static image.",
      "Fonts that aren’t on the server are replaced with others of similar metrics.",
      "Macros don’t run.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice, which reads the .doc format very well. On the free plan: up to 5 files at a time, up to 15 MB each.",
      "Password-protected .doc files can’t be converted.",
    ],
    steps: [
      "Choose the .doc file (or several at once, like a folder of old templates).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDFs (with several files, you can download them all together as a ZIP).",
    ],
    faq: [
      {
        q: "Is .doc the same as .docx?",
        a: "No. .doc is the Word format up to 2003, and .docx is the format from Word 2007 onward. Both convert to PDF equally well; .docx usually gives a more faithful result with complicated layouts.",
      },
      {
        q: "My old .doc looks odd in the PDF. What can I do?",
        a: "If it has WordArt or embedded objects, open it in Word or LibreOffice, save it as .docx and convert that file. Also check that it doesn’t use very unusual fonts.",
      },
      {
        q: "Are my files stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour. They aren’t used for anything else.",
      },
    ],
  },

  "xlsx>pdf": {
    when: [
      "Turning an Excel file into a PDF is handy for sending a spreadsheet the other person only needs to read: a quote, a price list, a schedule, an expense report or a payroll statement. A PDF can’t be changed by accident, opens on any phone and prints the same everywhere.",
      "If the other person needs to work with the data (filter, add up, copy), send them the Excel file or a CSV: in the PDF the numbers are visible, but they’re no longer a table you can calculate with.",
    ],
    differences: [
      "An Excel spreadsheet has no pages: it’s a grid that can be much wider and longer than a sheet of paper, with formulas that recalculate. A PDF, by contrast, is organized into fixed pages.",
      "So when you convert, the spreadsheet is split into pages according to the print settings saved in the file: orientation, print area, margins and the option to fit to one page wide. What you see in Excel’s print preview is the closest thing to the result.",
    ],
    kept: [
      "Values as they appear in the cells (the result of the formulas, not the formula).",
      "Formatting: borders, fill colors, bold, number and date formats.",
      "Charts and inserted images.",
      "Every sheet that has content, one after another.",
    ],
    lost: [
      "Formulas, filters and pivot tables stop working: you get a snapshot of the values.",
      "If the spreadsheet is wider than the page and isn’t set to fit, the columns on the right move to separate pages.",
      "Hidden sheets, comments and macros aren’t included.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan, up to 5 files at a time, up to 15 MB each. Huge spreadsheets (tens of thousands of rows) can take a while or produce hundreds of pages.",
      "Files protected with an open password can’t be converted.",
    ],
    steps: [
      "In Excel, check the print preview: choose landscape if the table is wide and “Fit All Columns on One Page” so it doesn’t get cut off. Save the file.",
      "Choose the .xlsx and leave PDF as the output format.",
      "Click Convert and download the PDF.",
      "If a column ended up on another page, adjust the print settings in Excel and convert again.",
    ],
    faq: [
      {
        q: "Why did my table get split across several pages?",
        a: "Because the spreadsheet is wider than the page. In Excel, on Page Layout, choose landscape orientation and fit to 1 page wide, then save and convert again.",
      },
      {
        q: "Can I convert just one sheet?",
        a: "Every sheet with content is converted. If you only want one, save a copy of the file with just that sheet, or pick out the pages you need afterward with Split PDF.",
      },
      {
        q: "What if I need to go the other way, from PDF to Excel?",
        a: "Use PDF to Excel: it detects the tables in a text-based PDF and puts them into cells. It works best with simple, well-aligned tables.",
      },
      {
        q: "Are my spreadsheets stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "xls>pdf": {
    when: [
      "A .xls is the Excel format up to version 2003. Plenty of offices still have legacy spreadsheets, old accounting systems that export .xls, or templates that have been passed around for years. Converting them to PDF lets you archive or send them without worrying about compatibility.",
      "If you’re going to keep updating the data, save it as .xlsx in Excel or LibreOffice; for reading, printing or attaching to an application, a PDF is all you need.",
    ],
    differences: [
      "A .xls is a binary format with the limits of its time: up to 65,536 rows and 256 columns per sheet. The modern .xlsx has far more capacity and is easier for today’s programs to read.",
      "A PDF has no formulas or cells: it’s the spreadsheet printed onto pages, using whatever print settings are saved in the file.",
    ],
    kept: [
      "The visible cell values, with their number, date and currency formats.",
      "Borders, colors, fonts and charts.",
      "Every sheet that has content.",
    ],
    lost: [
      "Formulas and macros (very common in old spreadsheets) don’t run: you get the last saved value.",
      "Columns that don’t fit the width of the page move to separate pages if the spreadsheet isn’t set to fit.",
      "Hidden sheets and comments aren’t included.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan: up to 5 files at a time and 15 MB per file.",
      "Files with an open password can’t be converted.",
    ],
    steps: [
      "If you can, open the spreadsheet and check the print settings (orientation and fit to page). If you don’t have Excel, just convert it and look at the result.",
      "Choose the .xls (or several) and leave PDF as the output format.",
      "Click Convert and download the PDF.",
    ],
    faq: [
      {
        q: "Do calculated values come out right if the spreadsheet has macros?",
        a: "You get the last value saved in the file. Macros don’t run during the conversion, so if the spreadsheet needs a macro to recalculate, do that in Excel before converting.",
      },
      {
        q: "Can I convert the .xls to a modern format?",
        a: "Yes: open it in Excel or LibreOffice Calc and use Save As .xlsx. If you only need the data, you can also export it to CSV with Excel to CSV.",
      },
      {
        q: "Are my files stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "pptx>pdf": {
    when: [
      "Converting a PowerPoint to PDF is the safest way to share a presentation: to send out the slides after a class or a meeting, upload them to an online classroom, or present from someone else’s computer without surprises from fonts or versions.",
      "A PDF is smaller than many presentations, opens on any phone and doesn’t let anyone change the content by accident.",
    ],
    differences: [
      "A .pptx presentation has slides with animations, transitions, videos and speaker notes, and it’s shown in slideshow mode. A PDF is a static document: one page per slide, exactly as each one looks at the end.",
      "To present live with animations, keep using PowerPoint; for handing out or archiving, a PDF is more practical.",
    ],
    kept: [
      "One page per slide, with its design, backgrounds, images, charts and tables.",
      "The text, which stays selectable and searchable.",
      "Links to websites.",
    ],
    lost: [
      "Animations and transitions: each slide appears in its final state.",
      "Embedded video and audio: only the poster frame remains, and they don’t play.",
      "Speaker notes aren’t included.",
      "Uncommon fonts that aren’t on the server are replaced with similar ones, and a text box may come out slightly different.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan, up to 15 MB per file and 5 files at a time: if your presentation is bigger because of videos, remove or compress them first.",
      "Presentations with an open password can’t be converted.",
    ],
    steps: [
      "If the presentation has large videos, remove them from a copy: they won’t play in the PDF anyway.",
      "Choose the .pptx and leave PDF as the output format.",
      "Click Convert and download the PDF.",
      "Check any slides with special fonts; if something moved, try a common font.",
    ],
    faq: [
      {
        q: "Are speaker notes included?",
        a: "No: the PDF has only the slides, one per page. If you need to hand out the notes, in PowerPoint you can print the Notes Page view to PDF.",
      },
      {
        q: "Are animations lost?",
        a: "Yes. Each slide appears as it looks at the end, with every element visible. If an animation was hiding something, that will show up too.",
      },
      {
        q: "My PowerPoint is over 15 MB. What can I do?",
        a: "It’s almost always because of videos or very large photos. Remove the videos from a copy or, in PowerPoint, use Compress Pictures; then convert it. If the PDF is still large, run it through Compress PDF.",
      },
      {
        q: "Are my presentations stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "ppt>pdf": {
    when: [
      "A .ppt is the PowerPoint format up to 2003. It shows up in presentations from old courses and training sessions that are still making the rounds. Converting them to PDF lets you view them on any device, even phones that can’t open .ppt, and archive them without depending on a particular program.",
    ],
    differences: [
      "A .ppt is an old binary format; today’s programs can open it, but sometimes with small differences in layout, fonts or effects. .pptx replaced it in 2007.",
      "A PDF locks each slide in place as a page: there are no animations or slideshow mode, but it looks the same everywhere.",
    ],
    kept: [
      "One page per slide, with text, images, backgrounds and tables.",
      "Selectable text.",
    ],
    lost: [
      "Animations, transitions, sounds and videos.",
      "Speaker notes.",
      "Effects and WordArt from that era may look somewhat different; fonts that aren’t on the server are replaced with similar ones.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan, up to 15 MB per file and 5 files at a time.",
      "Files with an open password can’t be converted.",
    ],
    steps: [
      "Choose the .ppt file (or several).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF and check that slides with effects look right.",
    ],
    faq: [
      {
        q: "Can I convert a .ppt to .pptx?",
        a: "Yes, by opening it in PowerPoint or LibreOffice Impress and saving it as .pptx. For sharing, a PDF is usually enough.",
      },
      {
        q: "Why does a slide look different in the PDF?",
        a: "Old .ppt files sometimes use effects or fonts that are drawn differently today. If it matters, open it in PowerPoint, change that element and convert again.",
      },
      {
        q: "Are my files stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "odt>pdf": {
    when: [
      "A .odt is the text document format of LibreOffice and OpenOffice, used by many teams in government and education. Converting it to PDF is useful for sending the document to someone who uses Word or to a website that only accepts PDFs.",
    ],
    differences: [
      "ODT (OpenDocument) is an open, standard format for editable documents, like Word’s .docx. Word can open it, but doesn’t always display it the same way LibreOffice does. A PDF, on the other hand, looks the same everywhere.",
      "Since our conversion uses LibreOffice itself, ODT is the format that converts best: the result is the same as exporting to PDF from LibreOffice Writer.",
    ],
    kept: [
      "Text, styles, tables, images, footnotes, headers and footers.",
      "Tables of contents and page numbering.",
      "Links.",
    ],
    lost: [
      "Comments and tracked changes aren’t printed the way they appear in the review view: accept or reject them first.",
      "Fonts that aren’t on the server are replaced with similar ones.",
    ],
    limits: [
      "The conversion runs on our server. On the free plan, up to 15 MB per file and 5 files at a time.",
      "Password-protected documents can’t be converted.",
    ],
    steps: [
      "Choose the .odt file (or several).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF.",
    ],
    faq: [
      {
        q: "How is this different from exporting to PDF in LibreOffice?",
        a: "There’s no difference in the result: we use the same engine. This page comes in handy when you don’t have LibreOffice at hand, for example on a phone or someone else’s computer.",
      },
      {
        q: "Can I convert LibreOffice spreadsheets or presentations?",
        a: "Yes, .ods files (spreadsheets) and .odp files (presentations) also convert to PDF.",
      },
      {
        q: "Are my documents stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "rtf>pdf": {
    when: [
      "RTF (Rich Text Format) shows up in documents generated by business management systems, medical or accounting software, and in files saved with WordPad or TextEdit. Converting it to PDF is the way to send or archive it with a fixed look.",
    ],
    differences: [
      "RTF is a text format with basic formatting (bold, italics, fonts, simple tables and images) that almost any word processor can open. It’s highly compatible, but each program interprets it a little differently.",
      "A PDF freezes that formatting onto pages, with the fonts embedded.",
    ],
    kept: [
      "Text with bold, italics, underlining, sizes and colors.",
      "Simple tables, images and paragraph alignment.",
      "Margins and page size, if the file defines them.",
    ],
    lost: [
      "Elements that some programs add to RTF in their own way (special fields, embedded objects) may not show up.",
      "Fonts that aren’t on the server are replaced with similar ones.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan, up to 15 MB per file and 5 files at a time.",
    ],
    steps: [
      "Choose the .rtf file (or several).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF.",
    ],
    faq: [
      {
        q: "Can RTF files be opened in Word?",
        a: "Yes, Word, LibreOffice and Google Docs all open them. Converting to PDF is useful when you want it to always look the same or when a system only accepts PDFs.",
      },
      {
        q: "A system generates lots of RTF files for me. Can I convert them all at once?",
        a: "Yes, choose several at a time (up to 5 per batch on the free plan) and download them together as a ZIP.",
      },
      {
        q: "Are my files stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  "txt>pdf": {
    when: [
      "Converting a TXT file to PDF lets you hand over notes, logs, lists or code as a document that’s ready to print or attach, with pages numbered by the viewer and a look that doesn’t depend on the program used to open it.",
    ],
    differences: [
      "A .txt file has only characters and line breaks: it doesn’t store fonts, sizes or margins, and every program displays it its own way. A PDF puts it onto pages with a fixed typeface and margins.",
    ],
    kept: [
      "All the text, with its line breaks and blank lines.",
      "Accented characters and those from other alphabets, if the file is saved as UTF-8.",
    ],
    lost: [
      "There’s no formatting to keep: the PDF uses a standard typeface, and very long lines wrap to fit the width of the page.",
      "Tabs may line up differently than in your editor.",
    ],
    limits: [
      "The conversion runs on our server with LibreOffice. On the free plan, up to 15 MB per file (a huge amount of text) and 5 files at a time.",
      "If you see garbled characters instead of accented letters, the file isn’t in UTF-8: open it in your editor, save it with UTF-8 encoding and convert again.",
    ],
    steps: [
      "Choose the .txt file (or several).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF and check that accented characters look right.",
    ],
    faq: [
      {
        q: "Can I choose the font or font size?",
        a: "Not with this conversion. If you want to add formatting (headings, bold, lists), write the text in Markdown and use Markdown to PDF, or paste it into a word processor.",
      },
      {
        q: "Why do strange symbols show up instead of accented letters?",
        a: "Because the file is saved in an old encoding. Open it in Notepad or another editor, save it as UTF-8 and convert again.",
      },
      {
        q: "Are my files stored?",
        a: "They’re converted on our server over an encrypted connection and deleted in less than 1 hour.",
      },
    ],
  },

  // Photos and images ↔ PDF (19.2b2). Facts: everything runs in the browser;
  // HEIC via libheif (WASM, ~2 MB, downloaded the first time), primary image,
  // rotation applied; converting decodes and re-encodes, so metadata (date,
  // GPS, camera) doesn’t carry over to the new file; transparency → white
  // background in JPG; adjustable quality (82 by default) and size; image →
  // PDF: one page the size of the image, JPG and PNG not recompressed; PDF →
  // image: 72/150/300 DPI (150 by default), one image per page, ZIP if there
  // are several; password-protected PDF: the password has to be removed first.
  // Per-file limit depends on the device’s memory (100 MB on most; less on
  // low-memory phones).
  "heic>jpg": {
    when: [
      "iPhones have saved photos as HEIC for years. They look fine on the iPhone itself and on a Mac, but plenty of web forms, government and application portals, older Windows programs and some Android apps won’t accept them. Converting them to JPG is the safest way to make sure any person or site can open them.",
      "If you’re only going to store the photos or view them on Apple devices, there’s no need to convert them: HEIC takes up less space at the same quality.",
    ],
    differences: [
      "HEIC uses a modern video codec (HEVC) to compress photos: at the same visual quality, it takes up roughly half the space of a JPG. JPG dates from 1992 and is far less efficient, but absolutely everything opens it: browsers, phones, printers, social networks and business systems.",
      "A HEIC file can also store things JPG can’t, like several images in one file or depth data for Portrait mode.",
    ],
    kept: [
      "The main photo at full resolution.",
      "The orientation: a portrait photo stays upright.",
      "The colors, with a loss of quality you won’t notice at the default quality setting.",
    ],
    lost: [
      "Metadata (date, GPS location, camera model) doesn’t carry over to the JPG, which also protects your privacy if you’re going to share the photo.",
      "Live Photos become still photos; Portrait mode depth data isn’t kept.",
      "The JPG is larger than the original HEIC, usually 1.5 to 2 times the size.",
    ],
    limits: [
      "The conversion happens in your browser: your photos aren’t uploaded to any server. The first time, the HEIC decoder (about 2 MB) is downloaded, and after that it stays in your browser’s cache.",
      "You can convert lots of photos at once. On phones with little memory, very large photos may take longer; if one fails, convert it on its own.",
    ],
    steps: [
      "Copy the photos from your iPhone to your computer (or open them right on the phone) and select them all together.",
      "Leave JPG as the output format. If you want smaller files, lower the quality to 70–80 or reduce the size.",
      "Click Convert.",
      "Download the photos one by one or all together in a ZIP.",
    ],
    faq: [
      {
        q: "Do I lose quality going from HEIC to JPG?",
        a: "A little, because JPG also uses lossy compression, but at the default quality you can’t see it with the naked eye. If you’re going to print the photo or edit it heavily, raise the quality to 90 or more, or convert it to PNG.",
      },
      {
        q: "How do I get my iPhone to take photos in JPG directly?",
        a: "Go to Settings → Camera → Formats and choose “Most Compatible.” New photos will be saved as JPG and take up more space; you can convert the ones you already have in HEIC here.",
      },
      {
        q: "Is the photo’s location kept?",
        a: "No: the new JPG doesn’t carry the date, GPS or camera data. That’s handy for sharing photos without revealing where they were taken.",
      },
      {
        q: "Are my photos uploaded to the internet?",
        a: "No. The HEIC is decoded and converted in your own browser; no server ever receives your photos.",
      },
    ],
  },

  "heic>png": {
    when: [
      "Converting HEIC to PNG makes sense when you’re going to edit the photo: crop it several times, add text, use it in a design or a presentation. PNG doesn’t lose quality every time you save it, so it’s a better starting point than a JPG for working on an image.",
      "To send photos in a message or upload them to a form, on the other hand, JPG is the better choice: the files are much smaller.",
    ],
    differences: [
      "HEIC is a format with very efficient compression, designed to store photos in little space. PNG is a lossless format: it stores every pixel exactly, at the cost of much larger files, especially with photos.",
      "PNG also supports transparency, which comes in handy if you later want to cut out the person or object in the photo.",
    ],
    kept: [
      "The main photo at full resolution, pixel for pixel exactly as decoded from the HEIC.",
      "The photo’s orientation.",
      "The quality: PNG doesn’t add any lossy compression.",
    ],
    lost: [
      "The file grows a lot: a 2 MB HEIC photo can top 15 MB as a PNG.",
      "Metadata (date, location, camera) isn’t copied.",
      "Live Photos become still photos.",
    ],
    limits: [
      "Everything happens in your browser, without uploading your photos. The first time, the HEIC decoder (about 2 MB) is downloaded.",
      "Since PNG photos are large, on phones with little memory it’s best to convert just a few photos at a time.",
    ],
    steps: [
      "Choose the HEIC photos.",
      "Choose PNG as the output format. If you don’t need full resolution, reduce the size so the file is smaller.",
      "Click Convert and download the PNGs (or the ZIP).",
    ],
    faq: [
      {
        q: "PNG or JPG for my iPhone photos?",
        a: "JPG for sharing and storing (the files are much smaller); PNG if you’re going to edit the photo or need it not to lose any quality along the way.",
      },
      {
        q: "Why is the PNG so much bigger than the HEIC?",
        a: "Because PNG doesn’t throw away any information: it stores every pixel as is. For drawings or screenshots that means small files, but for highly detailed photos the files get very large.",
      },
      {
        q: "Can I remove the background afterward?",
        a: "Yes. With the PNG, use Remove image background: the result keeps the transparency.",
      },
    ],
  },

  "heic>pdf": {
    when: [
      "HEIC to PDF is useful when you’ve taken photos of a document with your iPhone (an ID card, a receipt, a prescription, a certificate) and you need to send it or upload it to a site that only accepts PDF.",
      "If several photos make up a single document, use Images to PDF to combine them into one file with the pages in the order you choose. And if you want the photo to look like a scan, try Scan document.",
    ],
    differences: [
      "A HEIC is a photo; a PDF is a document made of pages. When you convert, the photo is placed on a page the same size as the image, so it looks the same but can now be attached wherever a PDF is required.",
    ],
    kept: [
      "The whole photo, with no margins or cropping.",
      "The correct orientation.",
      "Good quality: the photo is turned into a high-quality JPG before it goes into the PDF.",
    ],
    lost: [
      "The text in the photo can’t be selected or searched: the PDF contains an image. To make it searchable, run it through “OCR scanned PDF” afterward.",
      "The photo’s metadata doesn’t carry over to the PDF.",
    ],
    limits: [
      "The conversion happens in your browser: photos of your documents aren’t uploaded to any server.",
      "Each photo becomes its own one-page PDF. To combine several, use Images to PDF.",
    ],
    steps: [
      "Choose the HEIC photo (or several, if you want one PDF per photo).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF. If it’s too big for the site you’re uploading it to, use Compress PDF.",
    ],
    faq: [
      {
        q: "How do I combine several photos into a single PDF?",
        a: "With Images to PDF: you choose all the photos (HEIC works too), put them in order, and you get a single PDF with one page per photo.",
      },
      {
        q: "The site wants a PDF under 1 or 2 MB. What do I do?",
        a: "Run the PDF through Compress PDF, or reduce the photo’s size with Resize image before converting. For a document, 1,500 to 2,000 pixels on the long side is usually enough for it to read clearly.",
      },
      {
        q: "Are the photos of my documents uploaded anywhere?",
        a: "No. They’re converted in your browser and never leave your device.",
      },
    ],
  },

  "webp>jpg": {
    when: [
      "Many sites serve their images as WEBP, so when you save a picture from your browser it often ends up with that extension. Converting it to JPG makes sense when an older editing program, an app, a form or a printer doesn’t recognize it.",
      "If the image has transparent areas (a logo, an icon), convert it to PNG instead of JPG, because JPG doesn’t support transparency.",
    ],
    differences: [
      "WEBP is a Google format designed for the web: at the same quality, it’s 25–35% smaller than a JPG, and it also supports transparency and animation. JPG is older and less efficient, but every program and device accepts it.",
    ],
    kept: [
      "The image’s resolution.",
      "The colors, with a loss of quality you won’t notice at the default quality setting.",
    ],
    lost: [
      "Transparency: transparent areas turn white.",
      "If the WEBP is animated, only the first frame is converted.",
      "The JPG is usually somewhat larger than the original WEBP.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading your images, and you can convert lots of them at once.",
    ],
    steps: [
      "Choose the WEBP files (or drag them in).",
      "Leave JPG as the output format and, if you like, adjust the quality or size.",
      "Click Convert and download the images (or the ZIP).",
    ],
    faq: [
      {
        q: "Why are the images I save from the internet WEBP?",
        a: "Because sites serve them in that format so they load faster. Your browser saves the file exactly as it received it.",
      },
      {
        q: "What happens to a transparent background?",
        a: "JPG doesn’t support transparency, so those areas turn white. If you want to keep it, convert the WEBP to PNG.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "webp>png": {
    when: [
      "WEBP to PNG is the right conversion when the image has transparency (logos, icons, stickers, cutouts) and you need to open it in a program that can’t read WEBP, or when you’re going to edit it and don’t want to lose quality every time you save.",
    ],
    differences: [
      "Both formats support transparency. WEBP compresses more (it can be lossy or lossless) and is ideal for publishing on the web; PNG is lossless and opens in any image editor, word processor or design program.",
      "A rule of thumb: for publishing on a website, WEBP; for editing, printing or inserting into a Word document or a presentation, PNG.",
    ],
    kept: [
      "Transparency, including soft edges.",
      "The resolution and colors exactly as they look in the WEBP.",
    ],
    lost: [
      "If the WEBP is animated, only the first frame is converted.",
      "The PNG is usually quite a bit larger, especially if the image is a photo.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading your images.",
    ],
    steps: [
      "Choose the WEBP files.",
      "Leave PNG as the output format.",
      "Click Convert and download the PNGs (or the ZIP).",
    ],
    faq: [
      {
        q: "Do I lose quality going from WEBP to PNG?",
        a: "No additional loss: the PNG stores exactly the pixels in the WEBP. If the WEBP already lost quality when it was compressed, that can’t be recovered.",
      },
      {
        q: "Why is the PNG so big?",
        a: "Because it doesn’t throw away any information. If the file is too big and you don’t need transparency, convert it to JPG.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed on your device.",
      },
    ],
  },

  "avif>jpg": {
    when: [
      "AVIF is becoming more and more common on websites and on some newer phones and cameras. Converting it to JPG helps when a program, a social network, an older messaging app or a government or application portal doesn’t accept it yet.",
    ],
    differences: [
      "AVIF is a modern format based on the AV1 video codec: at the same quality, it takes up much less space than a JPG and even less than a WEBP, and it supports transparency and greater color depth. JPG is much older, but it’s compatible with everything.",
    ],
    kept: [
      "The image’s resolution.",
      "The colors, with a loss you won’t notice at the default quality setting.",
    ],
    lost: [
      "Transparency: it turns white.",
      "High dynamic range (HDR) AVIF images are shown with a JPG’s standard range.",
      "The JPG is larger than the AVIF, sometimes twice the size or more.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading your images. If your browser can’t decode AVIF on its own, a decoder built into the page is used.",
    ],
    steps: [
      "Choose the AVIF files.",
      "Leave JPG as the output format and adjust the quality if you like.",
      "Click Convert and download the images (or the ZIP).",
    ],
    faq: [
      {
        q: "Which programs can’t open AVIF?",
        a: "Current browsers can, but many editing programs, photo viewers in older versions of Windows and file upload systems still can’t. That’s why JPG is still the safe choice for sharing.",
      },
      {
        q: "AVIF to JPG or to PNG?",
        a: "JPG if it’s a photo and you want a small file; PNG if the image has transparency or you’re going to edit it.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "avif>png": {
    when: [
      "AVIF to PNG makes sense when the image has transparency or when you’re going to edit it in a program that can’t read AVIF yet, like many desktop editors and design programs.",
      "It’s also useful for keeping a working copy of an image downloaded from the web: starting from the PNG, you can crop, retouch and export again as many times as you like without adding quality loss at each step.",
    ],
    differences: [
      "AVIF compresses very efficiently and is designed for publishing; PNG stores the image losslessly and is the universal format for working with images that have transparency.",
    ],
    kept: [
      "Transparency.",
      "The resolution and colors exactly as they look on screen.",
    ],
    lost: [
      "If the AVIF is HDR or has more than 8 bits per channel, the PNG is saved with the standard range and depth (8 bits).",
      "If the AVIF is animated, only the first frame is converted.",
      "The file is quite a bit larger.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading your images.",
    ],
    steps: [
      "Choose the AVIF files.",
      "Leave PNG as the output format.",
      "Click Convert and download the PNGs (or the ZIP).",
    ],
    faq: [
      {
        q: "Is the transparent background kept?",
        a: "Yes, the PNG keeps the AVIF’s transparency, soft edges included.",
      },
      {
        q: "Why is the PNG so much bigger than the AVIF?",
        a: "AVIF is one of the most heavily compressed formats; PNG doesn’t throw anything away. It’s normal for the PNG to be several times larger.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed on your device.",
      },
    ],
  },

  "jpg>pdf": {
    when: [
      "JPG to PDF is useful for sending a photo of a document, a receipt or a drawing somewhere that only accepts PDF: government portals, online classrooms, job applications or health insurance forms.",
      "If you have several photos that make up a single document (for example, the front and back of an ID card), use Images to PDF to combine them into one file.",
    ],
    differences: [
      "A JPG is a standalone image; a PDF is a document made of pages that looks the same everywhere and that online forms and portals accept as a document.",
    ],
    kept: [
      "The photo at its original quality: the JPG goes into the PDF without being recompressed.",
      "The orientation (if the photo has its rotation stored in the EXIF data, it’s applied).",
      "A page exactly the size of the image, with no white borders.",
    ],
    lost: [
      "The text in the photo can’t be selected or searched. For that, run the PDF through “OCR scanned PDF.”",
      "The photo’s EXIF data isn’t visible in the PDF.",
    ],
    limits: [
      "The conversion happens in your browser: photos of your documents aren’t uploaded.",
      "Each JPG becomes its own one-page PDF. To choose A4 or Letter size, set margins or combine several images, use Images to PDF.",
    ],
    steps: [
      "Choose the photo (or several, if you want one PDF per photo).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF. If it’s too big, run it through Compress PDF.",
    ],
    faq: [
      {
        q: "How do I put several photos into a single PDF?",
        a: "Use Images to PDF: you choose all the images, drag them into order, and you get a single PDF.",
      },
      {
        q: "Is the PDF the size of an A4 sheet?",
        a: "With this conversion, the page is the size of the photo. If you need A4 or Letter with margins (for printing), use Images to PDF and choose the page size.",
      },
      {
        q: "Do I lose quality?",
        a: "No. The JPG is stored inside the PDF as is, without being recompressed.",
      },
    ],
  },

  "png>pdf": {
    when: [
      "PNG to PDF is handy for delivering screenshots, diagrams, floor plans, infographics or documents scanned as PNG in a document format anyone can open and print.",
    ],
    differences: [
      "PNG is a lossless image format, ideal for screenshots and graphics with crisp text. The PDF wraps it in a document page without changing the pixels.",
    ],
    kept: [
      "The image with no loss of quality: the PNG is stored inside the PDF as is.",
      "The crisp text and lines in screenshots and diagrams.",
      "Transparency (the PDF shows whatever is underneath, which on a new page is white).",
    ],
    lost: [
      "The text in the image can’t be selected. For that, run the PDF through “OCR scanned PDF.”",
      "A photo saved as PNG makes a large PDF; if it’s a photo, convert it to JPG first or compress the PDF.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading your images.",
      "Each PNG becomes its own one-page PDF, the size of the image. To combine several or choose A4, use Images to PDF.",
    ],
    steps: [
      "Choose the PNG (or several).",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF.",
    ],
    faq: [
      {
        q: "Will the screenshot look blurry in the PDF?",
        a: "No: the PNG goes into the PDF without being recompressed. If it looks small when printed, that’s because the page is the size of the image; use Images to PDF with A4 size so it fits the sheet.",
      },
      {
        q: "Can I combine several screenshots into one PDF?",
        a: "Yes, with Images to PDF.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "pdf>jpg": {
    when: [
      "PDF to JPG is useful for posting a page from a PDF on social media, inserting it into a presentation or a document as an image, sending it over WhatsApp so it shows up without opening anything, or uploading a certificate to a site that only accepts images.",
    ],
    differences: [
      "A PDF can contain text, vectors and images, and it stays sharp at any zoom level. A JPG is a snapshot of the page at a fixed resolution: easier to share and view anywhere, but with no selectable text or infinite zoom.",
    ],
    kept: [
      "The look of every page: text, images, colors and layout, just as they appear in a viewer.",
      "All the pages: one image per page.",
    ],
    lost: [
      "The text is no longer selectable and links stop working.",
      "Infinite sharpness: the image has the resolution you choose (72, 150 or 300 DPI).",
      "Transparent areas of the PDF turn white.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the PDF.",
      "With several pages, you get a ZIP with one image per page. If the PDF has an open password, remove it first with “Remove a PDF password.”",
    ],
    steps: [
      "Choose the PDF.",
      "Leave JPG as the output format and choose the resolution: 150 DPI for screens, 300 DPI if you’re going to print or need to read small print.",
      "Click Convert.",
      "Download the image or the ZIP with all the pages.",
    ],
    faq: [
      {
        q: "Which resolution should I choose?",
        a: "150 DPI is enough for viewing on screen or sending in a message. 300 DPI gives larger, sharper images, for printing or for documents with small print. 72 DPI gives very small files.",
      },
      {
        q: "Can I convert just one page?",
        a: "All pages are converted. If you only want one, pull it out first with Extract pages from a PDF and convert that file.",
      },
      {
        q: "JPG or PNG?",
        a: "JPG for pages with photos and to keep files small; PNG for pages with text, tables or charts, because the letters come out cleaner.",
      },
      {
        q: "What if I want the photos inside the PDF?",
        a: "Use Extract images from a PDF: it pulls out the original images without the page around them.",
      },
    ],
  },

  "pdf>png": {
    when: [
      "PDF to PNG is the way to go when the page has text, tables, charts or plans and you’re going to use it as an image in a presentation, a document, a wiki or a website: PNG keeps letters and lines clean, without the “noise” JPG adds around edges.",
    ],
    differences: [
      "A PDF is a document made of pages with text and vectors; a PNG is a lossless image. When you convert, each page is rendered as an image at the resolution you choose.",
    ],
    kept: [
      "The exact look of every page, with no loss of quality in what’s rendered.",
      "Crisp letters and lines.",
      "All the pages, one image per page.",
    ],
    lost: [
      "The text can’t be selected and links don’t work.",
      "Pages with lots of photos produce large PNGs; for those, JPG is better.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the PDF.",
      "With several pages you get a ZIP. PDFs with an open password have to be unlocked first.",
    ],
    steps: [
      "Choose the PDF.",
      "Leave PNG as the output format and choose the resolution (300 DPI so small print is easy to read).",
      "Click Convert and download the image or the ZIP.",
    ],
    faq: [
      {
        q: "Why does text look better in PNG than in JPG?",
        a: "Because JPG uses lossy compression and leaves small smudges around sharp edges, like those of letters. PNG stores them exactly.",
      },
      {
        q: "Does the PNG have a transparent background?",
        a: "No: each page is rendered on a white background, just as it looks in a PDF viewer.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No, it’s converted in your browser.",
      },
    ],
  },

  // Common image formats, icons and SVG (19.2b3). Facts: everything runs in the
  // browser; quality 82 by default for JPG/WEBP/AVIF; re-encoding doesn’t carry
  // metadata over; transparency → white in JPG; animated GIF → first frame;
  // multi-page TIFF → first page only (TIFF → PDF too); ICO output: 16, 32, 48,
  // 64, 128 and 256 px (only those that don’t exceed the image), centered square
  // with transparent padding; ICO → PNG: the browser decodes the icon (it usually
  // takes the largest image); SVG: rendered by the browser at the size of its
  // width/height/viewBox (1024 px if it has none), enlarging it doesn’t lose
  // sharpness, external images and fonts aren’t loaded; SVG → PDF: the SVG is
  // rendered as a PNG image inside the PDF (it doesn’t stay vector).
  "jpg>png": {
    when: [
      "Converting a JPG to PNG makes sense when you’re going to edit the image several times (crop, add text, retouch) and don’t want every save to add more loss, or when a system specifically asks for PNG, like some design platforms or online stores.",
      "If what you want is a transparent background, converting to PNG isn’t enough: a JPG has no transparency to keep. For that, use Remove image background, which gives you a PNG with the background cut out.",
    ],
    differences: [
      "JPG uses lossy compression: it throws away details the eye barely notices so photos stay small. PNG uses lossless compression: it stores every pixel exactly and supports transparency, but with photos it produces much larger files.",
      "Converting from JPG to PNG doesn’t bring back the quality the JPG already lost; it just keeps you from losing more from that point on.",
    ],
    kept: [
      "The image exactly as it looks in the JPG, pixel for pixel.",
      "The resolution and colors.",
      "The photo’s orientation.",
    ],
    lost: [
      "Nothing in the image is lost, but the file is usually 3 to 10 times larger.",
      "EXIF metadata (date, camera, GPS) doesn’t carry over to the PNG.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images, and it handles batches with a ZIP download.",
    ],
    steps: [
      "Choose the JPGs (or drag them in).",
      "Leave PNG as the output format; if you don’t need the original size, reduce the width so the files are smaller.",
      "Click Convert and download the PNGs or the ZIP.",
    ],
    faq: [
      {
        q: "Does converting from JPG to PNG improve quality?",
        a: "No. The PNG stores exactly what was in the JPG, compression artifacts included. What you gain is that later edits don’t add more loss.",
      },
      {
        q: "Will the PNG have a transparent background?",
        a: "No, because the JPG has no transparency. To cut out the background, use Remove image background.",
      },
      {
        q: "Why is the PNG so much bigger?",
        a: "Because it doesn’t throw away any information. With photos that’s very noticeable; with screenshots or simple graphics, the difference is smaller.",
      },
    ],
  },

  "png>jpg": {
    when: [
      "PNG to JPG is the simplest way to shrink heavy photos and screenshots: to send them by email, upload them to a form with a size limit or post them on a website. A photo saved as PNG can drop to a tenth of its size as a JPG with no visible difference.",
      "It’s not a good idea if the image has transparency (a logo, an icon) or lots of fine text: in those cases, it’s better to leave it as PNG or convert it to WEBP.",
    ],
    differences: [
      "PNG stores every pixel exactly and supports transparency; it’s ideal for graphics, screenshots and logos. JPG throws away imperceptible details to keep files small, and it works very well for photos, but it has no transparency and leaves small smudges around sharp edges like those of letters.",
    ],
    kept: [
      "The resolution and overall look of the image.",
      "The colors, with a loss you won’t notice at the default quality (82).",
    ],
    lost: [
      "Transparency: transparent areas turn white.",
      "Some sharpness on very crisp edges, like small text or thin lines.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images. You can adjust the quality and size and convert many at once.",
    ],
    steps: [
      "Choose the PNGs.",
      "Leave JPG as the output format. At quality 75–85, photos look the same and are much smaller; for screenshots with text, go up to 90.",
      "Click Convert and download the images or the ZIP.",
    ],
    faq: [
      {
        q: "Which quality should I choose?",
        a: "For photos, 75 to 85 is a good balance. For screenshots with text, 90 or higher, or just leave them as PNG.",
      },
      {
        q: "What happens to the transparent background?",
        a: "JPG doesn’t support it, so it turns white. If you need to keep it and still reduce the file size, convert to WEBP.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "jpg>webp": {
    when: [
      "JPG to WEBP is the go-to conversion for making a website load faster: at the same visual quality, photos are about 25–35% smaller, which improves load time and Google’s metrics. It’s also useful for saving space in online stores, blogs and catalogs.",
      "For sending photos in a message, printing them or uploading them to older systems, stick with JPG: some programs still can’t open WEBP.",
    ],
    differences: [
      "WEBP is newer and compresses better than JPG; it also supports transparency and animation. Every current browser displays it, but not every desktop program or file upload system accepts it.",
    ],
    kept: ["The resolution and look of the photo.", "The orientation."],
    lost: [
      "WEBP is also lossy: at very low quality you’ll see smudges. At the default quality (82) it’s indistinguishable from the JPG.",
      "EXIF metadata doesn’t carry over to the WEBP.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the photos, in batches and with a ZIP download.",
    ],
    steps: [
      "Choose the JPGs.",
      "Leave WEBP as the output format. If they’re for a website, also reduce the width to the largest size they’re displayed at (for example, 1,600 px).",
      "Click Convert and download the WEBPs or the ZIP.",
    ],
    faq: [
      {
        q: "How much smaller is a WEBP?",
        a: "It depends on the photo, but at the same visual quality it’s usually about 25–35% smaller than the JPG. Reducing the pixel dimensions as well is what saves the most.",
      },
      {
        q: "Do WordPress and online stores accept WEBP?",
        a: "Most current platforms do. If one doesn’t, upload the JPG.",
      },
      {
        q: "WEBP or AVIF for my website?",
        a: "AVIF compresses even more, but it takes longer to generate. WEBP is the most compatible and fastest option; AVIF is worth it if you want the smallest possible file size.",
      },
    ],
  },

  "png>webp": {
    when: [
      "PNG to WEBP is useful for slimming down a website’s images without losing transparency: logos, icons, cut-out product shots, screenshots and illustrations. It’s one of the conversions that saves the most weight on a page.",
    ],
    differences: [
      "PNG is lossless and gets very heavy with large images or photos. WEBP also supports transparency, but it uses lossy compression (with adjustable quality), and the result is usually a fraction of the PNG’s size.",
    ],
    kept: [
      "Transparency, with smooth edges.",
      "The resolution and look of the image.",
    ],
    lost: [
      "At low quality, smudges can appear around text and thin lines. For graphics with lots of text, use a high quality (90 or higher).",
      "The PNG’s metadata doesn’t carry over to the WEBP.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images. The quality setting applies to the whole batch.",
    ],
    steps: [
      "Choose the PNGs.",
      "Leave WEBP as the output format and adjust the quality: 82 for photos and products, 90 or higher for graphics with text.",
      "Click Convert and download the WEBPs or the ZIP.",
    ],
    faq: [
      {
        q: "Is the transparent background kept?",
        a: "Yes, WEBP supports transparency and keeps it.",
      },
      {
        q: "How much will I save?",
        a: "For photos and products saved as PNG, the WEBP is usually many times smaller. For small icons or very simple graphics, the difference is smaller.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "jpg>avif": {
    when: [
      "JPG to AVIF makes sense when you want the smallest possible file size for the photos on a website, a store or a gallery: AVIF usually achieves the same visual quality at a much smaller size than JPG and WEBP.",
      "Don’t use it for sharing in messages or uploading to systems that don’t recognize it: many programs still can’t open AVIF.",
    ],
    differences: [
      "AVIF uses the AV1 video codec to compress images. It’s more efficient than JPG and WEBP, supports transparency and HDR, and current browsers display it. The trade-off is that creating an AVIF takes more processing than creating a JPG.",
    ],
    kept: ["The resolution and look of the photo.", "The orientation."],
    lost: [
      "AVIF is lossy; at very low quality the image looks “washed out” in areas with fine texture. At the default quality, you won’t notice.",
      "EXIF metadata doesn’t carry over to the AVIF.",
    ],
    limits: [
      "The conversion happens in your browser with an encoder built into the page. It’s slower than converting to JPG or WEBP: a few seconds per large photo, longer on phones.",
    ],
    steps: [
      "Choose the JPGs.",
      "Leave AVIF as the output format and, if they’re for the web, reduce the width to the size they’re displayed at.",
      "Click Convert and wait: each photo takes a little longer than with other formats.",
      "Download the AVIFs or the ZIP.",
    ],
    faq: [
      {
        q: "Why does it take longer than converting to WEBP?",
        a: "Because encoding AVIF requires much more computation. That effort is exactly what makes the file smaller.",
      },
      {
        q: "Do all browsers display AVIF?",
        a: "Current versions of Chrome, Edge, Firefox and Safari do. If your audience uses very old devices, also offer a JPG or WEBP fallback.",
      },
      {
        q: "Are my photos uploaded?",
        a: "No, the AVIF is generated in your browser.",
      },
    ],
  },

  "gif>png": {
    when: [
      "GIF to PNG is useful for getting a still image out of a GIF (for example, an old logo, an icon or a frame from an animation) so you can edit it or use it in documents without the GIF’s 256-color limit.",
    ],
    differences: [
      "GIF supports animation, but only 256 colors per frame and all-or-nothing transparency. PNG is a still image with millions of colors and transparency with smooth edges. For graphics and logos, PNG is the modern replacement for the still GIF.",
    ],
    kept: ["The GIF’s exact colors and its transparency.", "The resolution."],
    lost: [
      "The animation: if the GIF is animated, only the first frame is converted.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the files. It always produces a still image, even if the GIF is animated.",
    ],
    steps: [
      "Choose the GIFs.",
      "Leave PNG as the output format.",
      "Click Convert and download the PNGs.",
    ],
    faq: [
      {
        q: "What happens to the animation?",
        a: "Only the first frame is converted: the PNG is a still image.",
      },
      {
        q: "Is transparency kept?",
        a: "Yes. The GIF’s transparent areas stay transparent in the PNG.",
      },
      {
        q: "Does the quality improve?",
        a: "No: the PNG stores exactly the colors the GIF had. What you gain is being able to edit it without the 256-color limit.",
      },
    ],
  },

  "gif>jpg": {
    when: [
      "GIF to JPG comes in handy when a site or a form doesn’t accept GIF and you still need to upload the image, or for saving the first frame of a GIF as a still photo.",
    ],
    differences: [
      "GIF is a format with 256 colors at most, animation and simple transparency. JPG is a still image with millions of colors and lossy compression, accepted everywhere, but with no transparency.",
    ],
    kept: [
      "The resolution of the first frame.",
      "Its colors: a GIF has 256 at most, and a JPG reproduces them without trouble.",
    ],
    lost: [
      "The animation: only the first frame remains.",
      "Transparency, which turns white.",
      "Some sharpness on the edges of drawings and text, because of JPG compression.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the files. If the GIF is a drawing or logo with transparency, convert it to PNG instead of JPG.",
    ],
    steps: [
      "Choose the GIFs.",
      "Leave JPG as the output format; for drawings with crisp edges, raise the quality to 90.",
      "Click Convert and download the JPGs.",
    ],
    faq: [
      {
        q: "Can I choose which frame of the GIF is converted?",
        a: "No, the first frame is always used.",
      },
      {
        q: "JPG or PNG for a GIF?",
        a: "PNG for logos, drawings or images with transparency; JPG only if the site requires it or if the GIF is a photo.",
      },
      {
        q: "Are my files uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "bmp>jpg": {
    when: [
      "BMP files turn up in screenshots from old Windows programs, scanners, industrial machines and medical equipment. They’re huge because they have no compression. Converting them to JPG makes them ready to email or upload anywhere, at a fraction of the size.",
    ],
    differences: [
      "BMP stores the image uncompressed (or with minimal compression): a 12-megapixel photo can take up more than 30 MB. JPG uses lossy compression and brings that same photo down to a few MB, compatible with everything.",
    ],
    kept: [
      "The resolution and look of the image.",
      "The colors, with a loss you won’t notice at the default quality.",
    ],
    lost: [
      "Some sharpness in text and thin lines because of the compression; for screenshots with text, PNG is better.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images, in batches.",
    ],
    steps: [
      "Choose the BMPs.",
      "Leave JPG as the output format and adjust the quality if you want.",
      "Click Convert and download the JPGs or the ZIP.",
    ],
    faq: [
      {
        q: "How much smaller is it?",
        a: "A lot: an uncompressed BMP usually shrinks to less than a tenth of its size as a JPG.",
      },
      {
        q: "BMP to JPG or to PNG?",
        a: "JPG for photos; PNG for screenshots, plans or images with text, because it doesn’t lose anything and still shrinks the BMP considerably.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "bmp>png": {
    when: [
      "BMP to PNG is ideal for screenshots, diagrams, and images from scanners or technical equipment that save as BMP: the PNG is much smaller and keeps the image exactly the same, without JPG’s loss.",
    ],
    differences: [
      "Both formats store every pixel exactly, but BMP barely compresses and PNG does (losslessly). The result is the same image in a file several times smaller and compatible with the web, documents and design programs.",
    ],
    kept: ["The exact image, pixel for pixel.", "The resolution and colors."],
    lost: ["Nothing in the image. Only the format and file size change."],
    limits: [
      "The conversion happens in your browser, without uploading the files, in batches.",
    ],
    steps: [
      "Choose the BMPs.",
      "Leave PNG as the output format.",
      "Click Convert and download the PNGs or the ZIP.",
    ],
    faq: [
      {
        q: "Is any quality lost?",
        a: "No. PNG uses lossless compression, so the image is identical.",
      },
      {
        q: "Why was the BMP so big?",
        a: "Because it stores every pixel uncompressed. PNG takes advantage of repeated areas to store the same thing in less space.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "tiff>jpg": {
    when: [
      "TIFF files come from scanners, professional cameras, print shops and photo archives. They’re excellent for archiving or printing, but they’re large and almost no browser or social network displays them. Converting them to JPG makes them ready to share or post.",
    ],
    differences: [
      "TIFF is a professional archival format: it usually stores the image losslessly, at high resolution and sometimes with several pages in a single file. JPG uses lossy compression to keep files small and opens on any device.",
    ],
    kept: [
      "The image resolution.",
      "The colors, with a loss you won’t notice at the default quality.",
    ],
    lost: [
      "If the TIFF has several pages (for example, a fax or a multi-page scan), only the first one is converted.",
      "Transparency and layers, if it has any.",
      "The file’s metadata.",
    ],
    limits: [
      "The conversion happens in your browser. Only Safari can read TIFF on its own; other browsers use a decoder built into the page. Some unusual TIFFs (for example, with 16 bits per channel or uncommon compression) may not open.",
    ],
    steps: [
      "Choose the TIFFs.",
      "Leave JPG as the output format; if the images are huge, reduce the width for sharing.",
      "Click Convert and download the JPGs or the ZIP.",
    ],
    faq: [
      {
        q: "My TIFF has several pages. Are they all converted?",
        a: "No, only the first one. If you need all of them, it’s best to rescan each page separately or save the document as a PDF from the scanner software.",
      },
      {
        q: "Is any quality lost?",
        a: "A little, because of JPG compression, but at the default quality you won’t notice it on screen. For printing, raise the quality to 90–95.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "tiff>pdf": {
    when: [
      "TIFF to PDF is useful for submitting a scan or an archival image as a document: to attach it to an application, send it by email or keep it together with other PDFs.",
    ],
    differences: [
      "TIFF is a professional image format widely used by scanners; PDF is the universal format for documents. When you convert, the image is placed on a page of the same size, with no margins.",
    ],
    kept: [
      "The image from the first page, at its resolution.",
      "High quality: the image is stored as a quality-92 JPG inside the PDF.",
    ],
    lost: [
      "Only the first page of a multi-page TIFF is converted.",
      "The text in the image can’t be searched or selected; for that, run the PDF through “OCR scanned PDF.”",
      "Transparency, if it has any.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the files. Some unusual TIFFs may not open. To combine several images into one PDF, use Images to PDF.",
    ],
    steps: [
      "Choose the TIFF.",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF and, if it’s large, run it through Compress PDF.",
    ],
    faq: [
      {
        q: "Are all the pages of the TIFF converted?",
        a: "No, only the first one. For multi-page documents, scan directly to PDF or combine the pages as images with Images to PDF.",
      },
      {
        q: "Will the PDF have searchable text?",
        a: "No, it contains an image. Use “OCR scanned PDF” to add recognized text to it.",
      },
      {
        q: "Are my files uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "png>ico": {
    when: [
      "PNG to ICO is what you need to create a website’s favicon (the icon in the browser tab) or an icon for a program or shortcut in Windows. If you have your logo as a PNG with a transparent background, that’s the best starting point.",
    ],
    differences: [
      "A PNG is a single image. An ICO is a container with several versions of the same icon at different sizes, so Windows and browsers can use the most suitable one in each place (tab, taskbar, desktop).",
    ],
    kept: [
      "The PNG’s transparency.",
      "The complete artwork, centered in a square if the image isn’t square.",
      "Sizes of 16, 32, 48, 64, 128 and 256 px in the same file (only those that don’t exceed the size of your image).",
    ],
    lost: [
      "At small sizes (16 and 32 px), fine details and text become illegible: that’s a limitation of the size, not the format. A simple icon works better.",
      "If the image isn’t square, transparent borders are added on the sides or at the top and bottom.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images. To also get the favicon PNGs (like apple-touch-icon) and the HTML code, use the “Favicon generator.”",
    ],
    steps: [
      "Prepare a square PNG of at least 256 × 256 px, ideally with a transparent background.",
      "Choose it and leave ICO as the output format.",
      "Click Convert and download the .ico file.",
      "For a website, upload it to the root with the name favicon.ico.",
    ],
    faq: [
      {
        q: "What image size do I need?",
        a: "Ideally 256 × 256 px or larger, and square. With a smaller image, the ICO only includes the sizes that don’t exceed it.",
      },
      {
        q: "Is transparency kept?",
        a: "Yes, each size is stored as a 32-bit PNG inside the ICO.",
      },
      {
        q: "Does it work as a Windows icon?",
        a: "Yes. The format (with PNG images inside) is compatible with Windows Vista and later and with all current browsers.",
      },
    ],
  },

  "jpg>ico": {
    when: [
      "JPG to ICO is useful for making a favicon or a Windows icon from a photo or a logo you only have as a JPG, for example a profile photo or the logo someone sent you in a message.",
      "If you have the logo as a PNG with a transparent background, use that instead: the result looks much better on dark tabs.",
    ],
    differences: [
      "JPG is a photo with no transparency; ICO is an icon container with several sizes. When you convert, the image is scaled down to each standard size and stored inside the ICO.",
    ],
    kept: [
      "The whole image, centered in a square.",
      "Sizes from 16 to 256 px in the same file.",
    ],
    lost: [
      "JPG has no transparency, so the photo’s background stays as is; if the image isn’t square, the added borders are transparent.",
      "At 16 and 32 px, a photo is reduced to very few pixels and loses detail. Crop the important part first (a face, the logo’s initial).",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the images.",
    ],
    steps: [
      "If needed, crop the image to a square with Crop image, keeping only what matters.",
      "Choose the JPG and leave ICO as the output format.",
      "Click Convert and download the .ico file.",
    ],
    faq: [
      {
        q: "Can I remove the background first?",
        a: "Yes. Run the JPG through Remove image background, download the PNG and convert it to ICO: the icon will have a transparent background.",
      },
      {
        q: "Why does my icon look blurry in the tab?",
        a: "Because at 16 px there’s hardly any room for detail. A simple drawing or a large letter looks much better than a photo.",
      },
      {
        q: "Are my images uploaded?",
        a: "No, everything is processed in your browser.",
      },
    ],
  },

  "ico>png": {
    when: [
      "ICO to PNG is useful for getting the image out of a favicon or a Windows icon and using it somewhere else: in a presentation, a document, a design, or to create a new icon based on the old one.",
    ],
    differences: [
      "An ICO contains one or more versions of an icon at different sizes. A PNG is a single image that any program can open and edit.",
    ],
    kept: ["The icon’s transparency.", "The exact colors."],
    lost: [
      "You get a single image: the browser picks one of the icon’s versions (usually the largest). The others aren’t exported.",
      "An icon that only comes in 16 or 32 px doesn’t gain detail: enlarging it afterward will make it look pixelated.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the files. Very old ICOs with unusual color formats may not open in every browser.",
    ],
    steps: [
      "Choose the .ico file.",
      "Leave PNG as the output format.",
      "Click Convert and download the PNG.",
    ],
    faq: [
      {
        q: "What size will the PNG be?",
        a: "The size of the icon version the browser uses, usually the largest one in the file (up to 256 × 256 px).",
      },
      {
        q: "Can I make it bigger?",
        a: "You can with Resize image, but an icon with few pixels will look pixelated or blurry when enlarged.",
      },
      {
        q: "Are my files uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "svg>png": {
    when: [
      "SVG to PNG is necessary when you have a vector logo or illustration and need to use it somewhere SVG isn’t accepted: social media, presentations, Word documents, messaging apps or platforms that ask for a regular image.",
    ],
    differences: [
      "An SVG is a drawing described with shapes and text, so it looks sharp at any size. A PNG is a pixel image with a fixed size. When you convert, the SVG is “drawn” at the size you choose, and from then on that’s its maximum sharpness.",
    ],
    kept: [
      "The transparent background.",
      "Shapes, colors and gradients, just as the browser renders them.",
      "Full sharpness at the chosen size: you can ask for a large PNG without it looking blurry.",
    ],
    lost: [
      "Scalability: the PNG can no longer be enlarged without losing sharpness.",
      "Images or fonts the SVG loads from the internet aren’t included; text in fonts that aren’t installed uses a system font.",
      "The SVG’s animations and code.",
    ],
    limits: [
      "The conversion happens in your browser. The size comes from the SVG’s width, height or viewBox; if it has none, 1,024 px is used. If the logo’s text shows up in a different font, convert it to outlines in your design program before exporting.",
    ],
    steps: [
      "Choose the SVG.",
      "Leave PNG as the output format and choose the size: for example, 1,000 px wide for social media, or twice the size it will be displayed at.",
      "Click Convert and download the PNG.",
    ],
    faq: [
      {
        q: "What PNG size should I choose?",
        a: "Whatever you need: since SVG is a vector format, enlarging it doesn’t lose quality. For high-density screens, choose twice the size it will be viewed at.",
      },
      {
        q: "The logo’s text comes out in a different font. Why?",
        a: "Because the SVG uses a font that isn’t embedded in the file or installed on your device. In your design program, convert the text to outlines (paths) and export the SVG again.",
      },
      {
        q: "Is the transparent background kept?",
        a: "Yes, the PNG keeps the transparency.",
      },
    ],
  },

  "svg>jpg": {
    when: [
      "SVG to JPG is useful when a site or a system only accepts JPG and you have a logo, a chart or an illustration in SVG: forms, profiles, ad platforms or quick prints.",
      "If the destination accepts PNG, that’s a better option: it keeps the transparency and the edges come out cleaner.",
    ],
    differences: [
      "SVG is a vector drawing that looks sharp at any size; JPG is a lossy-compressed pixel image, designed for photos and with no transparency.",
    ],
    kept: [
      "Shapes and colors, just as the browser renders them.",
      "Sharpness at the size you choose.",
    ],
    lost: [
      "Transparency: the background turns white.",
      "Some sharpness on edges and text because of JPG compression; raise the quality to 90 for logos.",
      "Any external images or fonts the SVG loads, and its animations.",
    ],
    limits: [
      "The conversion happens in your browser. The size comes from the SVG’s width, height or viewBox (1,024 px if it has none).",
    ],
    steps: [
      "Choose the SVG.",
      "Leave JPG as the output format, raise the quality to 90 and choose the size in pixels.",
      "Click Convert and download the JPG.",
    ],
    faq: [
      {
        q: "Can I choose a background color instead of white?",
        a: "In this conversion, the transparent background turns white. If you need a different color, change it in the SVG itself (with a design editor) before converting, or convert to PNG if the destination accepts it.",
      },
      {
        q: "JPG or PNG for a logo?",
        a: "PNG almost always: it keeps the transparency and crisp edges. JPG only if it’s required.",
      },
      {
        q: "Are my files uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },

  "svg>pdf": {
    when: [
      "SVG to PDF is useful for sending a chart, a plan or an illustration as a document, attaching it to a report, or letting someone without design software open and print it.",
    ],
    differences: [
      "SVG is a vector format for the web; PDF is a document format that can also contain vectors. In this conversion, however, the SVG is rendered as an image (PNG) inside a page of the same size.",
    ],
    kept: [
      "The look of the drawing, with its colors and shapes, at the SVG’s size.",
      "Transparency, which shows over a white background in the PDF.",
    ],
    lost: [
      "The PDF isn’t vector: if you zoom in a lot or print it at a large size, you’ll see the pixels. If you need a vector PDF (for a print shop, for example), export it from your design program.",
      "The SVG’s text can’t be selected in the PDF.",
      "The SVG’s external images and fonts.",
    ],
    limits: [
      "The conversion happens in your browser, without uploading the files. The page is the size of the SVG (1,024 px if it doesn’t define one); for more resolution, first convert it to PNG at a large size and turn that PNG into a PDF.",
    ],
    steps: [
      "Choose the SVG.",
      "Leave PDF as the output format and click Convert.",
      "Download the PDF and check it zoomed to the size it will be used at.",
    ],
    faq: [
      {
        q: "Does the PDF keep the vectors?",
        a: "No: the drawing is stored as an image inside the PDF. That’s fine for on-screen documents or regular printing; for professional printing, export a vector PDF from your design program.",
      },
      {
        q: "How do I get more resolution?",
        a: "Convert the SVG to PNG at a large size (for example, 3,000 px) and then turn that PNG into a PDF.",
      },
      {
        q: "Are my files uploaded?",
        a: "No, the conversion happens in your browser.",
      },
    ],
  },
};
