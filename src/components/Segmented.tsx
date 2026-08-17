/**
 * Sélecteur segmenté — LE composant des bascules et onglets (type de
 * prestation, critère de tri…). Une seule hauteur, un seul état actif,
 * partout : l'audit UX (C4) a montré le même contrôle rendu à deux
 * hauteurs différentes selon la vue.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  options: readonly { readonly value: T; readonly label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-1 rounded-xl bg-muted p-1 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={
            'flex-1 rounded-lg px-2 py-2 text-note font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
            (value === o.value
              ? 'bg-background font-bold text-foreground shadow-sm ring-1 ring-brand-ochre/45'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
