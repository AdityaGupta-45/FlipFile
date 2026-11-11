import { LineCapStyle, PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import JSZip from "jszip";
import pdfjs from "./pdfjs.js";
import { pageRot, viewSize, viewToPdf } from "./geometry.js";
import { Mp3Encoder } from "@breezystack/lamejs";

// Every processor takes (files, options, onProgress) and returns [{ name, blob }].
// onProgress(percent, label?) lets the page show a live progress bar.

const API = import.meta.env.VITE_API_URL || "";

const base = (name) => name.replace(/\.[^.]+$/, "");
const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));
const pdfBlob = (bytes) => new Blob([bytes], { type: "application/pdf" });
const tick = () => new Promise((r) => setTimeout(r));
const pct = (done, total, max = 95) => Math.round((done / total) * max);

async function zip(entries, name) {
  const z = new JSZip();
  entries.forEach((e) => z.file(e.name, e.blob));
  return { name, blob: await z.generateAsync({ type: "blob" }) };
}

const loadImage = (file) =>
  new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`Could not read ${file.name}.`)); };
    img.src = url;
  });

async function imageToCanvas(file, maxWidth = 0) {
  const img = await loadImage(file);
  const s = maxWidth && img.width > maxWidth ? maxWidth / img.width : 1;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; // JPG has no transparency
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function eachPage(file, scale, handler) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const ctx = c.getContext("2d");
    await page.render({ canvas: c, canvasContext: ctx, viewport: vp, background: "#fff" }).promise;
    await handler(c, n, pdf.numPages);
    page.cleanup();
  }
}

