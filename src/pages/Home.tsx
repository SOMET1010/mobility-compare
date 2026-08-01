import { Link } from 'react-router-dom';
import { PRODUCT, IS_BRAND_PENDING } from '@/config/product';
import { IS_BACKEND_CONFIGURED } from '@/config/env';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Écran d'accueil — reste HONNÊTE : il dit l'état réel du système. La
 * démonstration est un parcours séparé, explicitement marqué « simulation ».
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="product-name">{PRODUCT.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Comparateur de mobilite multimodale — {PRODUCT.scope.city}, {PRODUCT.scope.countryName}.
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
          <div className="space-y-2 pt-2">
            <Button asChild className="w-full">
              <Link to="/demo">Voir la démonstration (simulation) →</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Parcours illustratif à données 100 % fictives. Aucun prix, durée ou itinéraire réel.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
