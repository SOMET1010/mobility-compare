import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanForSecrets, isBlocking, type SecretFinding } from './secret-scanner';

const ROOT = join(__dirname, '..', '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'coverage', 'playwright-report'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.json', '.md', '.yml', '.yaml', '.sql', ''];

/** `.env.example` a pour extension `.example` : il serait manque sans cette regle. */
function isScanned(file: string): boolean {
  return SCANNED_EXTENSIONS.includes(extname(file)) || /(^|\/)\.env/.test(file);
}

describe('Detecteur de secrets — qualification en quatre niveaux', () => {
  it("distingue un exemple tronque d'une cle reelle", () => {
    expect(scanForSecrets('sb_secret_...')[0]?.verdict).toBe('SAFE_EXAMPLE');
    expect(scanForSecrets('SUPABASE_SECRET_KEY=sb_secret_<votre-cle>')[0]?.verdict).toBe(
      'SAFE_EXAMPLE',
    );
  });

  it('qualifie de suspecte une valeur de longueur realiste', () => {
    const findings = scanForSecrets('sb_secret_A1b2C3d4E5f6G7h8I9j0K1l2');
    expect(findings.some((f) => f.verdict === 'SUSPECT')).toBe(true);
  });

  it('confirme un JWT complet et en decode le role sans exposer le jeton', () => {
    const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
    const payload = Buffer.from('{"role":"service_role","exp":2094786785}').toString('base64url');
    const token = `${header}.${payload}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

    const findings = scanForSecrets(token);
    const jwt = findings.find((f) => f.kind === 'jwt');
    expect(jwt?.verdict).toBe('CONFIRMED_JWT');
    expect(jwt?.reason).toContain('service_role');
    expect(jwt?.excerpt.length).toBeLessThan(20); // le rapport ne rejoue pas le secret
  });

  it("l'arbre de travail ne contient aucune occurrence bloquante", () => {
    const blocking: string[] = [];
    for (const file of walk(ROOT).filter(isScanned)) {
      if (file.includes('secret-scanner') || file.includes('secrets.test')) continue; // motifs de test
      const findings = scanForSecrets(readFileSync(file, 'utf8')).filter(isBlocking);
      for (const f of findings) {
        blocking.push(`${file.slice(ROOT.length + 1)} [${f.verdict}] ${f.excerpt} — ${f.reason}`);
      }
    }
    expect(blocking, blocking.join('\n')).toEqual([]);
  });

  it("l'historique Git ne contient aucune occurrence bloquante", () => {
    let diff = '';
    try {
      diff = execSync('git log -p --all --no-color', {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
      });
    } catch {
      return; // pas de depot Git : controle non applicable
    }
    const blocking: SecretFinding[] = scanForSecrets(diff).filter(isBlocking);
    const report = blocking.map((f) => `[HISTORY/${f.verdict}] ${f.excerpt} — ${f.reason}`);
    expect(report, report.join('\n')).toEqual([]);
  });
});
