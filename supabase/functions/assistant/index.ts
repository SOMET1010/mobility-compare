/**
 * Edge Function `assistant` — pont vers l'IA conversationnelle (DEP-010).
 *
 * Règles non négociables :
 * - La clé d'API du fournisseur ne quitte JAMAIS cette fonction : stockée dans
 *   la table `assistant_config` (RLS sans politique — service role uniquement)
 *   ou en secret d'environnement (prioritaire). Jamais renvoyée au client :
 *   l'admin ne voit qu'une empreinte masquée (« ••••1234 »).
 * - La charte ci-dessous borne l'IA : aucun prix inventé, neutralité absolue,
 *   aucune collecte de données personnelles.
 * - Conversation : origines autorisées uniquement, entrées bornées
 *   (8 messages × 500 caractères, 400 tokens de réponse).
 * - Administration (`get_config` / `set_config` / `test`) : jeton de
 *   modérateur en en-tête `x-moderation-token`, vérifié par empreinte SHA-256
 *   (même mécanisme que la fonction `moderation`).
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://mobility-compare.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const DEFAULT_MODEL = 'kimi-latest';
const DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';

const CHARTE = `Tu es l'assistant de MOBILIS, le comparateur neutre des mobilités urbaines d'Abidjan (VTC, taxi compteur, woro-woro, gbaka).

Règles absolues :
1. NE DONNE JAMAIS un prix de trajet précis. Pour un prix, renvoie vers le comparateur de l'application (ses prix sont indicatifs, à confirmer sur le terrain). Tu peux expliquer COMMENT un prix se forme (prise en charge, distance, temps, suppléments).
2. NEUTRALITÉ ABSOLUE : ne recommande jamais un opérateur (Yango, Heetch ou autre) plutôt qu'un autre. Personne ne peut acheter sa place, toi non plus.
3. Ne demande et ne retiens AUCUNE donnée personnelle (nom, téléphone, position précise).
4. Réponds en français simple et chaleureux, au vouvoiement, en 100 mots maximum.
5. Ton périmètre : l'application MOBILIS, la mobilité urbaine en Côte d'Ivoire, les conseils de déplacement généraux. Hors sujet, redirige gentiment vers ce périmètre.
6. Si tu ne sais pas, dis-le simplement — jamais d'invention présentée comme un fait.
7. L'application est en version pilote : ses prix sont indicatifs, son classement est neutre par construction, et l'observatoire publie des prix réellement payés, modérés.`;

interface InMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  source: 'secret' | 'base';
  updatedAt: string | null;
}

function cors(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://mobility-compare.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type, x-moderation-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

/** Config effective : secret d'environnement prioritaire, sinon la base. */
async function resolveConfig(admin: SupabaseClient): Promise<AiConfig | null> {
  const envKey = Deno.env.get('KIMI_API_KEY');
  if (envKey) {
    return {
      apiKey: envKey,
      model: Deno.env.get('KIMI_MODEL') ?? DEFAULT_MODEL,
      baseUrl: Deno.env.get('KIMI_BASE_URL') ?? DEFAULT_BASE_URL,
      source: 'secret',
      updatedAt: null,
    };
  }
  const { data } = await admin
    .from('assistant_config')
    .select('api_key, model, base_url, updated_at')
    .eq('id', 'default')
    .maybeSingle();
  if (!data?.api_key) return null;
  return {
    apiKey: data.api_key,
    model: data.model || DEFAULT_MODEL,
    baseUrl: data.base_url || DEFAULT_BASE_URL,
    source: 'base',
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

const maskKey = (key: string) => `••••${key.slice(-4)}`;

async function callModel(
  cfg: AiConfig,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  try {
    const upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.6, max_tokens: maxTokens }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('assistant upstream', upstream.status, detail.slice(0, 300));
      const friendly: Record<number, string> = {
        401: 'Clé refusée par le fournisseur — recopiez-la ou créez-en une nouvelle dans la console.',
        402: 'Compte fournisseur sans crédit — rechargez-le.',
        404: 'Modèle introuvable chez le fournisseur — vérifiez le nom du modèle.',
        429: 'Crédit épuisé ou quota atteint chez le fournisseur — vérifiez la facturation.',
      };
      return {
        ok: false,
        error: friendly[upstream.status] ?? `Fournisseur : erreur ${upstream.status}.`,
      };
    }
    const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false, error: 'Réponse vide du modèle.' };
    return { ok: true, reply };
  } catch (e) {
    console.error('assistant fetch failed', e instanceof Error ? e.message : e);
    return { ok: false, error: 'Fournisseur injoignable.' };
  }
}

