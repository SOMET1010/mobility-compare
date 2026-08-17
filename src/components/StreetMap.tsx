import { useEffect, useRef } from 'react';
import { COULEURS } from '@/config/couleurs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Carte de rue réelle (fond OpenStreetMap) centrée sur le trajet.
 * Les tuiles se chargent dans le navigateur de l'usager. La ligne pointillée
 * origine → destination est un REPÈRE VISUEL, pas l'itinéraire : les
 * distances et durées affichées ailleurs viennent de notre serveur de
 * routage (OSRM). Les tracés pleins sont les lignes de transport réelles.
 */
export interface MapPoint {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
}

const ORIGIN = COULEURS.olive;
const DEST = COULEURS.ochre;

/** Un tracé de ligne à dessiner : ses segments de [lat, lng] et sa couleur. */
export interface TraceLayer {
  readonly segments: readonly (readonly (readonly [number, number])[])[];
  readonly color: string;
}

export function StreetMap({
  from,
  to,
  traces = null,
  changePoint = null,
}: {
  from: MapPoint;
  to: MapPoint;
  /** Tracés de lignes à mettre en évidence (un par étape du trajet). */
  traces?: readonly TraceLayer[] | null;
  /** Point de changement entre deux lignes — nommé quand on le connaît. */
  changePoint?: { lat: number; lng: number; label: string } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const a = L.latLng(from.lat, from.lng);
    const b = L.latLng(to.lat, to.lng);

    L.polyline([a, b], { color: DEST, weight: 3, dashArray: '6 7', opacity: 0.9 }).addTo(map);

    // Les tracés réels des lignes choisies — par-dessus la ligne directe.
    const bornes = L.latLngBounds([a, b]);
    if (traces) {
      for (const couche of traces) {
        for (const segment of couche.segments) {
          const pts = segment.map(([lat, lng]) => L.latLng(lat, lng));
          L.polyline(pts, { color: '#ffffff', weight: 7, opacity: 0.65 }).addTo(map);
          L.polyline(pts, { color: couche.color, weight: 4, opacity: 0.95 }).addTo(map);
          pts.forEach((p) => bornes.extend(p));
        }
      }
    }

    // Le point où l'on change de ligne — nommé quand on le connaît.
    if (changePoint) {
      L.circleMarker(L.latLng(changePoint.lat, changePoint.lng), {
        radius: 7,
        color: COULEURS.ink,
        weight: 2.5,
        fillColor: '#ffffff',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(`⇄ ${changePoint.label}`, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 6],
        });
    }

    const marker = (p: L.LatLng, color: string, label: string) =>
      L.circleMarker(p, {
        radius: 8,
        color: '#ffffff',
        weight: 2.5,
        fillColor: color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -6] });

    marker(a, ORIGIN, from.name);
    marker(b, DEST, to.name);

    map.fitBounds(bornes.pad(traces ? 0.12 : 0.4));

    return () => {
      map.remove();
    };
  }, [from.lat, from.lng, from.name, to.lat, to.lng, to.name, traces, changePoint]);

  return (
    <div ref={ref} className="h-[240px] w-full" role="img" aria-label="Carte du trajet à Abidjan" />
  );
}
