import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '..', '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const sourceFiles = () =>
  walk(join(ROOT, 'src')).filter((f) => ['.ts', '.tsx'].includes(extname(f)));

describe('ADR-001 — le nom de travail est confine', () => {
  const ALLOWED = ['src/config/product.ts'];

  it("n'apparait dans aucun fichier source hors du fichier d'identite produit", () => {
    const offenders = sourceFiles().filter((file) => {
      const relative = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      if (ALLOWED.includes(relative)) return false;
      const content = readFileSync(file, 'utf8');
      return /MobilityCompare|mobility[_-]compare/i.test(content);
    });
    expect(offenders, `Renommage douloureux en vue : ${offenders.join(', ')}`).toEqual([]);
  });

  it("n'apparait dans aucune migration de base de donnees", () => {
    let migrations: string[] = [];
    try {
      migrations = walk(join(ROOT, 'supabase', 'migrations'));
    } catch {
      migrations = [];
    }
    const offenders = migrations.filter((f) =>
      /MobilityCompare|mobility[_-]compare/i.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

// Le controle des secrets est assure par env-separation.test.ts (porte
// prebuild) et secrets.test.ts (detecteur qualifie). Le controle naif qui
// figurait ici produisait des faux positifs sur les fichiers declaratifs.

/**
 * Retire commentaires et chaines litterales.
 * Un commentaire qui INTERDIT un levier commercial doit pouvoir le nommer :
 * c'est le code executable qui est controle, pas la documentation.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

describe('Invariant I3 — aucun levier commercial dans le domaine', () => {
  const COMMERCIAL_TERMS = /sponsor|monetization|advertis|promo|discount|commission|partnerBoost/i;

  it('codeOnly neutralise commentaires et chaines', () => {
    expect(codeOnly('// sponsorBoost\nconst a = 1;')).not.toMatch(COMMERCIAL_TERMS);
    expect(codeOnly('const x = "promo";')).not.toMatch(COMMERCIAL_TERMS);
    expect(codeOnly('const sponsorBoost = 1;')).toMatch(COMMERCIAL_TERMS);
  });

  it('le moteur tarifaire ne connait aucun levier commercial', () => {
    let files: string[] = [];
    try {
      files = walk(join(ROOT, 'src', 'domain', 'pricing'));
    } catch {
      files = [];
    }
    const offenders = files
      .filter((f) => ['.ts', '.tsx'].includes(extname(f)))
      .filter((f) => COMMERCIAL_TERMS.test(codeOnly(readFileSync(f, 'utf8'))));
    expect(offenders, `Prix influencable : ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('Invariant I3 — le classement naturel ignore le sponsoring', () => {
  it('aucun fichier de src/domain/ranking ne reference le sponsoring', () => {
    let files: string[] = [];
    try {
      files = walk(join(ROOT, 'src', 'domain', 'ranking'));
    } catch {
      files = [];
    }
    const offenders = files
      .filter((f) => ['.ts', '.tsx'].includes(extname(f)))
      .filter((f) => /sponsor|monetization|advertis/i.test(codeOnly(readFileSync(f, 'utf8'))));
    expect(offenders, `Biais de classement possible : ${offenders.join(', ')}`).toEqual([]);
  });
});
