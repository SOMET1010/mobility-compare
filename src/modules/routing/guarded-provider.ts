/**
 * FOURNISSEUR PROTEGE PAR DISJONCTEUR
 * Enveloppe un `RoutingProvider` : quand le circuit est ouvert, l'appel n'est
 * PAS emis et un echec `CIRCUIT_OPEN` est retourne immediatement.
 *
 * Aucun repli, aucune estimation de substitution : si le routage est
 * indisponible, il n'y a pas de resultat, donc pas de prix.
 */

import { CircuitBreaker } from './circuit-breaker';
import { failure, type RouteOutcome, type RouteRequest, type RoutingProvider } from './provider';

export function createGuardedProvider(
  provider: RoutingProvider,
  breaker: CircuitBreaker,
): RoutingProvider {
  return {
    name: provider.name,

    async route(request: RouteRequest): Promise<RouteOutcome> {
      if (!breaker.canAttempt()) {
        const { nextProbeAt } = breaker.snapshot();
        return failure(
          'CIRCUIT_OPEN',
          provider.name,
          `Circuit ouvert, prochaine sonde a ${nextProbeAt?.toISOString() ?? 'inconnu'}`,
        );
      }

      const outcome = await provider.route(request);

      if (outcome.ok) {
        breaker.onSuccess();
        return outcome;
      }

      // Seuls les echecs imputables au fournisseur ouvrent le circuit.
      // Des coordonnees invalides ou l'absence d'itineraire sont des reponses
      // legitimes : le service fonctionne.
      if (outcome.failure.retryable) breaker.onFailure();
      else breaker.onSuccess();

      return outcome;
    },

    healthCheck: () => provider.healthCheck(),
  };
}