interface Body {
  action?: 'chat' | 'get_config' | 'set_config' | 'test';
  messages?: InMsg[];
  api_key?: string;
  model?: string;
  base_url?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = cors(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers,
    });
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origine non autorisée' }), {
      status: 403,
      headers,
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps JSON invalide' }), { status: 400, headers });
  }

  const admin = adminClient();
  const action = body.action ?? 'chat';

  /* ------------------------------------------------ administration (jeton) */
  if (action === 'get_config' || action === 'set_config' || action === 'test') {
    if (!(await isModerator(req, admin))) {
      return new Response(JSON.stringify({ error: 'non autorisé' }), { status: 401, headers });
    }

    if (action === 'set_config') {
      const model = (body.model ?? '').trim() || DEFAULT_MODEL;
      const baseUrl = (body.base_url ?? '').trim() || DEFAULT_BASE_URL;
      const apiKey = (body.api_key ?? '').trim();
      if (model.length > 100 || !/^https:\/\/[^\s]{1,200}$/.test(baseUrl)) {
        return new Response(JSON.stringify({ error: 'Modèle ou adresse invalide.' }), {
          status: 400,
          headers,
        });
      }
      if (apiKey && (apiKey.length < 10 || apiKey.length > 300)) {
        return new Response(JSON.stringify({ error: 'Clé invalide.' }), { status: 400, headers });
      }
      // Clé vide = conserver l'existante ; sinon remplacement complet.
      const { data: existing } = await admin
        .from('assistant_config')
        .select('api_key')
        .eq('id', 'default')
        .maybeSingle();
      const finalKey = apiKey || existing?.api_key || '';
      if (!finalKey) {
        return new Response(JSON.stringify({ error: 'Aucune clé fournie.' }), {
          status: 400,
          headers,
        });
      }
      const { error } = await admin.from('assistant_config').upsert({
        id: 'default',
        api_key: finalKey,
        model,
        base_url: baseUrl,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
      const overridden = Boolean(Deno.env.get('KIMI_API_KEY'));
      return new Response(
        JSON.stringify({
          saved: true,
          warning: overridden
            ? 'Un secret d’environnement KIMI_API_KEY existe et reste prioritaire sur cette configuration.'
            : undefined,
        }),
        { status: 200, headers },
      );
    }

    const cfg = await resolveConfig(admin);

    if (action === 'get_config') {
      return new Response(
        JSON.stringify(
          cfg
            ? {
                configured: true,
                source: cfg.source,
                model: cfg.model,
                base_url: cfg.baseUrl,
                key_hint: maskKey(cfg.apiKey),
                updated_at: cfg.updatedAt,
              }
            : { configured: false },
        ),
        { status: 200, headers },
      );
    }

    // action === 'test' : un appel minimal au modèle pour valider la clé.
    if (!cfg) {
      return new Response(JSON.stringify({ ok: false, error: 'Aucune configuration.' }), {
        status: 200,
        headers,
      });
    }
    const PING: { role: string; content: string }[] = [
      { role: 'user', content: 'Réponds uniquement : OK' },
    ];
    const probe = await callModel(cfg, PING, 8);
    if (probe.ok) {
      return new Response(JSON.stringify({ ok: true, model: cfg.model }), {
        status: 200,
        headers,
      });
    }
    // Auto-réparation : les deux plateformes Moonshot (.ai / .cn) ont des clés
    // incompatibles. Si la clé est refusée, on tente l'autre plateforme ; si
    // elle y répond, on corrige l'adresse enregistrée.
    if (cfg.source === 'base') {
      const MOONSHOT = ['https://api.moonshot.ai/v1', 'https://api.moonshot.cn/v1'];
      for (const alt of MOONSHOT.filter((u) => u !== cfg.baseUrl)) {
        const retry = await callModel({ ...cfg, baseUrl: alt }, PING, 8);
        if (retry.ok) {
          await admin
            .from('assistant_config')
            .update({ base_url: alt, updated_at: new Date().toISOString() })
            .eq('id', 'default');
          return new Response(
            JSON.stringify({ ok: true, model: cfg.model, switched_base_url: alt }),
            { status: 200, headers },
          );
        }
      }
    }
    return new Response(JSON.stringify({ ok: false, error: probe.error }), {
      status: 200,
      headers,
    });
  }

  /* -------------------------------------------------------- conversation */
  const messages = (body.messages ?? [])
    .filter(
      (m): m is InMsg =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));

  if (messages.length === 0 || messages[messages.length - 1]!.role !== 'user') {
    return new Response(JSON.stringify({ error: 'Aucune question' }), { status: 400, headers });
  }

  const cfg = await resolveConfig(admin);
  if (!cfg) {
    return new Response(
      JSON.stringify({ error: "L'assistant IA n'est pas encore activé (aucune clé configurée)." }),
      { status: 503, headers },
    );
  }

  const result = await callModel(cfg, [{ role: 'system', content: CHARTE }, ...messages], 400);
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "L'assistant IA est momentanément indisponible." }),
      { status: 502, headers },
    );
  }
  return new Response(JSON.stringify({ reply: result.reply }), { status: 200, headers });
});
