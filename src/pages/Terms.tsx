import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { Wordmark } from '@/components/BrandMark';
import { SiteHeader } from '@/components/SiteHeader';

/**
 * Conditions générales d'utilisation — VERSION PROVISOIRE.
 * Rédigées honnêtement pour l'état réel du service (démonstration/pilote,
 * aucune collecte serveur). La revue par un juriste ivoirien est une
 * dépendance ouverte (DEP-011) : la page l'affiche.
 */

const UPDATED = '15 août 2026';

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: '1. Objet',
    body: (
      <>
        {PRODUCT.displayName} est un comparateur neutre des mobilités urbaines (VTC, taxi compteur,
        woro-woro, gbaka) à Abidjan, Côte d’Ivoire. Le service aide à comparer prix, durée et
        compromis d’un trajet ; il ne vend pas de courses, ne met pas en relation avec des
        chauffeurs et ne perçoit aucune commission d’opérateur.
      </>
    ),
  },
  {
    title: '2. Statut du service : pilote de démonstration',
    body: (
      <>
        Le service est en phase de démonstration. Les prix et durées affichés sont des{' '}
        <b>estimations non contractuelles</b> : ils ne constituent ni une offre, ni un tarif
        opposable, ni un conseil. Les grilles tarifaires officielles et les relevés de terrain ne
        sont pas encore intégrés ; chaque écran indique le statut de la donnée (réelle, estimée ou
        simulée) et son indice de confiance.
      </>
    ),
  },
  {
    title: '3. Compte',
    body: (
      <>
        L’inscription proposée est une <b>simulation locale</b> : aucun SMS n’est réellement envoyé
        et aucune donnée n’est transmise à un serveur. Le profil créé est stocké uniquement dans le
        navigateur de l’appareil et peut être supprimé à tout moment depuis la page{' '}
        <Link to="/compte" className="font-semibold text-primary underline">
          Compte
        </Link>
        . L’inscription réelle par SMS sera couverte par une mise à jour des présentes conditions.
      </>
    ),
  },
  {
    title: '4. Données personnelles',
    body: (
      <>
        {PRODUCT.displayName} ne collecte aucune donnée personnelle sur ses serveurs : pas de compte
        serveur, pas de cookie de suivi, pas de mesure d’audience. Les préférences (onboarding vu,
        profil simulé) restent dans le stockage local du navigateur. Le navigateur contacte
        directement des services tiers pour fonctionner : OpenStreetMap (fonds de carte), Open-Meteo
        (météo, coordonnées fixes d’Abidjan) et Cloudflare Pages (hébergement) — chacun peut
        journaliser techniquement les requêtes selon ses propres conditions. Le calcul d’itinéraire
        par les rues, qui manipule des origines et destinations (données personnelles), passera
        exclusivement par notre couche de services, jamais par un appel direct du navigateur à un
        tiers.
      </>
    ),
  },
  {
    title: '5. Neutralité du classement',
    body: (
      <>
        Le classement des modes ne peut pas être influencé par un sponsor, une promotion ou une
        commission : le moteur n’a structurellement pas accès à ces notions et une vérification
        automatique bloque toute publication qui en introduirait. La méthode est décrite sur la page{' '}
        <Link to="/methode" className="font-semibold text-primary underline">
          Méthode
        </Link>
        .
      </>
    ),
  },
  {
    title: '6. Responsabilité',
    body: (
      <>
        Les informations sont fournies « en l’état », à titre indicatif. {PRODUCT.displayName} ne
        garantit pas la disponibilité des modes, l’exactitude des estimations ni la disponibilité
        continue du service, et ne saurait être tenu responsable des décisions prises sur la base
        des informations affichées pendant la phase de démonstration.
      </>
    ),
  },
  {
    title: '7. Propriété intellectuelle',
    body: (
      <>
        Le nom, l’identité visuelle et l’hébergement sont provisoires, dans l’attente de l’arbitrage
        de marque. Les fonds de carte sont © OpenStreetMap (ODbL) ; la météo provient d’Open-Meteo
        (CC BY 4.0).
      </>
    ),
  },
  {
    title: '8. Droit applicable et évolution',
    body: (
      <>
        Le service vise le cadre du droit ivoirien, notamment la loi n° 2013-450 relative à la
        protection des données à caractère personnel (ARTCI) dès qu’une collecte réelle existera.{' '}
        <b>Version provisoire</b> : ces conditions seront soumises à revue juridique avant toute
        mise en production (DEP-011) et pourront évoluer ; la date de mise à jour fait foi.
      </>
    ),
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/', label: 'Accueil' },
          { to: '/methode', label: 'Méthode' },
        ]}
      />

      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Juridique
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Conditions générales d’utilisation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version provisoire · mise à jour le {UPDATED} · en attente de revue juridique (DEP-011).
        </p>

        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-bold">{s.title}</h2>
              <p className="mt-1.5 text-[14px] leading-[1.65] text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-5 py-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" />
          <p>
            {PRODUCT.scope.city}, {PRODUCT.scope.countryName} · Identité et hébergement provisoires.
          </p>
        </div>
      </footer>
    </div>
  );
}
