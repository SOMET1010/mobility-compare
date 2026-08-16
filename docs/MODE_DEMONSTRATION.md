# Mode Démonstration

> **En une phrase :** le mode Démonstration fait tourner les **moteurs réels**
> (tarification dynamique + classement) sur des **données 100 % fictives et
> étiquetées**, pour montrer l'expérience utilisateur complète avant que les
> preuves externes (routage, grilles, relevés) ne soient disponibles.

Ce n'est **pas** une entorse à la doctrine « prouvé, pas déclaré / zéro donnée
inventée » : chaque écran porte la mention SIMULATION, l'indice de confiance
terrain reste **0**, et aucune valeur n'est présentée comme réelle. Le jour où
les données réelles existent, on remplace **une seule couture** — le parcours et
la mécanique de calcul ne changent pas.

## À quoi ça sert

- Rendre le produit **montrable** (partenaires, ARTI, testeurs) sans attendre
  les dépendances externes ouvertes (voir « Passer aux données réelles »).
- Prouver que la chaîne **UI → moteur de tarification → moteur de classement**
  est réellement câblée et se comporte correctement, pas seulement maquettée.
- Fixer l'expérience utilisateur (recherche → comparaison → détail) pour qu'elle
  reste stable quand la source de données bascule vers le réel.

## Comment y accéder

- Route `/demo` (déclarée dans `src/App.tsx`), atteignable depuis l'accueil `/`.
- La page `src/pages/DemoPage.tsx` orchestre le parcours ; toutes les données
  proviennent de `src/demo/`.

## Architecture — où passe la donnée

```
src/demo/scenario.ts   (données FICTIVES : corridors, durées, tarifs)
        │
        ▼  getComparison(corridorId, criterion)      ← LA SEULE COUTURE
        │
        ├─►  computeFare(input, clock)   [@/domain/pricing/dynamic]  → prix + trace (I2)
        │
        └─►  rankOptions(options, …)     [@/domain/ranking]          → ordre + badges (I3)
        │
        ▼
   DemoComparison  →  DemoPage.tsx  (affichage, bandeau SIMULATION)
```

Les deux moteurs appelés sont **les vrais** — le domaine pur, testé par ailleurs.
La démo ne les contourne ni ne les simplifie ; elle leur fournit une entrée
fictive et affiche fidèlement leur sortie, trace de calcul comprise.

## Ce qui est simulé (et affiché comme tel)

| Élément                 | Valeur en démo                                                                  | Garde-fou                                                              |
| ----------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Bandeau global          | « MAQUETTE — DONNÉES 100 % FICTIVES, NON CONTRACTUELLES » (`SIMULATION_BANNER`) | Affiché sur chaque écran                                               |
| Corridors               | 8 trajets d'Abidjan inventés (`CORRIDORS`)                                      | Libellés « Exemple » côté UI                                           |
| Distances / durées      | Fixées à la main par corridor                                                   | Aucun itinéraire calculé                                               |
| Fournisseur de routage  | `SIMULATION (aucun OSRM — DEP-001)` (`DEMO_ROUTING_PROVIDER`)                   | Inscrit dans la trace de chaque prix                                   |
| Grilles tarifaires      | `METERED_PARAMS` (VTC/taxi) + forfaits fictifs (woro/gbaka)                     | `policies … status: UNVALIDATED`, `basis: OBSERVED`, `sourceRef: null` |
| Frais fixes             | Supplément aéroport 1000, péage pont 500 (« exemple »)                          | Visibles dans la trace, libellés « exemple »                           |
| Valeur du temps         | 25 XOF/min (`DEMO_TIME_VALUE_XOF_PER_MIN`)                                      | « exemple non validé », sert au badge compromis                        |
| Indice de confiance     | **0** pour toute option                                                         | Provient du moteur réel : aucune observation terrain                   |
| Contribution d'un tarif | Formulaire à effet **simulé** (toast), rien n'est enregistré                    | Aucune écriture réelle                                                 |

Ce qui **n'est pas** simulé : la mécanique de prix (arrondis, minimum, plafond,
frais fixes, taxe), le classement, les badges neutres (`CHEAPEST`, `FASTEST`,
`BEST_VALUE`) et la trace de calcul. Tout cela sort des moteurs réels.

## Écosystème : conditions et assistant

