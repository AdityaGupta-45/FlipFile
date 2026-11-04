export const categories = ["All", "PDF", "Image", "Audio & Video", "Documents"];

const quality = (def) => ({ key: "quality", label: "Quality", type: "range", min: 0.3, max: 1, step: 0.05, default: def });

export const tools = [
  { id: "merge-pdf", name: "Merge PDF", desc: "Combine several PDFs into one file.", cat: "PDF", accepts: ["pdf"], multiple: true, ordered: true, min: 2, from: "PDF", to: "PDF", live: true, action: "Merge PDFs" },
  { id: "split-pdf", name: "Split PDF", desc: "Pull pages out into separate files.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Split PDF",
    options: [{ key: "pages", label: "Pages to extract, like 1-3, 5. Leave empty to save every page as its own file.", type: "text", default: "" }] },
  { id: "compress-pdf", name: "Compress PDF", desc: "Make a PDF smaller to share.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "PDF", live: true, action: "Compress PDF",
    options: [
      { key: "mode", label: "Compression", type: "select", default: "light", choices: [["light", "Light: keeps text selectable"], ["strong", "Strong: pages become images, much smaller"]] },
      { ...quality(0.6), label: "Image quality (strong mode only)" },
    ] },
  { id: "pdf-to-jpg", name: "PDF to JPG", desc: "Turn every page into an image.", cat: "PDF", accepts: ["pdf"], from: "PDF", to: "JPG", live: true, action: "Convert to JPG",
    options: [{ key: "scale", label: "Resolution", type: "select", default: "1.5", choices: [["1", "Standard"], ["1.5", "Good"], ["2.5", "High"]] }] },
  { id: "jpg-to-pdf", name: "JPG to PDF", desc: "Put images into one PDF.", cat: "Image", accepts: ["jpg", "png", "webp"], multiple: true, ordered: true, from: "JPG", to: "PDF", live: true, action: "Create PDF" },
  { id: "png-to-jpg", name: "PNG to JPG", desc: "Convert PNG images to JPG.", cat: "Image", accepts: ["png", "webp"], multiple: true, from: "PNG", to: "JPG", live: true, action: "Convert to JPG",
    options: [quality(0.92)] },
  { id: "compress-image", name: "Compress image", desc: "Shrink image size, keep quality.", cat: "Image", accepts: ["jpg", "png", "webp"], multiple: true, from: "IMG", to: "IMG", live: true, action: "Compress images",
    options: [
      quality(0.7),
      { key: "maxWidth", label: "Maximum width", type: "select", default: "0", choices: [["0", "Keep original"], ["1920", "1920 px"], ["1280", "1280 px"], ["800", "800 px"]] },
    ] },
  { id: "mp4-to-mp3", name: "MP4 to MP3", desc: "Extract the audio from a video.", cat: "Audio & Video", accepts: ["mp4"], from: "MP4", to: "MP3", live: true, action: "Extract MP3",
    options: [{ key: "bitrate", label: "Audio quality", type: "select", default: "128", choices: [["96", "Small (96 kbps)"], ["128", "Standard (128 kbps)"], ["192", "High (192 kbps)"]] }] },
  { id: "word-to-pdf", name: "Word to PDF", desc: "Convert a DOCX file to PDF.", cat: "Documents", accepts: ["docx"], from: "DOCX", to: "PDF", live: true, action: "Convert to PDF" },
];