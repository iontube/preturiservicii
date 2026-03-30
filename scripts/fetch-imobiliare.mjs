#!/usr/bin/env node
/**
 * Fetch real estate prices from storia.ro for all cities.
 * Extracts totalPrice and areaInSquareMeters from listing data.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Map our city slugs to storia.ro URL slugs
const orase = [
  { slug: 'bucuresti', storia: 'bucuresti', nume: 'București' },
  { slug: 'cluj-napoca', storia: 'cluj-napoca', nume: 'Cluj-Napoca' },
  { slug: 'timisoara', storia: 'timisoara', nume: 'Timișoara' },
  { slug: 'iasi', storia: 'iasi', nume: 'Iași' },
  { slug: 'constanta', storia: 'constanta', nume: 'Constanța' },
  { slug: 'brasov', storia: 'brasov', nume: 'Brașov' },
  { slug: 'craiova', storia: 'craiova', nume: 'Craiova' },
  { slug: 'galati', storia: 'galati', nume: 'Galați' },
  { slug: 'ploiesti', storia: 'ploiesti', nume: 'Ploiești' },
  { slug: 'oradea', storia: 'oradea', nume: 'Oradea' },
  { slug: 'arad', storia: 'arad', nume: 'Arad' },
  { slug: 'sibiu', storia: 'sibiu', nume: 'Sibiu' },
  { slug: 'pitesti', storia: 'pitesti', nume: 'Pitești' },
  { slug: 'bacau', storia: 'bacau', nume: 'Bacău' },
  { slug: 'targu-mures', storia: 'targu-mures', nume: 'Târgu Mureș' },
  { slug: 'baia-mare', storia: 'baia-mare', nume: 'Baia Mare' },
  { slug: 'buzau', storia: 'buzau', nume: 'Buzău' },
  { slug: 'suceava', storia: 'suceava', nume: 'Suceava' },
  { slug: 'botosani', storia: 'botosani', nume: 'Botoșani' },
  { slug: 'satu-mare', storia: 'satu-mare', nume: 'Satu Mare' },
  { slug: 'alba-iulia', storia: 'alba-iulia', nume: 'Alba Iulia' },
  { slug: 'deva', storia: 'deva', nume: 'Deva' },
];

const tipuri = [
  { slug: 'apartament', storia: 'apartament', nume: 'Apartament' },
  { slug: 'casa', storia: 'casa', nume: 'Casă' },
  { slug: 'teren', storia: 'teren', nume: 'Teren' },
];

const tranzactii = [
  { slug: 'vanzare', storia: 'vanzare', nume: 'Vânzare' },
  { slug: 'inchiriere', storia: 'inchiriere', nume: 'Închiriere' },
];

async function fetchPrices(oras, tip, tranzactie) {
  const url = `https://www.storia.ro/ro/rezultate/${tranzactie.storia}/${tip.storia}/${oras.storia}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
    });

    if (!res.ok) {
      console.log(`  ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();

    // Extract all totalPrice values and areas
    const prices = [];
    const priceMatches = [...html.matchAll(/"totalPrice":\{"value":(\d+),"currency":"(\w+)"/g)];
    const areaMatches = [...html.matchAll(/"areaInSquareMeters":(\d+(?:\.\d+)?)/g)];

    for (let i = 0; i < Math.min(priceMatches.length, areaMatches.length); i++) {
      const price = parseInt(priceMatches[i][1]);
      const currency = priceMatches[i][2];
      const area = parseFloat(areaMatches[i][1]);

      if (area > 0 && price > 0) {
        const priceEur = currency === 'EUR' ? price : Math.round(price / 5); // rough RON->EUR
        const pricePerMp = Math.round(priceEur / area);
        prices.push({ price: priceEur, area, pricePerMp });
      }
    }

    if (prices.length === 0) return null;

    // Calculate median price per sqm (more robust than average)
    const perMpValues = prices.map(p => p.pricePerMp).sort((a, b) => a - b);
    const median = perMpValues[Math.floor(perMpValues.length / 2)];
    const avg = Math.round(perMpValues.reduce((a, b) => a + b, 0) / perMpValues.length);
    const min = perMpValues[Math.floor(perMpValues.length * 0.25)]; // Q1
    const max = perMpValues[Math.floor(perMpValues.length * 0.75)]; // Q3

    return { median, avg, min, max, count: prices.length };
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

async function run() {
  const results = {};

  for (const oras of orase) {
    results[oras.slug] = { nume: oras.nume, preturi: {} };

    for (const tranzactie of tranzactii) {
      for (const tip of tipuri) {
        // Skip teren+inchiriere (not common)
        if (tip.slug === 'teren' && tranzactie.slug === 'inchiriere') continue;

        const key = `${tranzactie.slug}-${tip.slug}`;
        console.log(`${oras.nume} - ${tranzactie.nume} ${tip.nume}...`);

        const data = await fetchPrices(oras, tip, tranzactie);
        if (data) {
          results[oras.slug].preturi[key] = data;
          console.log(`  → ${data.median} EUR/mp (${data.count} anunțuri)`);
        } else {
          console.log(`  → no data`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  const outputPath = join(__dirname, '..', 'src', 'data', 'imobiliare.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nSaved to ${outputPath}`);
  console.log(`Cities with data: ${Object.keys(results).filter(k => Object.keys(results[k].preturi).length > 0).length}`);
}

run();