function parseRanges(text, total) {
  const out = [];
  for (const part of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a valid page range. Use something like 1-3, 5.`);
    const a = +m[1];
    const b = m[2] ? +m[2] : a;
    if (a < 1 || b < a || b > total) throw new Error(`Pages must be between 1 and ${total}.`);
    for (let i = a; i <= b; i++) out.push(i - 1);
  }
  return out;
}

async function mergePdf(files, _o, onProgress) {
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const src = await PDFDocument.load(await files[i].arrayBuffer());
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
    onProgress(pct(i + 1, files.length, 90), `Merging file ${i + 1} of ${files.length}`);
  }
  const bytes = await out.save();
  onProgress(100);
  return [{ name: "merged.pdf", blob: pdfBlob(bytes) }];
}

async function splitPdf([file], { pages }, onProgress) {
  const src = await PDFDocument.load(await file.arrayBuffer());
  const total = src.getPageCount();
  const make = async (idx) => {
    const d = await PDFDocument.create();
    (await d.copyPages(src, idx)).forEach((p) => d.addPage(p));
    return pdfBlob(await d.save());
  };
  if (pages.trim()) {
    onProgress(30, "Extracting pages");
    const blob = await make(parseRanges(pages, total));
    onProgress(100);
    return [{ name: `${base(file.name)}-pages.pdf`, blob }];
  }
  const entries = [];
  for (let i = 0; i < total; i++) {
    entries.push({ name: `${base(file.name)}-page-${i + 1}.pdf`, blob: await make([i]) });
    onProgress(pct(i + 1, total, 90), `Splitting page ${i + 1} of ${total}`);
  }
  const result = await zip(entries, `${base(file.name)}-pages.zip`);
  onProgress(100);
  return [result];
}

async function compressPdf([file], { mode, quality }, onProgress) {
  const name = `${base(file.name)}-compressed.pdf`;
  if (mode === "light") {
    onProgress(20, "Reading PDF");
    const d = await PDFDocument.load(await file.arrayBuffer());
    onProgress(60, "Optimizing");
    const bytes = await d.save({ useObjectStreams: true });
    onProgress(100);
    return [{ name, blob: pdfBlob(bytes) }];
  }
  const out = await PDFDocument.create();
  const scale = 1.5;
  await eachPage(file, scale, async (c, n, total) => {
    const jpg = await out.embedJpg(await (await toBlob(c, "image/jpeg", quality)).arrayBuffer());
    const w = c.width / scale;
    const h = c.height / scale;
    out.addPage([w, h]).drawImage(jpg, { x: 0, y: 0, width: w, height: h });
    onProgress(pct(n, total), `Compressing page ${n} of ${total}`);
  });
  const bytes = await out.save();
  onProgress(100);
  return [{ name, blob: pdfBlob(bytes) }];
}

async function pdfToJpg([file], { scale, format = "jpg" }, onProgress) {
  const png = format === "png";
  const entries = [];
  await eachPage(file, parseFloat(scale), async (c, n, total) => {
    entries.push({
      name: `${base(file.name)}-page-${n}.${png ? "png" : "jpg"}`,
      blob: await toBlob(c, png ? "image/png" : "image/jpeg", 0.92),
    });
    onProgress(pct(n, total), `Converting page ${n} of ${total}`);
  });
  const result = entries.length === 1 ? entries : [await zip(entries, `${base(file.name)}-images.zip`)];
  onProgress(100);
  return result;
}

async function imagesToPdf(files, _o, onProgress) {
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const c = await imageToCanvas(files[i]);
    const jpg = await out.embedJpg(await (await toBlob(c, "image/jpeg", 0.92)).arrayBuffer());
    out.addPage([c.width, c.height]).drawImage(jpg, { x: 0, y: 0, width: c.width, height: c.height });
    onProgress(pct(i + 1, files.length, 90), `Adding image ${i + 1} of ${files.length}`);
  }
  const bytes = await out.save();
  onProgress(100);
  return [{ name: "images.pdf", blob: pdfBlob(bytes) }];
}

async function convertImages(files, { quality, maxWidth = "0" }, suffix, onProgress) {
  const entries = [];
  for (let i = 0; i < files.length; i++) {
    const c = await imageToCanvas(files[i], parseInt(maxWidth));
    entries.push({ name: `${base(files[i].name)}${suffix}.jpg`, blob: await toBlob(c, "image/jpeg", quality) });
    onProgress(pct(i + 1, files.length, 90), `Image ${i + 1} of ${files.length}`);
  }
  const result = entries.length === 1 ? entries : [await zip(entries, "images.zip")];
  onProgress(100);
  return result;
}
const pngToJpg = (files, o, p) => convertImages(files, o, "", p);
const compressImage = (files, o, p) => convertImages(files, o, "-compressed", p);

async function mp4ToMp3([file], { bitrate }, onProgress) {
  onProgress(5, "Reading video");
  const data = await file.arrayBuffer();
  onProgress(15, "Decoding audio");
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let buf;
  try {
    buf = await ctx.decodeAudioData(data);
  } catch {
    throw new Error("This video's audio could not be read. Try Chrome or a different MP4 file.");
  } finally {
    ctx.close();
  }
  const channels = Math.min(buf.numberOfChannels, 2);
  const enc = new Mp3Encoder(channels, buf.sampleRate, parseInt(bitrate));
  const toInt = (f) => {
    const o = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const s = Math.max(-1, Math.min(1, f[i]));
      o[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return o;
  };
  const L = toInt(buf.getChannelData(0));
  const R = channels > 1 ? toInt(buf.getChannelData(1)) : null;
  const parts = [];
  const step = 1152 * 10;
  let chunk = 0;
  for (let i = 0; i < L.length; i += step) {
    const d = R
      ? enc.encodeBuffer(L.subarray(i, i + step), R.subarray(i, i + step))
      : enc.encodeBuffer(L.subarray(i, i + step));
    if (d.length) parts.push(d);
    if (++chunk % 40 === 0) {
      onProgress(30 + Math.round((i / L.length) * 65), "Encoding MP3");
      await tick();
    }
  }
  const end = enc.flush();
  if (end.length) parts.push(end);
  onProgress(100);
  return [{ name: `${base(file.name)}.mp3`, blob: new Blob(parts, { type: "audio/mpeg" }) }];
}

// Tools that run on the FlipFile server (LibreOffice, qpdf, ocrmypdf).
// The server gives no live progress, so after the upload the bar eases toward 92% until the file arrives.
function serverConvert(tool, file, fields, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timer;
    xhr.open("POST", `${API}/api/convert/${tool}`);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 35), "Uploading file");
    };
    xhr.upload.onload = () => {
      let p = 35;
      onProgress(p, "Converting on the server");
      timer = setInterval(() => {
        p += (92 - p) * 0.05;
        onProgress(Math.round(p), "Converting on the server");
      }, 400);
    };
    xhr.onload = async () => {
      clearInterval(timer);
      if (xhr.status === 200) return resolve(xhr.response);
      let message = "The conversion failed. Please try again.";
      try { message = JSON.parse(await xhr.response.text()).error || message; } catch { /* keep default */ }
      reject(new Error(message));
    };
    xhr.onerror = () => {
      clearInterval(timer);
      reject(new Error(
        import.meta.env.PROD && !API && import.meta.env.VITE_HAS_SERVER !== "true"
          ? "This tool is not available on this site yet. All the other tools work."
          : "Could not reach the conversion server. Start it with: npm run server"
      ));
    };

    // Text fields must come before the file so the server reads them first.
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file);
    xhr.send(form);
  });
}

const serverTool = (tool, { suffix = "", ext = "pdf", fields = () => ({}), check = () => {} } = {}) =>
  async ([file], options, onProgress) => {
    check(options);
    const blob = await serverConvert(tool, file, fields(options), onProgress);
    onProgress(100);
    return [{ name: `${base(file.name)}${suffix}.${ext}`, blob }];
  };

const wordToPdf = serverTool("word-to-pdf");
const excelToPdf = serverTool("excel-to-pdf");
const powerpointToPdf = serverTool("powerpoint-to-pdf");
const pdfToWord = serverTool("pdf-to-word", { ext: "docx" });
const repairPdf = serverTool("repair-pdf", { suffix: "-repaired" });
const ocrPdf = serverTool("ocr-pdf", { suffix: "-searchable", fields: (o) => ({ lang: o.lang }) });
const unlockPdf = serverTool("unlock-pdf", { suffix: "-unlocked", fields: (o) => ({ password: o.password }) });
const protectPdf = serverTool("protect-pdf", {
  suffix: "-protected",
  fields: (o) => ({ password: o.password }),
  check: (o) => {
    if (!o.password) throw new Error("Type a password first.");
    if (o.password !== o.confirm) throw new Error("The two passwords do not match.");
  },
});

// ---------------------------------------------------------------- Phase 1 tools

const COLORS = { gray: rgb(0.5, 0.5, 0.5), red: rgb(0.85, 0.15, 0.15), blue: rgb(0.17, 0.35, 1), black: rgb(0, 0, 0) };

// pageState comes from the page editor: [{ n: original page index, rot: extra degrees, del: true/false }]
async function editPages([file], { pageState }, onProgress) {
  const src = await PDFDocument.load(await file.arrayBuffer());
  const keep = pageState.filter((p) => !p.del);
  if (!keep.length) throw new Error("At least one page must stay in the PDF.");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keep.map((p) => p.n));
  copied.forEach((page, i) => {
    if (keep[i].rot) page.setRotation(degrees((page.getRotation().angle + keep[i].rot) % 360));
    out.addPage(page);
    onProgress(pct(i + 1, copied.length, 90), `Adding page ${i + 1} of ${copied.length}`);
  });
  const bytes = await out.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-edited.pdf`, blob: pdfBlob(bytes) }];
}

