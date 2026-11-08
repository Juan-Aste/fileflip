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
};
