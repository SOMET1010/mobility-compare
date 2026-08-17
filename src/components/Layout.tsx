import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ConditionsBar } from '@/components/Conditions';

/**
 * LE squelette du site — une seule route parent (audit UX C1 : chaque page
 * reconstruisait son en-tête avec des liens recopiés, et le pied de page
 * existait en cinq exemplaires). La navigation est identique partout ;
 * la bande de conditions vit sur l'accueil et le comparateur.
 */
const NAV = [
  { to: '/observatoire', label: 'Observatoire' },
  { to: '/methode', label: 'Méthode' },
  { to: '/partenaires', label: 'Partenaires' },
  { to: '/compte', label: 'Compte' },
];

export function SiteLayout() {
  const { pathname } = useLocation();
  const surComparateur = pathname.startsWith('/comparer');
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader
        links={NAV}
        cta={surComparateur ? null : undefined}
        banner={
          surComparateur ? (
            <ConditionsBar pilote />
          ) : pathname === '/' ? (
            <ConditionsBar />
          ) : undefined
        }
      />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
