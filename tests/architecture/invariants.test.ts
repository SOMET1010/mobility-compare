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

describe('Invariant I3 — le classement naturel ignore le sponsoring', () => {
  it('aucun fichier de src/domain/ranking ne reference le sponsoring', () => {
    let files: string[] = [];
    try {
      files = walk(join(ROOT, 'src', 'domain', 'ranking'));
    } catch {
      files = [];
    }
    const offenders = files
      .filter((f) => ['.ts', '.tsx'].includes(extname(f))) // la doc peut nommer la regle
      .filter((f) => /sponsor|monetization|advertis/i.test(readFileSync(f, 'utf8')));
    expect(offenders, `Biais de classement possible : ${offenders.join(', ')}`).toEqual([]);
  });
});