| Brique        | Statut de la donnée                                                                | Garde-fou                                                        |
| ------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Météo Abidjan | **RÉELLE** — Open-Meteo (sans clé), interrogée depuis le navigateur du visiteur    | Badge « Réel » ; en cas d'échec réseau, absence honnête          |
| Circulation   | **Simulée** — profil horaire type (pointes 6h30–9h30 et 16h30–20h), déterministe   | Badge « Profil type », mention DEP-009 ; n'ajuste pas les durées |
| Assistant     | **Hybride** — réponses guidées locales + IA serveur sous charte (questions libres) | Réponses IA étiquetées « IA — peut se tromper » (DEP-010)        |

L'assistant (`src/demo/assistant.ts`) sait : détecter deux communes dans une
phrase et proposer la comparaison correspondante, expliquer les modes, les prix,
la neutralité, la météo et le trafic. Chaque règle est testée
(`tests/unit/ecosystem.test.ts`).

## Ce qui reste honnête

- **Confiance 0.** Le moteur ne voit aucune observation terrain (`DEP-004`), donc
  `confidenceScore = 0`. La démo l'affiche au lieu de le masquer.
- **Grilles non validées.** Les politiques de composition et d'assiette fiscale
  restent `UNVALIDATED` (`DEP-002`, `DEP-003`) : la démo ne prétend pas à une
  tarification réglementaire.
- **Aucun routage réel.** La trace nomme explicitement le fournisseur
  « SIMULATION (aucun OSRM — DEP-001) ».
- **Neutralité (I3).** Le classement n'a aucun accès à un identifiant de
  sponsoring ; l'ordre ne dépend que du critère choisi par l'usager.
- **Absence honnête (I1).** Un corridor inconnu renvoie `null` (absence), jamais
  une valeur inventée pour « remplir ».

## Preuves

`tests/unit/demo.test.ts` (11 tests) verrouille ces propriétés : passage par les
moteurs réels, confiance 0, routage « simulation », trois badges neutres cités
sur des options réelles, supplément aéroport présent dans la trace, déterminisme,
8 corridors, et effet du critère de tri (`PRICE` / `DURATION` / `PRICE_TIME`).

## Passer aux données réelles

Le basculement est **local et unique** : réécrire `getComparison()` dans
`src/demo/scenario.ts` (ou la remplacer par un service) pour qu'elle produise ses
`RankableOption[]` à partir de sources réelles, **sans toucher** ni aux moteurs
(`@/domain/*`) ni à l'affichage (`DemoPage.tsx`). Concrètement, chaque valeur
fictive est remplacée quand la dépendance correspondante est levée :

| Donnée fictive aujourd'hui              | Source réelle                                                                               | Dépendance                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Distances / durées codées en dur        | Itinéraires OSRM sur extrait OSM                                                            | **DEP-001** (`./scripts/j2.3/run-proof.sh` → verdict PASS) |
| `METERED_PARAMS`, forfaits              | Grille officielle DGTTC/ARTI + grilles opérateurs, en `basis: REGULATORY` avec `sourceRef`  | **DEP-002**                                                |
| `taxBase: UNVALIDATED`                  | Assiette de la taxe de 4 % tranchée                                                         | **DEP-003**                                                |
| `confidenceScore = 0`, `MAX` par défaut | Relevés terrain (3–5 corridors) pour calibrer composition/plafond et alimenter la confiance | **DEP-004** — _chemin critique_                            |

Tant que ces dépendances sont **OUVERTES** (voir
`docs/REGISTRE_DEPENDANCES_EXTERNES.md`), le mode Démonstration reste la seule
manière honnête de montrer le produit : il expose l'expérience réelle **sans**
présenter de chiffre comme réel.

## Fichiers

| Fichier                   | Rôle                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| `src/demo/simulation.ts`  | Garde-fous et constantes (bandeau, routage simulé, valeur du temps).     |
| `src/demo/scenario.ts`    | **La couture** : données fictives → moteurs réels via `getComparison()`. |
| `src/pages/DemoPage.tsx`  | Parcours et affichage, bandeau SIMULATION permanent.                     |
| `src/App.tsx`             | Route `/demo`.                                                           |
| `tests/unit/demo.test.ts` | Preuves des propriétés d'honnêteté ci-dessus.                            |
