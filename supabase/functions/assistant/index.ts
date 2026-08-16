/**
 * Edge Function `assistant` — pont vers l'IA conversationnelle (DEP-010).
 *
 * Règles non négociables :
 * - La clé d'API (secret `KIMI_API_KEY`) ne quitte JAMAIS cette fonction.
 * - La charte ci-dessous borne l'IA : aucun prix inventé, neutralité absolue,
 *   aucune collecte de données personnelles.
 * - Origines autorisées uniquement (le navigateur du produit, pas le web).
 * - Entrées bornées : 8 messages max, 500 caractères par message.
 *
 * Secrets attendus (Dashboard → Edge Functions → Secrets) :
 * - KIMI_API_KEY  (obligatoire)
 * - KIMI_MODEL    (optionnel, défaut « kimi-latest »)
 * - KIMI_BASE_URL (optionnel, défaut « https://api.moonshot.ai/v1 »)
 */

const ALLOWED_ORIGINS = new Set([
  'https://mobility-compare.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]);

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

function cors(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://mobility-compare.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
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

  const apiKey = Deno.env.get('KIMI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "L'assistant IA n'est pas encore activé (clé absente)." }),
      { status: 503, headers },
    );
  }

  let body: { messages?: InMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps JSON invalide' }), { status: 400, headers });
  }

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

  const baseUrl = Deno.env.get('KIMI_BASE_URL') ?? 'https://api.moonshot.ai/v1';
  const model = Deno.env.get('KIMI_MODEL') ?? 'kimi-latest';

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: CHARTE }, ...messages],
        temperature: 0.6,
        max_tokens: 400,
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('kimi upstream', upstream.status, detail.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "L'assistant IA est momentanément indisponible." }),
        { status: 502, headers },
      );
    }
    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return new Response(JSON.stringify({ error: 'Réponse vide du modèle.' }), {
        status: 502,
        headers,
      });
    }
    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (e) {
    console.error('kimi fetch failed', e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "L'assistant IA est momentanément indisponible." }),
      { status: 502, headers },
    );
  }
});
