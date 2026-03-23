/**
 * Generates sitemap-index.xml with N sitemaps based on the day number.
 *
 * Usage:
 *   node scripts/drip-sitemap-index.mjs           # auto-calculate day
 *   node scripts/drip-sitemap-index.mjs 5          # force day 5
 *   node scripts/drip-sitemap-index.mjs all        # include all
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const SITE_URL = 'https://preturiservicii.ro';

const START_DATE = '2026-03-22';

const metaPath = resolve(distDir, 'sitemaps/meta.json');
if (!existsSync(metaPath)) {
  console.error('sitemaps/meta.json not found. Run split-sitemaps.mjs first.');
  process.exit(1);
}
const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

const arg = process.argv[2];
let count;

if (arg === 'all') {
  count = meta.totalSitemaps;
} else if (arg && !isNaN(Number(arg))) {
  count = Math.min(Number(arg), meta.totalSitemaps);
} else {
  const start = new Date(START_DATE);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  count = Math.min(daysSinceStart, meta.totalSitemaps);
}

count = Math.max(1, count);

console.log(`Including ${count}/${meta.totalSitemaps} sitemaps (${count * meta.urlsPerSitemap} URLs max)`);

const lastmod = meta.generatedAt;
const entries = [];
for (let i = 1; i <= count; i++) {
  const num = String(i).padStart(3, '0');
  entries.push(`<sitemap><loc>${SITE_URL}/sitemaps/sitemap-${num}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`);
}

const indexXml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</sitemapindex>`;

writeFileSync(resolve(distDir, 'sitemap-index.xml'), indexXml);
console.log(`sitemap-index.xml updated with ${count} sitemaps`);
