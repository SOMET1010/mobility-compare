import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PRODUCT } from '@/config/product';
import { BrandMark, Wordmark } from '@/components/BrandMark';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { MODE_META, type DemoMode } from '@/demo/scenario';
import { submitCandidature } from '@/features/operators/candidature';
import { IS_BACKEND_CONFIGURED } from '@/config/env';

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

/** Modes proposés au candidat — libellés de l'écran, valeurs de la base. */
const MODES_CANDIDATURE: readonly DemoMode[] = [
  'VTC',
  'TAXI',
  'WORO',
  'GBAKA',
  'MOTO',
  'TRICYCLE',
  'CARGO',
];

function CandidatureForm() {
  const [nom, setNom] = useState('');
  const [mode, setMode] = useState<DemoMode>('VTC');
  const [contact, setContact] = useState('');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  // Pot de miel anti-robots : caché aux humains, jamais rempli par eux.
  const [site, setSite] = useState('');
  const [sending, setSending] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (site.trim() !== '') return; // robot : on ignore silencieusement
    setSending(true);
    const result = await submitCandidature({
      nom,
      mode,
      contact,
      referenceAgrement: reference || undefined,
      message: message || undefined,
    });
    setSending(false);
    if (result.outcome === 'SAVED') {
      toast.success('Candidature reçue — merci !', {
        description:
          'Votre statut d’agrément sera vérifié auprès des sources officielles avant toute publication. Vous serez recontacté au contact indiqué.',
      });
      setNom('');
      setContact('');
      setReference('');
      setMessage('');
    } else if (result.outcome === 'SIMULATED') {
      toast('Démonstration — rien n’a été enregistré', {
        description: 'Dans le produit réel, votre candidature partirait en file d’examen.',
      });
    } else {
      toast.error('Candidature non envoyée', { description: result.message });
    }
  }

  const champClass =
    'w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <form onSubmit={envoyer} className="mt-6 max-w-xl rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Déposer une candidature</h3>
      <p className="mt-1 text-note text-muted-foreground">
        Trois champs suffisent — le reste aide l’examen.{' '}
        {IS_BACKEND_CONFIGURED ? '' : 'Mode démonstration : rien ne sera enregistré.'}
      </p>

      <label className="mb-1 mt-4 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Nom de l’opérateur *
      </label>
      <input
        type="text"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        required
        maxLength={120}
        placeholder="Ex. : Coursiers du Plateau"
        className={champClass}
      />

      <label className="mb-1 mt-3 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Type de service *
      </label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as DemoMode)}
        className={champClass}
      >
        {MODES_CANDIDATURE.map((m) => (
          <option key={m} value={m}>
            {MODE_META[m].emoji} {MODE_META[m].label} — {MODE_META[m].note}
          </option>
        ))}
      </select>

      <label className="mb-1 mt-3 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Contact joignable (e-mail ou téléphone) *
      </label>
      <input
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        required
        maxLength={200}
        placeholder="contact@operateur.ci ou +225 …"
        className={champClass}
      />

      <label className="mb-1 mt-3 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Référence d’agrément (si vous en avez une)
      </label>
      <input
        type="text"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        maxLength={200}
        placeholder="N° d’agrément ARTI / DGTTC, arrêté…"
        className={champClass}
      />

      <label className="mb-1 mt-3 block text-label font-bold uppercase tracking-wider text-muted-foreground">
        Message (facultatif)
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Zones desservies, flotte, grille tarifaire publique…"
        className={champClass}
      />

      {/* Pot de miel : invisible pour les humains */}
      <input
        type="text"
        value={site}
        onChange={(e) => setSite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      <Button type="submit" disabled={sending} className="mt-4 w-full">
        {sending ? 'Envoi…' : 'Envoyer ma candidature'}
      </Button>
      <p className="mt-2 text-tiny leading-snug text-muted-foreground">
        Seules ces informations sont transmises — aucune donnée de navigation. La candidature
        n’entraîne aucune publication automatique : vérification d’agrément d’abord, toujours.
      </p>
    </form>
  );
}

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
      <section className="bg-brand-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sprout">
            Institutions · Opérateurs · Usagers
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl sm:leading-[1.05]">
            Un observatoire neutre de la mobilité urbaine.
          </h1>
          <p className="mt-4 max-w-2xl text-emph leading-[1.6] text-white/70 sm:text-lg">
            {PRODUCT.displayName} compare les mobilités d’Abidjan sans vendre de courses et sans
            classement payant. Un outil d’intérêt public, pensé pour l’échelle nationale.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              to="/comparer"
              className="inline-flex items-center justify-center rounded-xl bg-brand-ochre px-6 py-3 text-base font-semibold text-brand-ink transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink active:brightness-95"
            >
              Ouvrir le comparateur →
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-medium text-white/90 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink active:bg-white/10"
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
              {a.title === 'Opérateurs de transport' && (
                <a
                  href="#candidature"
                  className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Candidater pour être listé →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PRINCIPES */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Nos principes de partenariat</h2>
          <p className="mt-2 max-w-2xl text-emph leading-[1.6] text-muted-foreground">
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
        <p className="mt-2 max-w-2xl text-emph leading-[1.6] text-muted-foreground">
          Les dépendances ouvertes du projet sont d’abord des partenariats à nouer.
        </p>
        <div className="mt-6 grid gap-3 sm:gap-5 md:grid-cols-3">
          {NEEDS.map((n) => (
            <div key={n.title} className="rounded-2xl border bg-card p-5">
              <span className="inline-block rounded-full bg-primary/12 px-2.5 py-1 text-label font-semibold text-primary">
                {n.tag}
              </span>
              <h3 className="mt-4 font-semibold">{n.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{n.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          <b className="text-foreground">Prise de contact.</b> Le nom {PRODUCT.displayName} est acté
          (ADR-001) ; le canal officiel (domaine, adresse) est en cours de mise en place. En
          attendant, la démonstration publique tient lieu de présentation, et les opérateurs peuvent
          déjà candidater ci-dessous.
        </div>
      </section>

      {/* CANDIDATURE OPÉRATEUR */}
      <section id="candidature" className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl scroll-mt-16 px-5 py-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Opérateurs : rejoindre le comparateur</h2>
          <p className="mt-2 max-w-2xl text-emph leading-[1.6] text-muted-foreground">
            Être listé est <b>gratuit</b> et l’ordre du classement <b>ne s’achète pas</b> — la
            candidature n’a aucun effet sur le tri, garanti par le code et vérifié à chaque
            livraison.
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-5">
            {[
              {
                n: '1',
                title: 'Candidature',
                body: 'Vous décrivez votre service (transport de personnes ou livraison) et laissez un contact joignable.',
              },
              {
                n: '2',
                title: 'Vérification',
                body: 'Le statut d’agrément est vérifié auprès des sources officielles (ARTI, DGTTC), puis daté et sourcé — jamais déclaré sur parole.',
              },
              {
                n: '3',
                title: 'Publication',
                body: 'Votre service apparaît sur les fiches concernées, avec son statut vérifié. Aucune mise en avant payante n’existe.',
              },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border bg-card p-5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-body font-extrabold text-primary">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>

          <CandidatureForm />
        </div>
      </section>

      {/* PIED */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-note text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
