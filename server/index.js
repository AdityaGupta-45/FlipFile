// FlipFile conversion server: Word to PDF using LibreOffice (same engine boringpdf uses).
import express from "express";
import multer from "multer";
import cors from "cors";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const ALLOWED = [".docx", ".doc", ".odt", ".rtf"];
const CONTACT_TO = "adityagupta1212349@gmail.com";

function findSoffice() {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  const windows = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  return windows.find((p) => existsSync(p)) || "soffice";
}
const SOFFICE = findSoffice();
const PROFILE = pathToFileURL(path.join(os.tmpdir(), "flipfile-lo-profile")).href;

// LibreOffice can only run one conversion at a time per profile, so we queue them.
let chain = Promise.resolve();
const enqueue = (job) => {
  const p = chain.then(() => job());
  chain = p.catch(() => {});
  return p;
};

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "20kb" }));
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 50 * 1024 * 1024 } });

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/convert/word-to-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file was received." });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const work = path.join(os.tmpdir(), `flipfile-${randomUUID()}`);
  try {
    if (!ALLOWED.includes(ext)) {
      return res.status(400).json({ error: "Only Word files (.docx, .doc) can be converted here." });
    }
    await fs.mkdir(work);
    const input = path.join(work, `input${ext}`);
    await fs.rename(req.file.path, input);
    await enqueue(() =>
      run(
        SOFFICE,
        ["--headless", "--norestore", `-env:UserInstallation=${PROFILE}`, "--convert-to", "pdf", "--outdir", work, input],
        { timeout: 180000 }
      )
    );
    const pdf = await fs.readFile(path.join(work, "input.pdf"));
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (e) {
    console.error("Conversion failed:", e.message);
    const message =
      e.code === "ENOENT"
        ? "LibreOffice is not installed on the server. Install it from libreoffice.org and restart the server."
        : "This file could not be converted. It may be damaged or password-protected.";
    if (!res.headersSent) res.status(500).json({ error: message });
  } finally {
    await fs.rm(work, { recursive: true, force: true });
    await fs.rm(req.file.path, { force: true });
  }
});

// Contact form: the browser talks to this server, and this server passes the message to FormSubmit,
// which emails it to CONTACT_TO. Going through the server avoids browser CORS errors.
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in your name, email and message." });
  }
  if (String(message).length > 2000 || String(name).length > 100 || String(email).length > 200) {
    return res.status(400).json({ error: "Your message is too long." });
  }
  try {
    const origin = process.env.FRONTEND_ORIGIN || req.get("origin") || "http://localhost:5173";
    const r = await fetch(`https://formsubmit.co/ajax/${CONTACT_TO}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: origin, Referer: `${origin}/` },
      body: JSON.stringify({
        name: String(name),
        email: String(email),
        message: String(message),
        _subject: `FlipFile message from ${name}`,
        _template: "table",
        _captcha: "false",
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || String(data.success) !== "true") {
      console.error("FormSubmit replied:", r.status, data);
      return res.status(502).json({ error: data.message || "The mail service rejected the message." });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Contact failed:", e.message);
    res.status(502).json({ error: "Could not reach the mail service. Please try again later." });
  }
});

// When built for production, the same server also serves the website.
const dist = path.join(__dirname, "../dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) return res.sendFile(path.join(dist, "index.html"));
    next();
  });
}

app.listen(PORT, () => {
  console.log(`FlipFile server running on http://localhost:${PORT}`);
  run(SOFFICE, ["--version"], { timeout: 30000 })
    .then(({ stdout }) => console.log("LibreOffice found:", stdout.trim()))
    .catch(() => console.warn("LibreOffice NOT found. Install it from libreoffice.org, or set SOFFICE_PATH."));
});