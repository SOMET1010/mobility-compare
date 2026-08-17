# Backlog UX — revue du décideur (16 août 2026)

> Sept axes issus de la revue produit du décideur, triés par une règle
> unique : **on ne montre jamais une donnée qu'on n'a pas.** Ce qui était
> affichable sans inventer a été livré le jour même ; le reste attend sa
> donnée, et ce document dit laquelle.

## Livré (16/08/2026)

| Axe                         | Ce qui a été fait                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Temps porte-à-porte (axe 3) | Durée affichée = durée + attente (« 43 min dont 8 d'attente ») — partout : carte conseil, cartes de modes, fiche détail, message WhatsApp. Le moteur de classement départageait déjà sur ce total : l'écran montre désormais le même nombre. |
| Badges lisibles (axe 1)     | 💰 Moins cher · ⚡ Plus rapide · ⭐ Meilleur rapport                                                                                                                                                                                         |
| « Ma position » (axe 2)     | Bouton 📍 sur l'accueil et le comparateur. Le lieu connu le plus proche est calculé **sur l'appareil** (la position n'est jamais envoyée) ; hors d'Abidjan → on le dit, on ne devine pas.                                                    |
| CTA jamais muet (axe 5)     | « Comparer les 4 modes → » garde son libellé ; l'aide (« Choisissez une autre destination ») est une ligne à part.                                                                                                                           |
| Estimation datée (axe 4)    | « Circulation dense (habituelle à 20h30) » — l'heure de l'estimation est dite ; la météo reste étiquetée (réel). Contraste du bandeau relevé.                                                                                                |
| Hero raccourci (axe 7)      | Hauteurs réduites ~40 % desktop ; liens « FAQ / Comment ça marche » retirés du hero (les sections suivent au scroll).                                                                                                                        |
| Assistant discret (axe 7)   | Pastille icône 48 px au lieu du bouton à texte.                                                                                                                                                                                              |

## En attente d'une donnée réelle (ne pas inventer)

| Axe                                                                   | Donnée manquante                                                        | Levée par                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prix par opérateur (Yango ≠ Heetch)                                   | Grilles réelles des opérateurs                                          | DEP-002 / relevés terrain (DEP-004)                                                                                                                                                                      |
| Marche + correspondances (axe 3)                                      | Intégration produit du réseau de lignes                                 | **La donnée est acquise (16/08/2026)** : 1 255 lignes bus/woro-woro/gbaka/bateaux extraites de notre carte OSM (voir SOURCES_OFFICIELLES §2) — reste le chantier d'intégration (itinéraires multimodaux) |
| « Tarif relevé à 20h32 » (axe 4)                                      | Flux tarifaire opérateur en temps réel                                  | Accord opérateur ou relevés horodatés (DEP-004)                                                                                                                                                          |
| Critères qualitatifs (axe 6 : clim, mobile money, bagages, fiabilité) | Attributs vérifiés par mode/opérateur, sourcés                          | Grille d'attributs à collecter sur le terrain ; les attributs **génériques par mode** (porte-à-porte, partagé) sont déjà les sous-titres des cartes                                                      |
| Lieu précis / adresse (axe 2)                                         | Géocodage — le serveur de routage sait déjà router n'importe quel point | Recherche d'adresse à brancher (notre serveur OSRM + données OSM locales) — prochain gros chantier produit                                                                                               |
| « Partir → ouvrir Yango/Heetch » (parcours cible, étape 6)            | Liens profonds officiels des applications opérateurs                    | À vérifier (schémas d'URL publics) — sans accord, repli : ouvrir l'app installée                                                                                                                         |

## Le parcours cible (retenu comme boussole)

Où partez-vous ? (📍 ou recherche) → Où allez-vous ? → Comparer →
Classement (Recommandé / Moins cher / Plus rapide) → Détail (coût complet,
attente, confiance) → **Partir**.

La promesse n'est pas « combien coûte Yango ? » mais « quelle est la
meilleure façon d'aller de A à B, maintenant, selon mes priorités ? ».

## Reportés après le refactoring (décision du décideur, 17/08/2026)

Les trois lots ci-dessous sont volontairement différés — « d'autres choses
peuvent venir avant ». À ressortir quand le besoin le justifiera :

- **Unifier le widget de l'accueil avec la vue recherche du comparateur**
  (une seule implémentation de la sélection de lieux — audit C2).
- **Migrer les fetchs sur React Query** (déjà installé, 0 usage — états
  chargement/erreur/succès uniformes, audit C10).
- **Prérendu / SEO** (titre et aperçu de lien dynamiques pour les trajets
  partagés — les deux audits s'accordaient déjà pour le différer).
