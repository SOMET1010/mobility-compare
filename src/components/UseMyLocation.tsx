import { useState } from 'react';
import { toast } from 'sonner';
import { nearestPlace } from '@/features/search/placeSearch';

/**
 * « Ma position » — remplit le départ avec le lieu connu le plus proche.
 * La position est traitée SUR l'appareil (nearestPlace est un calcul local) :
 * elle n'est jamais envoyée à un serveur, ni le nôtre ni un autre.
 */
export function UseMyLocation({ onFound }: { onFound: (id: string) => void }) {
  const [busy, setBusy] = useState(false);

  function locate() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast('Position indisponible sur cet appareil');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const hit = nearestPlace(pos.coords.latitude, pos.coords.longitude);
        if (!hit) {
          toast('Vous semblez être hors d’Abidjan', {
            description: 'Choisissez le départ à la main.',
          });
          return;
        }
        onFound(hit.id);
        toast(`Départ : ${hit.name}`, {
          description:
            'Lieu connu le plus proche. Position traitée sur votre téléphone, jamais envoyée.',
        });
      },
      () => {
        setBusy(false);
        toast('Position refusée ou indisponible');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={busy}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <span aria-hidden="true">📍</span> {busy ? 'Recherche…' : 'Ma position'}
    </button>
  );
}
