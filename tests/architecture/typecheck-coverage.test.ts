import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const ROOT = join(__dirname, '..', '..');

/**
 * Un `typecheck` qui ne vérifie AUCUN fichier passe toujours et ne prouve rien
 * (CLAUDE.md §4 : « un contrôle qui n'a pas pu conclure n'est pas un contrôle
 * réussi »). C'est exactement le piège dans lequel `tsc --noEmit` tombait ici :
 * lancé sur un tsconfig racine à `"files": []` et hors mode `-b`, il ignore les
 * références de projet et n'analyse rien. Cette garde interdit ce retour en
 * arrière : le typecheck doit rester en mode références et couvrir du code réel.
 */

function stripJsonComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(stripJsonComments(readFileSync(path, 'utf8'))) as Record<string, unknown>;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const isTs = (f: string) => ['.ts', '.tsx'].includes(extname(f));

/** Résout une entrée `include` (dossier ou fichier) en fichiers TypeScript réels. */
function resolveInclude(entry: string): string[] {
  const full = join(ROOT, entry);
  if (!existsSync(full)) return [];
  if (statSync(full).isDirectory()) return walk(full).filter(isTs);
  return isTs(full) ? [full] : [];
}

describe('le typecheck ne peut pas redevenir un contrôle vacant', () => {
  const pkg = readJson(join(ROOT, 'package.json')) as { scripts?: Record<string, string> };
  const typecheck = pkg.scripts?.typecheck ?? '';

  it('utilise le mode références de projet (tsc -b), et non un tsconfig à fichiers vides', () => {
    // `-b` force le suivi des références : c'est ce qui empêche l'analyse à vide.
    expect(typecheck, `script typecheck actuel : « ${typecheck} »`).toMatch(/\btsc\b[^|&]*\s-b\b/);
  });

  it('couvre effectivement du code réel — src ET tests, jamais zéro fichier', () => {
    const rootCfg = readJson(join(ROOT, 'tsconfig.json')) as {
      references?: Array<{ path: string }>;
    };
    const refs = (rootCfg.references ?? []).map((r) => r.path);
    expect(refs.length, 'tsconfig.json ne référence aucun projet').toBeGreaterThan(0);

    const covered = refs.flatMap((ref) => {
      const cfg = readJson(join(ROOT, ref)) as { include?: string[] };
      return (cfg.include ?? []).flatMap(resolveInclude);
    });

    expect(covered.length, 'aucun fichier TypeScript couvert par le typecheck').toBeGreaterThan(0);
    expect(
      covered.some((f) => f.includes(`${sep}src${sep}`)),
      'le code applicatif (src/) n’est pas couvert par le typecheck',
    ).toBe(true);
    expect(
      covered.some((f) => f.includes(`${sep}tests${sep}`)),
      'les tests ne sont pas couverts par le typecheck',
    ).toBe(true);
  });
});
