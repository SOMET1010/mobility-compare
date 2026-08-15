import { useEffect, useState } from 'react';
import {
  estimateTraffic,
  fetchWeatherAbidjan,
  TRAFFIC_TINT,
  WEATHER_SOURCE,
  type TrafficEstimate,
  type WeatherNow,
} from '@/demo/ecosystem';

/**
 * Conditions du moment à Abidjan : météo RÉELLE (Open-Meteo) et niveau de
 * circulation TYPE (profil horaire simulé — DEP-009). Chaque tuile porte son
 * statut ; l'échec météo s'affiche comme absence honnête, jamais une valeur
 * par défaut.
 */
export function Conditions() {
  const [weather, setWeather] = useState<WeatherNow | null | 'loading'>('loading');
  const [traffic, setTraffic] = useState<TrafficEstimate>(() => estimateTraffic(new Date()));

  useEffect(() => {
    const ctrl = new AbortController();
    fetchWeatherAbidjan(ctrl.signal).then((w) => {
      if (!ctrl.signal.aborted) setWeather(w);
    });
    const t = setInterval(() => setTraffic(estimateTraffic(new Date())), 60_000);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Météo — donnée réelle */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Météo Abidjan
          </span>
          <span className="rounded-full bg-[#5C6B2E]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#5C6B2E]">
            Réel
          </span>
        </div>
        {weather === 'loading' && (
          <div className="mt-1.5 text-sm font-semibold text-muted-foreground">Chargement…</div>
        )}
        {weather === null && (
          <div className="mt-1.5 text-[12px] font-medium text-muted-foreground">
            Indisponible pour le moment — rien à afficher plutôt qu’une estimation déguisée.
          </div>
        )}
        {weather !== 'loading' && weather !== null && (
          <>
            <div className="mt-1 text-lg font-extrabold tabular-nums leading-tight">
              {weather.tempC} °C{' '}
              <span className="text-[13px] font-semibold text-muted-foreground">
                · {weather.label}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              Vent {weather.windKmh} km/h
              {weather.precipitationMm > 0 ? ` · ${weather.precipitationMm} mm de pluie` : ''}
            </div>
          </>
        )}
        <div className="mt-1.5 text-[9px] leading-snug text-muted-foreground">
          Source : {WEATHER_SOURCE}
        </div>
      </div>

      {/* Trafic — profil type simulé */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Circulation
          </span>
          <span className="rounded-full bg-[#B9722A]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#9A3412]">
            Profil type
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-lg font-extrabold leading-tight">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TRAFFIC_TINT[traffic.level] }}
          />
          {traffic.label}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{traffic.window}</div>
        <div className="mt-1.5 text-[9px] leading-snug text-muted-foreground">
          Simulé — pas de mesure temps réel (DEP-009). N’ajuste pas les durées.
        </div>
      </div>
    </div>
  );
}
