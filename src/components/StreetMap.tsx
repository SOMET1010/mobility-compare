import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Carte de rue réelle (fond OpenStreetMap) centrée sur le trajet.
 * Les tuiles se chargent dans le navigateur de l'usager. Le tracé est une
 * LIGNE DIRECTE origine → destination : le calcul d'itinéraire par les routes
 * (OSRM) n'est pas encore branché (DEP-001). Honnête et étiqueté comme tel.
 */
export interface MapPoint {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
}

const ORIGIN = '#5C6B2E';
const DEST = '#B9722A';

export function StreetMap({ from, to }: { from: MapPoint; to: MapPoint }) {
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

    map.fitBounds(L.latLngBounds([a, b]).pad(0.4));

    return () => {
      map.remove();
    };
  }, [from.lat, from.lng, from.name, to.lat, to.lng, to.name]);

  return (
    <div ref={ref} className="h-[240px] w-full" role="img" aria-label="Carte du trajet à Abidjan" />
  );
}
