const body = `
A CSV file looks like a spreadsheet, opens in Excel and has rows and columns. But it isn't an Excel file, and many of the surprises it brings («everything ended up in one column», «names with accents show up as strange symbols», «the leading zeros of my codes disappeared») come from that difference. This guide explains what each format is, when to use one or the other, and how to open a CSV without breaking the data.

## What a CSV is and what an Excel file is

A **CSV** («comma-separated values») is a plain text file. Each line is a row and the values in each row are separated by a character, usually a comma. If you open it in Notepad, you see something like this:

\`\`\`
Customer,City,Amount
Muñoz,Córdoba,1250.50
Pereira,Montevideo,980
\`\`\`

An **Excel** file (XLSX, or XLS in older versions) is a much richer format: it can hold several sheets, formulas, number and date formats, colors, column widths, charts and filters.

| | CSV | Excel (XLSX) |
| --- | --- | --- |
| Sheets | A single table | Several sheets |
| Formulas | No: values only | Yes |
| Formatting (colors, widths, bold) | No | Yes |
| Data types | Everything is text; the program that opens it interprets it | Numbers, dates and text are stored as such |
| Opened by | Any program, database or programming language | Excel, LibreOffice, Google Sheets, Numbers |

## When to use each one

Use **CSV** when the data is going to another system: importing contacts, uploading a catalog to an online store, loading data into a database or accounting software. It's the universal exchange format precisely because it's simple.

Use **Excel** when a person is going to work with the data: reading it, calculating, filtering, sharing a report. And whenever the file has several sheets, formulas or formatting you want to keep.

## The three typical problems when opening a CSV in Excel

### 1. Everything ends up in one column

The CSV's separator doesn't match the one your Excel expects. In countries where the comma is the decimal separator (most of Europe and Latin America, Brazil), Excel uses the **semicolon** by default to separate values. Give it a comma-separated CSV and it puts each whole line in column A. The reverse also happens: a semicolon-separated CSV opened in an English-language Excel.

### 2. Accented letters look wrong

If «Muñoz» shows up as «MuÃ±oz» or «Córdoba» as «CÃ³rdoba», the problem is the encoding. Most current systems save CSV files as UTF-8, but Excel on Windows, if the file doesn't say so, reads it as if it were in the old Windows encoding, and each accented letter turns into two symbols. The same goes for any non-English characters: ü, ç, Chinese characters and so on.

The way to say so is an invisible mark at the start of the file, called a **BOM**. With it, Excel shows accents, ñ and other alphabets correctly.

### 3. Zeros or digits get lost, or values change

Excel interprets every value when it opens a CSV, and sometimes gets it wrong:

- **Codes with leading zeros** (007, a ZIP code like 02134) lose their zeros because Excel takes them as numbers.
- **Long numbers**, such as a card, account or ID number with more than 15 digits, are rounded or shown in scientific notation: Excel only keeps 15 significant digits.
- Some values turn into **dates** without you asking: a «1-2» can end up as January 2 or February 1.

The serious part is that if you then save the file from Excel, those changes are saved and the original data is lost.

## How to open a CSV without breaking it

### Option 1: convert it to Excel before opening it

[CSV to Excel](tool:csv-to-excel) reads the CSV in your browser and produces an XLSX that Excel opens correctly:

- It detects the separator (comma, semicolon, tab or vertical bar) and the encoding on its own, including the Windows encoding used by CSV files saved from Excel.
- It turns numeric values into real numbers, including those with a decimal comma in a semicolon-separated CSV.
- It keeps codes with leading zeros and numbers longer than 15 digits as text, so they aren't lost.
- It leaves dates as they come, as text, so they aren't misread.

It's the safest option if you received the CSV from a bank, an online store or an invoicing system and you just want to look at it and work with it.

### Option 2: import it from Excel

In current versions of Excel, instead of opening the CSV with a double click, go to **Data → Get Data → From Text/CSV** (in some versions, **Data → From Text/CSV**). A window opens where you can choose the **File Origin** (65001: Unicode UTF-8) and the **Delimiter**, and see a preview before loading. If a column has codes with leading zeros, you can mark it as text in **Transform Data**.

### Option 3: Google Sheets or LibreOffice

Google Sheets reads UTF-8 CSV files correctly and lets you choose the separator when importing. LibreOffice Calc shows a dialog with the encoding, the separator and the type of each column before opening the file.

## How to save a CSV that opens correctly in Excel

If you're the one creating the CSV for someone else to open in Excel, [Excel to CSV](tool:excel-to-csv) lets you choose:

1. Choose the Excel file. If it has several sheets, pick which one to convert, or all of them (one CSV per sheet).
2. Under **CSV separator**, choose **Comma** if the recipient has Excel in English or if the CSV is going to another system; **Semicolon** if they have Excel in Spanish, Portuguese, French or another language that uses the decimal comma.
3. Leave **UTF-8 with BOM** ticked.
4. Press **Convert to CSV** and download the file.

![Excel to CSV options: sheet, separator and UTF-8 with BOM](shot:excel-csv-opciones "With a comma and the BOM, the CSV opens with a double click in English-language Excel, each value in its column and accents intact.")

Numbers come out with all their decimals (not rounded as they look on screen) and codes with leading zeros are kept. The conversion happens in your browser, without uploading the file.

One detail: if the CSV is going to a system rather than a person, check what that system expects. Some programs don't expect the BOM and treat it as part of the first column name; in that case, untick the option.

## Other useful conversions

- [Excel to JSON](tool:excel-to-json) and [JSON to Excel](tool:json-to-excel), for data going to or coming from a web application.
- [Merge Excel files](tool:merge-excel), to combine several CSV files or spreadsheets into a single workbook.
- [PDF to Excel](tool:pdf-to-excel), if the table came to you as a PDF. The guide [How to convert a table from a PDF to Excel](guide:pdf-table-to-excel) explains how to check the result.

## Summary

- CSV is plain text for exchanging data; Excel is a spreadsheet with sheets, formulas and formatting.
- If everything lands in one column, it's the separator; if accents look wrong, it's the encoding (the BOM is missing).
- Opening a CSV with a double click can strip zeros and round long numbers: convert it first with [CSV to Excel](tool:csv-to-excel) or import it from **Data → From Text/CSV**.
- To create a CSV that opens correctly in Excel: the separator that matches the recipient's Excel, and UTF-8 with BOM.
`;

export default body;
