// Modération des observations ET des candidatures d'opérateurs.
// Authentification CUSTOM : jeton de modérateur transmis en en-tête
// `x-moderation-token`, comparé par empreinte SHA-256 à la table
// moderation_tokens (le jeton en clair n'est jamais stocké). La clé serveur
// (service role) ne quitte jamais cette fonction. verify_jwt est désactivé
// car l'authentification est implémentée ici (clés publishable non-JWT).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-moderation-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);

  const token = req.headers.get('x-moderation-token') ?? '';
  if (token.length < 20) return json({ error: 'non autorisé' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const hex = await sha256Hex(token);
  const { data: grant } = await admin
    .from('moderation_tokens')
    .select('id')
    .eq('token_sha256', hex)
    .eq('active', true)
    .maybeSingle();
  if (!grant) return json({ error: 'non autorisé' }, 401);

  await admin
    .from('moderation_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', grant.id);

  let body: { action?: string; id?: string; decision?: string; statut?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'corps JSON attendu' }, 400);
  }

  if (body.action === 'list') {
    const { data, error } = await admin
      .from('fare_observations')
      .select(
        'id, observed_at, from_commune, to_commune, mode, price_xof, rush_hour, wait_min, comment, source, created_at',
      )
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) return json({ error: error.message }, 500);
    return json({ pending: data });
  }

  if (body.action === 'decide') {
    const decision = body.decision;
    if (decision !== 'APPROVED' && decision !== 'REJECTED')
      return json({ error: 'decision invalide' }, 400);
    if (!body.id) return json({ error: 'id manquant' }, 400);
    const { data, error } = await admin
      .from('fare_observations')
      .update({ status: decision })
      .eq('id', body.id)
      .eq('status', 'PENDING')
      .select('id, status')
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'observation introuvable ou déjà traitée' }, 409);
    return json({ decided: data });
  }

  // Candidatures d'opérateurs en attente d'examen. Accepter une
  // candidature ne publie RIEN automatiquement : la publication dans la
  // table operators reste un geste séparé, avec statut d'agrément vérifié,
  // daté et sourcé (invariant I4).
  if (body.action === 'candidatures') {
    const { data, error } = await admin
      .from('operator_applications')
      .select(
        'id, created_at, nom, mode, contact, reference_agrement, message, api_devis_url, contact_technique, statut',
      )
      .in('statut', ['RECUE', 'EN_EXAMEN'])
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) return json({ error: error.message }, 500);
    return json({ candidatures: data });
  }

  if (body.action === 'candidature_decide') {
    const statut = body.statut;
    if (statut !== 'EN_EXAMEN' && statut !== 'ACCEPTEE' && statut !== 'REFUSEE')
      return json({ error: 'statut invalide' }, 400);
    if (!body.id) return json({ error: 'id manquant' }, 400);
    const { data, error } = await admin
      .from('operator_applications')
      .update({ statut })
      .eq('id', body.id)
      .in('statut', ['RECUE', 'EN_EXAMEN'])
      .select('id, statut')
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'candidature introuvable ou déjà traitée' }, 409);
    return json({ decided: data });
  }

  return json({ error: 'action inconnue' }, 400);
});
