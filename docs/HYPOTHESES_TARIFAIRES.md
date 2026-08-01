# HYPOTHÈSES TARIFAIRES ET ARBITRAGES EN ATTENTE

**Jalon** J2.1 · **Date** 1er août 2026 · **Statut** hypothèses à confirmer par relevés terrain

Le moteur de calcul dynamique est implémenté et prouvé. Mais **calculer juste suppose de savoir ce qui est juste**, et plusieurs règles ne sont documentées nulle part publiquement. Ce document liste ce que j'ai dû décider, et pourquoi.

Aucune valeur tarifaire réelle n'a été inventée : le moteur ne contient aucun nombre d'opérateur. Ce sont les **règles de composition** qui font l'objet d'hypothèses.

---

## 1. Hypothèses figées dans le moteur

Chacune est implémentée, testée, et **révisable** — une hypothèse fausse se corrige en changeant l'ordre d'application, pas l'architecture.

### H1 — Le minimum de course s'applique **après** les majorations

```
S3 = max(S2 × multiplicateur, minimumFare)
```

**Alternative écartée** : appliquer le minimum avant, puis majorer, ce qui donnerait `minimumFare × 1,5` sur un trajet très court en heure de pointe.

**Pourquoi** : le minimum est un plancher de rentabilité pour le chauffeur, pas une base majorable. L'appliquer avant reviendrait à facturer une majoration sur un prix qui n'a pas été atteint au compteur.

**Impact si faux** : les trajets courts en période majorée sont sous-estimés.

### H2 — Les frais fixes ne sont **pas** majorés

```
S4 = S3 + fraisFixes
```

**Pourquoi** : un péage ou un supplément aéroport est un montant dû à un tiers. Il ne varie pas parce qu'il pleut.

**Impact si faux** : sous-estimation des trajets aéroport en période majorée.

### H3 — Composition des majorations — **POLITIQUE INJECTABLE, `UNVALIDATED`**

Ce n'est plus une constante du moteur mais une politique portée par la grille, avec deux modes :

| Mode                                 | Formule            |
| ------------------------------------ | ------------------ |
| `MULTIPLICATIVE` (défaut provisoire) | horaire × zone     |
| `MAX`                                | max(horaire, zone) |

Le statut `UNVALIDATED` est **exposé dans le résultat** (`multiplier.compositionStatus`) et non enfoui.

**Pourquoi ce défaut** : deux causes de rareté indépendantes se cumulent plausiblement. Un trajet nocturne vers l'aéroport est plus difficile à pourvoir qu'un trajet nocturne ordinaire.

**Impact si faux** : surestimation quand plusieurs majorations coïncident. Reste l'hypothèse la plus incertaine. Les deux modes sont testés et donnent des prix mesurablement différents — le choix n'est pas neutre.

### H4 — Plafond de majoration — **BORNE TECHNIQUE PROVISOIRE**

```
M = min(M, maxTotalMultiplier)    défaut provisoire : 3, configurable par grille
```

**Ce n'est pas une règle réglementaire.** Aucune source officielle fixant un plafond n'a été versée au dossier. La valeur de 3 est arbitraire et sert uniquement à empêcher la composition de diverger sans limite.

Le message d'écrêtage le dit explicitement : _« borne technique provisoire, aucune source réglementaire versée au dossier »_.

**Au dépassement, le moteur écrête et trace** — il ne déclare pas d'absence. L'absence reste réservée aux cas où le calcul est réellement impossible : données invalides, expirées ou insuffisantes. Le résultat expose :

| Champ                  | Contenu                          |
| ---------------------- | -------------------------------- |
| `multiplier.raw`       | majoration brute, avant écrêtage |
| `multiplier.applied`   | majoration retenue               |
| `multiplier.capped`    | `true`                           |
| `multiplier.capReason` | raison du plafonnement           |

_Note de contexte, sans valeur de justification_ : la presse ivoirienne a rapporté en mai 2026 qu'un recadrage des plateformes sur la tarification dynamique serait en préparation. Il s'agit d'une source secondaire, non officielle, qui **ne fonde aucune décision d'architecture**. Elle est mentionnée ici comme veille, non comme référence.

### H5 — Assiette de la taxe — **POLITIQUE INJECTABLE, `UNVALIDATED`**

L'assiette n'est pas tranchée. Les deux options sont modélisées et testées séparément :

| Mode                                   | Assiette                             | Formule                      |
| -------------------------------------- | ------------------------------------ | ---------------------------- |
| `METER_ONLY`                           | compteur seul, frais fixes exclus    | `S3 × taux`, ajouté au total |
| `TOTAL_BEFORE_TAX` (défaut provisoire) | total avant taxe, frais fixes inclus | `S4 × taux`                  |

