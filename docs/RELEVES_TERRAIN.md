# Kit de relevés terrain (DEP-004 — chemin critique)

> Le CDC est formel (§12) : sans observations réelles, aucun prix ne peut être
> présenté comme fiable. Ce kit permet de commencer la collecte **demain
> matin**, avec un téléphone et un tableur.

## Le modèle à remplir

Fichier : [`/releves-terrain-modele.csv`](https://mobility-compare.pages.dev/releves-terrain-modele.csv)
(aussi dans `public/` du dépôt). Une ligne = un trajet réellement payé.

| Colonne        | Format                                               | Exemple        |
| -------------- | ---------------------------------------------------- | -------------- |
| `date`         | AAAA-MM-JJ                                           | 2026-08-16     |
| `heure`        | HH:MM (heure locale d'Abidjan)                       | 07:45          |
| `corridor`     | `yopougon-plateau`, `cocody-plateau`, `abobo-adjame` | cocody-plateau |
| `mode`         | `VTC`, `TAXI`, `WORO`, `GBAKA`                       | GBAKA          |
| `prix_fcfa`    | entier, prix réellement payé                         | 300            |
| `heure_pointe` | `oui` / `non`                                        | oui            |
| `commentaire`  | libre (négociation, pluie, détour…)                  | prix négocié   |

**Règles de collecte :**

- Ne noter que des prix **réellement payés** (pas d'estimations, pas de
  « on m'a dit que »). Pour les VTC, le prix affiché par l'application au
  moment de la commande compte comme payé.
- Ne jamais noter d'information personnelle (ni chauffeur, ni plaque, ni
  passager) — seule la transaction compte.
- Varier les heures : au moins un tiers des relevés en heure de pointe
  (6h30–9h30 / 16h30–20h).

## Objectifs (corridors d'amorçage, CDC §13.8)

| Corridor           | Modes                       | Objectif          |
| ------------------ | --------------------------- | ----------------- |
| Yopougon ↔ Plateau | VTC, taxi, woro-woro, gbaka | ≥ 30 observations |
| Cocody ↔ Plateau   | VTC, taxi, woro-woro        | ≥ 30 observations |
| Abobo ↔ Adjamé     | woro-woro, gbaka            | ≥ 30 observations |

À ~10 relevés par jour et par enquêteur, un seul enquêteur boucle les trois
corridors en **deux semaines** ; deux enquêteurs, en une.

## Ce qui se passe à la remise du fichier

1. J'écris l'import (validation des colonnes, rejet des aberrations
   évidentes, aucune invention pour « remplir »).
2. Les grilles passent en `basis: OBSERVED` avec le nombre d'observations et
   leur fraîcheur dans la trace de calcul (invariant I2).
3. **L'indice de confiance affiché passe de 0 à sa vraie valeur** — le moment
   où le produit cesse d'être une démonstration.

Dès que Supabase est branché (DEP-006), la page « Contribuer un tarif » de
l'application remplace le tableur comme canal de saisie.
