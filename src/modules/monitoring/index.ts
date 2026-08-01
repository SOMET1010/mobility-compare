/**
 * MONITORING — SENTRY
 * Origine : derive de NOLI `src/lib/sentry/index.ts` (278 l.) et
 * `src/lib/monitoring/index.ts` (476 l.).
 * Conserve : principe d'initialisation conditionnelle et d'enrichissement de contexte.
 * Ajoute   : filtrage systematique des donnees sensibles avant tout envoi,
 *            et desactivation par defaut en developpement.
 *
 * NOLI activait Sentry des qu'un DSN etait present. Ici, l'envoi vers un service
 * tiers est un acte deliberé : en local, il faut l'activer explicitement.
 */

import * as Sentry from '@sentry/react';
import { logger, redact } from '@/modules/logger';

/** Champs de requete a ne jamais transmettre a un service tiers. */
const SENSITIVE_QUERY_PARAMS = ['phone', 'msisdn', 'otp', 'code', 'token', 'lat', 'lng'];

/** Retire les parametres sensibles d'une URL sans la casser. */
function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (url.searchParams.has(param)) url.searchParams.set(param, '[masque]');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const enabledInDev = import.meta.env.VITE_SENTRY_ENABLE_DEV === 'true';

  if (!dsn) {
    logger.debug('Monitoring inactif : aucun DSN configure');
    return;
  }
  // En local, on n'envoie rien a un tiers sans decision explicite.
  if (import.meta.env.DEV && !enabledInDev) {
    logger.debug('Monitoring inactif en developpement');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
    // Ni saisies ni textes captures : le rejeu exposerait numeros et codes.
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    beforeSend(event) {
      if (event.request?.url) event.request.url = sanitizeUrl(event.request.url);
      if (event.request?.headers) delete event.request.headers;
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) event.user = { id: event.user.id };
      if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>;
      if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts;
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.['url'] && typeof breadcrumb.data['url'] === 'string') {
        breadcrumb.data['url'] = sanitizeUrl(breadcrumb.data['url']);
      }
      // Les saisies clavier peuvent contenir un OTP ou un numero.
      if (breadcrumb.category === 'ui.input') return null;
      return breadcrumb;
    },
  });

  // Le logger alimente Sentry : un seul point d'entree pour les erreurs.
  logger.setSink((entry) => {
    if (entry.level === 'error') {
      Sentry.captureMessage(entry.message, { level: 'error', extra: { ...entry.context } });
    }
  });

  logger.info('Monitoring actif');
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, { extra: redact(context) as Record<string, unknown> });
}

export { sanitizeUrl };
