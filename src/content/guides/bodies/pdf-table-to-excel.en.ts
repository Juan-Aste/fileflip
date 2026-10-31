const body = `
A bank statement, a supplier's price list, the report someone sent you: many tables arrive as PDFs, and to add up, filter or sort the data you need them in a spreadsheet. Copying and pasting from the PDF reader almost never works well: everything lands in a single column, or the numbers come in as text and Excel won't add them up. This guide shows how to do it with [PDF to Excel](tool:pdf-to-excel), how to check the result and what to do when the PDF is scanned.

## Why copy and paste isn't enough

A PDF doesn't store tables. It stores loose pieces of text with their position on the page: «84.35» is so many millimeters from the edge, «Supermarket» a little further left. The lines you see as cell borders are drawings unrelated to the text. When you copy, the PDF reader gives you the text in some order, and the row and column structure is lost.

Our tool rebuilds the table from those positions: it forms rows from the text that sits at the same height and columns from how it lines up, just as a person looking at the page would.

## Before you start: check that the PDF has text

Open the PDF and try to select a number with the mouse. If it gets selected, the PDF has text and the tool will work: that's the norm for PDFs produced by a bank, an invoicing system or a program like Excel or Word.

If instead the whole page gets selected like an image, the PDF is a scan or a photo. Read on: further down we explain what to do in that case.

## How to convert a PDF table to Excel, step by step

1. Open [PDF to Excel](tool:pdf-to-excel) and choose the PDF.
2. Wait a few seconds: the tool looks for tables and tells you how many it found.
3. Check the **Preview**. If there are several tables, pick them from the list to see them one by one.
4. Choose the format: **Excel (XLSX)** or **CSV**.
5. Choose how to spread the tables across **Sheets**: one sheet per page, one per table or everything in one sheet.
6. Press **Convert to Excel** and download the file.

![Preview of a table detected in a PDF statement](shot:pdf-excel-vista-previa "The tool found two tables in a two-page statement and shows the first one before you download.")

Everything happens in your browser: the PDF is never uploaded to a server, which matters with bank statements and invoices. It accepts PDFs up to 100 MB.

## Check the preview before downloading

The preview is the most important step. Since the columns are worked out from the alignment, there are cases where the result needs a look:

- **Cells with text on two lines**: a long description split over two lines can come out as two rows. In the spreadsheet, just merge those cells.
- **Cells that span several columns**: a title across the whole table may end up in a single cell on the left.
- **Columns very close together**: if two columns almost touch in the PDF, their values can land in the same cell.

In the screenshot above, the sample statement came out perfectly: date, description, debit and credit each in its own column, and the empty cells (a transaction has a debit but no credit) stayed empty, without shifting the values.

## Real numbers, with a decimal point or a decimal comma

What saves the most time is that amounts come out as numbers, not text: you can add them up with a formula straight away.

The tool detects, table by table, how the numbers are written:

- With a **decimal point**, as in the United States, the United Kingdom or Mexico: 1,234.56.
- With a **decimal comma**, as in Spain, most of Latin America and much of Europe: 1.234,56.
- With a **space as the thousands separator**, as in France: 1 250,5.

If detection gets it wrong (it can happen in tables with few numbers, where a value like 1,250 could be one thousand two hundred and fifty or one point twenty-five), choose the separator yourself under **Decimal separator of the numbers**.

Some data is deliberately left as text: codes with leading zeros (like 007, so the zeros aren't lost), dates, percentages and amounts with the currency symbol attached. They look exactly as in the PDF and, if you need them as numbers or dates, Excel converts them with **Data → Text to Columns**.

## One sheet per page, per table or everything together

- **One sheet per page** is the most natural option for a short document or when each page covers something different.
- **One sheet per table** is useful when a page has several separate tables, such as a summary and a detail.
- **Everything in one sheet** is the best option for a statement of several pages: all the transactions end up one below the other, with an empty row between one table and the next. If the header repeats on every page, it appears several times: delete those rows and the empty ones, and you can sort or filter everything at once.

If you choose CSV, each sheet becomes a separate CSV file. To open those files in Excel without problems with accented characters, leave **UTF-8 with BOM** ticked; the guide [CSV vs Excel: differences and how to open a CSV correctly](guide:csv-vs-excel) explains why.

## If the PDF is scanned

A scanned PDF has no text, just an image of each page, so the tool tells you it can't detect tables. The way forward is:

1. Run the PDF through [OCR scanned PDF](tool:ocr-pdf), choosing the document's language. The OCR recognizes the letters and adds an invisible text layer.
2. Use the PDF it returns in [PDF to Excel](tool:pdf-to-excel).

It works, but with an important warning: **OCR can misread characters**, and in a table of numbers that's serious (an 8 read as a 3, a lost decimal point). Check the numbers in the preview against the original, especially the totals. With sharp, straight scans there are few errors; with crooked or blurry photos, many. If the document is a photo taken with your phone, run it through [Scan document](tool:scan-document) first to straighten it and clean up the background.

## Afterwards: working with the spreadsheet

Once the data is in Excel you can sort, filter, add up or build a pivot table. Some tools that may help next:

- [Merge Excel files](tool:merge-excel), if you converted several statements (one per month) and want all the transactions in a single file, one below the other.
- [Excel to CSV](tool:excel-to-csv), if you need to load the data into another system that asks for CSV.
- [PDF to Word](conv:pdf-docx), if besides the table you need the document's text to edit it.

## Summary

- A PDF doesn't store tables: they have to be rebuilt from the position of the text.
- [PDF to Excel](tool:pdf-to-excel) does it in your browser, with a preview and real numbers.
- Check the preview: two-line cells and columns that are very close may need a touch-up.
- If numbers come out as text, choose the decimal separator yourself.
- If the PDF is scanned, run OCR first, and check the numbers carefully.
`;

export default body;
