/**
 * Géocodage OSM des lieux du comparateur — remplace les points de repère
 * « de mémoire » par les coordonnées Nominatim (OpenStreetMap).
 *
 * Usage (depuis votre machine, avec Internet) :
 *   node scripts/geocoder-quartiers.mjs
 *
 * Règles d'usage du Nominatim public respectées : 1 requête/seconde,
 * User-Agent identifiable, une seule passe (pas d'autocomplete).
 * Sortie : le bloc COMMUNES prêt à coller dans src/demo/scenario.ts,
 * avec l'écart en mètres par rapport à la position actuelle.
 */
import { COMMUNES } from '../src/demo/scenario.ts';

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

const results = [];
for (const place of COMMUNES) {
  const q = encodeURIComponent(`${place.name}, ${place.commune}, Abidjan, Côte d'Ivoire`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ci`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const json = await res.json();
    const hit = json[0];
    if (hit) {
      const lat = Math.round(parseFloat(hit.lat) * 1000) / 1000;
      const lng = Math.round(parseFloat(hit.lon) * 1000) / 1000;
      const ecart = distM(place, { lat, lng });
      results.push({ ...place, lat, lng, ecart, ok: true });
      console.log(`✓ ${place.name.padEnd(20)} ${lat}, ${lng}  (écart ${ecart} m)`);
    } else {
      results.push({ ...place, ecart: null, ok: false });
      console.log(`✗ ${place.name.padEnd(20)} introuvable — position actuelle conservée`);
    }
  } catch (e) {
    results.push({ ...place, ecart: null, ok: false });
    console.log(`✗ ${place.name.padEnd(20)} erreur réseau — position actuelle conservée`);
  }
  await sleep(1100); // politique Nominatim : 1 req/s maximum
}

console.log('\n--- Bloc à coller dans src/demo/scenario.ts ---\n');
for (const p of results) {
  console.log(
    `  { id: '${p.id}', name: '${p.name}', commune: '${p.commune}', lat: ${p.lat}, lng: ${p.lng} },`,
  );
}
const gros = results.filter((p) => p.ecart !== null && p.ecart > 1500);
if (gros.length > 0) {
  console.log('\n⚠ Écarts > 1,5 km à vérifier à la main (le géocodage peut viser un homonyme) :');
  for (const p of gros) console.log(`  - ${p.name} : ${p.ecart} m`);
}
