/**
 * LOGGER STRUCTURE
 * =============================================================================
 * Origine : derive de NOLI `src/lib/logger/index.ts` (283 lignes).
 * Conserve : singleton, niveaux, contexte structure, seuil par environnement.
 * Ajoute   : MASQUAGE OBLIGATOIRE des donnees sensibles.
 *
 * Le logger de NOLI journalisait le contexte tel quel. Ce projet manipule des
 * numeros de telephone, des codes OTP et des positions GPS. La specification
 * OTP (§5.3) interdit de journaliser un numero complet ou un code, sous
 * quelque forme que ce soit.
 *
 * Le masquage est applique ICI, au coeur, et non a chaque appel : une regle de
 * securite qui depend de la vigilance de l'appelant finit toujours par ceder.
 * =============================================================================
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly component?: string;
  readonly action?: string;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context: LogContext;
  readonly timestamp: string;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Cles dont la valeur ne doit JAMAIS apparaitre en clair dans un journal.
 * La comparaison est insensible a la casse et fondee sur l'inclusion, pour
 * couvrir les variantes (`phone`, `phoneNumber`, `user_phone`...).
 */
const SENSITIVE_KEYS = [
  'otp',
  'code',
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'phone',
  'msisdn',
  'telephone',
  'email',
  'lat',
  'lng',
  'latitude',
  'longitude',
];

/** Masque un numero en conservant l'indicatif et les deux derniers chiffres. */
export function maskMsisdn(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `+${digits.slice(0, 3)} ** ** ** ${digits.slice(-2)}`;
}

function isSensitiveKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return SENSITIVE_KEYS.some((needle) => lowered.includes(needle));
}

/** Parcourt recursivement le contexte et masque toute valeur sensible. */
export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6) return '[profondeur maximale]';
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((item) => redact(item, depth + 1));
  if (input instanceof Error) return { name: input.name, message: input.message };
  if (typeof input !== 'object') return input;

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isSensitiveKey(key)) {
      output[key] = redact(value, depth + 1);
      continue;
    }
    // Un numero reste correlable sous forme masquee ; le reste est supprime.
    const lowered = key.toLowerCase();
    const isPhone =
      lowered.includes('phone') || lowered.includes('msisdn') || lowered.includes('telephone');
    output[key] = isPhone && typeof value === 'string' ? maskMsisdn(value) : '[masque]';
  }
  return output;
}

class Logger {
  private static instance: Logger | null = null;
  private baseContext: LogContext = {};
  private readonly threshold: LogLevel;
  private sink: ((entry: LogEntry) => void) | null = null;

  private constructor() {
    this.threshold = import.meta.env.DEV ? 'debug' : 'warn';
  }

  static getInstance(): Logger {
    Logger.instance ??= new Logger();
    return Logger.instance;
  }

  /** Reinitialise l'instance. Reserve aux tests. */
  static reset(): void {
    Logger.instance = null;
  }

  setContext(context: LogContext): void {
    this.baseContext = { ...this.baseContext, ...context };
  }

  /** Branche un collecteur externe (Sentry, agregateur...). */
  setSink(sink: ((entry: LogEntry) => void) | null): void {
    this.sink = sink;
  }

  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }
  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }
  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }
  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.threshold]) return;

    const entry: LogEntry = {
      level,
      message,
      context: redact({ ...this.baseContext, ...context }) as LogContext,
      timestamp: new Date().toISOString(),
    };

    this.sink?.(entry);

    if (import.meta.env.DEV) {
      const method = level === 'debug' ? 'log' : level;
      console[method](`[${entry.level}] ${entry.message}`, entry.context);
    }
  }
}

export const logger = Logger.getInstance();
export { Logger };
