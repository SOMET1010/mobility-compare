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

| #   | Constat                                                                                                                                                                                                                                                          | Gravité | Décision                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Les tuiles Météo/Circulation (`Conditions`) n'existaient **que** dans les résultats de `/demo` — invisibles depuis l'accueil                                                                                                                                     | Haute   | **Corrigé** : tuiles déplacées sur l'accueil, sous le widget trajet                                                                                                                                                                                                                           |
| 2   | Le widget trajet de l'accueil **dupliquait** la même donnée en mini-puces (2ᵉ rendu, 2ᵉ appel météo) — la « couche » typique                                                                                                                                     | Haute   | **Corrigé** : mini-puces supprimées ; `Conditions` est la source unique                                                                                                                                                                                                                       |
| 3   | La page résultats empilait 10 blocs (titre, critères, recommandé, cartes, exclus, actions, carte, conditions, détails) — déjà signalée confuse                                                                                                                   | Moyenne | **Corrigé** : les conditions n'y sont plus ; la pile raccourcit                                                                                                                                                                                                                               |
| 4   | `/demo` avait son propre en-tête (`AppBar`) distinct du `SiteHeader` des 7 autres pages — deux systèmes d'en-tête à maintenir                                                                                                                                    | Moyenne | **Corrigé** : `SiteHeader` partout ; la démo lui passe son bandeau d'honnêteté (`banner`) et masque le CTA (`cta`)                                                                                                                                                                            |
| 5   | L'`Assistant` était monté page par page (`/` et `/demo` seulement), absent partout ailleurs                                                                                                                                                                      | Basse   | **Corrigé** : monté une seule fois dans le shell applicatif — présent sur tout le site                                                                                                                                                                                                        |
| 6   | Les CGU ne sont accessibles que par les pieds de page                                                                                                                                                                                                            | Basse   | Acceptable (usage standard) ; lien aussi présent dans le parcours d'inscription                                                                                                                                                                                                               |
| 7   | Le produit se présentait comme une démo : onglets « Réel vs simulé » / « À propos » dans le parcours, bandeau « MAQUETTE », CTA « Voir la démo » — plus d'écrans d'explication que de réponse                                                                    | Haute   | **Corrigé** : la page est le comparateur seul (`/comparer`, `/demo` redirige) ; explications déplacées en FAQ sur `/methode#faq` ; bandeau « Version pilote — prix indicatifs » ; CTA « Comparer »                                                                                            |
| 8   | Le parcours parlait « Oslo », pas « Babi » : codes internes à l'écran (DEP-001/004/009, invariants I2/I3/I4, « périmètre V1 »), échafaudage « Étape 1/2/3 », formule mathématique dans l'encadré conseil, mots froids (« calibration », « estimation déguisée ») | Haute   | **Corrigé** : langage d'usager partout (« On va où ? », « Notre conseil », « Partager un prix payé », « Combien coûte votre trajet ? ») ; codes internes retirés des écrans (leur place : `/methode` et le dépôt) ; la formule ne vit plus que dans la fiche (« Le calcul, ligne par ligne ») |

## Règle retenue pour la suite

Un contenu = **un composant, un point de montage par écran**. Toute envie d'en
afficher « une petite version ailleurs » se traite en réutilisant le composant
(au besoin avec une prop `compact`), jamais en recodant une variante.

## Décisions de conception prises en autonomie (16 août 2026)

La thèse produit : **l'écran de résultats est une réponse, pas une liste.**

1. **La réponse d'abord** — l'encadré conseil est devenu la carte-réponse :
   mode gagnant, prix en gros, durée, touchable vers le calcul complet.
2. **Changer de trajet depuis le titre** — « Yopougon → Plateau ✎ » ramène à
   la recherche ; plus besoin de descendre chercher un bouton.
3. **Onboarding en un écran** — trois points, un bouton « C'est parti » ;
   trois écrans à lire avant de comparer contredisaient le produit-réponse.
4. **Registre de langue** — vouvoiement conservé (respectueux à tout âge),
   formules impersonnelles quand c'est naturel (« On va où ? ») ; pas de
   nouchi forcé. À réévaluer avec de vrais retours d'usagers.
5. **Le résultat circule par WhatsApp** — bouton dédié : le message contient
   la réponse (tous les prix, gagnant étoilé, mention « indicatifs ») et le
   lien profond du trajet. C'est ainsi qu'un comparateur se propage à Abidjan.
6. **Installation en un geste** — manifest au nom MOBILIS, icônes PNG 192/512
   générées, invite discrète « Ajouter à l'écran d'accueil » sous les
   résultats (Chrome/Android), jamais en interstitiel.
7. **Yango et Heetch visibles dès l'en-tête de section VTC** — pastilles aux
   couleurs de marque (données du registre I4). Les prix par opérateur
   attendent les grilles réelles : on n'invente pas d'écart de prix.
8. **Le public vit sur TikTok et Facebook** — un lien MOBILIS qui circule doit
   être beau : balises Open Graph + image sociale 1200×630 (« On va où ?
   Comparez les prix avant de partir. ») ; bouton Facebook à côté de WhatsApp.
   Limite connue : la carte est la même pour toutes les pages (site statique,
   pas de rendu par trajet) — une carte par trajet exigerait des fonctions
   serveur, noté pour plus tard.
