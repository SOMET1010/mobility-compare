/**
 * MONNAIE — FRANC CFA (XOF)
 * Le XOF n'a pas de subdivision en usage : tous les montants sont des ENTIERS.
 * Aucun flottant ne circule dans le moteur tarifaire, ce qui elimine par
 * construction les derives d'arrondi cumulatives.
 */

export type Xof = number & { readonly __brand: 'Xof' };

export function xof(amount: number): Xof {
  if (!Number.isFinite(amount)) throw new Error(`Montant non fini : ${amount}`);
  if (!Number.isInteger(amount)) throw new Error(`Le XOF n'admet pas de decimale : ${amount}`);
  if (amount < 0) throw new Error(`Montant negatif : ${amount}`);
  return amount as Xof;
}

export type RoundingMode = 'nearest' | 'up' | 'down';

/**
 * Arrondi au multiple de `step`.
 * Le pas usuel a Abidjan est de 5 FCFA : c'est la plus petite piece en
 * circulation courante. Un prix affiche a l'unite serait impayable en especes.
 * Le pas reste configurable par grille — cf. HYPOTHESE H6.
 */
export function roundTo(amount: number, step: number, mode: RoundingMode): Xof {
  if (step <= 0 || !Number.isInteger(step)) {
    throw new Error(`Pas d'arrondi invalide : ${step}`);
  }
  const quotient = amount / step;
  const rounded =
    mode === 'up'
      ? Math.ceil(quotient)
      : mode === 'down'
        ? Math.floor(quotient)
        : Math.round(quotient);
  return xof(rounded * step);
}
