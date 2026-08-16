/**
 * Edge Function `audience` — compteur d'audience souverain et anonyme.
 *
 * Règles non négociables :
 * - AUCUNE donnée personnelle : ni cookie, ni adresse IP, ni identifiant,
 *   ni user-agent ne sont stockés. La table ne contient que (jour, page,
 *   vues, visites) — des nombres, rien d'autre.
 * - Le navigateur envoie seulement { page, visite } ; toute page hors de
 *   la liste blanche est ignorée sans erreur (pas de collecte incidente).
 * - Lecture réservée au jeton de modérateur (empreinte SHA-256, même
 *   mécanisme que les fonctions `moderation` et `assistant`).
 * - L'écriture en base passe par `audience_bump` (service role uniquement :
 *   le compteur n'est pas gonflable via l'API publique).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://mobility-compare.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]);

/** Pages comptées. /moderation est volontairement exclue (écran interne). */
const PAGES = new Set([
  '/',
  '/comparer',
  '/observatoire',
  '/methode',
  '/partenaires',
  '/compte',
  '/conditions',
]);

function cors(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://mobility-compare.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type, x-moderation-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'content-type': 'application/json',
  };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

/** Jeton de modérateur valide ? (empreinte comparée, jamais le clair) */
async function isModerator(req: Request, admin: SupabaseClient): Promise<boolean> {
  const token = req.headers.get('x-moderation-token') ?? '';
  if (token.length < 20) return false;
  const hex = await sha256Hex(token);
  const { data } = await admin
    .from('moderation_tokens')
    .select('id')
    .eq('token_sha256', hex)
    .eq('active', true)
    .maybeSingle();
  return data !== null;
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  const admin = adminClient();

  // Lecture (tableau de bord /moderation) — jeton obligatoire.
  if (req.method === 'GET') {
    if (!(await isModerator(req, admin))) {
      return new Response(JSON.stringify({ error: 'Jeton invalide.' }), { status: 401, headers });
    }
    const { data, error } = await admin
      .from('audience_daily')
      .select('jour, page, vues, visites')
      .gte('jour', new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10))
      .order('jour', { ascending: false });
    if (error) {
      return new Response(JSON.stringify({ error: 'Lecture impossible.' }), {
        status: 500,
        headers,
      });
    }
    return new Response(JSON.stringify({ jours: data ?? [] }), { headers });
  }

  // Balise (navigateur) — { page, visite }, rien d'autre n'est lu.
  if (req.method === 'POST') {
    let corps: unknown;
    try {
      corps = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'json' }), { status: 400, headers });
    }
    const { page, visite } = (corps ?? {}) as Record<string, unknown>;
    const normalisee = page === '/demo' ? '/comparer' : page;
    if (typeof normalisee !== 'string' || !PAGES.has(normalisee)) {
      // Page inconnue : ignorée sans erreur — on ne collecte rien d'imprévu.
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    const { error } = await admin.rpc('audience_bump', {
      p_page: normalisee,
      p_visite: visite === true,
    });
    if (error) {
      return new Response(JSON.stringify({ error: 'Écriture impossible.' }), {
        status: 500,
        headers,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response(JSON.stringify({ error: 'methode' }), { status: 405, headers });
});
