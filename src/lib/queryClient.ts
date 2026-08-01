/**
 * CONFIGURATION TANSTACK QUERY
 * Origine : NOLI configurait le QueryClient dans App.tsx, sans politique de
 * reessai differenciee. Ici la politique s'appuie sur la taxonomie d'erreurs.
 *
 * Contrainte CDC : reseau 3G intermittent a Abidjan. Les reglages sont
 * volontairement tolerants aux coupures et econnomes en donnees.
 */

import { QueryClient } from '@tanstack/react-query';
import { AppError, isRetryable } from '@/lib/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reseau intermittent : on evite les rechargements opportunistes.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof AppError && !isRetryable(error)) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        // Une mutation rejouee peut declencher un second SMS : jamais d'automatisme.
        retry: false,
      },
    },
  });
}
