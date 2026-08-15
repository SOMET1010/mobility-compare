#!/usr/bin/env node
/**
 * IMPORT DES RELEVÉS TERRAIN (DEP-004)
 * =============================================================================
 * Charge un CSV de relevés (modèle : public/releves-terrain-modele.csv) dans
 * la table fare_observations, en `source: 'import'`, statut PENDING (la
 * modération reste obligatoire — rien n'est publié brut).
 *
 * SCRIPT SERVEUR : il exige la clé secrète, lue depuis l'environnement
 * (SUPABASE_SECRET_KEY) — jamais commitée, jamais côté client (ADR-002).
 *
 * Usage :
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=sb_secret_... \
 *   node scripts/import-observations.mjs chemin/vers/releves.csv
 *
 * Validation ligne à ligne ; les lignes invalides sont LISTÉES et écartées,
 * jamais corrigées en silence (« zéro donnée inventée »).
 * =============================================================================
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CORRIDORS = {
  'yopougon-plateau': ['yopougon', 'plateau'],
  'cocody-plateau': ['cocody', 'plateau'],
  'abobo-adjame': ['abobo', 'adjame'],
};
const MODES = new Set(['VTC', 'TAXI', 'WORO', 'GBAKA']);

const [, , csvPath] = process.argv;
const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!csvPath || !url || !secretKey) {
  console.error(
    'Usage : SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-observations.mjs <fichier.csv>',
  );
  process.exit(1);
}

const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const header = lines.shift();
const EXPECTED = 'date;heure;corridor;mode;prix_fcfa;heure_pointe;commentaire';
if (header !== EXPECTED) {
  console.error(`En-tête inattendu.\n  attendu : ${EXPECTED}\n  reçu    : ${header}`);
  process.exit(1);
}

const valid = [];
const rejected = [];

lines.forEach((line, i) => {
  const n = i + 2; // numéro de ligne humain (après l'en-tête)
  const [date, heure, corridor, mode, prix, pointe, commentaire = ''] = line.split(';');
  const errors = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) errors.push('date attendue AAAA-MM-JJ');
  if (!/^\d{2}:\d{2}$/.test(heure ?? '')) errors.push('heure attendue HH:MM');
  if (!CORRIDORS[corridor]) errors.push(`corridor inconnu « ${corridor} »`);
  if (!MODES.has(mode)) errors.push(`mode inconnu « ${mode} »`);
  const price = Number(prix);
  if (!Number.isInteger(price) || price < 100 || price > 100000)
    errors.push(`prix invalide « ${prix} » (entier FCFA attendu)`);
  if (pointe !== 'oui' && pointe !== 'non') errors.push('heure_pointe attendu oui/non');

  if (errors.length > 0) {
    rejected.push(`  ligne ${n} : ${errors.join(' · ')}`);
    return;
  }
  const [from_commune, to_commune] = CORRIDORS[corridor];
  valid.push({
    observed_at: `${date}T${heure}:00+00:00`,
    from_commune,
    to_commune,
    mode,
    price_xof: price,
    rush_hour: pointe === 'oui',
    comment: commentaire.slice(0, 280) || null,
    source: 'import',
    status: 'PENDING',
  });
});

console.log(`Lignes valides : ${valid.length} · rejetées : ${rejected.length}`);
if (rejected.length > 0) {
  console.log('Rejets (à corriger dans le fichier, rien n’a été inventé) :');
  rejected.forEach((r) => console.log(r));
}
if (valid.length === 0) {
  console.log('Rien à importer.');
  process.exit(rejected.length > 0 ? 1 : 0);
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
const { error } = await supabase.from('fare_observations').insert(valid);
if (error) {
  console.error('Échec de l’import :', error.message);
  process.exit(1);
}
console.log(`✓ ${valid.length} observation(s) importée(s) en file de modération (PENDING).`);