async function rotatePdf([file], { angle, pages }, onProgress) {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const all = doc.getPages();
  const idx = pages.trim() ? parseRanges(pages, all.length) : all.map((_, i) => i);
  idx.forEach((i, k) => {
    const page = all[i];
    page.setRotation(degrees((page.getRotation().angle + parseInt(angle)) % 360));
    onProgress(pct(k + 1, idx.length, 90));
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-rotated.pdf`, blob: pdfBlob(bytes) }];
}

async function addPageNumbers([file], { position, format, start, size }, onProgress) {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const parsed = parseInt(start);
  const first = Number.isNaN(parsed) ? 1 : parsed;
  const fontSize = parseInt(size);
  const margin = 28;
  const pages = doc.getPages();
  const last = first + pages.length - 1;
  pages.forEach((page, i) => {
    const num = first + i;
    const label =
      format === "page" ? `Page ${num}` : format === "of" ? `Page ${num} of ${last}` : format === "slash" ? `${num} / ${last}` : `${num}`;
    const { width, height } = page.getSize();
    const w = font.widthOfTextAtSize(label, fontSize);
    const [v, h] = position.split("-");
    const x = h === "left" ? margin : h === "right" ? width - margin - w : (width - w) / 2;
    const y = v === "top" ? height - margin - fontSize * 0.8 : margin;
    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
    onProgress(pct(i + 1, pages.length, 90), `Numbering page ${i + 1} of ${pages.length}`);
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-numbered.pdf`, blob: pdfBlob(bytes) }];
}

