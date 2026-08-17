import { useState } from 'react';
import { toast } from 'sonner';
import { nearestPlace } from '@/features/search/placeSearch';

/**
 * « Ma position » — remplit le départ avec le lieu connu le plus proche.
 * La position est traitée SUR l'appareil (nearestPlace est un calcul local) :
 * elle n'est jamais envoyée à un serveur, ni le nôtre ni un autre.
 * Grande ligne tactile pour l'écran de choix de lieu.
 */
export function UseMyLocation({ onFound }: { onFound: (id: string) => void }) {
  const [busy, setBusy] = useState(false);

  function locate() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast.error('Position indisponible sur cet appareil');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const hit = nearestPlace(pos.coords.latitude, pos.coords.longitude);
        if (!hit) {
          toast.error('Vous semblez être hors d’Abidjan', {
            description: 'Choisissez le départ à la main.',
          });
          return;
        }
        onFound(hit.id);
        toast.success(`Départ : ${hit.name}`, {
          description:
            'Lieu connu le plus proche. Position traitée sur votre téléphone, jamais envoyée.',
        });
      },
      () => {
        setBusy(false);
        toast.error('Position refusée ou indisponible');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  // Le titre ne change JAMAIS de largeur : l'état de recherche vit dans le
  // sous-titre, l'icône devient un indicateur qui pulse.
  return (
    <button
      type="button"
      onClick={locate}
      disabled={busy}
      aria-busy={busy}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={
          'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-[16px]' +
          (busy ? ' animate-pulse' : '')
        }
      >
        📍
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-primary">Ma position</span>
        <span className="block text-[11px] text-muted-foreground">
          {busy
            ? 'Recherche en cours (jusqu’à 8 s)…'
            : 'Trouvée sur votre téléphone — jamais envoyée'}
        </span>
      </span>
    </button>
  );
}
