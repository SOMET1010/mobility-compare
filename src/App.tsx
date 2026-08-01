import { QueryClientProvider } from '@tanstack/react-query';
import { PRODUCT, IS_BRAND_PENDING } from '@/config/product';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { createQueryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const queryClient = createQueryClient();

/**
 * Shell applicatif du jalon J1.3.
 * Aucune fonctionnalite metier : le socle technique est branche, rien de plus.
 * L'ecran dit la verite sur l'etat du systeme plutot que de simuler un produit.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle data-testid="product-name">{PRODUCT.displayName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Comparateur de mobilite multimodale — {PRODUCT.scope.city},{' '}
                {PRODUCT.scope.countryName}.
              </p>
              <p className="text-muted-foreground">
                Socle technique initialise. Aucune fonctionnalite n&apos;est encore disponible.
              </p>
              <div className="flex flex-wrap gap-2">
                {IS_BRAND_PENDING && <Badge variant="outline">Marque : ADR-001</Badge>}
                <Badge variant={IS_BACKEND_CONFIGURED ? 'default' : 'outline'}>
                  {IS_BACKEND_CONFIGURED ? 'Backend configure' : 'Backend non configure'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </main>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
