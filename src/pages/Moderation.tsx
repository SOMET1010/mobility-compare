import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { COMMUNES, MODE_META } from '@/demo/scenario';
import {
  decide,
  decideCandidature,
  isOutlier,
  listCandidatures,
  listPending,
  PLAUSIBLE_XOF,
  type CandidatureStatut,
  type OperatorApplication,
  type PendingObservation,
} from '@/features/moderation/api';
import {
  getAiConfig,
  setAiConfig,
  testAi,
  type AiConfigStatus,
} from '@/features/assistant/adminApi';
import { getAudience, type AudienceDay } from '@/features/audience/adminApi';

/**
 * Écran de modération — PROTÉGÉ par jeton de modérateur.
 * Rien ne se publie sans passer ici : chaque observation PENDING est
 * approuvée ou rejetée à la main (CDC M4). Le jeton vit en sessionStorage
 * (fermé l'onglet, fermée la session) ; l'écran n'est pas référencé dans la
 * navigation publique.
 */

const TOKEN_KEY = 'mobilis.moderation-token.v1';
const XOF = new Intl.NumberFormat('fr-FR');
const communeName = (id: string) => COMMUNES.find((c) => c.id === id)?.name ?? id;

export default function Moderation() {
  const [token, setToken] = useState<string>(() =>
    typeof window === 'undefined' ? '' : (window.sessionStorage.getItem(TOKEN_KEY) ?? ''),
  );
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingObservation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (tok: string) => {
    setLoading(true);
    setError(null);
    const res = await listPending(tok);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      if (res.error.includes('autoris')) {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
      }
      return;
    }
    setPending(res.value.pending);
  }, []);

  useEffect(() => {
    if (token) void refresh(token);
  }, [token, refresh]);

  function signIn() {
    const tok = input.trim();
    if (tok.length < 20) {
      setError('Jeton trop court.');
      return;
    }
    window.sessionStorage.setItem(TOKEN_KEY, tok);
    setInput('');
    setToken(tok);
  }

  function signOut() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setPending(null);
  }

  async function judge(obs: PendingObservation, decision: 'APPROVED' | 'REJECTED') {
    const res = await decide(token, obs.id, decision);
    if (!res.ok) {
      toast.error('Échec — rien n’a changé', { description: res.error });
      return;
    }
    toast.success(decision === 'APPROVED' ? 'Observation approuvée' : 'Observation rejetée', {
      description: `${communeName(obs.from_commune)} → ${communeName(obs.to_commune)} · ${MODE_META[obs.mode].label} · ${XOF.format(obs.price_xof)} FCFA`,
    });
    setPending((list) => (list ? list.filter((o) => o.id !== obs.id) : list));
  }

  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <p className="text-label font-bold uppercase tracking-widest text-muted-foreground">
          Espace protégé
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Modération des relevés</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rien ne se publie sans décision humaine : chaque relevé en attente est approuvé ou rejeté
          ici (CDC M4). Anonyme par conception — il n’y a rien d’autre à voir que la transaction.
        </p>

        {!token ? (
          /* ------------------------------------------------- porte d'entrée */
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <label
              htmlFor="mod-token"
              className="mb-1.5 block text-label font-bold uppercase tracking-wider text-muted-foreground"
            >
              Jeton de modérateur
            </label>
            <input
              id="mod-token"
              type="password"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
              placeholder="mob_…"
              className="w-full rounded-xl border bg-background px-3.5 py-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && (
              <p className="mt-2 text-note font-medium text-warn" role="alert">
                {error}
              </p>
            )}
            <Button className="mt-4 h-11 w-full" onClick={signIn}>
              Entrer
            </Button>
            <p className="mt-3 text-label leading-snug text-muted-foreground">
              Le jeton n’est jamais stocké en clair côté serveur (empreinte SHA-256) et reste dans
              cette session de navigateur uniquement.
            </p>
          </div>
        ) : (
          /* --------------------------------------------------- file d'attente */
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold tabular-nums">
                {pending === null
                  ? 'Chargement…'
                  : `${pending.length} relevé${pending.length > 1 ? 's' : ''} en attente`}
              </span>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refresh(token)}
                  disabled={loading}
                >
                  Actualiser
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Quitter
                </Button>
              </span>
            </div>

            {error && (
              <p className="mt-3 text-note font-medium text-warn" role="alert">
                {error}
              </p>
            )}

            {pending !== null && pending.length === 0 && !error && (
              <div className="mt-4 rounded-2xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
                File vide — tout est traité. Les nouveaux dépôts de l’application et les imports CSV
                apparaîtront ici.
              </div>
            )}

            <div className="mt-4 space-y-3">
              {pending?.map((obs) => {
                const outlier = isOutlier(obs.mode, obs.price_xof);
                const [min, max] = PLAUSIBLE_XOF[obs.mode];
                return (
                  <div key={obs.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">
                        {communeName(obs.from_commune)} → {communeName(obs.to_commune)}
                      </span>
                      <span className="text-lg font-extrabold tabular-nums">
                        {XOF.format(obs.price_xof)}{' '}
                        <span className="text-tiny font-semibold text-muted-foreground">FCFA</span>
                      </span>
                    </div>
                    <div className="mt-1 text-note text-muted-foreground">
                      {MODE_META[obs.mode].label} · observé le{' '}
                      {new Date(obs.observed_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {obs.rush_hour === true ? ' · heure de pointe' : ''}
                      {typeof obs.wait_min === 'number' ? ` · ⏱ ${obs.wait_min} min d’attente` : ''}
                      {' · source : '}
                      {obs.source === 'app' ? 'application' : 'import CSV'}
                    </div>
                    {obs.comment && (
                      <p className="mt-1 text-note italic text-muted-foreground">
                        « {obs.comment} »
                      </p>
                    )}
                    {outlier && (
                      <p className="mt-2 rounded-lg bg-warn/8 px-2.5 py-1.5 text-label font-medium text-warn">
                        ⚠ Hors plage de vraisemblance {MODE_META[obs.mode].label} ({XOF.format(min)}
                        –{XOF.format(max)} FCFA) — à vérifier avant d’approuver.
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="border-warn/40 text-warn hover:bg-warn/8"
                        onClick={() => judge(obs, 'REJECTED')}
                      >
                        Rejeter
                      </Button>
                      <Button
                        className="bg-brand-olive text-white hover:brightness-110"
                        onClick={() => judge(obs, 'APPROVED')}
                      >
                        Approuver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <CandidaturesPanel token={token} />

            <AudiencePanel token={token} />

            <AiConfigPanel token={token} />
          </div>
        )}
      </main>
    </>
  );
}

/**
 * File d'examen des candidatures d'opérateurs (page Partenaires).
 * Accepter ne publie RIEN automatiquement : la publication dans la table
 * operators reste un geste séparé, avec statut d'agrément vérifié, daté
 * et sourcé (invariant I4).
 */
function CandidaturesPanel({ token }: { token: string }) {
  const [liste, setListe] = useState<OperatorApplication[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const res = await listCandidatures(token);
    if (res.ok) {
      setListe(res.value.candidatures);
      setErreur(null);
    } else setErreur(res.error);
  }, [token]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function statuer(c: OperatorApplication, statut: CandidatureStatut) {
    const res = await decideCandidature(token, c.id, statut);
    if (!res.ok) {
      toast.error('Échec — rien n’a changé', { description: res.error });
      return;
    }
    const libelle =
      statut === 'ACCEPTEE'
        ? 'Candidature acceptée'
        : statut === 'REFUSEE'
          ? 'Candidature refusée'
          : 'Candidature mise en examen';
    toast.success(libelle, {
      description:
        statut === 'ACCEPTEE'
          ? `${c.nom} — pensez à publier l’opérateur (table operators) avec un statut d’agrément vérifié, daté et sourcé.`
          : c.nom,
    });
    if (statut === 'EN_EXAMEN') {
      setListe((l) => (l ? l.map((x) => (x.id === c.id ? { ...x, statut } : x)) : l));
    } else {
      setListe((l) => (l ? l.filter((x) => x.id !== c.id) : l));
    }
  }

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-label font-bold uppercase tracking-widest text-muted-foreground">
          Candidatures d’opérateurs
        </h2>
        <Button variant="outline" size="sm" onClick={charger}>
          Actualiser
        </Button>
      </div>

      {erreur && <p className="mt-2 text-note text-muted-foreground">{erreur}</p>}
      {liste === null && !erreur && (
        <p className="mt-2 text-note text-muted-foreground">Chargement…</p>
      )}
      {liste !== null && liste.length === 0 && !erreur && (
        <p className="mt-2 text-note text-muted-foreground">
          Aucune candidature en attente — celles déposées sur la page Partenaires apparaîtront ici.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {liste?.map((c) => (
          <div key={c.id} className="rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold">{c.nom}</span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-tiny font-bold">
                  {MODE_META[c.mode].emoji} {MODE_META[c.mode].label}
                </span>
                {c.statut === 'EN_EXAMEN' && (
                  <span className="rounded-full bg-brand-ochre/12 px-2 py-0.5 text-tiny font-bold uppercase tracking-wide text-brand-ochre">
                    En examen
                  </span>
                )}
              </span>
            </div>
            <p className="mt-1 font-mono text-note">{c.contact}</p>
            <p className="mt-0.5 text-label text-muted-foreground">
              Déposée le{' '}
              {new Date(c.created_at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {c.reference_agrement ? (
                <>
                  {' '}
                  · agrément déclaré : <b>{c.reference_agrement}</b> (à vérifier — jamais sur
                  parole)
                </>
              ) : (
                ' · aucun agrément déclaré'
              )}
            </p>
            {c.message && (
              <p className="mt-1.5 text-note italic text-muted-foreground">« {c.message} »</p>
            )}
            {(c.api_devis_url || c.contact_technique) && (
              <p className="mt-1.5 rounded-lg bg-trace-1/8 px-2.5 py-1.5 text-label text-foreground/80">
                🔌 <b>Intégration API proposée</b>
                {c.api_devis_url && (
                  <>
                    {' '}
                    · devis : <span className="font-mono">{c.api_devis_url}</span>
                  </>
                )}
                {c.contact_technique && (
                  <>
                    {' '}
                    · technique : <span className="font-mono">{c.contact_technique}</span>
                  </>
                )}{' '}
                — voir docs/CONTRAT_INTERFACE_VTC.md avant tout branchement.
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-warn/40 text-warn hover:bg-warn/8"
                onClick={() => statuer(c, 'REFUSEE')}
              >
                Refuser
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={c.statut === 'EN_EXAMEN'}
                onClick={() => statuer(c, 'EN_EXAMEN')}
              >
                En examen
              </Button>
              <Button
                size="sm"
                className="bg-brand-olive text-white hover:brightness-110"
                onClick={() => statuer(c, 'ACCEPTEE')}
              >
                Accepter
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-label leading-snug text-muted-foreground">
        Accepter ne publie rien tout seul : la publication dans le comparateur exige un statut
        d’agrément <b>vérifié auprès des sources officielles, daté et sourcé</b> (invariant I4).
      </p>
    </section>
  );
}

/**
 * Tableau de bord d'audience — compteurs souverains et anonymes.
 * Visites = sessions de navigation, pas des personnes : sans cookie ni
 * identifiant, le même visiteur revenu le lendemain compte pour une
 * nouvelle visite. C'est dit tel quel, sur l'écran comme ici.
 */
function AudiencePanel({ token }: { token: string }) {
  const [jours, setJours] = useState<readonly AudienceDay[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAudience(token).then((res) => {
      if (cancelled) return;
      if (res.ok) setJours(res.jours);
      else setErreur(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const ilYA7 = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const somme = (liste: readonly AudienceDay[]) =>
    liste.reduce((acc, d) => ({ visites: acc.visites + d.visites, vues: acc.vues + d.vues }), {
      visites: 0,
      vues: 0,
    });
  const tous = jours ?? [];
  const totalJour = somme(tous.filter((d) => d.jour === aujourdHui));
  const total7 = somme(tous.filter((d) => d.jour >= ilYA7));
  const total30 = somme(tous);

  const parPage = new Map<string, { visites: number; vues: number }>();
  for (const d of tous) {
    const cur = parPage.get(d.page) ?? { visites: 0, vues: 0 };
    parPage.set(d.page, { visites: cur.visites + d.visites, vues: cur.vues + d.vues });
  }
  const pagesTriees = [...parPage.entries()].sort((a, b) => b[1].vues - a[1].vues);

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="text-label font-bold uppercase tracking-widest text-muted-foreground">
        Audience — compteur souverain
      </h2>

      {erreur && <p className="mt-2 text-note text-muted-foreground">{erreur}</p>}
      {jours === null && !erreur && (
        <p className="mt-2 text-note text-muted-foreground">Chargement…</p>
      )}

      {jours !== null && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Aujourd'hui", totalJour],
                ['7 jours', total7],
                ['30 jours', total30],
              ] as const
            ).map(([libelle, t]) => (
              <div key={libelle} className="rounded-xl border bg-background px-2 py-3">
                <p className="text-xl font-extrabold tabular-nums">{XOF.format(t.visites)}</p>
                <p className="text-label text-muted-foreground">
                  visites · {XOF.format(t.vues)} vues
                </p>
                <p className="mt-0.5 text-tiny font-bold uppercase tracking-wider text-muted-foreground">
                  {libelle}
                </p>
              </div>
            ))}
          </div>

          {pagesTriees.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-label font-bold uppercase tracking-wider text-muted-foreground">
                Par page (30 jours)
              </p>
              {pagesTriees.map(([page, t]) => (
                <div
                  key={page}
                  className="flex items-baseline justify-between border-b py-1 text-note last:border-b-0"
                >
                  <span className="font-mono">{page}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {XOF.format(t.visites)} visites · {XOF.format(t.vues)} vues
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-label leading-snug text-muted-foreground">
        Compté chez nous, sans cookie, sans adresse IP, sans identifiant : une <b>visite</b> est une
        session de navigation, pas une personne — un visiteur revenu le lendemain compte pour une
        nouvelle visite. Les navigateurs demandant à ne pas être suivis ne sont pas comptés. Repère
        CDC §13.7 : aucune monétisation avant une audience mensuelle mesurée de 10 000.
      </p>
    </section>
  );
}

/**
 * Configuration de l'assistant IA — clé, modèle, adresse du fournisseur.
 * La clé part vers le serveur et n'en revient jamais : l'état affiché ne
 * contient qu'une empreinte masquée (« ••••1234 »).
 */
function AiConfigPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await getAiConfig(token);
    if (res.ok) {
      setStatus(res.value);
      setModel(res.value.model ?? '');
      setBaseUrl(res.value.base_url ?? '');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    const res = await setAiConfig(token, {
      api_key: apiKey.trim() || undefined,
      model: model.trim() || undefined,
      base_url: baseUrl.trim() || undefined,
    });
    if (!res.ok) {
      setBusy(false);
      toast.error('Échec de l’enregistrement', { description: res.error });
      return;
    }
    toast.success('Configuration enregistrée', {
      description: res.value.warning ?? 'Test en cours…',
    });
    setApiKey('');
    void load();
    // Test automatique : l'état de la clé qu'on vient d'enregistrer, sans ambiguïté.
    const probe = await testAi(token);
    setBusy(false);
    if (probe.ok && probe.value.ok) {
      toast.success('Clé valide ✓', {
        description: probe.value.switched_base_url
          ? `Votre clé appartient à l'autre plateforme Moonshot — adresse corrigée automatiquement (${probe.value.switched_base_url}).`
          : probe.value.adjusted_model
            ? `Modèle ajusté automatiquement : ${probe.value.adjusted_model} (le nom configuré n'existait pas chez le fournisseur).`
            : `Le modèle ${probe.value.model} a répondu.`,
      });
      if (probe.value.switched_base_url || probe.value.adjusted_model) void load();
    } else {
      toast.error('La clé enregistrée ne fonctionne pas', {
        description: probe.ok ? probe.value.error : probe.error,
      });
    }
  }

  async function probe() {
    setBusy(true);
    const res = await testAi(token);
    setBusy(false);
    if (!res.ok) {
      toast.error('Test impossible', { description: res.error });
      return;
    }
    if (res.value.ok) {
      toast.success('Clé valide ✓', {
        description: res.value.switched_base_url
          ? `Votre clé appartient à l'autre plateforme Moonshot — adresse corrigée automatiquement (${res.value.switched_base_url}).`
          : res.value.adjusted_model
            ? `Modèle ajusté automatiquement : ${res.value.adjusted_model} (le nom configuré n'existait pas chez le fournisseur).`
            : `Le modèle ${res.value.model} a répondu.`,
      });
      if (res.value.switched_base_url || res.value.adjusted_model) void load();
    } else {
      toast.error('La clé ne fonctionne pas', { description: res.value.error });
    }
  }

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="text-label font-bold uppercase tracking-widest text-muted-foreground">
        Assistant IA — configuration
      </h2>
      <p className="mt-1.5 text-note leading-snug text-muted-foreground">
        {status === null
          ? 'Chargement…'
          : status.configured
            ? `Actif · clé ${status.key_hint} · modèle ${status.model}` +
              (status.updated_at
                ? ` · enregistrée le ${new Date(status.updated_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : '') +
              (status.source === 'secret' ? ' · définie par secret serveur (prioritaire)' : '')
            : 'Aucune clé configurée — l’assistant répond uniquement en mode guidé.'}
      </p>

      <label
        htmlFor="ai-key"
        className="mb-1 mt-4 block text-label font-bold uppercase tracking-wider text-muted-foreground"
      >
        Clé d’API du fournisseur
      </label>
      <input
        id="ai-key"
        type="password"
        autoComplete="off"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={status?.configured ? 'Laisser vide pour conserver la clé actuelle' : 'sk-…'}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="ai-model"
            className="mb-1 block text-label font-bold uppercase tracking-wider text-muted-foreground"
          >
            Modèle
          </label>
          <input
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="kimi-latest"
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="ai-base"
            className="mb-1 block text-label font-bold uppercase tracking-wider text-muted-foreground"
          >
            Adresse de l’API
          </label>
          <input
            id="ai-base"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.moonshot.ai/v1"
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={probe} disabled={busy || !status?.configured}>
          Tester la clé
        </Button>
        <Button onClick={save} disabled={busy || (!apiKey.trim() && !status?.configured)}>
          Enregistrer
        </Button>
      </div>

      <p className="mt-3 text-label leading-snug text-muted-foreground">
        « Tester la clé » vérifie la clé <b>enregistrée</b> — un texte tapé ci-dessus sans «
        Enregistrer » n’est pas pris en compte (l’enregistrement lance le test tout seul).
      </p>
      <p className="mt-2 text-label leading-snug text-muted-foreground">
        La clé est stockée côté serveur (table protégée, aucune lecture publique) et n’est jamais
        renvoyée au navigateur. Compatible avec toute API au format OpenAI (Kimi/Moonshot par
        défaut). La charte de l’assistant — aucun prix inventé, neutralité, pas de données
        personnelles — s’applique quel que soit le modèle.
      </p>
    </section>
  );
}
