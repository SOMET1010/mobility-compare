import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { SiteHeader } from '@/components/SiteHeader';

/**
 * Page Partenaires — registre institutionnel.
 * Adresse les collectivités/autorités, les opérateurs et les usagers. Honnête :
 * aucun partenaire, logo, chiffre d'adoption ou témoignage inventé. Ce qui est
 * affirmé, ce sont les PRINCIPES du produit (neutralité, transparence) et les
 * BESOINS ouverts (données, terrain), pas des acquis fictifs.
 */

const AUDIENCES: { title: string; body: string }[] = [
  {
    title: 'Collectivités & autorités',
    body: 'Un observatoire neutre des mobilités urbaines : lecture comparée des modes, transparence tarifaire, appui à la décision publique. Sans intérêt commercial dans le classement.',
  },
  {
    title: 'Opérateurs de transport',
    body: 'Une visibilité équitable : la place dans le classement ne s’achète pas. Un canal pour publier des grilles officielles et être comparé sur des bases claires.',
  },
  {
    title: 'Usagers',
    body: 'Une comparaison honnête et gratuite : prix, temps et meilleur compromis sur un même écran, avec le calcul affiché et l’absence de donnée signalée plutôt que masquée.',
  },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: 'Neutralité inscrite dans le code',
    body: 'Le classement n’a aucun accès à un identifiant de sponsor, de promotion ou de commission. Une vérification automatique bloque la publication si un tel levier est introduit.',
  },
  {
    title: 'Transparence du calcul',
    body: 'Chaque prix expose sa formule, étape par étape. Le socle est testé en continu ; la neutralité est vérifiée à chaque livraison.',
  },
  {
    title: 'Données vérifiables',
    body: 'Une grille présentée comme officielle doit citer sa source datée. Sans observation de terrain, un tarif s’affiche comme non validé (indice de confiance 0).',
  },
  {
    title: 'Absence honnête',
    body: 'Quand une donnée manque, {name} le dit. Jamais d’estimation déguisée en certitude.',
  },
];

const NEEDS: { tag: string; title: string; body: string }[] = [
  {
    tag: 'Données',
    title: 'Grilles tarifaires officielles',
    body: 'Arrêtés et barèmes (taxi compteur, VTC) permettant de renseigner des grilles vérifiables et datées.',
  },
  {
    tag: 'Terrain',
    title: 'Relevés de prix pratiqués',
    body: 'Campagnes de collecte sur des corridors représentatifs, pour calibrer les modèles et alimenter l’indice de confiance.',
  },
  {
    tag: 'Institutionnel',
    title: 'Cadre & soutien',
    body: 'Partenaires publics et financiers pour porter un bien commun de mobilité à l’échelle de la ville, puis du pays.',
  },
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/', label: 'Accueil' },
          { to: '/methode', label: 'Méthode' },
        ]}
      />

      {/* HERO */}
      <section className="bg-[var(--brand-ink)] text-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C3D18F]">
            Institutions · Opérateurs · Usagers
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl sm:leading-[1.05]">
            Un observatoire neutre de la mobilité urbaine.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.6] text-white/70 sm:text-lg">
            {PRODUCT.displayName} compare les mobilités d’Abidjan sans vendre de courses et sans
            classement payant. Un outil d’intérêt public, pensé pour l’échelle nationale.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              to="/comparer"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-ochre)] px-6 py-3 text-base font-semibold text-[var(--brand-ink)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ochre)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-ink)] active:brightness-95"
            >
              Ouvrir le comparateur →
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-medium text-white/90 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-ink)] active:bg-white/10"
            >
              Devenir partenaire
            </a>
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <h2 className="text-2xl font-bold sm:text-3xl">Ce que MOBILIS apporte</h2>
        <div className="mt-6 grid gap-3 sm:gap-5 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-primary">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRINCIPES */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Nos principes de partenariat</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-[1.6] text-muted-foreground">
            Des engagements structurels, pas des slogans : ils sont tenus par le code et les tests.
          </p>
          <div className="mt-6 grid gap-3 sm:gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-2xl border bg-card p-5">
                <div className="flex items-start gap-3">
                  <BrandMark className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {p.body.replace('{name}', PRODUCT.displayName)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CE QUE NOUS CHERCHONS */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-12 sm:py-20">
        <h2 className="text-2xl font-bold sm:text-3xl">Ce que nous cherchons</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-[1.6] text-muted-foreground">
          Les dépendances ouvertes du projet sont d’abord des partenariats à nouer.
        </p>
        <div className="mt-6 grid gap-3 sm:gap-5 md:grid-cols-3">
          {NEEDS.map((n) => (
            <div key={n.title} className="rounded-2xl border bg-card p-5">
              <span className="inline-block rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {n.tag}
              </span>
              <h3 className="mt-4 font-semibold">{n.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{n.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          <b className="text-foreground">Prise de contact.</b> Le canal officiel (adresse, domaine)
          est <b>en cours de définition</b> : la marque et l’identité restent provisoires tant que
          l’arbitrage n’est pas rendu (ADR-001 / DEP-007). En attendant, la démonstration publique
          tient lieu de présentation.
        </div>
      </section>

      {/* PIED */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" />
          <p>
            {PRODUCT.scope.city}, {PRODUCT.scope.countryName} · Identité, nom et hébergement
            provisoires · Démonstration à données simulées.
          </p>
        </div>
      </footer>
    </div>
  );
}