async function watermark([file], { text, opacity, size, color, angle }, onProgress) {
  if (!text.trim()) throw new Error("Type the watermark text first.");
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const deg = parseInt(angle);
  const rad = (deg * Math.PI) / 180;
  const pages = doc.getPages();
  try {
    font.widthOfTextAtSize(text, 10);
  } catch {
    throw new Error("Watermark text supports Latin letters, numbers and common symbols only.");
  }
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    let s = parseInt(size);
    let w = font.widthOfTextAtSize(text, s);
    const maxW = (deg === 0 ? width : Math.hypot(width, height)) * 0.85;
    if (w > maxW) { s = (s * maxW) / w; w = maxW; }
    const dx = w / 2;
    const dy = s * 0.3;
    const x = width / 2 - (dx * Math.cos(rad) - dy * Math.sin(rad));
    const y = height / 2 - (dx * Math.sin(rad) + dy * Math.cos(rad));
    page.drawText(text, { x, y, size: s, font, color: COLORS[color], opacity, rotate: degrees(deg) });
    onProgress(pct(i + 1, pages.length, 90), `Stamping page ${i + 1} of ${pages.length}`);
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-watermarked.pdf`, blob: pdfBlob(bytes) }];
}

// Text of one page, grouped into lines.
async function pageLines(pdf, n) {
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

async function extractText([file], { markers }, onProgress) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const parts = [];
  let chars = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const lines = await pageLines(pdf, n);
    chars += lines.join("").length;
    parts.push(markers === "yes" ? `--- Page ${n} ---\n${lines.join("\n")}` : lines.join("\n"));
    onProgress(pct(n, pdf.numPages), `Reading page ${n} of ${pdf.numPages}`);
  }
  if (!chars) throw new Error("No text found. This PDF is probably scanned (just pictures of pages), so it needs OCR first.");
  onProgress(100);
  return [{ name: `${base(file.name)}.txt`, blob: new Blob([parts.join("\n\n")], { type: "text/plain;charset=utf-8" }) }];
}

function applyFilter(canvas, mode) {
  if (mode === "original") return;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (mode === "clean") g = Math.max(0, Math.min(255, (g - 60) * 2.2)); // whiter paper, darker ink
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
}

async function scanToPdf(files, { filter }, onProgress) {
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const c = await imageToCanvas(files[i], 2000);
    applyFilter(c, filter);
    const jpg = await out.embedJpg(await (await toBlob(c, "image/jpeg", 0.85)).arrayBuffer());
    out.addPage([c.width, c.height]).drawImage(jpg, { x: 0, y: 0, width: c.width, height: c.height });
    onProgress(pct(i + 1, files.length, 90), `Scanning page ${i + 1} of ${files.length}`);
    await tick();
  }
  const bytes = await out.save();
  onProgress(100);
  return [{ name: "scan.pdf", blob: pdfBlob(bytes) }];
}

// Line-by-line difference between two lists of lines.
function lcsDiff(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: "del", text: a[i++] });
    else ops.push({ type: "add", text: b[j++] });
  }
  while (i < m) ops.push({ type: "del", text: a[i++] });
  while (j < n) ops.push({ type: "add", text: b[j++] });
  return ops;
}

async function comparePdfs([fileA, fileB], _o, onProgress) {
  const open = async (f) => pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
  const pa = await open(fileA);
  const pb = await open(fileB);
  const total = Math.max(pa.numPages, pb.numPages);
  const changedPages = [];
  const report = [];
  let added = 0;
  let removed = 0;
  let seen = 0;
  for (let n = 1; n <= total; n++) {
    const A = n <= pa.numPages ? await pageLines(pa, n) : [];
    const B = n <= pb.numPages ? await pageLines(pb, n) : [];
    seen += A.length + B.length;
    const ops = lcsDiff(A, B);
    if (ops.length) {
      changedPages.push({ page: n, lines: ops });
      ops.forEach((o) => (o.type === "add" ? added++ : removed++));
      report.push(`Page ${n}`, ...ops.map((o) => `${o.type === "add" ? "+ Added:" : "- Removed:"} ${o.text}`), "");
    }
    onProgress(pct(n, total), `Comparing page ${n} of ${total}`);
  }
  if (!seen) throw new Error("No text found in these PDFs. Scanned PDFs need OCR first.");
  onProgress(100);
  const text = changedPages.length ? report.join("\n") : "No text differences found.";
  return [{
    name: "comparison-report.txt",
    blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    diff: { pagesA: pa.numPages, pagesB: pb.numPages, changedPages, added, removed },
  }];
}

// ---------------------------------------------------------------- Phase 2 tools
// pageState comes from the visual editors. Positions are fractions of the page as the user sees it.

const dataUrlBytes = (url) => Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0));

async function cropPdf([file], { scope, pageState }, onProgress) {
  if (!pageState?.rect) throw new Error("Drag on the page to choose the area you want to keep.");
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const pages = doc.getPages();
  const targets = scope === "page" ? [pageState.page - 1] : pages.map((_, i) => i);
  const { u0, v0, u1, v1 } = pageState.rect;
  targets.forEach((i, k) => {
    const page = pages[i];
    const rot = pageRot(page);
    const box = page.getCropBox();
    const a = viewToPdf(u0, v0, rot, box);
    const b = viewToPdf(u1, v1, rot, box);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    page.setMediaBox(x, y, w, h);
    page.setCropBox(x, y, w, h);
    onProgress(pct(k + 1, targets.length, 90), `Cropping page ${k + 1} of ${targets.length}`);
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-cropped.pdf`, blob: pdfBlob(bytes) }];
}

