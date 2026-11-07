// Runs after `vite build`. Gives every page its own real HTML file with the right title,
// description and share tags, so Google and WhatsApp/LinkedIn previews see them
// without running any JavaScript. Also writes sitemap.xml and robots.txt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tools } from "../src/tools.js";
import { HOME_DESC, HOME_TITLE, PAGE_SEO, SITE_NAME, SITE_URL, canonicalUrl, toolSeo } from "../src/lib/seo.js";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const websiteLd = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/` };
const toolLd = (t, url, description) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: t.name,
  url,
  description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
});

function render({ route, canonical = route, title, description, heading, jsonLd }) {
  const url = canonicalUrl(canonical);
  const image = `${SITE_URL}/social-preview.png`;
  let html = template;
  const meta = (attr, name, value) => {
    html = html.replace(new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`), (_, a, b) => a + esc(value) + b);
  };
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => a + url + b);
  meta("name", "description", description);
  meta("property", "og:title", title);
  meta("property", "og:description", description);
  meta("property", "og:url", url);
  meta("property", "og:image", image);
  meta("name", "twitter:title", title);
  meta("name", "twitter:description", description);
  meta("name", "twitter:image", image);
  html = html.replace(
    /<script type="application\/ld\+json" id="ld-json">[\s\S]*?<\/script>/,
    () => `<script type="application/ld+json" id="ld-json">${json(jsonLd)}</script>`
  );
  const links = tools.map((t) => `<li><a href="/${t.id}">${esc(t.name)}</a></li>`).join("");
  html = html.replace(
    '<div id="root"></div>',
    () => `<div id="root"></div>\n    <noscript><h1>${esc(heading)}</h1><p>${esc(description)}</p><ul>${links}</ul></noscript>`
  );
  return html;
}

const pages = [
  { route: "/", title: HOME_TITLE, description: HOME_DESC, heading: "FlipFile: free file converter", jsonLd: websiteLd },
  { route: "/tools", canonical: "/", title: "All tools | FlipFile", description: HOME_DESC, heading: "All FlipFile tools", jsonLd: websiteLd },
  ...Object.entries(PAGE_SEO).map(([key, s]) => ({ route: `/${key}`, ...s, heading: s.title.split(" | ")[0], jsonLd: websiteLd })),
  ...tools.map((t) => {
    const seo = toolSeo(t);
    return { route: `/${t.id}`, ...seo, heading: t.name, jsonLd: toolLd(t, canonicalUrl(`/${t.id}`), seo.description) };
  }),
];

for (const page of pages) {
  const html = render(page);
  if (page.route === "/") {
    fs.writeFileSync(path.join(dist, "index.html"), html);
  } else {
    const dir = path.join(dist, page.route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
  }
}

const today = new Date().toISOString().slice(0, 10);
const listed = pages.filter((p) => p.canonical === undefined);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  listed.map((p) => `  <url><loc>${canonicalUrl(p.route)}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Prerendered ${pages.length} pages, sitemap with ${listed.length} URLs.`);