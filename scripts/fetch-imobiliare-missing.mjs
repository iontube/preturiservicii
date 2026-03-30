#!/usr/bin/env node
/**
 * Fetch missing city prices from imobiliare.ro
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const dataPath = join(__dirname, '..', 'src', 'data', 'imobiliare.json');
const existing = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Cities missing from storia.ro - use imobiliare.ro slugs
const missing = [
  { slug: 'cluj-napoca', imo: 'cluj-napoca', nume: 'Cluj-Napoca' },
  { slug: 'timisoara', imo: 'timisoara', nume: 'Timișoara' },
  { slug: 'craiova', imo: 'craiova', nume: 'Craiova' },
  { slug: 'ploiesti', imo: 'ploiesti', nume: 'Ploiești' },
  { slug: 'oradea', imo: 'oradea', nume: 'Oradea' },
  { slug: 'pitesti', imo: 'pitesti', nume: 'Pitești' },
  { slug: 'targu-mures', imo: 'targu-mures', nume: 'Târgu Mureș' },
  { slug: 'baia-mare', imo: 'baia-mare', nume: 'Baia Mare' },
  { slug: 'alba-iulia', imo: 'alba-iulia', nume: 'Alba Iulia' },
  { slug: 'deva', imo: 'deva', nume: 'Deva' },
];

const tipuri = [
  { key: 'vanzare-apartament', path: 'vanzare-apartamente' },
  { key: 'vanzare-casa', path: 'vanzare-case-vile' },
  { key: 'vanzare-teren', path: 'vanzare-terenuri' },
  { key: 'inchiriere-apartament', path: 'inchirieri-apartamente' },
  { key: 'inchiriere-casa', path: 'inchirieri-case-vile' },
];

async function fetchFromImobiliare(oras, tip) {
  const url = `https://www.imobiliare.ro/${tip.path}/${oras.imo}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) {
      console.log(`  ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();

    // Extract price and surface data
    const prices = [...html.matchAll(/"price":(\d+)/g)].map(m => parseInt(m[1]));

    // Try to find surface data
    const surfaces = [...html.matchAll(/"surface":(\d+)/g)].map(m => parseInt(m[1]));

    if (prices.length === 0) return null;

    // If we have surfaces, calculate price per sqm
    if (surfaces.length > 0 && surfaces.length === prices.length) {
      const perMp = [];
      for (let i = 0; i < prices.length; i++) {
        if (surfaces[i] > 10 && surfaces[i] < 500 && prices[i] > 1000) {
          perMp.push(Math.round(prices[i] / surfaces[i]));
        }
      }
      if (perMp.length > 0) {
        perMp.sort((a, b) => a - b);
        return {
          median: perMp[Math.floor(perMp.length / 2)],
          avg: Math.round(perMp.reduce((a, b) => a + b, 0) / perMp.length),
          min: perMp[Math.floor(perMp.length * 0.25)],
          max: perMp[Math.floor(perMp.length * 0.75)],
          count: perMp.length,
        };
      }
    }

    // Fallback: estimate from prices alone using typical sizes
    // Deduplicate (imobiliare.ro lists prices twice in HTML)
    const uniquePrices = [...new Set(prices)].filter(p => p > 5000 && p < 2000000);
    if (uniquePrices.length === 0) return null;

    // For apartments: assume avg 60mp, for houses 120mp, for rent: just report monthly
    const isRent = tip.key.startsWith('inchiriere');
    const isTeren = tip.key.includes('teren');

    if (isRent) {
      uniquePrices.sort((a, b) => a - b);
      // Rent prices are monthly in EUR, divide by ~55mp avg
      const perMp = uniquePrices.map(p => Math.round(p / 55));
      return {
        median: perMp[Math.floor(perMp.length / 2)],
        avg: Math.round(perMp.reduce((a, b) => a + b, 0) / perMp.length),
        min: perMp[Math.floor(perMp.length * 0.25)],
        max: perMp[Math.floor(perMp.length * 0.75)],
        count: perMp.length,
      };
    }

    // For sale: estimate per mp
    const avgSize = isTeren ? 500 : tip.key.includes('casa') ? 120 : 60;
    const perMp = uniquePrices.map(p => Math.round(p / avgSize));
    perMp.sort((a, b) => a - b);
    return {
      median: perMp[Math.floor(perMp.length / 2)],
      avg: Math.round(perMp.reduce((a, b) => a + b, 0) / perMp.length),
      min: perMp[Math.floor(perMp.length * 0.25)],
      max: perMp[Math.floor(perMp.length * 0.75)],
      count: perMp.length,
    };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

async function run() {
  for (const oras of missing) {
    if (!existing[oras.slug]) {
      existing[oras.slug] = { nume: oras.nume, preturi: {} };
    }

    for (const tip of tipuri) {
      if (existing[oras.slug].preturi[tip.key]) continue;

      console.log(`${oras.nume} - ${tip.key}...`);
      const data = await fetchFromImobiliare(oras, tip);
      if (data) {
        existing[oras.slug].preturi[tip.key] = data;
        console.log(`  → ${data.median} EUR/mp (${data.count} anunțuri)`);
      } else {
        console.log(`  → no data`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  writeFileSync(dataPath, JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`\nSaved. Cities with data: ${Object.keys(existing).filter(k => Object.keys(existing[k].preturi).length > 0).length}/22`);
}

run();
