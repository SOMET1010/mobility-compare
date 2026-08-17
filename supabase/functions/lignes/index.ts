// Edge Function « lignes » — quelles lignes cartographiées passent près
// du départ ET de l'arrivée ? Source : OpenStreetMap (travail Jungle
// Bus/AMUGA et contributeurs), extraite de NOTRE carte. Pas d'horaires
// ni de tarifs — la fonction ne prétend donc à rien de plus que le
// tracé : « ces lignes passent à proximité ». Aucune position d'usager
// n'est stockée ni transmise à un tiers.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Point = { lat: number; lng: number };

function pointValide(p: unknown): p is Point {
  if (typeof p !== 'object' || p === null) return false;
  const { lat, lng } = p as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= 4.2 &&
    lat <= 10.9 &&
    lng >= -8.7 &&
    lng <= -2.3
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
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
  const { depart, arrivee } = (corps ?? {}) as Record<string, unknown>;
  if (!pointValide(depart) || !pointValide(arrivee)) {
    return json({ erreur: 'coordonnees invalides ou hors Côte d’Ivoire' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ disponible: false }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin.rpc('lignes_desservant', {
    p_lat1: depart.lat,
    p_lng1: depart.lng,
    p_lat2: arrivee.lat,
    p_lng2: arrivee.lng,
    p_rayon: 800,
  });
  if (error || !Array.isArray(data)) return json({ disponible: false }, 503);

  const lignes = data.filter(
    (l): l is { nom: string; mode: string; ref: string; montee_m: number; descente_m: number } =>
      typeof l?.nom === 'string' && typeof l?.mode === 'string',
  );

  // Peu ou pas de lignes directes → chercher les trajets à UNE
  // correspondance (croisement géographique des tracés).
  let correspondances: unknown[] = [];
  if (lignes.length < 3) {
    const { data: corr } = await admin.rpc('lignes_correspondance', {
      p_lat1: depart.lat,
      p_lng1: depart.lng,
      p_lat2: arrivee.lat,
      p_lng2: arrivee.lng,
      p_rayon: 800,
      p_transfert: 400,
    });
    if (Array.isArray(corr)) {
      // `gare` : nom du lieu connu le plus proche du point de changement
      // (lieux_index) — null si rien à moins de 250 m, jamais inventé.
      correspondances = corr.filter(
        (c) => typeof c?.ligne1 === 'string' && typeof c?.ligne2 === 'string',
      );
    }
  }

  return json({ disponible: true, lignes, correspondances });
});
