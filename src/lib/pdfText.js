import pdfjs from "./pdfjs.js";

// Text of one page, grouped into lines.
export async function pageLines(pdf, n) {
  const page = await pdf.getPage(n);
  const { items } = await page.getTextContent();
  const lines = [];
  let cur = "";
  let lastY = null;
  const flush = () => {
    const t = cur.replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
    cur = "";
  };
  for (const it of items) {
    if (!("str" in it)) continue;
    const y = it.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 3) flush();
    if (cur && !cur.endsWith(" ") && !it.str.startsWith(" ")) cur += " ";
    cur += it.str;
    lastY = y;
  }
  flush();
  page.cleanup();
  return lines;
}

// The text of every page, as an array with one string per page.
export async function extractPages(file, onProgress = () => {}) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    pages.push((await pageLines(pdf, n)).join("\n"));
    onProgress(n, pdf.numPages);
  }
  return pages;
}