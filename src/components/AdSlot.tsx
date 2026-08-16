import { Link } from 'react-router-dom';

/**
 * Encart publicitaire — l'emplacement est DESSINÉ dès maintenant, sa
 * monétisation viendra après la preuve d'audience (CDC §13.7).
 *
 * Règles non négociables :
 * - Toujours étiqueté « Publicité » : un placement sponsorisé est identifié
 *   comme tel (invariant I3).
 * - JAMAIS dans le classement : les encarts vivent hors de la liste des
 *   résultats — un partenaire s'affiche, il n'influence pas l'ordre.
 * - Tant qu'aucun partenaire n'est signé, l'encart se vend lui-même et
 *   renvoie vers la page Partenaires.
 */
export function AdSlot({ slotId }: { slotId: string }) {
  return (
    <aside
      aria-label="Publicité"
      data-slot={slotId}
      className="rounded-2xl border border-dashed bg-muted/30 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Publicité
        </span>
        <span className="text-[10px] text-muted-foreground">N’influence jamais le classement</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">Cet espace attend un partenaire de confiance.</p>
        <Link
          to="/partenaires"
          className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold text-primary transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Devenir partenaire →
        </Link>
      </div>
    </aside>
  );
}
