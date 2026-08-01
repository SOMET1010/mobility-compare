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

/**
 * Une dependance de production declaree mais jamais importee est un poids mort :
 * elle alourdit l'installation, elargit la surface d'attaque et fait croire a un
 * usage qui n'existe pas. On l'ajoute quand on s'en sert, pas avant.
 */
describe('hygiene des dependances', () => {
  it('toute dependance de production est effectivement importee', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const sources = [join(ROOT, 'src'), join(ROOT, 'tests')]
      .flatMap((dir) => walk(dir))
      .filter((f) => ['.ts', '.tsx'].includes(extname(f)))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');

    const unused = Object.keys(pkg.dependencies).filter(
      (dep) => !new RegExp(`from ['"]${dep.replace(/[/\\-]/g, '\\$&')}`).test(sources),
    );
    // react-dom est importe via 'react-dom/client'
    const filtered = unused.filter((dep) => !sources.includes(`from '${dep}/`));

    expect(filtered, `Dependances non importees : ${filtered.join(', ')}`).toEqual([]);
  });
});
