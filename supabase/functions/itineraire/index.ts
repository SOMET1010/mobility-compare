// Edge Function « itineraire » — distance et durée routières réelles.
// Seul client autorisé de notre serveur OSRM (DEP-001) : le jeton de
// routage vit ici (env ou table routing_config, service role uniquement)
// et n'atteint JAMAIS le navigateur. Aucune position d'usager n'est
// envoyée à un tiers : le serveur de routage est le nôtre.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Point = { lat: number; lng: number };

// Garde-fou : la fonction ne route qu'en Côte d'Ivoire — elle ne doit pas
// pouvoir servir de relais générique vers notre serveur.
function pointValide(p: unknown): p is Point {
  if (typeof p !== "object" || p === null) return false;
  const { lat, lng } = p as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 4.2 &&
    lat <= 10.9 &&
    lng >= -8.7 &&
    lng <= -2.3
  );
}

async function resolveConfig(): Promise<
  { baseUrl: string; jeton: string } | null
> {
  const envUrl = Deno.env.get("ROUTAGE_URL");
  const envJeton = Deno.env.get("ROUTAGE_JETON");
  if (envUrl && envJeton) return { baseUrl: envUrl, jeton: envJeton };
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data } = await admin
    .from("routing_config")
    .select("base_url, jeton")
    .eq("id", true)
    .maybeSingle();
  if (!data?.base_url || !data?.jeton) return null;
  return { baseUrl: data.base_url, jeton: data.jeton };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "methode" }, 405);

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json({ erreur: "json" }, 400);
  }
  const { depart, arrivee } = (corps ?? {}) as Record<string, unknown>;
  if (!pointValide(depart) || !pointValide(arrivee)) {
    return json({ erreur: "coordonnees invalides ou hors Côte d'Ivoire" }, 400);
  }

  const config = await resolveConfig();
  if (!config) return json({ disponible: false }, 503);

  const url =
    `${config.baseUrl.replace(/\/+$/, "")}/route/v1/driving/` +
    `${depart.lng},${depart.lat};${arrivee.lng},${arrivee.lat}` +
    `?overview=false&alternatives=false&steps=false`;

  try {
    const reponse = await fetch(url, {
      headers: { "X-Routage-Jeton": config.jeton },
      signal: AbortSignal.timeout(6000),
    });
    if (!reponse.ok) return json({ disponible: false }, 503);
    const donnees = await reponse.json();
    const route = donnees?.routes?.[0];
    if (donnees?.code !== "Ok" || !route) return json({ disponible: false }, 503);
    return json({
      disponible: true,
      distance_m: Math.round(route.distance),
      duree_s: Math.round(route.duration),
    });
  } catch {
    // Serveur de routage injoignable : absence honnête (I1), jamais de
    // valeur inventée — l'appelant garde son repli (matrice embarquée).
    return json({ disponible: false }, 503);
  }
});
