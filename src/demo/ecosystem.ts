import { COULEURS } from '@/config/couleurs';
/**
 * Écosystème du comparateur : conditions de circulation et météo.
 *
 * Doctrine « zéro donnée inventée » :
 * - Le TRAFIC est un profil horaire TYPE d'Abidjan, simulé et déterministe —
 *   étiqueté comme tel partout (pas de mesure temps réel : DEP-009).
 * - La MÉTÉO est RÉELLE : Open-Meteo (service public, sans clé), interrogé
 *   depuis le navigateur du visiteur. En cas d'échec réseau, absence honnête.
 */

/* ------------------------------------------------------------------ trafic */

export type TrafficLevel = 'FLUIDE' | 'DENSE' | 'SATURE';

export interface TrafficEstimate {
  readonly level: TrafficLevel;
  readonly label: string;
  /** Fenêtre horaire type qui justifie le niveau (trace du raisonnement). */
  readonly window: string;
}

export const TRAFFIC_DISCLAIMER =
  'Profil horaire type, simulé — aucune mesure de trafic en temps réel (DEP-009).';

/**
 * Niveau de circulation TYPE selon l'heure locale d'Abidjan.
 * Modèle assumé simpliste (pointes matin/soir, creux de nuit), déterministe
 * pour être testable. Il n'ajuste PAS les durées affichées (DEP-001/DEP-009).
 */
export function estimateTraffic(now: Date): TrafficEstimate {
  const m = now.getHours() * 60 + now.getMinutes();
  const inWindow = (h1: number, min1: number, h2: number, min2: number) =>
    m >= h1 * 60 + min1 && m < h2 * 60 + min2;

  if (inWindow(6, 30, 9, 30))
    return { level: 'SATURE', label: 'Saturé', window: 'pointe du matin (6h30–9h30)' };
  if (inWindow(16, 30, 20, 0))
    return { level: 'SATURE', label: 'Saturé', window: 'pointe du soir (16h30–20h)' };
  if (inWindow(5, 0, 6, 30))
    return { level: 'DENSE', label: 'Dense', window: 'montée vers la pointe (5h–6h30)' };
  if (inWindow(9, 30, 12, 0))
    return { level: 'DENSE', label: 'Dense', window: 'matinée (9h30–12h)' };
  if (inWindow(12, 0, 14, 0))
    return { level: 'DENSE', label: 'Dense', window: 'mi-journée (12h–14h)' };
  if (inWindow(14, 0, 16, 30))
    return { level: 'DENSE', label: 'Dense', window: 'après-midi (14h–16h30)' };
  if (inWindow(20, 0, 22, 0)) return { level: 'DENSE', label: 'Dense', window: 'soirée (20h–22h)' };
  return { level: 'FLUIDE', label: 'Fluide', window: 'nuit (22h–5h)' };
}

export const TRAFFIC_TINT: Record<TrafficLevel, string> = {
  FLUIDE: COULEURS.olive,
  DENSE: COULEURS.ochre,
  SATURE: COULEURS.warn,
};

/* ------------------------------------------------------------------- météo */

export interface WeatherNow {
  readonly tempC: number;
  readonly windKmh: number;
  readonly precipitationMm: number;
  readonly code: number;
  readonly label: string;
}

export const WEATHER_SOURCE = 'Open-Meteo (donnée réelle, heure d’Abidjan)';

/** Libellé français des codes météo WMO utilisés par Open-Meteo. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code >= 1 && code <= 2) return 'Peu nuageux';
  if (code === 3) return 'Couvert';
  if (code === 45 || code === 48) return 'Brume';
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return 'Pluie';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code >= 95) return 'Orage';
  return 'Conditions inconnues';
}

/** Abidjan (Plateau). */
const ABIDJAN = { lat: 5.336, lng: -4.027 };

/**
 * Météo actuelle à Abidjan — Open-Meteo, sans clé d'API.
 * Retourne `null` en cas d'échec : l'UI affiche alors une absence honnête,
 * jamais une valeur par défaut déguisée en mesure.
 */
export async function fetchWeatherAbidjan(signal?: AbortSignal): Promise<WeatherNow | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${ABIDJAN.lat}&longitude=${ABIDJAN.lng}` +
    `&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Africa%2FAbidjan`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const c = json.current;
    if (!c || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number')
      return null;
    return {
      tempC: Math.round(c.temperature_2m),
      windKmh: Math.round(c.wind_speed_10m ?? 0),
      precipitationMm: c.precipitation ?? 0,
      code: c.weather_code,
      label: weatherLabel(c.weather_code),
    };
  } catch {
    return null;
  }
}
