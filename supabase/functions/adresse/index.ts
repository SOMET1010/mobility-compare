// Edge Function « adresse » — recherche d'adresses et de lieux précis.
// Deux étages, tous deux souverains :
//   1. lieux_index (notre base) : préfixes et FAUTES DE FRAPPE pardonnées
//      (trigrammes) — instantané, pensé pour la saisie en cours ;
//   2. notre Nominatim auto-hébergé : requêtes complètes, en complément.
// Le jeton vit ici (table routing_config, service role) et n'atteint
// jamais le navigateur. Les recherches des usagers ne sont NI stockées
// NI transmises à un tiers — l'index et le géocodeur sont les nôtres.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fenêtre de biais : le Grand Abidjan (les résultats y sont favorisés,
// le reste de la Côte d'Ivoire reste trouvable).
const VUE_ABIDJAN = '-4.5,5.0,-3.6,5.65';

interface Resultat {
  nom: string;
  detail: string;
  lat: number;
  lng: number;
}

function adminClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

async function resolveConfig(
  admin: SupabaseClient | null,
): Promise<{ baseUrl: string; jeton: string } | null> {
  const envUrl = Deno.env.get('ROUTAGE_URL');
  const envJeton = Deno.env.get('ROUTAGE_JETON');
  if (envUrl && envJeton) return { baseUrl: envUrl, jeton: envJeton };
  if (!admin) return null;
  const { data } = await admin
    .from('routing_config')
    .select('base_url, jeton')
    .eq('id', true)
    .maybeSingle();
  if (!data?.base_url || !data?.jeton) return null;
  return { baseUrl: data.base_url, jeton: data.jeton };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Étage 1 — index tolérant aux fautes (notre base). Null si indisponible. */
async function chercherIndex(admin: SupabaseClient, q: string): Promise<Resultat[] | null> {
  const { data, error } = await admin.rpc('chercher_lieux', { p_q: q, p_limit: 6 });
  if (error || !Array.isArray(data)) return null;
  return data.filter(
    (r): r is Resultat =>
      typeof r?.nom === 'string' && Number.isFinite(r?.lat) && Number.isFinite(r?.lng),
  );
}

interface NominatimHit {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
}

/** Étage 2 — notre Nominatim (requêtes complètes). Null si indisponible. */
async function chercherNominatim(
  config: { baseUrl: string; jeton: string },
  q: string,
): Promise<Resultat[] | null> {
  const url =
    `${config.baseUrl.replace(/\/+$/, '')}/geocodage/search` +
    `?q=${encodeURIComponent(q)}` +
    `&format=jsonv2&limit=6&countrycodes=ci&accept-language=fr` +
    `&viewbox=${VUE_ABIDJAN}&bounded=0`;
  try {
    const reponse = await fetch(url, {
      headers: { 'X-Routage-Jeton': config.jeton },
      signal: AbortSignal.timeout(6000),
    });
    if (!reponse.ok) return null;
    const donnees = (await reponse.json()) as NominatimHit[];
    if (!Array.isArray(donnees)) return null;
    return donnees
      .map((h) => {
        const lat = Number(h.lat);
        const lng = Number(h.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const nom = h.name || h.display_name?.split(',')[0]?.trim() || '';
        const detail =
          h.display_name
            ?.split(',')
            .slice(1, 3)
            .map((p) => p.trim())
            .join(', ') ?? '';
        return nom ? { nom, detail, lat, lng } : null;
      })
      .filter((r): r is Resultat => r !== null);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erreur: 'methode' }, 405);

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json({ erreur: 'json' }, 400);
  }
  const { q } = (corps ?? {}) as Record<string, unknown>;
  if (typeof q !== 'string' || q.trim().length < 3 || q.length > 80) {
    return json({ erreur: 'requete invalide (3 à 80 caractères)' }, 400);
  }
  const requete = q.trim();

  const admin = adminClient();
  const index = admin ? await chercherIndex(admin, requete) : null;

  // L'index suffit presque toujours pour la saisie en cours.
  if (index && index.length >= 5) {
    return json({ disponible: true, resultats: index.slice(0, 6) });
  }

  const config = await resolveConfig(admin);
  const nominatim = config ? await chercherNominatim(config, requete) : null;

  if (index === null && nominatim === null) {
    // Les deux étages injoignables : absence honnête (I1) — l'appelant
    // garde la recherche parmi les 29 lieux connus.
    return json({ disponible: false }, 503);
  }

  // Fusion sans doublons : même nom normalisé, ou même endroit (~120 m).
  const resultats: Resultat[] = [...(index ?? [])];
  for (const hit of nominatim ?? []) {
    const doublon = resultats.some(
      (r) =>
        normalise(r.nom) === normalise(hit.nom) ||
        (Math.abs(r.lat - hit.lat) < 0.0011 && Math.abs(r.lng - hit.lng) < 0.0011),
    );
    if (!doublon) resultats.push(hit);
    if (resultats.length >= 6) break;
  }
  return json({ disponible: true, resultats: resultats.slice(0, 6) });
});
