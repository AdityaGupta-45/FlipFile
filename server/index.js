// FlipFile conversion server. It runs the tools a browser cannot do on its own:
// LibreOffice (Word, Excel, PowerPoint to PDF, PDF to Word), qpdf (protect, unlock, repair)
// and ocrmypdf (make a scanned PDF searchable).
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

function findSoffice() {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  const windows = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  return windows.find((p) => existsSync(p)) || "soffice";
}
const SOFFICE = findSoffice();
const QPDF = process.env.QPDF_PATH || "qpdf";
const OCRMYPDF = process.env.OCRMYPDF_PATH || "ocrmypdf";
const PROFILE = pathToFileURL(path.join(os.tmpdir(), "flipfile-lo-profile")).href;

// An error with a message that is safe and useful to show to the visitor.
class UserError extends Error {}

// Some programs can only run one job at a time, so jobs wait in a line per program.
const queues = new Map();
const enqueue = (key, job) => {
  const p = (queues.get(key) || Promise.resolve()).then(() => job());
  queues.set(key, p.catch(() => {}));
  return p;
};

const libreOffice = (dir, input, target, extra = []) =>
  enqueue("libreoffice", () =>
    run(SOFFICE, ["--headless", "--norestore", `-env:UserInstallation=${PROFILE}`, ...extra, "--convert-to", target, "--outdir", dir, input], {
      timeout: 180000,
    })
  );

// qpdf exits with 3 when it finished but had warnings, which is fine.
async function qpdf(args) {
  try {
    await run(QPDF, args, { timeout: 120000 });
  } catch (e) {
    if (e.code === 3) return;
    throw e;
  }
}

const PDF = "application/pdf";
const toPdf = (exts) => ({
  exts,
  type: PDF,
  run: async ({ dir, input }) => {
    await libreOffice(dir, input, "pdf");
    return "input.pdf";
  },
});

const JOBS = {
  "word-to-pdf": toPdf([".docx", ".doc", ".odt", ".rtf"]),
  "excel-to-pdf": toPdf([".xlsx", ".xls", ".ods", ".csv"]),
  "powerpoint-to-pdf": toPdf([".pptx", ".ppt", ".odp"]),

  "pdf-to-word": {
    exts: [".pdf"],
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    run: async ({ dir, input }) => {
      await libreOffice(dir, input, "docx:MS Word 2007 XML", ["--infilter=writer_pdf_import"]);
      return "input.docx";
    },
  },

  "protect-pdf": {
    exts: [".pdf"],
    type: PDF,
    run: async ({ dir, input, fields }) => {
      const pw = String(fields.password || "");
      if (!pw) throw new UserError("Type a password first.");
      await qpdf(["--encrypt", pw, pw, "256", "--", input, path.join(dir, "output.pdf")]);
      return "output.pdf";
    },
  },

  "unlock-pdf": {
    exts: [".pdf"],
    type: PDF,
    run: async ({ dir, input, fields }) => {
      try {
        await qpdf([`--password=${String(fields.password || "")}`, "--decrypt", input, path.join(dir, "output.pdf")]);
      } catch (e) {
        if (/password/i.test(e.stderr || "")) throw new UserError("That password is not correct, or the PDF needs one.");
        throw e;
      }
      return "output.pdf";
    },
  },

  "repair-pdf": {
    exts: [".pdf"],
    type: PDF,
    run: async ({ dir, input }) => {
      try {
        await qpdf([input, path.join(dir, "output.pdf")]);
      } catch (e) {
        if (e.code === 2) throw new UserError("This PDF is too damaged to repair.");
        throw e;
      }
      return "output.pdf";
    },
  },

  "ocr-pdf": {
    exts: [".pdf"],
    type: PDF,
    run: async ({ dir, input, fields }) => {
      const lang = ["eng", "hin", "eng+hin"].includes(fields.lang) ? fields.lang : "eng";
      await enqueue("ocr", () =>
        run(OCRMYPDF, ["-l", lang, "--skip-text", "--output-type", "pdf", input, path.join(dir, "output.pdf")], { timeout: 600000 })
      );
      return "output.pdf";
    },
  },
};

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 50 * 1024 * 1024 } });

app.get("/api/health", (_req, res) => res.json({ ok: true, tools: Object.keys(JOBS) }));

app.post("/api/convert/:tool", upload.single("file"), async (req, res) => {
  const job = JOBS[req.params.tool];
  const dir = path.join(os.tmpdir(), `flipfile-${randomUUID()}`);
  try {
    if (!job) return res.status(404).json({ error: "Unknown tool." });
    if (!req.file) return res.status(400).json({ error: "No file was received." });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!job.exts.includes(ext)) {
      return res.status(400).json({ error: `This tool accepts ${job.exts.join(", ")} files.` });
    }
    await fs.mkdir(dir);
    const input = path.join(dir, `input${ext}`);
    await fs.rename(req.file.path, input);
    const outName = await job.run({ dir, input, fields: req.body || {} });
    const data = await fs.readFile(path.join(dir, outName));
    res.setHeader("Content-Type", job.type);
    res.send(data);
  } catch (e) {
    if (e instanceof UserError) {
      if (!res.headersSent) res.status(400).json({ error: e.message });
    } else {
      console.error(`${req.params.tool} failed:`, e.message);
      const message =
        e.code === "ENOENT"
          ? "A program this tool needs is not installed on the server."
          : "This file could not be processed. It may be damaged or password-protected.";
      if (!res.headersSent) res.status(500).json({ error: message });
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    if (req.file) await fs.rm(req.file.path, { force: true });
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
  const check = (name, cmd, args) =>
    run(cmd, args, { timeout: 30000 })
      .then(({ stdout }) => console.log(`${name}: found (${stdout.split("\n")[0].trim()})`))
      .catch(() => console.warn(`${name}: NOT found. The tools that need it will not work.`));
  check("LibreOffice", SOFFICE, ["--version"]);
  check("qpdf", QPDF, ["--version"]);
  check("ocrmypdf", OCRMYPDF, ["--version"]);
});