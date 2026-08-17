import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeGroups } from '@/demo/scenario';
import {
  makeAddressId,
  nearestPlace,
  prioritizeCommuneMatches,
  resolvePoint,
  searchPlaces,
} from '@/features/search/placeSearch';
import { searchAddresses, type AddressHit } from '@/features/search/adresse';
import { UseMyLocation } from '@/components/UseMyLocation';

/**
 * Choix de lieu « à la Yango » : le champ n'est qu'un déclencheur —
 * le choix se fait dans un écran plein (PlaceSheet) : saisie au clavier
 * ouvert, 📍 Ma position, lieux récents, quartiers groupés, adresses de
 * notre géocodeur (fautes pardonnées). La valeur ne change QUE par
 * sélection : jamais de lieu inventé.
 */

/** Le champ-déclencheur : affiche le lieu choisi, ouvre l'écran de choix. */
export function PlaceTrigger({
  label,
  dotClass,
  value,
  onPress,
  wrapperClass = '',
}: {
  label: string;
  dotClass: string;
  value: string;
  onPress: () => void;
  wrapperClass?: string;
}) {
  const selected = resolvePoint(value);
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${wrapperClass}`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-[15px] font-bold">{selected?.name ?? 'Choisir…'}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

/** L'écran de choix plein écran. */
export function PlaceSheet({
  label,
  onPick,
  onClose,
  withGeolocation = false,
  recentIds = [],
}: {
  label: string;
  onPick: (id: string) => void;
  onClose: () => void;
  withGeolocation?: boolean;
  recentIds?: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [addresses, setAddresses] = useState<AddressHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clavier ouvert d'emblée, page arrière figée.
  useEffect(() => {
    inputRef.current?.focus();
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);

  // Adresses du géocodeur : après un temps de calme, jamais à chaque frappe.
  useEffect(() => {
    if (query.trim().length < 3) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    const minuteur = setTimeout(() => {
      searchAddresses(query).then((hits) => {
        if (!cancelled) setAddresses(hits ?? []);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(minuteur);
    };
  }, [query]);

  const lieux = query.trim() ? searchPlaces(query) : null;
  const adressesTriees = prioritizeCommuneMatches(query, addresses);
  const recents = [...new Set(recentIds)]
    .map((id) => ({ id, point: resolvePoint(id) }))
    .filter((r) => r.point !== null)
    .slice(0, 6);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') {
      const premier =
        lieux?.[0]?.id ??
        (adressesTriees[0]
          ? makeAddressId(adressesTriees[0].lat, adressesTriees[0].lng, adressesTriees[0].nom)
          : null);
      if (premier) onPick(premier);
    }
  }

  // Portail vers <body> : un ancêtre à effet (backdrop-blur du widget…)
  // capturerait sinon le position:fixed dans sa propre boîte.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-stretch justify-center bg-black/35 sm:items-start sm:py-12"
      role="dialog"
      aria-label={`Choisir : ${label}`}
      onClick={onClose}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-background sm:max-h-[76vh] sm:w-[26rem] sm:rounded-2xl sm:border sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête : retour + libellé, puis champ de recherche dessiné */}
        <div className="border-b px-3 pb-3 pt-2.5">
          <div className="mb-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              aria-label="Retour"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
            </button>
            <span className="text-[13.5px] font-bold">{label}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3.5 py-2.5">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={query}
              placeholder="Quartier, gare, adresse…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full bg-transparent text-[15px] font-semibold placeholder:font-medium placeholder:text-muted-foreground focus-visible:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Effacer"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted-foreground/20 text-[11px] text-foreground/70 transition hover:bg-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Résultats */}
        <div className="flex-1 overflow-y-auto pb-8">
          {lieux === null ? (
            <>
              {withGeolocation && (
                <div className="border-b py-1">
                  <UseMyLocation onFound={onPick} />
                </div>
              )}
              {recents.length > 0 && (
                <div className="border-b">
                  <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Récents
                  </p>
                  {recents.map((r) => (
                    <SheetRow key={r.id} name={r.point!.name} onPick={() => onPick(r.id)} />
                  ))}
                </div>
              )}
              {placeGroups().map((g) => (
                <div key={g.label}>
                  <p className="sticky top-0 bg-muted/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {g.label}
                  </p>
                  {g.places.map((p) => (
                    <SheetRow key={p.id} name={p.name} onPick={() => onPick(p.id)} />
                  ))}
                </div>
              ))}
            </>
          ) : (
            <>
              {lieux.map((h) => (
                <SheetRow key={h.id} name={h.name} sub={h.commune} onPick={() => onPick(h.id)} />
              ))}
              {adressesTriees.length > 0 && (
                <p className="border-t bg-muted/60 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Adresses
                </p>
              )}
              {adressesTriees.map((a) => (
                <SheetRow
                  key={`${a.lat},${a.lng}`}
                  name={a.nom}
                  sub={a.detail || (nearestPlace(a.lat, a.lng)?.name ?? '')}
                  onPick={() => onPick(makeAddressId(a.lat, a.lng, a.nom))}
                />
              ))}
              {lieux.length === 0 && adressesTriees.length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Aucun lieu trouvé — essayez le nom de la commune
                  {query.trim().length < 3 ? ' (adresses dès 3 lettres)' : ''}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SheetRow({ name, sub, onPick }: { name: string; sub?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-baseline justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="min-w-0 truncate text-[15px] font-semibold">{name}</span>
      {sub && sub !== name && (
        <span className="max-w-[40%] shrink-0 truncate text-[11.5px] text-muted-foreground">
          {sub}
        </span>
      )}
    </button>
  );
}
