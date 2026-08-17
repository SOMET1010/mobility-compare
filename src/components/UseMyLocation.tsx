import { useState } from 'react';
import { toast } from 'sonner';
import { nearestPlace } from '@/features/search/placeSearch';

/**
 * « Ma position » — remplit le départ avec le lieu connu le plus proche.
 * La position est traitée SUR l'appareil (nearestPlace est un calcul local) :
 * elle n'est jamais envoyée à un serveur, ni le nôtre ni un autre.
 * `variant="row"` : grande ligne tactile pour l'écran de choix de lieu.
 */
export function UseMyLocation({
  onFound,
  variant = 'inline',
}: {
  onFound: (id: string) => void;
  variant?: 'inline' | 'row';
}) {
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

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-[16px]"
        >
          📍
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-primary">
            {busy ? 'Recherche…' : 'Ma position'}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Trouvée sur votre téléphone — jamais envoyée
          </span>
        </span>
      </button>
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
