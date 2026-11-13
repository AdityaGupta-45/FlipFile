// Everything Google and social sites read about each page lives here.
// When you buy your own domain, change SITE_URL and nothing else.
export const SITE_URL = "https://tryflipfile.vercel.app";
export const SITE_NAME = "FlipFile";

export const HOME_TITLE = "FlipFile | Free online PDF, image and file converter";
export const HOME_DESC =
  "Merge, split, compress, sign and convert PDFs, images, audio and Word files for free. No sign-up needed, and most tools run on your device.";

export const PAGE_SEO = {
  privacy: { title: "Privacy Policy | FlipFile", description: "How FlipFile handles your files. Most tools run in your browser, so your files are never uploaded." },
  terms: { title: "Terms of Service | FlipFile", description: "The terms for using FlipFile's free file conversion tools." },
  docs: { title: "Docs | FlipFile", description: "How to use FlipFile's tools to merge, split, compress, sign and convert files, step by step." },
  changelog: { title: "Changelog | FlipFile", description: "What is new in FlipFile: the latest tools and improvements." },
  about: { title: "About | FlipFile", description: "FlipFile is a free set of file conversion tools: every common PDF, image and document operation in one place." },
  contact: { title: "Contact | FlipFile", description: "Send a message to FlipFile, report a bug or suggest a new tool." },
};

export function toolSeo(tool) {
  const onDevice = !tool.server && !tool.ai; // server tools send the file to our server, AI tools send its text to an AI provider
  return {
    title: `${tool.name} Online Free | FlipFile`,
    description: `${tool.desc} Free online, no sign-up needed.${onDevice ? " Your files stay on your device." : ""}${tool.ai ? " Works with your own AI key." : ""}`,
  };
}

export const canonicalUrl = (path) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path.replace(/\/+$/, "")}`);

function setTag(selector, tag, attrs, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute(tag === "link" ? "href" : "content", value);
}

// Keeps the tab title and the meta tags right while people move between pages.
export function setMeta({ title, description = HOME_DESC, path = "/" }) {
  document.title = title;
  const url = canonicalUrl(path);
  setTag('meta[name="description"]', "meta", { name: "description" }, description);
  setTag('link[rel="canonical"]', "link", { rel: "canonical" }, url);
  setTag('meta[property="og:title"]', "meta", { property: "og:title" }, title);
  setTag('meta[property="og:description"]', "meta", { property: "og:description" }, description);
  setTag('meta[property="og:url"]', "meta", { property: "og:url" }, url);
  setTag('meta[name="twitter:title"]', "meta", { name: "twitter:title" }, title);
  setTag('meta[name="twitter:description"]', "meta", { name: "twitter:description" }, description);
}