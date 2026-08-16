import { useEffect, useRef, useState } from 'react';
import { placeGroups } from '@/demo/scenario';
import {
  makeAddressId,
  resolvePoint,
  searchPlaces,
  type PlaceHit,
} from '@/features/search/placeSearch';
import { searchAddresses, type AddressHit } from '@/features/search/adresse';

/**
 * Champ de lieu « en tapant » — remplace les listes déroulantes.
 * Au toucher : la liste complète (groupée par commune) s'ouvre ; dès deux
 * lettres, elle se réduit aux correspondances (accents ignorés). Avec
 * `allowAddresses`, les adresses précises de notre géocodeur s'ajoutent
 * sous les quartiers (≥ 3 lettres, 300 ms de calme). La valeur ne change
 * QUE par sélection dans la liste : jamais de lieu inventé.
 */
export function PlaceField({
  label,
  dotClass,
  value,
  onChange,
  wrapperClass = '',
  allowAddresses = false,
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (id: string) => void;
  wrapperClass?: string;
  allowAddresses?: boolean;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [addresses, setAddresses] = useState<AddressHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = resolvePoint(value);
  const editing = query !== null;
  const lieux: PlaceHit[] | null = editing && query.trim() ? searchPlaces(query) : null;

  // Adresses du géocodeur : après un temps de calme, jamais à chaque frappe.
  useEffect(() => {
    if (!allowAddresses || !editing || (query?.trim().length ?? 0) < 3) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    const minuteur = setTimeout(() => {
      searchAddresses(query!).then((hits) => {
        if (!cancelled) setAddresses(hits ?? []);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(minuteur);
    };
  }, [allowAddresses, editing, query]);

  /** Liste unifiée pour le clavier : quartiers d'abord, adresses ensuite. */
  const combined: { id: string; name: string; sub?: string }[] = [
    ...(lieux ?? []).map((h) => ({ id: h.id, name: h.name, sub: h.commune })),
    ...addresses.map((a) => ({
      id: makeAddressId(a.lat, a.lng, a.nom),
      name: a.nom,
      sub: a.detail,
    })),
  ];

  function pick(id: string) {
    onChange(id);
    setQuery(null);
    setHighlight(0);
    setAddresses([]);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editing) return;
    if (e.key === 'Escape') {
      setQuery(null);
      inputRef.current?.blur();
      return;
    }
    if (combined.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, combined.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(combined[Math.min(highlight, combined.length - 1)]!.id);
    }
  }

  const lieuxCount = lieux?.length ?? 0;

  return (
    <div className={`relative ${wrapperClass}`}>
      <label className="flex items-center gap-2.5 px-1 py-1">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={editing}
            aria-label={label}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            value={editing ? query : (selected?.name ?? '')}
            placeholder={selected?.name ?? 'Tapez un quartier…'}
            onFocus={() => {
              setQuery('');
              setHighlight(0);
            }}
            onBlur={() => setQuery(null)}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-[15px] font-bold placeholder:font-semibold placeholder:text-foreground/70 focus-visible:outline-none"
          />
        </span>
      </label>

      {editing && (
        <div
          role="listbox"
          aria-label={`Lieux pour ${label}`}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-card shadow-xl"
        >
          {lieux === null ? (
            /* Liste complète, groupée par commune — avant la première lettre. */
            placeGroups().map((g) => (
              <div key={g.label}>
                <div className="sticky top-0 bg-muted/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {g.label}
                </div>
                {g.places.map((p) => (
                  <OptionRow key={p.id} name={p.name} onPick={() => pick(p.id)} />
                ))}
              </div>
            ))
          ) : combined.length > 0 ? (
            <>
              {combined.map((c, i) => (
                <div key={c.id}>
                  {allowAddresses && i === lieuxCount && addresses.length > 0 && (
                    <div className="border-t bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Adresses
                    </div>
                  )}
                  <OptionRow
                    name={c.name}
                    commune={c.sub}
                    active={i === highlight}
                    onPick={() => pick(c.id)}
                  />
                </div>
              ))}
            </>
          ) : (
            <p className="px-3 py-3 text-[12.5px] text-muted-foreground">
              Aucun lieu trouvé — essayez le nom de la commune
              {allowAddresses ? ' ou continuez à taper (adresses dès 3 lettres)' : ''}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OptionRow({
  name,
  commune,
  active = false,
  onPick,
}: {
  name: string;
  commune?: string;
  active?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      /* mousedown : sélectionner AVANT que le blur du champ ne ferme la liste */
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
      className={`flex w-full items-baseline justify-between gap-2 px-3 py-2.5 text-left text-[14px] transition ${
        active ? 'bg-muted' : 'hover:bg-muted/60'
      }`}
    >
      <span className="min-w-0 truncate font-semibold">{name}</span>
      {commune && commune !== name && (
        <span className="max-w-[45%] shrink-0 truncate text-[11px] text-muted-foreground">
          {commune}
        </span>
      )}
    </button>
  );
}