async function signPdf([file], { pageState }, onProgress) {
  const st = pageState;
  if (!st?.signature || !st.placements.length) throw new Error("Click on the page to place your signature first.");
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const png = await doc.embedPng(dataUrlBytes(st.signature.url));
  const pages = doc.getPages();
  st.placements.forEach((pl, k) => {
    const page = pages[pl.page - 1];
    const rot = pageRot(page);
    const box = page.getCropBox();
    const vs = viewSize(rot, box);
    const wPts = st.scale * vs.w;
    const hPts = wPts * st.signature.ar;
    const a = viewToPdf(pl.u, pl.v + hPts / vs.h, rot, box);
    page.drawImage(png, { x: a.x, y: a.y, width: wPts, height: hPts, rotate: degrees(rot) });
    onProgress(pct(k + 1, st.placements.length, 90), "Placing signature");
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-signed.pdf`, blob: pdfBlob(bytes) }];
}

async function redactPdf([file], { pageState }, onProgress) {
  const rects = pageState?.rects || [];
  if (!rects.length) throw new Error("Draw at least one box over the text you want to hide.");
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf.slice(0));
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const out = await PDFDocument.create();
  const total = src.getPageCount();
  const scale = 2;
  for (let i = 0; i < total; i++) {
    const mine = rects.filter((r) => r.page === i + 1);
    if (!mine.length) {
      const [copy] = await out.copyPages(src, [i]);
      out.addPage(copy);
    } else {
      // Redacted pages are rebuilt as pictures so the hidden text is really gone.
      const pg = await pdf.getPage(i + 1);
      const vp = pg.getViewport({ scale });
      const c = document.createElement("canvas");
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const ctx = c.getContext("2d");
      await pg.render({ canvas: c, canvasContext: ctx, viewport: vp, background: "#fff" }).promise;
      ctx.fillStyle = "#000";
      mine.forEach((r) => ctx.fillRect(r.u0 * c.width, r.v0 * c.height, (r.u1 - r.u0) * c.width, (r.v1 - r.v0) * c.height));
      const jpg = await out.embedJpg(await (await toBlob(c, "image/jpeg", 0.92)).arrayBuffer());
      const size1 = pg.getViewport({ scale: 1 });
      out.addPage([size1.width, size1.height]).drawImage(jpg, { x: 0, y: 0, width: size1.width, height: size1.height });
      pg.cleanup();
    }
    onProgress(pct(i + 1, total, 90), `Processing page ${i + 1} of ${total}`);
  }
  const bytes = await out.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-redacted.pdf`, blob: pdfBlob(bytes) }];
}

