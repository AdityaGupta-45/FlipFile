import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Mp3Encoder } from "@breezystack/lamejs";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

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

async function pdfToJpg([file], { scale }, onProgress) {
  const entries = [];
  await eachPage(file, parseFloat(scale), async (c, n, total) => {
    entries.push({ name: `${base(file.name)}-page-${n}.jpg`, blob: await toBlob(c, "image/jpeg", 0.92) });
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

// Word to PDF runs on the FlipFile server (LibreOffice), so layout, images and tables stay intact.
function convertOnServer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timer;
    xhr.open("POST", `${API}/api/convert/word-to-pdf`);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 35), "Uploading file");
    };
    xhr.upload.onload = () => {
      // The server gives no live progress, so the bar eases toward 92% until the PDF arrives.
      let p = 35;
      onProgress(p, "Converting document");
      timer = setInterval(() => {
        p += (92 - p) * 0.05;
        onProgress(Math.round(p), "Converting document");
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
      reject(new Error("Could not reach the conversion server. Start it with: npm run server"));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

async function wordToPdf([file], _o, onProgress) {
  const blob = await convertOnServer(file, onProgress);
  onProgress(100);
  return [{ name: `${base(file.name)}.pdf`, blob }];
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
};