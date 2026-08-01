/**
 * GESTION CENTRALISEE DES ERREURS
 * Origine : concept repris de NOLI (ErrorBoundary 416 lignes + gestion diffuse).
 * Reecrit : NOLI melangeait presentation, journalisation et vocabulaire metier
 * assurance. Ici, une taxonomie neutre et un message usager par categorie.
 *
 * Regle : le message technique n'atteint JAMAIS l'usager. Il recoit un message
 * comprehensible et un identifiant de correlation, rien de plus.
 */

export type ErrorKind =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'PROVIDER'
  | 'UNEXPECTED';

export interface AppErrorOptions {
  readonly kind: ErrorKind;
  readonly technicalMessage: string;
  readonly correlationId?: string;
  readonly cause?: unknown;
}

export class AppError extends Error {
  readonly kind: ErrorKind;
  readonly correlationId: string;

  constructor({ kind, technicalMessage, correlationId, cause }: AppErrorOptions) {
    super(technicalMessage);
    this.name = 'AppError';
    this.kind = kind;
    this.correlationId = correlationId ?? crypto.randomUUID();
    this.cause = cause;
  }
}

/** Messages destines a l'usager. Neutres, sans detail interne, sans blame. */
const USER_MESSAGES: Record<ErrorKind, string> = {
  NETWORK: 'La connexion semble interrompue. Verifiez votre reseau puis reessayez.',
  TIMEOUT: 'Le service met trop de temps a repondre. Reessayez dans un instant.',
  UNAUTHORIZED: 'Votre session a expire. Reconnectez-vous.',
  FORBIDDEN: "Vous n'avez pas acces a cette page.",
  NOT_FOUND: "Cette page n'existe pas ou plus.",
  VALIDATION: 'Certaines informations saisies sont incompletes ou incorrectes.',
  RATE_LIMITED: 'Trop de tentatives. Patientez avant de reessayer.',
  PROVIDER: 'Un service externe est momentanement indisponible.',
  UNEXPECTED: "Une erreur inattendue s'est produite.",
};

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return USER_MESSAGES[error.kind];
  return USER_MESSAGES.UNEXPECTED;
}

export function correlationIdOf(error: unknown): string | null {
  return error instanceof AppError ? error.correlationId : null;
}

/** Un echec reseau merite une nouvelle tentative ; une erreur de droits, non. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  return (['NETWORK', 'TIMEOUT', 'PROVIDER'] as ErrorKind[]).includes(error.kind);
}
