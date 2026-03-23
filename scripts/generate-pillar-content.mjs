#!/usr/bin/env node
/**
 * Generate unique pillar page content for each service using DeepSeek.
 * Creates 3 specific paragraphs per service for the /[serviciu]/ index page.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from '../../shared-deepseek.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const servicii = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'servicii.json'), 'utf-8'));
const outputPath = join(__dirname, '..', 'src', 'data', 'pillar-content.json');

// Load existing content if any
let existing = {};
try {
  existing = JSON.parse(readFileSync(outputPath, 'utf-8'));
} catch {}

const SYSTEM_PROMPT = `Ești un expert în servicii și prețuri din România. Scrii conținut informativ pentru un site de prețuri servicii.

REGULI STRICTE:
- Scrie DOAR în română, natural, ca un jurnalist economic pragmatic
- ZERO clișee AI: nu folosi "este important de menționat", "în concluzie", "trebuie subliniat", "de asemenea", "în primul rând"
- Fii CONCRET și SPECIFIC pentru serviciul cerut - nu text generic care s-ar aplica oricărui serviciu
- Fiecare paragraf: 2-3 propoziții, dense în informație
- Include cifre concrete, exemple practice, detalii tehnice specifice serviciului
- Nu repeta informații între paragrafe

Răspunde STRICT în JSON cu formatul:
{
  "ce_influenteaza": "paragraf despre factorii specifici care influențează prețul ACESTUI serviciu",
  "ce_include": "paragraf despre ce include și ce NU include prețul la ACEST serviciu",
  "sfaturi": "paragraf cu sfaturi practice specifice pentru cine caută ACEST serviciu"
}`;

const CONCURRENCY = 10;
let done = 0;

async function generateForService(serviciu) {
  if (existing[serviciu.slug]) {
    done++;
    console.log(`[${done}/${servicii.length}] ${serviciu.slug} - skip (exists)`);
    return;
  }

  const userPrompt = `Serviciu: ${serviciu.nume}
Categorie: ${serviciu.categorie}
Preț: ${serviciu.pretMin}-${serviciu.pretMax} ${serviciu.unitate}

Scrie 3 paragrafe UNICE și SPECIFICE pentru acest serviciu. Fiecare paragraf trebuie să conțină informații care se aplică DOAR la "${serviciu.nume}", nu la servicii în general.`;

  try {
    const result = await callLLM(SYSTEM_PROMPT, userPrompt);
    existing[serviciu.slug] = result;
    done++;
    console.log(`[${done}/${servicii.length}] ${serviciu.slug} - OK`);

    // Save after each to not lose progress
    if (done % 5 === 0) {
      writeFileSync(outputPath, JSON.stringify(existing, null, 2), 'utf-8');
    }
  } catch (err) {
    done++;
    console.error(`[${done}/${servicii.length}] ${serviciu.slug} - ERROR: ${err.message}`);
  }
}

async function run() {
  console.log(`Generating pillar content for ${servicii.length} services...`);
  console.log(`Already have: ${Object.keys(existing).length}`);

  // Process in batches
  for (let i = 0; i < servicii.length; i += CONCURRENCY) {
    const batch = servicii.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(s => generateForService(s)));
  }

  writeFileSync(outputPath, JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`\nDone! ${Object.keys(existing).length} services with pillar content.`);
}

run();
