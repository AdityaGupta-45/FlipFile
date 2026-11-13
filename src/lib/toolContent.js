// The "How to use" text shown under every tool. It helps visitors, and it gives Google real text to read.
export const toolContent = {
  "merge-pdf": {
    about: "Merge PDF joins several PDF files into one document, in the order you choose. It runs in your browser, so your files are not uploaded anywhere.",
    steps: ["Add two or more PDF files, or drop them on the page.", "Use Up and Down to put the files in the order you want.", "Click Merge PDFs, then download merged.pdf."],
    faq: [
      ["Is there a limit on the number of files?", "FlipFile does not set a limit. Very large files can be slow because your own device does the work."],
      ["Are my files uploaded?", "No. Merging happens in your browser and the files stay on your device."],
    ],
  },
  "split-pdf": {
    about: "Split PDF pulls pages out of a PDF. Pick page ranges to make one new PDF, or split every page into its own file.",
    steps: ["Add the PDF you want to split.", "Type the pages to extract, like 1-3, 5, or leave the box empty to get every page as a separate file.", "Click Split PDF and download the result. Separate pages come in a ZIP file."],
    faq: [
      ["How do I write page ranges?", "Use numbers and dashes separated by commas, for example 1-3, 5, 8-10."],
      ["What do I get if I leave the pages box empty?", "A ZIP file with one PDF for every page."],
    ],
  },
  "delete-pages": {
    about: "Delete Pages removes the pages you do not need from a PDF. You see a thumbnail of every page and mark the ones to remove.",
    steps: ["Add your PDF and wait for the page thumbnails to appear.", "Click each page you want to delete. Marked pages turn red. Click again to keep a page.", "Click Delete marked pages and download the new PDF."],
    faq: [
      ["Can I undo a deletion?", "Yes, before you save. Click a marked page again to keep it. Your original file is never changed."],
      ["Can I delete every page?", "No. At least one page must stay in the PDF."],
    ],
  },
  "organize-pages": {
    about: "Organize Pages lets you reorder, rotate and delete the pages of a PDF in one place, using page thumbnails.",
    steps: ["Add your PDF and wait for the thumbnails to appear.", "Drag pages into a new order, or use the arrow buttons under each page. Use the rotate and bin buttons to turn or remove pages.", "Click Save new PDF and download it."],
    faq: [
      ["Can I use it on a phone?", "Yes. Dragging may not work on touch screens, so use the arrow buttons under each page there."],
      ["Does it change my original file?", "No. You download a new PDF and the original stays as it was."],
    ],
  },
  "scan-to-pdf": {
    about: "Scan to PDF turns photos of paper documents into a clean PDF. Take photos with your phone or add pictures you already have.",
    steps: ["Add one photo per page, or tap Take a photo on a phone.", "Choose a look. Clean document makes the paper whiter and the ink darker.", "Click Create PDF and download scan.pdf."],
    faq: [
      ["Does this do OCR?", "No. The PDF holds pictures of your pages, so you cannot search or copy the text."],
      ["Which image types work?", "JPG, PNG and WebP."],
    ],
  },
  "compress-pdf": {
    about: "Compress PDF makes a PDF smaller so it is easier to email or upload. Light mode keeps text selectable. Strong mode turns pages into images for a much smaller file.",
    steps: ["Add your PDF.", "Choose Light to keep text selectable, or Strong for the smallest file, and set the image quality.", "Click Compress PDF and compare the sizes shown before you download."],
    faq: [
      ["Why did my file barely get smaller in Light mode?", "Light mode only tidies the PDF structure. If most of the size comes from large images, use Strong mode."],
      ["What does Strong mode change?", "Every page becomes an image, so text can no longer be selected or searched."],
    ],
  },
  "jpg-to-pdf": {
    about: "JPG to PDF puts one or more images into a single PDF, with one image on each page. It also accepts PNG and WebP files.",
    steps: ["Add your images.", "Use Up and Down to set the page order.", "Click Create PDF and download images.pdf."],
    faq: [
      ["Can I combine PNG and JPG files?", "Yes. You can mix JPG, PNG and WebP in one PDF."],
      ["Is the image quality reduced?", "Images are saved as high-quality JPG inside the PDF, so PNG files can lose a little detail."],
    ],
  },
  "word-to-pdf": {
    about: "Word to PDF converts a DOCX file into a PDF and keeps the layout, images and tables. The conversion is done with LibreOffice on the FlipFile server.",
    steps: ["Add your .docx file.", "Click Convert to PDF and watch the progress bar.", "Download the PDF."],
    faq: [
      ["Is my file uploaded?", "Yes. This is the only tool that sends your file to the FlipFile server. The server converts it and then deletes it."],
      ["Will it look exactly like it does in Word?", "Usually very close. Fonts that are not installed on the server may be replaced by similar ones."],
    ],
  },
  "pdf-to-jpg": {
    about: "PDF to JPG/PNG turns every page of a PDF into an image. It runs in your browser, so your file is not uploaded.",
    steps: ["Add your PDF.", "Choose JPG for smaller files or PNG for sharper text, and pick the resolution.", "Click Convert to images. One page gives one image, and several pages come in a ZIP file."],
    faq: [
      ["Which resolution should I pick?", "Good is fine for screens. Choose High if you plan to print the images or zoom in a lot."],
      ["How are multiple pages delivered?", "As a ZIP file with one image for every page."],
    ],
  },
  "extract-text": {
    about: "Extract Text copies all the text out of a PDF into a plain text file.",
    steps: ["Add your PDF.", "Choose whether to add a page marker before each page.", "Click Extract text and download the .txt file."],
    faq: [
      ["Why does it say no text was found?", "The PDF is probably a scan, meaning pictures of pages. Scanned PDFs need OCR, which this tool does not do yet."],
      ["Is the layout kept?", "No. You get the text as lines, without columns, tables or formatting."],
    ],
  },
  "extract-images": {
    about: "Extract Images saves the pictures that are embedded inside a PDF as separate image files.",
    steps: ["Add your PDF.", "Choose PNG or JPG, and whether to skip small images such as icons.", "Click Extract images and download the file or ZIP."],
    faq: [
      ["Does it capture whole pages as pictures?", "No. It only saves images embedded in the PDF. To turn pages into images, use PDF to JPG/PNG."],
      ["Why were no images found?", "The PDF may only contain text, or its pictures are smaller than the size you chose to skip."],
    ],
  },
  "rotate-pdf": {
    about: "Rotate PDF turns pages sideways or upside down and saves the change in a new file.",
    steps: ["Add your PDF.", "Choose 90, 180 or 270 degrees clockwise, and optionally type which pages to rotate, like 1-3, 5.", "Click Rotate PDF and download the result."],
    faq: [
      ["Can I rotate only some pages?", "Yes. Type the page numbers, or leave the box empty to rotate every page."],
      ["Which direction is 90 degrees?", "Clockwise. Choose 270 degrees to turn a page 90 degrees anticlockwise."],
    ],
  },
  "page-numbers": {
    about: "Add Page Numbers prints a number on every page of your PDF, in the position and style you choose.",
    steps: ["Add your PDF.", "Pick the position, a style such as Page 1 of 10, the text size and the first number.", "Click Add page numbers and download the result."],
    faq: [
      ["Can numbering start from a different number?", "Yes. Change the Start numbering at box."],
      ["Can I skip the first page?", "Not yet. Numbers are added to every page."],
    ],
  },
  watermark: {
    about: "Watermark stamps a line of text across every page of a PDF, such as CONFIDENTIAL or DRAFT.",
    steps: ["Add your PDF.", "Type the watermark text and choose its opacity, size, color and direction.", "Click Add watermark and download the result."],
    faq: [
      ["Which characters can I use?", "Latin letters, numbers and common symbols. Other scripts are not supported yet."],
      ["Should I keep my original file?", "Yes. The watermark is saved into the new PDF, so keep the original if you may need a clean copy."],
    ],
  },
  "pdf-viewer": {
    about: "PDF Viewer opens a PDF in your browser so you can read it page by page. Nothing is uploaded.",
    steps: ["Add your PDF.", "Use the arrow buttons, the page box or the left and right arrow keys to move between pages.", "Use the plus and minus buttons to zoom."],
    faq: [
      ["Is the file uploaded?", "No. The PDF is opened on your device."],
      ["Can I edit the PDF here?", "No. To add text or drawings, use Edit PDF."],
    ],
  },
  "crop-pdf": {
    about: "Crop PDF trims a PDF down to an area you choose, for example to cut off wide margins.",
    steps: ["Add your PDF.", "Drag on the page preview to draw the area you want to keep.", "Choose whether to crop all pages or only that page, then click Crop PDF."],
    faq: [
      ["Is the cropped part deleted?", "It is hidden, not erased. Use Redact PDF if you need to remove information for good."],
      ["Does it work on rotated pages?", "Yes. The crop area follows the page the way you see it."],
    ],
  },
  "edit-pdf": {
    about: "Edit PDF lets you add text, drawings, highlights and white-out boxes on top of a PDF.",
    steps: ["Add your PDF.", "Pick a tool: Text, Draw, Highlight or White-out, then choose a color and size.", "Click or drag on the page, then click Save edited PDF."],
    faq: [
      ["Can I change the text that is already in the PDF?", "No. You can add new content on top of a page, but existing text cannot be edited."],
      ["Does White-out remove what is underneath?", "No. It only covers it. Use Redact PDF to remove information permanently."],
    ],
  },
  "compare-pdfs": {
    about: "Compare PDFs shows which lines of text were added or removed between two versions of a document.",
    steps: ["Add the original PDF first and the changed PDF second. Use Up and Down to swap them.", "Click Compare PDFs.", "Read the list of added and removed lines, or download the text report."],
    faq: [
      ["Does it compare images and layout?", "No. It compares text only."],
      ["Why does it say no text was found?", "Scanned PDFs have no text to compare and need OCR first."],
    ],
  },
  "sign-pdf": {
    about: "Sign PDF adds an image of your signature to a PDF. Draw it, or upload a picture of it, and place it on any page.",
    steps: ["Add your PDF, then draw your signature or upload an image of it.", "Click on the page to place the signature, drag it into position and set its size.", "Click Sign PDF and download the result."],
    faq: [
      ["Is this a legally binding digital signature?", "It adds a picture of your signature, not a certificate-based digital signature. Check what your situation requires."],
      ["Can I sign more than one page?", "Yes. Click on any page to place the signature there."],
    ],
  },
  "redact-pdf": {
    about: "Redact PDF blacks out private information such as names, numbers or addresses so it cannot be read or copied.",
    steps: ["Add your PDF.", "Drag boxes over the text or images you want to hide. Click a box to remove it.", "Click Redact PDF and download the result."],
    faq: [
      ["Is the hidden text really gone?", "Pages with black boxes are rebuilt as pictures, so the text under the boxes is not in the file. Other pages stay unchanged."],
      ["Why is my PDF larger after redacting?", "Redacted pages become images, which are often bigger than text pages."],
    ],
  },
  "png-to-jpg": {
    about: "PNG to JPG converts PNG and WebP images to JPG, which usually makes the file smaller.",
    steps: ["Add one or more images.", "Set the quality.", "Click Convert to JPG. Several images come in a ZIP file."],
    faq: [
      ["What happens to transparent areas?", "JPG has no transparency, so transparent areas become white."],
      ["Can I convert many images at once?", "Yes. Add as many as you like and download them as a ZIP file."],
    ],
  },
  "compress-image": {
    about: "Compress image reduces the file size of JPG, PNG and WebP images so they load and send faster.",
    steps: ["Add your images.", "Set the quality and, if you like, a maximum width.", "Click Compress images and compare the sizes."],
    faq: [
      ["What format is the result?", "JPG. Transparent areas of PNG files become white."],
      ["How much smaller will the files get?", "It depends on the picture. A lower quality and a smaller maximum width give smaller files."],
    ],
  },
  "mp4-to-mp3": {
    about: "MP4 to MP3 extracts the sound from a video and saves it as an MP3 file.",
    steps: ["Add your MP4 video.", "Choose the audio quality.", "Click Extract MP3 and download the audio file."],
    faq: [
      ["Is the video uploaded?", "No. The audio is extracted in your browser."],
      ["Why did it fail on my video?", "Your browser may not be able to read that video's audio. Try Chrome or a different file. Very large videos can also run out of memory."],
    ],
  },
  "excel-to-pdf": {
    about: "Excel to PDF converts a spreadsheet into a PDF using LibreOffice on the FlipFile server.",
    steps: ["Add your .xlsx, .xls, .ods or .csv file.", "Click Convert to PDF and watch the progress bar.", "Download the PDF."],
    faq: [
      ["Is my file uploaded?", "Yes. This tool sends your file to the FlipFile server, which converts it and then deletes it."],
      ["Why are my columns split across pages?", "The PDF follows the page size and print settings of the spreadsheet. Set the print area and page layout in your spreadsheet program for the best result."],
    ],
  },
  "powerpoint-to-pdf": {
    about: "PowerPoint to PDF converts a slide deck into a PDF using LibreOffice on the FlipFile server.",
    steps: ["Add your .pptx, .ppt or .odp file.", "Click Convert to PDF and watch the progress bar.", "Download the PDF."],
    faq: [
      ["Are animations and transitions kept?", "No. A PDF holds still pages, so animations and transitions are not included."],
      ["Will my fonts look the same?", "Fonts that are not installed on the server may be replaced by similar ones."],
    ],
  },
  "pdf-to-word": {
    about: "PDF to Word turns a PDF into an editable DOCX file. The conversion is done with LibreOffice on the FlipFile server, so it works best on PDFs made from text documents.",
    steps: ["Add your PDF.", "Click Convert to Word and watch the progress bar.", "Download the .docx file and open it in Word."],
    faq: [
      ["Will the layout match the PDF exactly?", "Not always. Simple documents convert well, but complex layouts, tables and columns may need tidying in Word."],
      ["Does it work on scanned PDFs?", "Not well. A scan is only a picture of the text, so it needs OCR first."],
    ],
  },
  "ocr-pdf": {
    about: "OCR PDF reads the text in a scanned PDF and adds an invisible text layer, so the PDF becomes searchable and you can copy its text.",
    steps: ["Add your scanned PDF.", "Choose the language of the text.", "Click Make searchable and download the result. Long documents can take a minute or more."],
    faq: [
      ["Which languages are supported?", "English, Hindi, or both together."],
      ["What happens to pages that already have text?", "They are left as they are. Only pages without text are read."],
    ],
  },
  "repair-pdf": {
    about: "Repair PDF tries to fix a PDF that will not open or shows errors, by rebuilding its internal structure.",
    steps: ["Add the damaged PDF.", "Click Repair PDF.", "Download the repaired file and check that it opens."],
    faq: [
      ["Will it recover everything?", "It fixes broken file structure, such as a damaged index. It cannot bring back content that is missing from the file."],
      ["What if it says the file is too damaged?", "Then not enough of the PDF is left to rebuild. Try getting the file again from where it came from."],
    ],
  },
  "protect-pdf": {
    about: "Protect PDF locks a PDF with a password, using 256-bit AES encryption, so only people who know the password can open it.",
    steps: ["Add your PDF.", "Type a password and repeat it.", "Click Protect PDF and download the locked file."],
    faq: [
      ["What if I forget the password?", "The PDF cannot be opened without it, and FlipFile cannot recover it. Keep your password and the original file safe."],
      ["Is my password stored?", "No. The file and password are used to lock the PDF and are then deleted from the server."],
    ],
  },
  "unlock-pdf": {
    about: "Unlock PDF removes the password from a PDF when you know it, so it opens without asking.",
    steps: ["Add your protected PDF.", "Type its password. Leave it empty if the PDF opens freely but has editing or printing limits.", "Click Unlock PDF and download the unlocked file."],
    faq: [
      ["Can it unlock a PDF if I forgot the password?", "No. FlipFile does not guess or crack passwords."],
      ["Is it okay to unlock any PDF?", "Only unlock files you own or have permission to change."],
    ],
  },
  "summarize-pdf": {
    about: "Summarize PDF reads the text of a PDF and writes a summary with an AI model of your choice. You use your own API key, so you pay the AI provider directly, and FlipFile never sees your key or your document.",
    steps: ["Add your PDF.", "Choose an AI provider and paste your API key. Tick Remember if you want to keep it in this browser.", "Pick the length, style and language of the summary, then click Summarize.", "Read the summary, copy it or download it as a text file."],
    faq: [
      ["Is my PDF uploaded to FlipFile?", "No. The text is read in your browser and sent straight to the AI provider you choose, using your key. It does not pass through a FlipFile server."],
      ["Where do I get an API key?", "From the website of the AI provider, in your account's API settings. API use is billed by the provider and is separate from a chat subscription."],
      ["Does it work on scanned PDFs?", "Not yet. The PDF needs real text. A scan is only a picture of the text and needs OCR first."],
      ["Can the summary be wrong?", "Yes. AI can miss details or make mistakes, so check important facts against the PDF."],
    ],
  },
  "chat-with-pdf": {
    about: "Chat with PDF lets you ask questions about a PDF and get answers that point to page numbers. It uses an AI model of your choice with your own API key.",
    steps: ["Add your PDF.", "Choose an AI provider and paste your API key.", "Type a question and press Enter. Ask follow-up questions as you like."],
    faq: [
      ["What happens with a very long PDF?", "If the PDF is too long to send in one go, FlipFile sends only the pages that match your question best, and tells you so."],
      ["Does it remember the chat?", "Only on this page. Closing or reloading the page clears the conversation."],
      ["Is my key stored?", "Only if you tick Remember. Then it is saved in this browser on this device, and you can remove it with Forget key."],
    ],
  },
  "custom-workflows": {
    about: "Custom Workflows chains several PDF tools into one run. For example, merge three PDFs, add page numbers, then add a watermark, without downloading anything in between.",
    steps: ["Add one PDF, or several PDFs to merge first.", "Add steps such as Rotate PDF, Add Page Numbers or Watermark, and set their options. Use the arrows to change the order.", "Click Run workflow and download the final PDF."],
    faq: [
      ["Which steps can I use?", "Rotate PDF, Add Page Numbers, Watermark, Compress PDF, Keep only some pages and Remove some pages. More steps will be added."],
      ["Does it run in my browser?", "Yes. Every step runs on your device and nothing is uploaded."],
    ],
  },
};