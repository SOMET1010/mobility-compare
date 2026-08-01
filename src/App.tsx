import { PRODUCT, IS_BRAND_PENDING } from '@/config/product';

/**
 * Point d'entree minimal du jalon J1.
 * Aucune fonctionnalite : le socle est pose, la construction commence a J2.
 * Cet ecran est deliberement honnete sur l'etat du produit.
 */
export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{PRODUCT.displayName}</h1>
      <p className="text-sm">
        Comparateur de mobilite multimodale — {PRODUCT.scope.city}, {PRODUCT.scope.countryName}.
      </p>
      <p className="text-sm">
        Socle technique initialise (jalon J1). Aucune fonctionnalite n&apos;est encore disponible.
      </p>
      {IS_BRAND_PENDING && (
        <p className="text-xs" role="note">
          Nom commercial en attente d&apos;arbitrage — ADR-001.
        </p>
      )}
    </main>
  );
}