L'écart est réel : sur un trajet avec 1 000 FCFA de frais fixes et 4 % de taxe, les deux politiques diffèrent de 40 FCFA. La trace nomme l'assiette employée.

**À vérifier** : texte de l'annexe fiscale ou DGTTC. `À DÉFINIR`.

### H6 — Arrondi au multiple de 5 FCFA, au plus proche

**Pourquoi** : 5 FCFA est la plus petite pièce en circulation courante. Un prix affiché à l'unité serait impayable en espèces — et l'espèce reste dominante.

Le pas et le mode sont configurables par grille.

---

## 2. Ce que le moteur garantit

| Exigence                              | Comment                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calcul à partir de données explicites | Aucun nombre codé en dur ; tout vient de la grille validée                                                                                                              |
| Aucun levier commercial               | Le modèle n'a pas de champ pour ça. Un identifiant contenant `promo`, `discount`, `sponsor`, `commission` dans `domain/pricing` fait échouer la CI — testé négativement |
| Déterminisme                          | Vérifié sur 100 exécutions avec majorations, zones, frais fixes et taxe                                                                                                 |
| Règles non ambiguës                   | Ordre figé et documenté ; arrondis, minimums, bornes explicites                                                                                                         |
| Trace complète                        | Chaque étape porte son libellé, sa formule avec valeurs réelles, son montant cumulé. La dernière étape égale le montant facturé — testé                                 |
| Configuration invalide rejetée        | 9 tests de validation ; le moteur n'accepte qu'une grille validée                                                                                                       |
| Horloge injectée                      | L'heure système n'est jamais lue. Deux horloges distinctes donnent le même résultat si le départ est fourni — testé                                                     |

**Un point de conception mérite d'être signalé** : le champ `sponsorBoost` injecté dans une grille est _silencieusement ignoré_ par la validation Zod, pas rejeté. C'est le comportement souhaité — un champ inconnu ne peut pas influencer le calcul puisqu'il n'atteint jamais le moteur. Un test le vérifie explicitement.

---

## 3. Arbitrages métier en attente

### A. Assiette de la taxe de 4 %

Porte-t-elle sur le total ou sur le seul prix au compteur ? Les frais fixes en sont-ils exclus ? **Source à obtenir** : texte de l'annexe fiscale ou DGTTC.

### B. Valeur du plafond de majoration

Le défaut de 3 est arbitraire. Faut-il l'aligner sur une future règle DGTTC, ou l'afficher comme _notre_ plafond d'estimation, distinct de ce que pratiquent les plateformes ? **Question produit autant que technique.**

### C. Que faire au-delà du plafond ?

Aujourd'hui le moteur écrête et le signale. Trois options :

1. écrêter et signaler (actuel)
2. écrêter et déclarer une absence — « majoration hors de nos bornes de fiabilité »
3. afficher la valeur non plafonnée avec un avertissement

L'option 2 est la plus honnête si l'écart devient important. **Ton arbitrage.**

### D. Taxi compteur — **tranché : deux estimations séparées**

Le moteur **ne fabrique aucun « prix négocié »**. Toute grille porte une base :

| Base         | Condition                                                                             |
| ------------ | ------------------------------------------------------------------------------------- |
| `REGULATORY` | grille officielle vérifiée — `sourceRef` **obligatoire**, la validation rejette sinon |
| `OBSERVED`   | échantillon terrain suffisant                                                         |

Les deux valeurs ne sont jamais fusionnées : aucune fonction du moteur ne les combine, et le résultat porte toujours sa base. Reste à arbitrer la **présentation** : afficher les deux côte à côte, ou n'en montrer qu'une selon le contexte.

### E. Granularité des zones de majoration

Zones administratives (communes), zones fonctionnelles (aéroport, port), ou maillage géographique ? Détermine le modèle de données du référentiel.

### F. Facturation de l'attente

Le modèle la prévoit mais aucune plateforme n'expose ses règles. Seuil de déclenchement, tarif, plafond : `À COLLECTER`.

---

## 4. Ce qui n'est pas encore construit

Le moteur calcule un prix **théorique** à partir d'une grille. Il annonce d'ailleurs honnêtement `confidenceScore: 0` et `observationCount: 0` — aucune observation terrain ne l'alimente encore.

Manquent, dans l'ordre :

1. **Les grilles réelles** — chemin critique du projet (CDC §7)
2. **Le recalage par contributions** — module B du modèle produit : les prix réellement payés corrigent l'estimation et alimentent le score de confiance
3. **L'estimation du surge en temps réel** — le moteur applique des fenêtres horaires connues, pas une majoration observée à l'instant t

Tant que 1 et 2 n'existent pas, le moteur ne doit produire **aucun affichage public**. Un prix théorique présenté comme une estimation fiable serait exactement le genre de présence trompeuse que le CDC interdit.
