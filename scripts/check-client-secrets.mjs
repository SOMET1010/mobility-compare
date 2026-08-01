#!/usr/bin/env node
/**
 * CONTROLE PRE-BUILD — AUCUN SECRET DANS LE CODE CLIENT
 * =============================================================================
 * Execute par `prebuild` : `npm run build` ECHOUE si le controle echoue.
 * Ce n'est pas un test que l'on peut oublier de lancer, c'est une porte.
 *
 * Trois verifications :
 *   1. Aucune variable serveur n'est referencee depuis `src/`
 *   2. Aucune variable `VITE_*` ne contient un fragment interdit
 *   3. `.env.example` ne declare aucune valeur pour une variable serveur
 * =============================================================================
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const { SERVER_VARIABLES, FORBIDDEN_CLIENT_FRAGMENTS } = await import(
  join(ROOT, 'src/config/env-registry.js')
);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry)) continue;
    const full = join(dir, entry);
    statSync(full).isDirectory() ? walk(full, acc) : acc.push(full);
  }
  return acc;
}

const violations = [];
const clientFiles = walk(join(ROOT, 'src')).filter((f) => ['.ts', '.tsx'].includes(extname(f)));

// --- 1. Variables serveur referencees cote client -----------------------------
for (const file of clientFiles) {
  // Le registre DECLARE ces noms : c'est sa raison d'etre, pas un usage.
  if (file.endsWith('env-registry.js')) continue;
  const content = readFileSync(file, 'utf8');
  for (const { name } of SERVER_VARIABLES) {
    if (!content.includes(name)) continue;
    // Une mention en commentaire est pedagogique, pas une lecture.
    const isRealRead = new RegExp(
      `(import\\.meta\\.env|process\\.env)\\s*[.\\[]\\s*['"\`]?${name}`,
    ).test(content);
    violations.push({
      file: relative(ROOT, file),
      rule: 'variable serveur',
      detail: isRealRead
        ? `${name} est LU depuis le code client`
        : `${name} est mentionne dans un fichier client`,
      blocking: true,
    });
  }
}

// --- 2. Fragments interdits dans une variable VITE_ ---------------------------
const vitePattern = /VITE_[A-Z0-9_]+/g;
for (const file of [...clientFiles, join(ROOT, '.env.example')]) {
  if (!existsSync(file)) continue;
  if (file.endsWith('env-registry.js')) continue;
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(vitePattern)) {
    const name = match[0];
    const fragment = FORBIDDEN_CLIENT_FRAGMENTS.find((f) => name.includes(f));
    if (!fragment) continue;
    violations.push({
      file: relative(ROOT, file),
      rule: 'fragment interdit',
      detail: `${name} contient « ${fragment} » : une variable VITE_ est publique`,
      blocking: true,
    });
  }
}

// --- 3. Valeur declaree pour une variable serveur dans .env.example -----------
const examplePath = join(ROOT, '.env.example');
if (existsSync(examplePath)) {
  for (const rawLine of readFileSync(examplePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('#') || !line.includes('=')) continue;
    const [name, ...rest] = line.split('=');
    const value = rest.join('=').split('#')[0].trim();
    if (value.length === 0) continue;
    if (SERVER_VARIABLES.some((v) => v.name === name.trim())) {
      violations.push({
        file: '.env.example',
        rule: 'valeur serveur declaree',
        detail: `${name.trim()} porte une valeur : ce fichier est commite`,
        blocking: true,
      });
    }
  }
}

if (violations.length === 0) {
  console.log('✓ Controle des secrets client : aucune violation');
  console.log(
    `  ${clientFiles.length} fichiers analyses, ${SERVER_VARIABLES.length} variables serveur surveillees`,
  );
  process.exit(0);
}

console.error('\n✗ BUILD BLOQUE — secrets potentiellement exposes au client\n');
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}`);
  console.error(`      ${v.detail}\n`);
}
console.error('Voir docs/adr/ADR-002-gestion-des-secrets.md\n');
process.exit(1);
