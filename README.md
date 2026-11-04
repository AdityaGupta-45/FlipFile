<p align="center">
  <img src="docs/logo.svg" alt="FlipFile logo" width="96" />
</p>

<h1 align="center">FlipFile</h1>

<p align="center">Flip any file into what you need. Free file conversion tools that run in your browser.</p>

## Tools

| Tool | What it does |
| --- | --- |
| Merge PDF | Combine several PDFs into one file |
| Split PDF | Pull pages out into separate files |
| Compress PDF | Make a PDF smaller to share |
| PDF to JPG | Turn every page into an image |
| JPG to PDF | Put images into one PDF |
| PNG to JPG | Convert PNG images to JPG |
| Compress image | Shrink image size, keep quality |
| MP4 to MP3 | Extract the audio from a video |
| Word to PDF | Convert a DOCX file to PDF, layout kept (uses LibreOffice) |

Every conversion shows a live progress bar. Except for Word to PDF, files never leave your device.

## Built with

React, Vite, Tailwind CSS, pdf-lib, pdf.js, JSZip, and a small Express server that runs LibreOffice for Word to PDF.

## Run it locally

1. Install [Node.js](https://nodejs.org) (LTS) and [LibreOffice](https://www.libreoffice.org) (only needed for Word to PDF).
2. Install the packages:
   ```bash
   npm install
   ```
3. Start the conversion server in one terminal:
   ```bash
   npm run server
   ```
4. Start the website in a second terminal:
   ```bash
   npm run dev
   ```
5. Open http://localhost:5173

## Contact form

The contact form uses [Web3Forms](https://web3forms.com). Put your own access key in `src/pages/Contact.jsx` (the `ACCESS_KEY` line).

Made with Adityaa © 2026