const waitFor = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(() => r(null), ms))]);
const getPdfObject = (page, name) =>
  waitFor(
    new Promise((resolve) => {
      const store = name.startsWith("g_") ? page.commonObjs : page.objs;
      try { store.get(name, resolve); } catch { resolve(null); }
    }),
    4000
  );

// Turns an image object from pdf.js into a canvas (kind: 1 = 1-bit gray, 2 = RGB, 3 = RGBA).
function pdfImageToCanvas(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return c;
  }
  if (!img.data) return null;
  const out = ctx.createImageData(img.width, img.height);
  const d = out.data;
  const src = img.data;
  const px = img.width * img.height;
  if (img.kind === 3) {
    d.set(src.subarray(0, px * 4));
  } else if (img.kind === 2) {
    for (let i = 0; i < px; i++) {
      d[i * 4] = src[i * 3]; d[i * 4 + 1] = src[i * 3 + 1]; d[i * 4 + 2] = src[i * 3 + 2]; d[i * 4 + 3] = 255;
    }
  } else if (img.kind === 1) {
    const rowBytes = (img.width + 7) >> 3;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const v = (src[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
        const o = (y * img.width + x) * 4;
        d[o] = d[o + 1] = d[o + 2] = v;
        d[o + 3] = 255;
      }
    }
  } else {
    return null;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

async function extractImages([file], { format, minSize }, onProgress) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const { OPS } = pdfjs;
  const min = parseInt(minSize);
  const png = format === "png";
  const entries = [];
  const seen = new Set();
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const list = await page.getOperatorList();
    for (let k = 0; k < list.fnArray.length; k++) {
      const fn = list.fnArray[k];
      if (fn !== OPS.paintImageXObject && fn !== OPS.paintInlineImageXObject) continue;
      const arg = list.argsArray[k][0];
      let img;
      if (typeof arg === "string") {
        if (seen.has(arg)) continue;
        seen.add(arg);
        img = await getPdfObject(page, arg);
      } else {
        img = arg;
      }
      if (!img || img.width < min || img.height < min) continue;
      const canvas = pdfImageToCanvas(img);
      if (!canvas) continue;
      entries.push({
        name: `${base(file.name)}-page${n}-image${entries.length + 1}.${png ? "png" : "jpg"}`,
        blob: await toBlob(canvas, png ? "image/png" : "image/jpeg", 0.92),
      });
    }
    page.cleanup();
    onProgress(pct(n, pdf.numPages), `Looking at page ${n} of ${pdf.numPages}`);
  }
  if (!entries.length) {
    throw new Error("No images found. This PDF may only contain text, or the pictures are smaller than the size you chose to skip.");
  }
  const result = entries.length === 1 ? entries : [await zip(entries, `${base(file.name)}-images.zip`)];
  onProgress(100);
  return result;
}

