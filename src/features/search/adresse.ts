import { env } from '@/config/env';

/**
 * Client de la recherche d'adresses — parle à l'Edge Function `adresse`,
 * seul pont vers notre géocodeur auto-hébergé. Les recherches ne sont ni
 * stockées ni transmises à un tiers. Indisponible (serveur en import,
 * panne…) → null : l'appelant garde la recherche parmi les lieux connus.
 */

export interface AddressHit {
  readonly nom: string;
  readonly detail: string;
  readonly lat: number;
  readonly lng: number;
}

function functionUrl(): string | null {
  return env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL}/functions/v1/adresse` : null;
}

/** Mémoire de session par requête ; seuls les succès sont mémorisés. */
const cache = new Map<string, AddressHit[]>();

/** Après une indisponibilité, on laisse le géocodeur tranquille un moment. */
let indisponibleJusqua = 0;

export async function searchAddresses(q: string): Promise<AddressHit[] | null> {
  const url = functionUrl();
  const requete = q.trim();
  if (!url || requete.length < 3) return null;
  const cle = requete.toLowerCase();
  const connu = cache.get(cle);
  if (connu) return connu;
  if (Date.now() < indisponibleJusqua) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: requete }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 503) {
      indisponibleJusqua = Date.now() + 60_000;
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      disponible?: boolean;
      resultats?: AddressHit[];
    } | null;
    if (!json?.disponible || !Array.isArray(json.resultats)) return null;
    const hits = json.resultats.filter(
      (r) => typeof r?.nom === 'string' && Number.isFinite(r?.lat) && Number.isFinite(r?.lng),
    );
    cache.set(cle, hits);
    return hits;
  } catch {
    return null;
  }
}
