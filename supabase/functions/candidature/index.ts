// Edge Function « candidature » — un opérateur demande à figurer sur le
// comparateur. La candidature part en file d'examen : rien n'est publié
// automatiquement (I4 : chaque statut d'agrément est vérifié, daté et
// sourcé avant publication). Être listé est gratuit ; l'ordre du
// classement ne s'achète pas — la candidature ne change rien au tri.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODES = ['VTC', 'TAXI', 'WORO', 'GBAKA', 'MOTO', 'TRICYCLE', 'CARGO'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function champ(v: unknown, min: number, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
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
  const { nom, mode, contact, reference_agrement, message, site } = (corps ?? {}) as Record<
    string,
    unknown
  >;

  // Pot de miel : un humain ne remplit jamais ce champ caché. On répond
  // comme si tout allait bien, sans rien enregistrer.
  if (typeof site === 'string' && site.trim() !== '') return json({ enregistree: true });

  const nomOk = champ(nom, 2, 120);
  const contactOk = champ(contact, 5, 200);
  const modeOk = typeof mode === 'string' && MODES.includes(mode) ? mode : null;
  if (!nomOk || !contactOk || !modeOk) {
    return json({ erreur: 'nom, mode et contact sont obligatoires' }, 400);
  }
  const refOk = champ(reference_agrement, 1, 200);
  const messageOk = champ(message, 1, 2000);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ enregistree: false }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { error } = await admin.from('operator_applications').insert({
    nom: nomOk,
    mode: modeOk,
    contact: contactOk,
    reference_agrement: refOk,
    message: messageOk,
  });
  if (error) return json({ enregistree: false }, 503);

  return json({ enregistree: true });
});
