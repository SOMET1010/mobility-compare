// Edge Function « lieux-import » — remplissage de l'index de lieux.
// Appelée UNIQUEMENT par notre serveur de géocodage (script
// infra/osrm/export-lieux.sh), authentifiée par le jeton de routage
// (routing_config). Charge les lieux nommés du Grand Abidjan dans
// lieux_index — des lieux publics, aucune donnée personnelle.
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Ligne {
  id: number;
  nom: string;
  detail?: string;
  lat: number;
  lng: number;
  imp?: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ligneValide(l: unknown): l is Ligne {
  if (typeof l !== 'object' || l === null) return false;
  const { id, nom, detail, lat, lng, imp } = l as Record<string, unknown>;
  return (
    typeof id === 'number' &&
    Number.isFinite(id) &&
    typeof nom === 'string' &&
    nom.trim().length > 0 &&
    nom.length <= 120 &&
    (detail === undefined || (typeof detail === 'string' && detail.length <= 80)) &&
    typeof lat === 'number' &&
    lat >= 4.2 &&
    lat <= 10.9 &&
    typeof lng === 'number' &&
    lng >= -8.7 &&
    lng <= -2.3 &&
    (imp === undefined || typeof imp === 'number')
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'methode' }, 405);

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json({ erreur: 'json' }, 400);
  }
  const { jeton, purge, lignes } = (corps ?? {}) as Record<string, unknown>;
  if (typeof jeton !== 'string' || jeton.length < 20) {
    return json({ erreur: 'jeton requis' }, 401);
  }
  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 1000) {
    return json({ erreur: 'lignes: 1 à 1000 par lot' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: config } = await admin
    .from('routing_config')
    .select('jeton')
    .eq('id', true)
    .maybeSingle();
  if (!config?.jeton || config.jeton !== jeton) {
    return json({ erreur: 'jeton invalide' }, 401);
  }

  const valides = lignes.filter(ligneValide).map((l) => ({
    id: Math.trunc(l.id),
    nom: l.nom.trim(),
    detail: (l.detail ?? '').trim(),
    lat: l.lat,
    lng: l.lng,
    imp: l.imp ?? 0,
  }));

  if (purge === true) {
    const { error } = await admin.from('lieux_index').delete().gte('id', 0);
    if (error) return json({ erreur: 'purge impossible' }, 500);
  }

  const { error } = await admin.from('lieux_index').upsert(valides, { onConflict: 'id' });
  if (error) return json({ erreur: `insertion: ${error.message}` }, 500);

  return json({ ok: true, inseres: valides.length, ignorees: lignes.length - valides.length });
});
