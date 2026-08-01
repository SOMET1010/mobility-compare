# ADR-001 — Nom commercial et Sender ID

- **Statut** : OUVERTE
- **Date** : 1er aout 2026
- **Decideur** : Patrick SOMET

## Contexte

Le depot doit etre initialise, mais le nom commercial du produit n'est pas arrete.
Bloquer l'architecture Git sur une decision de marque serait un mauvais arbitrage :
le nommage marketing et la structure technique n'ont pas le meme rythme de decision.

Deux elements dependent du nom et ne peuvent pas etre engages :

1. Le **Sender ID SMS**, limite a 11 caracteres alphanumeriques, soumis a
   enregistrement aupres des operateurs et a conformite ARTCI. Les delais annonces
   sont de 5 jours ouvres cote Orange et 15 jours cote MTN. Une demande deposee sur
   un nom provisoire devrait etre refaite entierement.
2. Le **nom de domaine de production**. Aucune reservation ne doit intervenir avant
   arbitrage.

## Decision

Avancer avec un placeholder neutre et confiner strictement sa portee.

| Usage                  | Valeur provisoire            |
| ---------------------- | ---------------------------- |
| Nom de travail produit | `MobilityCompare`            |
| Nom du depot           | `mobility-compare`           |
| Nom technique interne  | `mobility_compare`           |
| Nom affiche a l'usager | « Nom du produit a definir » |

Le nom affiche est volontairement explicite : on n'expose pas un nom de travail a
un utilisateur final.

### Regles de confinement

1. **Occurrence unique** : le nom ne figure que dans `src/config/product.ts`.
2. **Aucun nom de produit dans le domaine metier** : `src/domain/` en est exempt.
3. **Aucun nom de produit dans les migrations** de base de donnees.
4. **Noms generiques et fonctionnels** pour les packages, secrets, buckets et
   Edge Functions — par exemple `otp-dispatch`, pas `mobility-compare-otp`.
5. **Aucune demande de Sender ID** n'est lancee a ce stade.
6. **Aucun domaine definitif** n'est reserve.
7. **Verification automatisee** : `tests/architecture/invariants.test.ts` fait
   echouer la CI si le nom apparait hors du fichier autorise ou dans une migration.

### Perimetre d'un renommage futur

Le renommage doit se limiter a quatre endroits :

1. `src/config/product.ts`
2. le champ `name` de `package.json`
3. le nom du depot Git
4. la liste d'exclusion du test d'architecture

## Consequences

**Positives** : le developpement demarre immediatement ; le cout du renommage est
borne et connu ; aucune demarche administrative irreversible n'est engagee.

**Negatives** : le produit reste sans identite visible, ce qui empeche tout test
utilisateur incluant la marque, ainsi que le travail de charte graphique.

**Point de vigilance** : l'enregistrement du Sender ID est sur le chemin critique de
la mise en production de l'authentification. Le delai administratif court a partir de
la decision de marque, pas a partir du developpement. Plus l'arbitrage tarde, plus il
contraint la date de mise en service.

## Cloture

Cette ADR sera close par une decision explicite fixant le nom commercial. Elle devra
alors etre suivie, dans l'ordre : mise a jour de `product.ts`, depot du Sender ID,
reservation du domaine.
