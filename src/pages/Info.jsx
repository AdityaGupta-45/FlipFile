import { Link } from "react-router-dom";
import { usePageTitle } from "../components/ui.jsx";
import { PAGE_SEO } from "../lib/seo.js";

const pages = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "Most FlipFile tools run directly in your browser. For those tools, your files are never uploaded anywhere.",
      "Word to PDF is the exception. That file is sent to our conversion server, converted with LibreOffice, and deleted as soon as the PDF is sent back to you.",
      "We do not read, keep or share the files you convert.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "FlipFile is free to use and is provided as is, without any warranty. Keep a copy of your original file before you convert it.",
      "You are responsible for the files you convert. Only use files you have the right to use.",
    ],
  },
  docs: {
    title: "Docs",
    body: [
      "Pick a tool from the home page, add your file, change any options, and click the action button. A progress bar shows how far the conversion has got.",
      "Merge PDF and JPG to PDF let you reorder files with the Up and Down buttons before you convert.",
      "Compress PDF has two modes. Light keeps your text selectable. Strong turns pages into images, which makes the file much smaller.",
      "Word to PDF needs the conversion server to be running. Everything else works without it.",
    ],
  },
  changelog: {
    title: "Changelog",
    body: [
      "Version 0.1: Merge PDF, Split PDF, Compress PDF, PDF to JPG, JPG to PDF, PNG to JPG, Compress image, MP4 to MP3 and Word to PDF. Every conversion shows a progress bar.",
    ],
  },
  about: {
    title: "About",
    body: [
      "FlipFile is a set of free file conversion tools built by Adityaa. The goal is simple: every common file operation in one place, fast, and private by default.",
    ],
  },
};

export default function Info({ page }) {
  const p = pages[page];
  usePageTitle(PAGE_SEO[page].title, PAGE_SEO[page].description);
  return (
    <section className="mx-auto max-w-2xl py-12">
      <Link to="/" className="text-sm text-[var(--muted)]">Back to all tools</Link>
      <h1 className="display mt-3 text-4xl font-extrabold">{p.title}</h1>
      {p.body.map((text) => (
        <p key={text} className="mt-4 leading-relaxed text-[var(--muted)]">{text}</p>
      ))}
    </section>
  );
}