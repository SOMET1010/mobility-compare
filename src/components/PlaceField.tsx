import { useRef, useState } from 'react';
import { COMMUNES, placeGroups } from '@/demo/scenario';
import { searchPlaces, type PlaceHit } from '@/features/search/placeSearch';

/**
 * Champ de lieu « en tapant » — remplace les listes déroulantes.
 * Au toucher : la liste complète (groupée par commune) s'ouvre ; dès deux
 * lettres, elle se réduit aux correspondances (accents ignorés). La valeur
 * ne change QUE par sélection dans la liste : impossible d'envoyer un lieu
 * inconnu au comparateur.
 */
export function PlaceField({
  label,
  dotClass,
  value,
  onChange,
  wrapperClass = '',
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (id: string) => void;
  wrapperClass?: string;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = COMMUNES.find((c) => c.id === value);
  const editing = query !== null;
  const hits: PlaceHit[] | null = editing && query.trim() ? searchPlaces(query) : null;

  function pick(id: string) {
    onChange(id);
    setQuery(null);
    setHighlight(0);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editing) return;
    if (e.key === 'Escape') {
      setQuery(null);
      inputRef.current?.blur();
      return;
    }
    if (!hits || hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(hits[Math.min(highlight, hits.length - 1)]!.id);
    }
  }

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
          {hits === null ? (
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
          ) : hits.length > 0 ? (
            hits.map((h, i) => (
              <OptionRow
                key={h.id}
                name={h.name}
                commune={h.commune}
                active={i === highlight}
                onPick={() => pick(h.id)}
              />
            ))
          ) : (
            <p className="px-3 py-3 text-[12.5px] text-muted-foreground">
              Aucun lieu trouvé — essayez le nom de la commune.
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
      <span className="font-semibold">{name}</span>
      {commune && commune !== name && (
        <span className="shrink-0 text-[11px] text-muted-foreground">{commune}</span>
      )}
    </button>
  );
}
