import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error registre en JavaScript pur, partage avec les scripts Node
import { SERVER_VARIABLES, CLIENT_VARIABLES, isForbiddenInClient } from '@/config/env-registry.js';

const ROOT = join(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-client-secrets.mjs');

/** Lance le controle pre-build et retourne son code de sortie. */
function runGate(): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

describe('separation client / serveur', () => {
  it('le registre ne declare aucune variable serveur prefixee VITE_', () => {
    const offenders = SERVER_VARIABLES.filter((v: { name: string }) => v.name.startsWith('VITE_'));
    expect(offenders).toEqual([]);
  });

  it('aucune variable client ne porte de fragment interdit', () => {
    const offenders = CLIENT_VARIABLES.filter((v: { name: string }) => isForbiddenInClient(v.name));
    expect(offenders).toEqual([]);
  });

  it('isForbiddenInClient reconnait les variantes non encore ecrites', () => {
    expect(isForbiddenInClient('VITE_SUPABASE_SERVICE_KEY')).toBe(true);
    expect(isForbiddenInClient('VITE_STRIPE_SECRET')).toBe(true);
    expect(isForbiddenInClient('VITE_DB_PASSWORD')).toBe(true);
    expect(isForbiddenInClient('SUPABASE_SECRET_KEY')).toBe(true);
    expect(isForbiddenInClient('VITE_SUPABASE_PUBLISHABLE_KEY')).toBe(false);
    expect(isForbiddenInClient('VITE_ROUTING_BASE_URL')).toBe(false);
  });
});

describe('porte pre-build — le build echoue en cas de fuite', () => {
  const VIOLATION = join(ROOT, 'src', 'lib', '__test-violation.ts');
  const cleanup = () => existsSync(VIOLATION) && unlinkSync(VIOLATION);

  it("passe sur l'etat courant du depot", () => {
    expect(runGate().ok).toBe(true);
  });

  it('echoue si une variable serveur est lue depuis le code client', () => {
    writeFileSync(VIOLATION, 'export const k = import.meta.env.SUPABASE_SECRET_KEY;\n');
    const result = runGate();
    cleanup();
    expect(result.ok).toBe(false);
    expect(result.output).toContain('est LU depuis le code client');
  });

  it('echoue si une variable VITE_ porte un fragment interdit', () => {
    writeFileSync(VIOLATION, 'export const k = import.meta.env.VITE_STRIPE_SECRET;\n');
    const result = runGate();
    cleanup();
    expect(result.ok).toBe(false);
    expect(result.output).toContain('fragment interdit');
  });

  it('echoue si .env.example renseigne une variable serveur', () => {
    const path = join(ROOT, '.env.example');
    const original = readFileSync(path, 'utf8');
    // Motif assemble a l'execution : ecrit en clair, il entrerait dans
    // l'historique Git et ferait echouer le controle d'historique a jamais.
    const fakeKey = ['sb', 'secret', 'A1b2C3d4E5f6G7h8'].join('_');
    writeFileSync(path, `${original}\nSUPABASE_SECRET_KEY=${fakeKey}\n`);
    const result = runGate();
    writeFileSync(path, original);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('porte une valeur');
  });
});
