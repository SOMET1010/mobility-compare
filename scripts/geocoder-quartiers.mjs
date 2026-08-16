/**
 * Géocodage OSM des lieux du comparateur — remplace les points de repère
 * « de mémoire » par les coordonnées Nominatim (OpenStreetMap).
 *
 * Usage (machine connectée, depuis un clone du dépôt mobility-compare) :
 *   node scripts/geocoder-quartiers.mjs
 *
 * Autonome : lit src/demo/scenario.ts comme du texte (aucune dépendance).
 * Politique du Nominatim public respectée : 1 requête/seconde, User-Agent
 * identifiable, une seule passe (pas d'autocomplete).
 * Sortie : le bloc COMMUNES corrigé à coller dans src/demo/scenario.ts,
 * avec l'écart en mètres par rapport à la position actuelle.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(racine, 'src/demo/scenario.ts'), 'utf8');

const LIGNE =
  /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*commune:\s*'([^']+)',\s*lat:\s*([\d.]+),\s*lng:\s*(-[\d.]+)\s*\}/g;
const lieux = [...source.matchAll(LIGNE)].map((m) => ({
  id: m[1],
  name: m[2],
  commune: m[3],
  lat: parseFloat(m[4]),
  lng: parseFloat(m[5]),
}));
if (lieux.length === 0) {
  console.error('Aucun lieu trouvé dans src/demo/scenario.ts — lancez depuis le dépôt mobility-compare.');
  process.exit(1);
}
console.log(`${lieux.length} lieux à vérifier via Nominatim (1 req/s)…\n`);

const UA = 'comparateur-mobilite-abidjan/1.0 (verification quartiers)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function distM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

const resultats = [];
for (const lieu of lieux) {
  const q = encodeURIComponent(`${lieu.name}, ${lieu.commune}, Abidjan, Côte d'Ivoire`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ci`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const json = await res.json();
    const hit = json[0];
    if (hit) {
      const lat = Math.round(parseFloat(hit.lat) * 1000) / 1000;
      const lng = Math.round(parseFloat(hit.lon) * 1000) / 1000;
      const ecart = distM(lieu, { lat, lng });
      resultats.push({ ...lieu, lat, lng, ecart });
      console.log(`✓ ${lieu.name.padEnd(20)} ${lat}, ${lng}  (écart ${ecart} m)`);
    } else {
      resultats.push({ ...lieu, ecart: null });
      console.log(`✗ ${lieu.name.padEnd(20)} introuvable — position actuelle conservée`);
    }
  } catch {
    resultats.push({ ...lieu, ecart: null });
    console.log(`✗ ${lieu.name.padEnd(20)} erreur réseau — position actuelle conservée`);
  }
  await sleep(1100);
}

console.log('\n--- Bloc à coller dans src/demo/scenario.ts ---\n');
for (const p of resultats) {
  console.log(
    `  { id: '${p.id}', name: '${p.name}', commune: '${p.commune}', lat: ${p.lat}, lng: ${p.lng} },`,
  );
}
const gros = resultats.filter((p) => p.ecart !== null && p.ecart > 1500);
if (gros.length > 0) {
  console.log('\n⚠ Écarts > 1,5 km à vérifier à la main (le géocodage peut viser un homonyme) :');
  for (const p of gros) console.log(`  - ${p.name} : ${p.ecart} m`);
}