const EDIT_COLORS = {
  black: rgb(0, 0, 0), red: rgb(0.85, 0.15, 0.15), blue: rgb(0.17, 0.35, 1), green: rgb(0.1, 0.6, 0.3), yellow: rgb(1, 0.9, 0),
};

async function editPdf([file], { pageState }, onProgress) {
  const items = pageState?.items || [];
  if (!items.length) throw new Error("Add some text, a drawing or a highlight first.");
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  items.forEach((it, k) => {
    const page = pages[it.page - 1];
    const rot = pageRot(page);
    const box = page.getCropBox();
    if (it.type === "text") {
      try {
        font.widthOfTextAtSize(it.text, it.size);
      } catch {
        throw new Error("Text supports Latin letters, numbers and common symbols only.");
      }
      const vs = viewSize(rot, box);
      const a = viewToPdf(it.u, it.v + (0.8 * it.size) / vs.h, rot, box);
      page.drawText(it.text, { x: a.x, y: a.y, size: it.size, font, color: EDIT_COLORS[it.color], rotate: degrees(rot) });
    } else if (it.type === "draw") {
      for (let i = 1; i < it.points.length; i++) {
        const p = viewToPdf(it.points[i - 1][0], it.points[i - 1][1], rot, box);
        const q = viewToPdf(it.points[i][0], it.points[i][1], rot, box);
        page.drawLine({ start: p, end: q, thickness: it.width, color: EDIT_COLORS[it.color], lineCap: LineCapStyle.Round });
      }
    } else {
      const a = viewToPdf(it.u0, it.v0, rot, box);
      const b = viewToPdf(it.u1, it.v1, rot, box);
      const white = it.mode === "whiteout";
      page.drawRectangle({
        x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y),
        color: white ? rgb(1, 1, 1) : EDIT_COLORS[it.color], opacity: white ? 1 : 0.35, borderWidth: 0,
      });
    }
    onProgress(pct(k + 1, items.length, 90), `Applying change ${k + 1} of ${items.length}`);
  });
  const bytes = await doc.save();
  onProgress(100);
  return [{ name: `${base(file.name)}-edited.pdf`, blob: pdfBlob(bytes) }];
}

export const processors = {
  "merge-pdf": mergePdf,
  "split-pdf": splitPdf,
  "compress-pdf": compressPdf,
  "pdf-to-jpg": pdfToJpg,
  "jpg-to-pdf": imagesToPdf,
  "png-to-jpg": pngToJpg,
  "compress-image": compressImage,
  "mp4-to-mp3": mp4ToMp3,
  "word-to-pdf": wordToPdf,
  "delete-pages": editPages,
  "organize-pages": editPages,
  "rotate-pdf": rotatePdf,
  "page-numbers": addPageNumbers,
  watermark,
  "extract-text": extractText,
  "scan-to-pdf": scanToPdf,
  "compare-pdfs": comparePdfs,
  "crop-pdf": cropPdf,
  "sign-pdf": signPdf,
  "redact-pdf": redactPdf,
  "extract-images": extractImages,
  "edit-pdf": editPdf,
  "excel-to-pdf": excelToPdf,
  "powerpoint-to-pdf": powerpointToPdf,
  "pdf-to-word": pdfToWord,
  "ocr-pdf": ocrPdf,
  "repair-pdf": repairPdf,
  "protect-pdf": protectPdf,
  "unlock-pdf": unlockPdf,
};