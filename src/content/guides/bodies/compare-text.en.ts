const body = `
A contract comes back “with a few small tweaks”, a classmate sends you the final version of your group assignment, or a new draft of a regulation is published. Reading both versions side by side and hunting for differences by eye is slow and unreliable: a changed figure or an added “not” is easy to miss. This guide shows how to compare two texts and see exactly what was added, what was removed and what changed, and what to do when the versions come as PDF or Word files.

## How to compare two texts, step by step

1. Open [Compare text](tool:compare-text).
2. Paste the earlier version into **Original text** and the new one into **New text**. If you have them as text files, use **Open file** above each box.
3. Under **Compare by**, choose **Lines** or **Words** (see below for when to use each).
4. If you like, tick **Ignore upper and lower case** or **Ignore extra spaces**.
5. Press **Compare** and check the result under **Differences**.

![Two versions of a contract compared line by line: the amounts, the deadline and a new clause are highlighted](shot:comparar-textos-lineas "By lines: red is what was in the original text, green is what the new text brings.")

Above the result there is a summary, such as “3 lines changed, 1 added and none removed”, so you can tell at a glance how much was touched. If the two texts match, it says “The texts are identical.”

The comparison runs in your browser: the texts are not uploaded to any server. The result doesn’t update by itself: if you edit either box, press **Compare** again.

## How to read the result

The tool marks differences with two colors and, for words, with strikethrough and underline too, so they stand out even if you can’t tell the colors apart:

- **Red** (words also struck through): what was in the original text and is gone.
- **Green** (words also underlined): what appears in the new text.
- No mark: what didn’t change.

In **Lines** mode, each row has two numbers: on the left, its line number in the original text; on the right, in the new one. Lines with “−” and a red background belong to the original; lines with “+” and a green background, to the new version. When a line changed, the tool shows the old and the new version and highlights only the words that changed inside them; a line that was added or removed as a whole just gets its colored background. In the screenshot, clause 2 only has “200” → “500” and “two” → “three” marked.

The **Swap** button moves the original text into the other box and vice versa. It helps if you pasted them the wrong way round; then press **Compare** again.

## Lines or words?

**Lines** is the classic mode of code comparison tools and the best one when the text is organized in lines: lists, numbered clauses, articles of a law, code, data or subtitles.

**Words** shows the whole new text as running prose, with removed and added words marked where they are. Line breaks and spacing don’t count as changes. It’s the most comfortable mode for prose: an essay, an article, a school assignment, a letter. It’s also the one to use when the text comes from a PDF, because there lines break wherever the line ended on the page, and if one version reflowed, line mode would make it look as if everything had changed. In this mode the summary counts words added and removed.

![A paragraph compared word by word: removed words are struck through and added words are underlined](shot:comparar-textos-palabras "By words: the new text with the changes marked in place.")

## The two options to ignore differences

- **Ignore upper and lower case**: “Contract” and “CONTRACT” count as the same. Handy when one version put the headings in capitals and you don’t want that to hide the changes in content.
- **Ignore extra spaces**: in **Lines** mode, spaces at the start and end of each line and double spaces inside it don’t count. It’s the option for re-indented code or text copied from somewhere that adds spaces. In **Words** mode spacing never counts, so this box makes no difference there.

## If the versions are PDF or Word files

**Open file** only takes text files: .txt, .md, .csv, .tsv, .json, .html, .xml, .srt, .vtt and .log, up to 2 million characters, and it detects the encoding automatically. It doesn’t open PDF or Word files directly, so you need to get the text out first:

- **PDF with selectable text** (one made by a word processor or a system): run it through [PDF to text](tool:pdf-to-text). It accepts several PDFs at once; download the .txt of each version and load it with **Open file**. If you tick **Mark where each page starts**, the text includes a marker for each page, which helps you find which page a change is on.
- **Scanned PDF** (the pages are pictures): use [OCR scanned PDF](tool:ocr-pdf), choose the **Language of the text** and, under **Result**, **Text only (.txt)**. It handles up to 100 pages per PDF.
- **Photo of a printed page**: [Image to text (OCR)](tool:image-to-text) gets the text out of the image.
- **Word**: open the document, select everything (Ctrl+A), copy it and paste it into the box. Each Word paragraph becomes one line, so with long paragraphs **Words** mode reads better.

With OCR text, keep in mind that recognition can mix up a character here and there (“l” for “1”, a comma for a period). If a change looks odd, check it in the original document before taking it as real.

Once you’ve found what needs fixing in a PDF, you can do it with [Edit PDF](tool:edit-pdf); the guide [How to convert a PDF to Word](guide:pdf-to-word) explains what to do if you’d rather edit it in Word.

## Real-life uses

- **A contract that comes back with edits**: compare by **Lines** or **Words** and focus on amounts, dates, deadlines and words like “not”, “only” or “except”, which change the meaning with very little. Before signing, the guide [How to sign a PDF](guide:sign-pdf) covers the next step.
- **An assignment or a thesis**: compare the version you handed in with the corrected one by **Words** to see everything your teacher or classmate touched.
- **A legal text or a set of rules**: with numbered articles, **Lines** mode shows which articles were added, which were removed and which words changed in each.
- **Code or config files**: compare by **Lines**, tick **Ignore extra spaces** if the indentation changed and, if you need to share the change, press **Download .diff**. That file uses the unified format read by git and review tools. Note that the .diff records every change, including case or spacing changes you chose to ignore on screen.
- **Two lists** (guests, products): sort them first with [Remove duplicate lines](tool:remove-duplicate-lines), choosing **A → Z** under **Sort**, then compare them by lines. That way you see which items are missing from each without a different order cluttering the result.

If the texts have almost nothing in common, the line comparison stops and shows a warning: in that case, compare shorter parts, for example chapter by chapter.

## Other useful tools

- [Word and character counter](tool:word-counter): to check that the new version still fits the word limit of an assignment or a form.
- [Case converter](tool:case-converter): to make headings consistently upper or lower case in the final version.

## Summary

- Paste both versions into [Compare text](tool:compare-text) and press **Compare**: removed text in red and struck through, added text in green and underlined.
- **Lines** for lists, clauses and code; **Words** for prose and for text taken from a PDF.
- For PDF or Word files, get the text out first with PDF to text, OCR scanned PDF or by copying and pasting.
- Everything happens in your browser, without uploading the texts.
`;

export default body;
