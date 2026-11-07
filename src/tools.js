export const categories = ["All", "PDF", "Image", "Audio & Video", "Documents"];

const quality = (def) => ({ key: "quality", label: "Quality", type: "range", min: 0.3, max: 1, step: 0.05, default: def });

export const tools = [
  // ---- Organize
  { id: "merge-pdf", name: "Merge PDF", desc: "Combine several PDFs into one file.", cat: "PDF", accepts: ["pdf"], multiple: true, ordered: true, min: 2, from: "PDF", to: "PDF", live: true, action: "Merge PDFs" },
  { id: "split-pdf", name: "Split PDF", desc: "Pull pages out into separate files.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Split PDF",
    options: [{ key: "pages", label: "Pages to extract, like 1-3, 5. Leave empty to save every page as its own file.", type: "text", default: "" }] },
  { id: "delete-pages", name: "Delete Pages", desc: "Remove the pages you don't need.", cat: "PDF", accepts: ["pdf"], editor: "delete", from: "PDF", to: "PDF", live: true, action: "Delete marked pages" },
  { id: "organize-pages", name: "Organize Pages", desc: "Reorder, rotate and delete pages.", cat: "PDF", accepts: ["pdf"], editor: "organize", from: "PDF", to: "PDF", live: true, action: "Save new PDF" },
  { id: "scan-to-pdf", name: "Scan to PDF", desc: "Turn photos of documents into a clean PDF.", cat: "PDF", accepts: ["jpg", "png", "webp"], multiple: true, ordered: true, camera: true, from: "Photo", to: "PDF", live: true, action: "Create PDF",
    hint: "Add one photo per page. On a phone, you can take the photos right here.",
    options: [{ key: "filter", label: "Look", type: "select", default: "clean", choices: [["clean", "Clean document (recommended)"], ["gray", "Grayscale"], ["original", "Original colors"]] }] },

  // ---- Optimize
  { id: "compress-pdf", name: "Compress PDF", desc: "Make a PDF smaller to share.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Compress PDF",
    options: [
      { key: "mode", label: "Compression", type: "select", default: "light", choices: [["light", "Light: keeps text selectable"], ["strong", "Strong: pages become images, much smaller"]] },
      { ...quality(0.6), label: "Image quality (strong mode only)" },
    ] },

  // ---- Convert
  { id: "jpg-to-pdf", name: "JPG to PDF", desc: "Put images into one PDF.", cat: "Image", accepts: ["jpg", "png", "webp"], multiple: true, ordered: true, from: "JPG", to: "PDF", live: true, action: "Create PDF" },
  { id: "word-to-pdf", name: "Word to PDF", desc: "Convert a DOCX file to PDF.", cat: "Documents", accepts: ["docx"], from: "DOCX", to: "PDF", live: true, action: "Convert to PDF" },
  { id: "pdf-to-jpg", name: "PDF to JPG/PNG", desc: "Turn every page into an image.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "JPG/PNG", live: true, action: "Convert to images",
    options: [
      { key: "format", label: "Image format", type: "select", default: "jpg", choices: [["jpg", "JPG (smaller files)"], ["png", "PNG (sharper text)"]] },
      { key: "scale", label: "Resolution", type: "select", default: "1.5", choices: [["1", "Standard"], ["1.5", "Good"], ["2.5", "High"]] },
    ] },
  { id: "extract-text", name: "Extract Text", desc: "Copy all the text out of a PDF.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "TXT", live: true, action: "Extract text",
    options: [{ key: "markers", label: "Page markers", type: "select", default: "yes", choices: [["yes", "Add a line like --- Page 1 --- before each page"], ["no", "Text only"]] }] },

  // ---- Edit
  { id: "rotate-pdf", name: "Rotate PDF", desc: "Turn pages sideways or upside down.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Rotate PDF",
    options: [
      { key: "angle", label: "Rotate clockwise by", type: "select", default: "90", choices: [["90", "90 degrees"], ["180", "180 degrees"], ["270", "270 degrees (90 anticlockwise)"]] },
      { key: "pages", label: "Pages to rotate, like 1-3, 5. Leave empty to rotate all pages.", type: "text", default: "" },
    ] },
  { id: "page-numbers", name: "Add Page Numbers", desc: "Number every page of your PDF.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Add page numbers",
    options: [
      { key: "position", label: "Position", type: "select", default: "bottom-center", choices: [["bottom-center", "Bottom center"], ["bottom-right", "Bottom right"], ["bottom-left", "Bottom left"], ["top-center", "Top center"], ["top-right", "Top right"], ["top-left", "Top left"]] },
      { key: "format", label: "Style", type: "select", default: "n", choices: [["n", "1, 2, 3"], ["page", "Page 1, Page 2"], ["of", "Page 1 of 10"], ["slash", "1 / 10"]] },
      { key: "size", label: "Text size", type: "select", default: "12", choices: [["10", "Small"], ["12", "Medium"], ["14", "Large"]] },
      { key: "start", label: "Start numbering at", type: "text", default: "1" },
    ] },
  { id: "watermark", name: "Watermark", desc: "Stamp text across every page.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Add watermark",
    options: [
      { key: "text", label: "Watermark text", type: "text", default: "CONFIDENTIAL" },
      { key: "opacity", label: "Opacity", type: "range", min: 0.1, max: 1, step: 0.05, default: 0.3 },
      { key: "size", label: "Text size", type: "select", default: "70", choices: [["40", "Small"], ["70", "Medium"], ["100", "Large"]] },
      { key: "color", label: "Color", type: "select", default: "gray", choices: [["gray", "Gray"], ["red", "Red"], ["blue", "Blue"], ["black", "Black"]] },
      { key: "angle", label: "Direction", type: "select", default: "45", choices: [["45", "Diagonal"], ["0", "Straight across"]] },
    ] },
  { id: "pdf-viewer", name: "PDF Viewer", desc: "Open and read a PDF in your browser.", cat: "PDF", accepts: ["pdf"], viewer: true, from: "PDF", to: "PDF", live: true },
  { id: "compare-pdfs", name: "Compare PDFs", desc: "See which text changed between two PDFs.", cat: "PDF", accepts: ["pdf"], multiple: true, ordered: true, min: 2, max: 2, from: "PDF", to: "PDF", live: true, action: "Compare PDFs",
    hint: "Add two PDFs. The first is the original and the second is the changed version. Use Up and Down to swap them." },

  // ---- Phase 2: visual tools
  { id: "sign-pdf", name: "Sign PDF", desc: "Draw or upload your signature and place it on any page.", cat: "PDF", accepts: ["pdf"], editor: "sign", from: "PDF", to: "PDF", live: true, action: "Sign PDF",
    hint: "This adds an image of your signature. It is not a legal digital certificate." },
  { id: "crop-pdf", name: "Crop PDF", desc: "Trim the margins and keep only the area you choose.", cat: "PDF", accepts: ["pdf"], editor: "crop", from: "PDF", to: "PDF", live: true, action: "Crop PDF",
    options: [{ key: "scope", label: "Apply the crop to", type: "select", default: "all", choices: [["all", "All pages"], ["page", "Only the page I drew on"]] }] },
  { id: "redact-pdf", name: "Redact PDF", desc: "Black out private text or images for good.", cat: "PDF", accepts: ["pdf"], editor: "redact", from: "PDF", to: "PDF", live: true, action: "Redact PDF",
    hint: "Pages with black boxes are turned into images, so the hidden text cannot be copied. Other pages stay as they are." },
  { id: "extract-images", name: "Extract Images", desc: "Save every picture inside a PDF.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "Images", live: true, action: "Extract images",
    options: [
      { key: "format", label: "Image format", type: "select", default: "png", choices: [["png", "PNG (best quality)"], ["jpg", "JPG (smaller files)"]] },
      { key: "minSize", label: "Skip small images (icons, lines)", type: "select", default: "50", choices: [["0", "Keep everything"], ["50", "Skip under 50 px"], ["150", "Skip under 150 px"]] },
    ] },
  { id: "edit-pdf", name: "Edit PDF", desc: "Add text, drawings, highlights and white-out boxes.", cat: "PDF", accepts: ["pdf"], editor: "edit", from: "PDF", to: "PDF", live: true, action: "Save edited PDF",
    hint: "You can add new content. Text that is already in the PDF cannot be changed." },

  // ---- Images and audio
  { id: "png-to-jpg", name: "PNG to JPG", desc: "Convert PNG images to JPG.", cat: "Image", accepts: ["png", "webp"], multiple: true, from: "PNG", to: "JPG", live: true, action: "Convert to JPG",
    options: [quality(0.92)] },
  { id: "compress-image", name: "Compress image", desc: "Shrink image size, keep quality.", cat: "Image", accepts: ["jpg", "png", "webp"], multiple: true, from: "IMG", to: "IMG", live: true, action: "Compress images",
    options: [
      quality(0.7),
      { key: "maxWidth", label: "Maximum width", type: "select", default: "0", choices: [["0", "Keep original"], ["1920", "1920 px"], ["1280", "1280 px"], ["800", "800 px"]] },
    ] },
  { id: "mp4-to-mp3", name: "MP4 to MP3", desc: "Extract the audio from a video.", cat: "Audio & Video", accepts: ["mp4"], from: "MP4", to: "MP3", live: true, action: "Extract MP3",
    options: [{ key: "bitrate", label: "Audio quality", type: "select", default: "128", choices: [["96", "Small (96 kbps)"], ["128", "Standard (128 kbps)"], ["192", "High (192 kbps)"]] }] },
];