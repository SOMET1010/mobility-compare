import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCT } from '@/config/product';
import { Wordmark } from '@/components/BrandMark';
import { SiteHeader } from '@/components/SiteHeader';
import { AdSlot } from '@/components/AdSlot';
import { ModeGlyph, type GlyphShape } from '@/components/ModeGlyph';
import { COMMUNES, MODE_META, type DemoMode } from '@/demo/scenario';
import { MEDIAN_MIN_OBSERVATIONS } from '@/features/contributions/aggregate';
import { fetchObservatory, type ObservatoryData } from '@/features/contributions/observatory';

/**
 * Observatoire des prix — CDC M10, version pilote.
 * Transparence publique de la collecte : uniquement des observations
 * APPROUVÉES, agrégées par corridor et par mode. Aucune valeur simulée ici :
 * quand il n'y a rien, la page montre qu'il n'y a rien.
 */

const XOF = new Intl.NumberFormat('fr-FR');
const GLYPH: Record<DemoMode, GlyphShape> = {
  VTC: 'vtc',
  TAXI: 'taxi',
  WORO: 'woro',
  GBAKA: 'gbaka',
  MOTO: 'moto',
  TRICYCLE: 'tricycle',
  CARGO: 'cargo',
};
const MODE_ORDER: DemoMode[] = ['VTC', 'TAXI', 'WORO', 'GBAKA', 'MOTO', 'TRICYCLE', 'CARGO'];

const communeName = (id: string) => COMMUNES.find((c) => c.id === id)?.name ?? id;
const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Observatory() {
  const [data, setData] = useState<ObservatoryData | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetchObservatory().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        links={[
          { to: '/', label: 'Accueil' },
          { to: '/methode', label: 'Méthode' },
        ]}
      />

      {/* En-tête encre */}
      <section className="bg-brand-ink text-white">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sprout">
            Observatoire des prix · version pilote
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
            Ce que les usagers paient vraiment, corridor par corridor.
          </h1>
          <p className="mt-4 max-w-2xl text-emph leading-[1.6] text-white/70">
            Uniquement des prix <b className="text-white">réellement payés</b>, déposés par les
            usagers ou relevés sur le terrain, puis modérés. Aucune estimation, aucune valeur
            simulée sur cette page.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        {data === 'loading' && (
          <p className="text-sm font-medium text-muted-foreground">Chargement des relevés…</p>
        )}

        {data === null && (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
            L’observatoire est momentanément injoignable — plutôt que d’afficher des chiffres en
            cache d’une fraîcheur inconnue, cette page préfère le dire. Réessayez dans un instant.
          </div>
        )}

        {data !== 'loading' && data !== null && (
          <>
            {/* Compteurs globaux */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-2xl font-extrabold tabular-nums">{data.total}</div>
                <div className="mt-0.5 text-label leading-snug text-muted-foreground">
                  relevé{data.total > 1 ? 's' : ''} approuvé{data.total > 1 ? 's' : ''}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-2xl font-extrabold tabular-nums">{data.corridors.length}</div>
                <div className="mt-0.5 text-label leading-snug text-muted-foreground">
                  corridor{data.corridors.length > 1 ? 's' : ''} couvert
                  {data.corridors.length > 1 ? 's' : ''}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <div className="text-body font-extrabold leading-tight">
                  {data.latestAt ? dateFr(data.latestAt) : '—'}
                </div>
                <div className="mt-0.5 text-label leading-snug text-muted-foreground">
                  dernier relevé
                </div>
              </div>
            </div>

            {data.total === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
                Aucune observation approuvée pour l’instant — la collecte démarre. Cette page se
                remplira au rythme des relevés modérés, jamais plus vite.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {data.corridors.map((c) => (
                  <section
                    key={`${c.fromId}-${c.toId}`}
                    className="rounded-2xl border bg-card p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-lg font-extrabold">
                        {communeName(c.fromId)} → {communeName(c.toId)}
                      </h2>
                      <span className="text-label font-medium tabular-nums text-muted-foreground">
                        {c.total} relevé{c.total > 1 ? 's' : ''}
                        {c.latestAt ? ` · dernier le ${dateFr(c.latestAt)}` : ''}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {MODE_ORDER.filter((m) => c.byMode[m]).map((m) => {
                        const agg = c.byMode[m]!;
                        const meta = MODE_META[m];
                        return (
                          <div
                            key={m}
                            className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5"
                          >
                            <span
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                              style={{
                                color: meta.color,
                                backgroundColor: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                              }}
                              aria-hidden="true"
                            >
                              <ModeGlyph shape={GLYPH[m]} className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-body font-bold leading-tight">
                                {meta.label}
                              </span>
                              <span className="text-label text-muted-foreground">
                                {agg.count} relevé{agg.count > 1 ? 's' : ''}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {agg.medianXof !== null ? (
                                <>
                                  <span className="block text-emph font-extrabold tabular-nums leading-none">
                                    ~{XOF.format(agg.medianXof)}
                                  </span>
                                  <span className="text-tiny font-semibold text-muted-foreground">
                                    FCFA · médiane
                                  </span>
                                </>
                              ) : (
                                <span className="text-tiny font-medium leading-tight text-muted-foreground">
                                  médiane dès
                                  <br />
                                  {MEDIAN_MIN_OBSERVATIONS} relevés
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* Appel à contribution */}
            <div className="mt-8 rounded-2xl border bg-muted/40 p-5 text-center">
              <h2 className="text-lg font-bold">Faites grandir l’observatoire</h2>
              <p className="mx-auto mt-1.5 max-w-md text-body leading-relaxed text-muted-foreground">
                Chaque prix réellement payé que vous déposez est modéré puis rendu public ici —
                anonyme par conception.
              </p>
              <Link
                to="/comparer"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-ochre px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Contribuer un tarif →
              </Link>
            </div>

            <div className="mt-6">
              <AdSlot slotId="observatoire" />
            </div>

            <p className="mt-6 text-label leading-relaxed text-muted-foreground">
              Méthode : médiane par mode, affichée à partir de {MEDIAN_MIN_OBSERVATIONS} relevés
              approuvés (seuil provisoire) ; les sens aller et retour sont comptés séparément. La
              modération écarte les aberrations manifestes ; rien n’est corrigé en silence. Détails
              sur la page{' '}
              <Link to="/methode" className="font-semibold text-primary underline">
                Méthode
              </Link>
              .
            </p>
          </>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-5 py-8 text-note text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" />
          <p>
            {PRODUCT.scope.city}, {PRODUCT.scope.countryName} · Observatoire pilote — données
            réelles modérées.
          </p>
        </div>
      </footer>
    </div>
  );
}
