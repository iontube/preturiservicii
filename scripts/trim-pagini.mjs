#!/usr/bin/env node
/**
 * Trim service pages from 11 to 3 per service/city:
 * 1. City main page (slug === orasSlug)
 * 2. "Ce include" merged with "Costuri ascunse"
 * 3. "Cum compari" merged with "Cum negociezi" + "Merită ieftin"
 *
 * Deletes: de-ce-variaza, cand-e-cel-mai-ieftin, ce-factori, pret-pe-ora, cat-costa-manopera
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');

const files = readdirSync(dataDir).filter(f => f.startsWith('pagini-') && f.endsWith('.json'));
console.log(`Processing ${files.length} pagini files...`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const filePath = join(dataDir, file);
  const pagini = JSON.parse(readFileSync(filePath, 'utf-8'));
  totalBefore += pagini.length;

  // Group by city
  const byCity = {};
  for (const p of pagini) {
    const city = p.orasSlug;
    if (!byCity[city]) byCity[city] = {};

    if (p.slug === city) {
      byCity[city].main = p;
    } else if (p.slug.startsWith('ce-include-pretul')) {
      byCity[city].ceInclude = p;
    } else if (p.slug.startsWith('ce-costuri-ascunse')) {
      byCity[city].costuriAscunse = p;
    } else if (p.slug.startsWith('cum-compari-oferte')) {
      byCity[city].cumCompari = p;
    } else if (p.slug.startsWith('cum-negociezi-pretul')) {
      byCity[city].cumNegociezi = p;
    } else if (p.slug.startsWith('merita-sa-alegi')) {
      byCity[city].merita = p;
    }
    // Everything else is deleted (de-ce-variaza, cand-e-cel-mai-ieftin, ce-factori, pret-pe-ora, cat-costa-manopera)
  }

  const trimmed = [];

  for (const [city, pages] of Object.entries(byCity)) {
    // 1. Keep city main page
    if (pages.main) {
      trimmed.push(pages.main);
    }

    // 2. Merge ce-include + costuri-ascunse
    if (pages.ceInclude) {
      const merged = { ...pages.ceInclude };
      if (pages.costuriAscunse) {
        // Append costuri ascunse sections
        merged.sectiuni = [
          ...(merged.sectiuni || []),
          ...(pages.costuriAscunse.sectiuni || []),
        ];
        // Update title to include both topics
        if (merged.titlu && !merged.titlu.includes('costuri')) {
          merged.titlu = merged.titlu.replace('Ce include prețul', 'Ce include prețul și ce costuri ascunse apar');
        }
      }
      trimmed.push(merged);
    }

    // 3. Merge cum-compari + cum-negociezi + merita
    if (pages.cumCompari) {
      const merged = { ...pages.cumCompari };
      const extraSections = [];
      if (pages.cumNegociezi) {
        extraSections.push(...(pages.cumNegociezi.sectiuni || []));
      }
      if (pages.merita) {
        extraSections.push(...(pages.merita.sectiuni || []));
      }
      if (extraSections.length > 0) {
        merged.sectiuni = [
          ...(merged.sectiuni || []),
          ...extraSections,
        ];
        if (merged.titlu && !merged.titlu.includes('negoci')) {
          merged.titlu = merged.titlu.replace('Cum compari oferte', 'Cum compari oferte și negociezi prețul');
        }
      }
      trimmed.push(merged);
    }
  }

  writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  totalAfter += trimmed.length;
}

// Rebuild all-pagini.json
const allPagini = [];
for (const file of files) {
  const pagini = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
  allPagini.push(...pagini);
}
writeFileSync(join(dataDir, 'all-pagini.json'), JSON.stringify(allPagini, null, 2), 'utf-8');

console.log(`\nBefore: ${totalBefore} pages`);
console.log(`After: ${totalAfter} pages`);
console.log(`Removed: ${totalBefore - totalAfter} pages`);
console.log(`all-pagini.json rebuilt with ${allPagini.length} entries`);
