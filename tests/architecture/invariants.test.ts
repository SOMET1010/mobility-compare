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

describe('Securite — aucun secret expose au client', () => {
  const FORBIDDEN = [
    'VITE_SUPABASE_SERVICE',
    'VITE_SUPABASE_SECRET',
    'VITE_SERVICE_ROLE',
    'VITE_SMS_',
    'VITE_OTP_',
    'service_role',
  ];

  it('aucune variable VITE_ ne porte un secret dans src/', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const content = readFileSync(file, 'utf8');
      for (const needle of FORBIDDEN) {
        if (content.includes(needle)) offenders.push(`${file} -> ${needle}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it(".env.example ne contient aucune valeur renseignee apres un '='", () => {
    const content = readFileSync(join(ROOT, '.env.example'), 'utf8');
    const filled = content
      .split('\n')
      .map((line) => line.split('#')[0]!.trim()) // les commentaires ne sont pas des valeurs
      .filter((line) => /^[A-Z][A-Z0-9_]*=.+/.test(line))
      .filter((line) => !line.endsWith('=development'));
    expect(filled, `Valeurs presentes : ${filled.join(' | ')}`).toEqual([]);
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
      .filter((f) => ['.ts', '.tsx'].includes(extname(f))) // la doc peut nommer la regle
      .filter((f) => /sponsor|monetization|advertis/i.test(readFileSync(f, 'utf8')));
    expect(offenders, `Biais de classement possible : ${offenders.join(', ')}`).toEqual([]);
  });
});
