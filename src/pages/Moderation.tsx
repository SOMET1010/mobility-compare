import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/SiteHeader';
import { COMMUNES, MODE_META } from '@/demo/scenario';
import {
  decide,
  isOutlier,
  listPending,
  PLAUSIBLE_XOF,
  type PendingObservation,
} from '@/features/moderation/api';
import {
  getAiConfig,
  setAiConfig,
  testAi,
  type AiConfigStatus,
} from '@/features/assistant/adminApi';

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
      toast('Échec — rien n’a changé', { description: res.error });
      return;
    }
    toast(decision === 'APPROVED' ? 'Observation approuvée' : 'Observation rejetée', {
      description: `${communeName(obs.from_commune)} → ${communeName(obs.to_commune)} · ${MODE_META[obs.mode].label} · ${XOF.format(obs.price_xof)} FCFA`,
    });
    setPending((list) => (list ? list.filter((o) => o.id !== obs.id) : list));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader links={[{ to: '/', label: 'Accueil' }]} />

      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
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
              <p className="mt-2 text-[12px] font-medium text-[#9A3412]" role="alert">
                {error}
              </p>
            )}
            <Button className="mt-4 h-11 w-full" onClick={signIn}>
              Entrer
            </Button>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
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
              <p className="mt-3 text-[12px] font-medium text-[#9A3412]" role="alert">
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
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          FCFA
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {MODE_META[obs.mode].label} · observé le{' '}
                      {new Date(obs.observed_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {obs.rush_hour === true ? ' · heure de pointe' : ''}
                      {' · source : '}
                      {obs.source === 'app' ? 'application' : 'import CSV'}
                    </div>
                    {obs.comment && (
                      <p className="mt-1 text-[12px] italic text-muted-foreground">
                        « {obs.comment} »
                      </p>
                    )}
                    {outlier && (
                      <p className="mt-2 rounded-lg bg-[#9A3412]/8 px-2.5 py-1.5 text-[11.5px] font-medium text-[#9A3412]">
                        ⚠ Hors plage de vraisemblance {MODE_META[obs.mode].label} ({XOF.format(min)}
                        –{XOF.format(max)} FCFA) — à vérifier avant d’approuver.
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="border-[#9A3412]/40 text-[#9A3412] hover:bg-[#9A3412]/8"
                        onClick={() => judge(obs, 'REJECTED')}
                      >
                        Rejeter
                      </Button>
                      <Button
                        className="bg-[#5C6B2E] text-white hover:brightness-110"
                        onClick={() => judge(obs, 'APPROVED')}
                      >
                        Approuver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <AiConfigPanel token={token} />
          </div>
        )}
      </main>
    </div>
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
    setBusy(false);
    if (!res.ok) {
      toast('Échec de l’enregistrement', { description: res.error });
      return;
    }
    toast('Configuration enregistrée', { description: res.value.warning });
    setApiKey('');
    void load();
  }

  async function probe() {
    setBusy(true);
    const res = await testAi(token);
    setBusy(false);
    if (!res.ok) {
      toast('Test impossible', { description: res.error });
      return;
    }
    if (res.value.ok) {
      toast('Clé valide ✓', { description: `Le modèle ${res.value.model} a répondu.` });
    } else {
      toast('La clé ne fonctionne pas', { description: res.value.error });
    }
  }

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Assistant IA — configuration
      </h2>
      <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
        {status === null
          ? 'Chargement…'
          : status.configured
            ? `Actif · clé ${status.key_hint} · modèle ${status.model}` +
              (status.source === 'secret' ? ' · définie par secret serveur (prioritaire)' : '')
            : 'Aucune clé configurée — l’assistant répond uniquement en mode guidé.'}
      </p>

      <label
        htmlFor="ai-key"
        className="mb-1 mt-4 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
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
            className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
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
            className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
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

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        La clé est stockée côté serveur (table protégée, aucune lecture publique) et n’est jamais
        renvoyée au navigateur. Compatible avec toute API au format OpenAI (Kimi/Moonshot par
        défaut). La charte de l’assistant — aucun prix inventé, neutralité, pas de données
        personnelles — s’applique quel que soit le modèle.
      </p>
    </section>
  );
}
