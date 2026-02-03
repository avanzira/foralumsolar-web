#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const companyJson = path.join(root, "assets", "config", "es.company.json");
const sitemapXml = path.join(root, "sitemap.xml");

const fallbackUrl = "https://foralumsolar.es/";

const loadCanonicalUrl = () => {
  if (!fs.existsSync(companyJson)) return fallbackUrl;
  try {
    const raw = fs.readFileSync(companyJson, "utf-8");
    const data = JSON.parse(raw);
    let url =
      data?.computed?.canonical_url ||
      data?.meta?.canonical_url ||
      fallbackUrl;
    if (!url.endsWith("/")) url += "/";
    return url;
  } catch (err) {
    return fallbackUrl;
  }
};

const buildSitemap = (homeUrl) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${homeUrl}</loc>
    <priority>1.00</priority>
  </url>

</urlset>
`;

const main = () => {
  const homeUrl = loadCanonicalUrl();
  const xml = buildSitemap(homeUrl);
  fs.writeFileSync(sitemapXml, xml, "utf-8");
  console.log(`Sitemap updated: ${sitemapXml}`);
};

main();
