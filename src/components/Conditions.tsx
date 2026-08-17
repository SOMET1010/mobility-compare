import { useEffect, useState } from 'react';
import {
  estimateTraffic,
  fetchWeatherAbidjan,
  TRAFFIC_TINT,
  type TrafficEstimate,
  type WeatherNow,
} from '@/demo/ecosystem';

/**
 * Conditions du moment à Abidjan — une BANDE fine sous l'en-tête (place
 * naturelle d'une information d'ambiance), pas des tuiles dans le contenu.
 * Météo RÉELLE (Open-Meteo) et circulation TYPE (profil horaire — DEP-009),
 * chacune étiquetée. L'échec météo est une absence honnête : la bande
 * n'affiche alors que la circulation, jamais une valeur par défaut.
 * `pilote` : la pastille d'honnêteté vit DANS cette bande — une seule
 * bande sous l'en-tête, jamais deux empilées.
 */
export function ConditionsBar({ pilote = false }: { pilote?: boolean }) {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
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
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 border-b bg-muted px-3 py-1 text-[11.5px] font-medium text-foreground/75">
      {pilote && (
        <span
          title="Version pilote — prix indicatifs, à confirmer sur le terrain"
          className="inline-flex items-center gap-1.5 font-bold text-[#26301C]"
        >
          <span aria-hidden="true" className="text-[#B9722A]">
            ●
          </span>
          Pilote · prix indicatifs
        </span>
      )}
      {weather && (
        <span className="inline-flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3 text-[#B9722A]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" />
          </svg>
          <span className="tabular-nums">
            {weather.tempC} °C · {weather.label}
          </span>
          <span className="opacity-60">(réel)</span>
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: TRAFFIC_TINT[traffic.level] }}
        />
        Circulation {traffic.label.toLowerCase()}
        <span className="opacity-60">
          (habituelle à{' '}
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
        </span>
      </span>
    </div>
  );
}
