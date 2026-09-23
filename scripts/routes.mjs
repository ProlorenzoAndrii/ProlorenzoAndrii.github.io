// Builds src/data/routes.json (Н-09 and Т-09-06 near the billboards) from OpenStreetMap.
// Run with `node scripts/routes.mjs`, or `node scripts/routes.mjs saved-response.json` when
// the public Overpass server is busy. Data © OpenStreetMap contributors, ODbL.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROUTES = { 'Н-09': 'H09', 'Т-09-06': 'T09-06' };
const BBOX = '48.15,24.25,48.95,24.85';
const query = `[out:json][timeout:50];way["ref"~"${Object.keys(ROUTES).join('|')}"](${BBOX});out geom;`;

async function download() {
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': 'politorg-iv-billboard-map/1.0 (prolorenzoandrii.github.io)' } },
  );
  if (!res.ok) throw new Error(`Overpass responded ${res.status}; retry later or pass a saved response`);
  return res.json();
}

const savedPath = process.argv[2];
const { elements } = savedPath ? JSON.parse(readFileSync(savedPath, 'utf8')) : await download();

const round = (n) => Math.round(n * 1e5) / 1e5;
const key = ([lng, lat]) => `${lng},${lat}`;

function mergeLines(lines) {
  const pool = lines.map((l) => [...l]);
  const merged = [];
  while (pool.length) {
    let line = pool.pop();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const other = pool[i];
        const [head, tail] = [key(line[0]), key(line.at(-1))];
        const [oHead, oTail] = [key(other[0]), key(other.at(-1))];
        if (tail === oHead) line = line.concat(other.slice(1));
        else if (tail === oTail) line = line.concat([...other].reverse().slice(1));
        else if (head === oTail) line = other.concat(line.slice(1));
        else if (head === oHead) line = [...other].reverse().concat(line.slice(1));
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    merged.push(line);
  }
  return merged;
}

const features = Object.entries(ROUTES).map(([osmRef, route]) => {
  const lines = elements
    .filter((w) => w.tags.ref.split(';').map((r) => r.trim()).includes(osmRef))
    .map((w) => w.geometry.map((p) => [round(p.lon), round(p.lat)]));
  return {
    type: 'Feature',
    properties: { route },
    geometry: { type: 'MultiLineString', coordinates: mergeLines(lines) },
  };
});

const out = fileURLToPath(new URL('../src/data/routes.json', import.meta.url));
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }));
for (const f of features) {
  console.log(f.properties.route, f.geometry.coordinates.length, 'lines');
}
