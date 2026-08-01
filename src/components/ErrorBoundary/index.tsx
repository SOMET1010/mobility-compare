import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/modules/logger';
import { captureError } from '@/modules/monitoring';
import { toUserMessage, correlationIdOf } from '@/lib/errors';

/**
 * Origine : derive de NOLI `src/components/ErrorBoundary/index.tsx` (416 l.).
 * Reecrit : la version NOLI melait presentation, telemetrie, logique de reprise
 * et references metier assurance. Ici, une seule responsabilite — intercepter,
 * journaliser, afficher un repli honnete.
 */

interface Props {
  readonly children: ReactNode;
  readonly fallback?: (error: unknown, reset: () => void) => ReactNode;
}

interface State {
  readonly error: unknown | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Erreur non interceptee dans le rendu', {
      component: 'ErrorBoundary',
      componentStack: info.componentStack,
    });
    captureError(error, { componentStack: info.componentStack });
  }

  private readonly reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    const correlationId = correlationIdOf(error);
    return (
      <div role="alert" className="mx-auto max-w-md p-6">
        <h2 className="mb-2 text-lg font-semibold">{toUserMessage(error)}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Vous pouvez reessayer. Si le probleme persiste, revenez plus tard.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Reessayer
        </button>
        {correlationId && (
          <p className="mt-4 text-xs text-muted-foreground">Reference : {correlationId}</p>
        )}
      </div>
    );
  }
}
