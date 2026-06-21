import type { Express } from "express";
import { type Server } from "http";

import { LANG_CODES, STATIC_PAGES, TOOL_SLUGS } from "../shared/tool-registry";

const BASE_URL = "https://pdfx.tools";

function buildHreflangLinks(path: string): string {
  const links = LANG_CODES.map(
    (lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}${path}?lang=${lang}"/>`
  ).join("\n");
  const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}"/>`;
  return links + "\n" + xdefault;
}

function buildSitemap(): string {
  const urls: string[] = [];

  for (const page of STATIC_PAGES) {
    urls.push(`  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${buildHreflangLinks(page.path)}
  </url>`);
  }

  for (const slug of TOOL_SLUGS) {
    const path = `/tools/${slug}`;
    urls.push(`  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
${buildHreflangLinks(path)}
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buildSitemap());
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(
`User-agent: *
Allow: /

# Disallow admin/API routes
Disallow: /api/

Sitemap: ${BASE_URL}/sitemap.xml

# Crawl-delay for polite bots
Crawl-delay: 1
`
    );
  });

  return httpServer;
}
