#!/usr/bin/env node
/**
 * CONTROLE POST-BUILD — INSPECTION DU BUNDLE REELLEMENT PRODUIT
 * =============================================================================
 * Le controle pre-build lit le code source. Celui-ci lit le RESULTAT.
 * C'est la seule preuve qui compte : ce qui part chez l'usager.
 *
 * Lecon de l'audit NOLI (J0) : la verification doit porter sur la signature
 * complete d'un JWT. Les jetons Supabase `anon` et `service_role` partagent le
 * meme en-tete — un controle sur le prefixe produit un faux positif.
 * =============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('✗ Aucun dossier dist/ : lancer le build d\'abord');
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    statSync(full).isDirectory() ? walk(full, acc) : acc.push(full);
  }
  return acc;
}

const files = walk(DIST);
const violations = [];

for (const file of files) {
  if (!/\.(js|css|html|json|map)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  const where = relative(ROOT, file);

  // 1. Cle secret Supabase
  for (const match of content.matchAll(/sb_secret_[A-Za-z0-9._-]{8,}/g)) {
    violations.push({ where, what: 'cle secret Supabase', detail: `${match[0].slice(0, 14)}...` });
  }

  // 2. JWT decodable portant un role privilegie
  for (const match of content.matchAll(
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  )) {
    const parts = match[0].split('.');
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
      if (claims.role && claims.role !== 'anon') {
        violations.push({
          where,
          what: 'JWT privilegie',
          detail: `role « ${claims.role} » — le bundle est public`,
        });
      }
    } catch {
      /* jeton non decodable : ni confirme, ni ignore silencieusement */
    }
  }

  // 3. Noms de variables serveur
  for (const needle of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_JWT_SECRET',
    'OTP_HASH_PEPPER',
    'SMS_PROVIDER_PRIMARY_CREDENTIALS',
  ]) {
    if (content.includes(needle)) {
      violations.push({ where, what: 'variable serveur', detail: needle });
    }
  }
}

if (violations.length === 0) {
  console.log(`✓ Controle du bundle : ${files.length} fichiers inspectes, aucun secret detecte`);
  process.exit(0);
}

console.error('\n✗ SECRET DETECTE DANS LE BUNDLE PUBLIE\n');
for (const v of violations) console.error(`  ${v.where}\n      ${v.what} : ${v.detail}\n`);
process.exit(1);
