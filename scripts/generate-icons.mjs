import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, '../public');

const iconSvg = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a5f"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="110" fill="url(#bg)"/>
  <text x="256" y="310" font-family="system-ui" font-size="240" font-weight="800" fill="#fbbf24" text-anchor="middle">₽</text>
</svg>`;

const ogSvg = `
<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0f2440"/>
  <rect x="60" y="60" width="100" height="100" rx="22" fill="#1e3a5f"/>
  <text x="110" y="130" font-family="system-ui" font-size="50" font-weight="800" fill="#fbbf24" text-anchor="middle">₽</text>
  <text x="200" y="125" font-family="system-ui" font-size="40" font-weight="700" fill="white">prețuri<tspan fill="#fbbf24">servicii</tspan>.ro</text>
  <text x="60" y="350" font-family="system-ui" font-size="50" font-weight="700" fill="white">Cât costă serviciile</text>
  <text x="60" y="420" font-family="system-ui" font-size="50" font-weight="700" fill="#fbbf24">în orașul tău</text>
  <text x="60" y="520" font-family="system-ui" font-size="22" fill="#93c5fd">80 servicii · 22 orașe · Prețuri orientative actualizate</text>
</svg>`;

async function gen() {
  const i = Buffer.from(iconSvg), o = Buffer.from(ogSvg);
  await sharp(i).resize(32,32).png().toFile(resolve(pub,'favicon-32.png'));
  await sharp(i).resize(180,180).png().toFile(resolve(pub,'apple-touch-icon.png'));
  await sharp(i).resize(192,192).png().toFile(resolve(pub,'icon-192.png'));
  await sharp(i).resize(512,512).png().toFile(resolve(pub,'icon-512.png'));
  await sharp(o).resize(1200,630).png().toFile(resolve(pub,'og-default.png'));
  console.log('Done!');
}
gen();
