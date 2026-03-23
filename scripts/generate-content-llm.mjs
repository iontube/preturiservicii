/**
 * Generates content for preturiservicii.ro using Gemini 2.5 Flash.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');
// Using Vertex AI via shared helper

import { callGemini } from '/Users/luc/Directoare/shared-gemini.mjs';
const BATCH_SIZE = 5;
const CONCURRENCY = 3;
const SAVE_EVERY = 100;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildPrompt(batch) {
  const questions = batch.map((q, i) => `${i + 1}. "${q.titlu}" (${q.serviciu}, ${q.oras})`).join('\n');
  return `Ești un expert în prețuri și costuri de servicii din România. Scrii articole informative pentru un site care ajută oamenii să înțeleagă prețurile serviciilor.

REGULI:
- Prima propoziție RĂSPUNDE DIRECT la întrebare. Fără ocolișuri.
- Scrie ca un om real. ZERO fraze: "este important", "în concluzie", "haideți să", "merită menționat".
- Informații practice, specifice orașului menționat unde e posibil.
- Include range-uri de preț concrete, factori care influențează costul, cum compari oferte.
- 200-350 cuvinte per articol. Română naturală.
- Fiecare articol COMPLET DIFERIT.

Scrie articole pentru:
${questions}

JSON array strict:
[{"intro":"2-3 prop, prima = răspuns direct","sectiuni":[{"titlu":"...","tip":"lista","items":[{"titlu":"...","text":"..."}]}],"concluzie":"sfat concret"}]

Tip: "lista" sau "pasi". 2-3 secțiuni, 3-5 items.`;
}

function getProgressFile(slug) { return resolve(dataDir, `progress-${slug}.json`); }
function loadProgress(slug) {
  const f = getProgressFile(slug);
  return existsSync(f) ? new Set(JSON.parse(readFileSync(f, 'utf-8'))) : new Set();
}
function saveProgress(slug, done) { writeFileSync(getProgressFile(slug), JSON.stringify([...done])); }

async function processFile(filename) {
  const slug = filename.replace('pagini-', '').replace('.json', '');
  const file = resolve(dataDir, filename);
  const pagini = JSON.parse(readFileSync(file, 'utf-8'));
  const doneSlugs = loadProgress(slug);
  const servicii = JSON.parse(readFileSync(resolve(dataDir, 'servicii.json'), 'utf-8'));

  // Skip already done
  const hasContent = (q) => q.intro && q.intro.length > 60 && !q.intro.includes('Placeholder');
  pagini.forEach(q => { if (hasContent(q)) doneSlugs.add(q.slug); });

  const slugToIdx = new Map();
  pagini.forEach((p, i) => slugToIdx.set(p.slug, i));
  const todo = pagini.filter(p => !doneSlugs.has(p.slug));

  console.log(`\n${slug}: ${todo.length} de procesat (${doneSlugs.size} deja)`);
  if (todo.length === 0) return;

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));

  let lastSave = doneSlugs.size;
  const start = Date.now();

  async function processBatch(batch) {
    const batchData = batch.map(p => {
      const serv = servicii.find(s => s.slug === p.serviciuSlug);
      return { titlu: p.titlu, serviciu: serv?.nume || p.serviciuSlug, oras: p.orasNume };
    });
    const result = await callGemini(buildPrompt(batchData));
    if (result && Array.isArray(result)) {
      for (let j = 0; j < Math.min(result.length, batch.length); j++) {
        const content = result[j];
        if (content?.intro && content?.sectiuni) {
          const idx = slugToIdx.get(batch[j].slug);
          if (idx !== undefined) {
            pagini[idx].intro = content.intro;
            pagini[idx].sectiuni = content.sectiuni;
            pagini[idx].concluzie = content.concluzie || pagini[idx].concluzie;
            pagini[idx].metaDescription = content.intro.substring(0, 155).replace(/\.\s*$/, '') + '.';
          }
          doneSlugs.add(batch[j].slug);
        }
      }
    }
  }

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(b => processBatch(b)));

    const done = doneSlugs.size;
    const total = pagini.length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const rate = ((done - (total - todo.length)) / Math.max(1, elapsed)).toFixed(1);
    process.stdout.write(`\r  ${slug}: ${done}/${total} (${((done/total)*100).toFixed(1)}%) | ${elapsed}s | ~${rate} art/s    `);

    if (done - lastSave >= SAVE_EVERY) {
      saveProgress(slug, doneSlugs);
      writeFileSync(file, JSON.stringify(pagini, null, 2));
      lastSave = done;
    }
  }

  saveProgress(slug, doneSlugs);
  writeFileSync(file, JSON.stringify(pagini, null, 2));
  console.log(`\n  ${slug}: DONE - ${doneSlugs.size}/${pagini.length}`);
}

async function main() {
  console.log('=== Generare conținut preturiservicii.ro ===');
  const files = readdirSync(dataDir).filter(f => f.startsWith('pagini-') && f.endsWith('.json'));
  for (const f of files) await processFile(f);
  // Cleanup
  readdirSync(dataDir).filter(f => f.startsWith('progress-')).forEach(f => {
    try { unlinkSync(resolve(dataDir, f)); } catch {}
  });
  console.log('\n=== DONE ===');
}

main().catch(console.error);
