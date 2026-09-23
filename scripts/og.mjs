// Renders public/og-image.png (1200x630). Run once with `node scripts/og.mjs` and commit the PNG.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#06140d"/>
      <stop offset="0.5" stop-color="#0b2418"/>
      <stop offset="1" stop-color="#040d08"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#34d399" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="300" cy="260" r="260" fill="url(#glow)"/>

  <g transform="translate(150 70)" fill="none" stroke="#34d399">
    <rect x="148" y="250" width="24" height="170" rx="4" fill="#34d399" fill-opacity="0.12" stroke-opacity="0.4" stroke-width="2"/>
    <line x1="120" y1="250" x2="148" y2="295" stroke-opacity="0.3" stroke-width="3"/>
    <line x1="200" y1="250" x2="172" y2="295" stroke-opacity="0.3" stroke-width="3"/>
    <rect x="30" y="40" width="260" height="210" rx="8" fill="#34d399" fill-opacity="0.05" stroke-opacity="0.5" stroke-width="3"/>
    <rect x="42" y="52" width="236" height="186" rx="4" fill="#06301c" fill-opacity="0.8" stroke-opacity="0.3" stroke-width="2"/>
    <rect x="70" y="100" width="180" height="10" rx="5" fill="#a7f3d0" fill-opacity="0.35" stroke="none"/>
    <rect x="70" y="124" width="130" height="10" rx="5" fill="#a7f3d0" fill-opacity="0.2" stroke="none"/>
    <rect x="70" y="156" width="96" height="28" rx="14" fill="#34d399" fill-opacity="0.25" stroke-opacity="0.5" stroke-width="2"/>
    <circle cx="100" cy="36" r="7" fill="#a7f3d0" stroke="none"/>
    <circle cx="160" cy="36" r="7" fill="#a7f3d0" stroke="none"/>
    <circle cx="220" cy="36" r="7" fill="#a7f3d0" stroke="none"/>
  </g>

  <g font-family="Montserrat, Helvetica, Arial, sans-serif">
    <text x="590" y="270" font-size="88" font-weight="800" fill="#ffffff">Політорг<tspan fill="#34d399">-ІВ</tspan></text>
    <text x="594" y="330" font-size="34" font-weight="600" fill="#ffffff" fill-opacity="0.6">Зовнішня реклама на Прикарпатті</text>
    <rect x="594" y="365" width="80" height="4" rx="2" fill="#34d399"/>
    <text x="594" y="425" font-size="28" font-weight="600" fill="#a7f3d0">Карта білбордів 3×6 та 12×5</text>
    <text x="594" y="470" font-size="26" font-weight="500" fill="#ffffff" fill-opacity="0.45">+38 (095) 132-74-15</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log('Wrote', out);
