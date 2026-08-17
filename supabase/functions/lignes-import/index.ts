// Edge Function « lignes-import » — remplissage des lignes de transport.
// Appelée UNIQUEMENT par notre serveur (script infra/osrm/export-lignes.sh),
// authentifiée par le jeton de routage. Charge les lignes cartographiées
// (OpenStreetMap : gbaka, woro-woro, bus, bateaux-bus) et leurs points de
// passage — des tracés publics, aucune donnée personnelle.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODES = new Set(['GBAKA', 'WORO', 'BUS', 'BATEAU']);

interface Ligne {
  id: number;
  nom: string;
  mode: string;
  ref?: string;
  operateur?: string;
  points: [number, number][];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function pointValide(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    p[0] >= 4.2 &&
    p[0] <= 10.9 &&
    typeof p[1] === 'number' &&
    p[1] >= -8.7 &&
    p[1] <= -2.3
  );
}

function ligneValide(l: unknown): l is Ligne {
  if (typeof l !== 'object' || l === null) return false;
  const { id, nom, mode, ref, operateur, points } = l as Record<string, unknown>;
  return (
    typeof id === 'number' &&
    Number.isFinite(id) &&
    typeof nom === 'string' &&
    nom.trim().length > 0 &&
    nom.length <= 160 &&
    typeof mode === 'string' &&
    MODES.has(mode) &&
    (ref === undefined || (typeof ref === 'string' && ref.length <= 40)) &&
    (operateur === undefined || (typeof operateur === 'string' && operateur.length <= 80)) &&
    Array.isArray(points) &&
    points.length >= 2 &&
    points.length <= 80 &&
    points.every(pointValide)
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
  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 100) {
    return json({ erreur: 'lignes: 1 à 100 par lot' }, 400);
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

  const valides = lignes.filter(ligneValide);

  if (purge === true) {
    const { error } = await admin.from('lignes_transport').delete().gte('id', 0);
    if (error) return json({ erreur: 'purge impossible' }, 500);
  }

  const entetes = valides.map((l) => ({
    id: Math.trunc(l.id),
    nom: l.nom.trim(),
    mode: l.mode,
    ref: (l.ref ?? '').trim(),
    operateur: (l.operateur ?? '').trim(),
  }));
  const { error: e1 } = await admin.from('lignes_transport').upsert(entetes, { onConflict: 'id' });
  if (e1) return json({ erreur: `lignes: ${e1.message}` }, 500);

  const points = valides.flatMap((l) =>
    l.points.map(([lat, lng]) => ({ ligne_id: Math.trunc(l.id), lat, lng })),
  );
  // Ré-import d'une ligne existante : ses anciens points d'abord.
  const ids = entetes.map((e) => e.id);
  const { error: e2 } = await admin.from('lignes_points').delete().in('ligne_id', ids);
  if (e2) return json({ erreur: `nettoyage: ${e2.message}` }, 500);
  const { error: e3 } = await admin.from('lignes_points').insert(points);
  if (e3) return json({ erreur: `points: ${e3.message}` }, 500);

  return json({
    ok: true,
    inserees: valides.length,
    points: points.length,
    ignorees: lignes.length - valides.length,
  });
});
