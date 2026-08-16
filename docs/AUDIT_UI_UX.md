# Audit UI/UX — couches, doublons, placements

> **Statut : réalisé le 16 août 2026.** Objectif fixé par le décideur : les
> widgets (météo, circulation…) doivent vivre sur la page d'accueil, et le site
> ne doit pas accumuler des « couches » — un même contenu rendu plusieurs fois,
> à plusieurs endroits, avec plusieurs codes.

## Méthode

Inventaire exhaustif des 8 pages (`/`, `/demo`, `/observatoire`, `/methode`,
`/partenaires`, `/compte`, `/conditions`, `/moderation`), des composants
partagés (`SiteHeader`, `Conditions`, `Assistant`, `OnboardingOverlay`) et de
leurs points de montage, puis vérification écran par écran (mobile 390px,
desktop 1366px).

## Constats et décisions

| #   | Constat                                                                                                                                        | Gravité | Décision                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Les tuiles Météo/Circulation (`Conditions`) n'existaient **que** dans les résultats de `/demo` — invisibles depuis l'accueil                   | Haute   | **Corrigé** : tuiles déplacées sur l'accueil, sous le widget trajet                                               |
| 2   | Le widget trajet de l'accueil **dupliquait** la même donnée en mini-puces (2ᵉ rendu, 2ᵉ appel météo) — la « couche » typique                   | Haute   | **Corrigé** : mini-puces supprimées ; `Conditions` est la source unique                                           |
| 3   | La page résultats empilait 10 blocs (titre, critères, recommandé, cartes, exclus, actions, carte, conditions, détails) — déjà signalée confuse | Moyenne | **Corrigé** : les conditions n'y sont plus ; la pile raccourcit                                                   |
| 4   | `/demo` a son propre en-tête (`AppBar`) distinct du `SiteHeader` des 7 autres pages — deux systèmes d'en-tête à maintenir                      | Moyenne | **À faire** : unifier sur `SiteHeader` (chantier séparé, l'AppBar porte le bandeau d'honnêteté et la nav interne) |
| 5   | L'`Assistant` est monté sur `/`, `/demo`, `/methode` mais absent de `/observatoire`, `/partenaires`, `/compte`, `/conditions`                  | Basse   | **À faire** : le monter une seule fois au niveau du routeur (présence uniforme, un seul point de montage)         |
| 6   | Les CGU ne sont accessibles que par les pieds de page                                                                                          | Basse   | Acceptable (usage standard) ; lien aussi présent dans le parcours d'inscription                                   |

## Règle retenue pour la suite

Un contenu = **un composant, un point de montage par écran**. Toute envie d'en
afficher « une petite version ailleurs » se traite en réutilisant le composant
(au besoin avec une prop `compact`), jamais en recodant une variante.
