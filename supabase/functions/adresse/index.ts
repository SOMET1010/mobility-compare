// Edge Function « adresse » — recherche d'adresses et de lieux précis.
// Seul client autorisé de notre géocodeur auto-hébergé (Nominatim, même
// serveur que le routage) : le jeton vit ici (table routing_config,
// service role) et n'atteint jamais le navigateur. Les recherches des
// usagers ne sont NI stockées NI transmises à un tiers — le géocodeur
// est le nôtre.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fenêtre de biais : le Grand Abidjan (les résultats y sont favorisés,
// le reste de la Côte d'Ivoire reste trouvable).
const VUE_ABIDJAN = '-4.5,5.0,-3.6,5.65';

async function resolveConfig(): Promise<{ baseUrl: string; jeton: string } | null> {
  const envUrl = Deno.env.get('ROUTAGE_URL');
  const envJeton = Deno.env.get('ROUTAGE_JETON');
  if (envUrl && envJeton) return { baseUrl: envUrl, jeton: envJeton };
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
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

interface NominatimHit {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
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

  const config = await resolveConfig();
  if (!config) return json({ disponible: false }, 503);

  const url =
    `${config.baseUrl.replace(/\/+$/, '')}/geocodage/search` +
    `?q=${encodeURIComponent(q.trim())}` +
    `&format=jsonv2&limit=6&countrycodes=ci&accept-language=fr` +
    `&viewbox=${VUE_ABIDJAN}&bounded=0`;

  try {
    const reponse = await fetch(url, {
      headers: { 'X-Routage-Jeton': config.jeton },
      signal: AbortSignal.timeout(6000),
    });
    if (!reponse.ok) return json({ disponible: false }, 503);
    const donnees = (await reponse.json()) as NominatimHit[];
    if (!Array.isArray(donnees)) return json({ disponible: false }, 503);
    const resultats = donnees
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
      .filter((r) => r !== null);
    return json({ disponible: true, resultats });
  } catch {
    // Géocodeur injoignable : absence honnête (I1) — l'appelant garde la
    // recherche parmi les 29 lieux connus.
    return json({ disponible: false }, 503);
  }
});
