# Moteur tarifaire dynamique — VTC et taxi compteur

Domaine pur : aucun reseau, aucune base, aucune horloge systeme.

- `money.ts` (parent) — XOF entier, arrondi au pas configurable
- `clock.ts` (parent) — horloge injectee, fuseau Abidjan UTC+0
- `grid.ts` — modele de grille et validation prealable au calcul
- `engine.ts` — calcul, ordre d'application fige et trace

Aucune valeur tarifaire reelle n'est codee ici. Les grilles sont collectees
puis versionnees en base (CDC §7).

**Interdit par conception** : aucun coefficient commercial, promotionnel ou
pilote par un partenaire. Verifie par test d'architecture.

Hypotheses tarifaires et arbitrages en attente : `docs/HYPOTHESES_TARIFAIRES.md`.
