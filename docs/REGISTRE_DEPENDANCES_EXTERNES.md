# REGISTRE DES DÉPENDANCES EXTERNES

**Objet** : suivre les éléments qui ne peuvent pas être produits par le développement, et qui conditionnent certaines validations.

**Règle** : ces dépendances **ne bloquent aucun développement prouvable**. Elles bloquent en revanche toute prétention de validation correspondante. Une hypothèse `UNVALIDATED` le reste tant que sa dépendance n'est pas levée.

**Règle de propriété** : chaque dépendance porte une **fonction responsable**, même lorsque la personne n'est pas encore désignée. Une dépendance sans propriétaire n'est suivie par personne et finit par disparaître du radar.

Dernière mise à jour : 1er août 2026.

---

## DEP-001 — Environnement Docker avec accès aux données OSM

|                           |                                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| **Bloque**                | Clôture de J2                                                        |
| **Responsable**           | Patrick ADOM                                                         |
| **Source attendue**       | VM Linux ou poste avec Docker, accès réseau à Geofabrik              |
| **Critère d'acceptation** | `./scripts/j2.3/run-proof.sh` produit un rapport de verdict **PASS** |
| **Statut**                | OUVERTE                                                              |

Le protocole est livré et testé. Il ne reste qu'à l'exécuter. Le rapport produit fait foi : horodaté, avec empreinte de l'extrait OSM et mesures.

---

## DEP-002 — Grille tarifaire officielle

|                           |                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Bloque**                | Toute validation tarifaire réelle ; H1, H2, H5                                                        |
| **Responsable**           | `À DÉSIGNER`                                                                                          |
| **Source attendue**       | Arrêté ou grille DGTTC/ARTI pour le taxi compteur ; grilles opérateurs pour le VTC                    |
| **Critère d'acceptation** | Document daté et vérifiable, permettant de renseigner une grille `basis: REGULATORY` avec `sourceRef` |
| **Statut**                | OUVERTE                                                                                               |

La validation d'une grille `REGULATORY` **rejette** déjà une grille sans `sourceRef`. Le verrou est technique, pas seulement documentaire.

---

## DEP-003 — Assiette de la taxe de 4 %

|                           |                                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| **Bloque**                | H5 — politique `taxBase` reste `UNVALIDATED`                         |
| **Responsable**           | `À DÉSIGNER`                                                         |
| **Source attendue**       | Texte de l'annexe fiscale, ou position écrite de la DGTTC            |
| **Critère d'acceptation** | Le texte permet de trancher entre `METER_ONLY` et `TOTAL_BEFORE_TAX` |
| **Statut**                | OUVERTE                                                              |

Les deux options sont implémentées et testées. Il ne manque que la réponse.

---

## DEP-004 — Relevés terrain des tarifs pratiqués

|                           |                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Bloque**                | H3 (composition), H4 (plafond) ; alimentation du score de confiance                              |
| **Responsable**           | `À DÉSIGNER`                                                                                     |
| **Source attendue**       | Campagne de collecte sur 3 à 5 corridors, protocole à définir                                    |
| **Critère d'acceptation** | Échantillon permettant de départager `MULTIPLICATIVE` et `MAX`, et de calibrer une borne mesurée |
| **Statut**                | OUVERTE                                                                                          |

**Chemin critique du projet.** Ne se débloquera pas en attendant une machine : c'est une opération de terrain à organiser, avec un budget. Sans ces données, le moteur reste théorique et `confidenceScore` reste à 0.

---

## DEP-005 — Exécution des tests Playwright

|                           |                                                               |
| ------------------------- | ------------------------------------------------------------- |
| **Bloque**                | Validation du premier parcours navigateur                     |
| **Responsable**           | Patrick ADOM                                                  |
| **Source attendue**       | Environnement autorisant le téléchargement des navigateurs    |
| **Critère d'acceptation** | `npx playwright install chromium && npm run test:e2e` au vert |
| **Statut**                | **LEVÉE (2026-08-01)**                                        |

**Résolution (2026-08-01)** : les deux smoke tests (`tests/e2e/smoke.spec.ts` —
chargement du shell sans erreur console ; absence de secret dans le bundle servi)
**passent**. Ils sont désormais exécutés à chaque push par le job `e2e` de la CI
GitHub Actions (`.github/workflows/ci.yml`), avec installation déterministe du
navigateur. Deux défauts révélés au premier passage réel ont été corrigés côté
produit **sans modifier les tests** : favicon absent (404 console) et littéral du
préfixe de détection `sb_secret_` présent dans le bundle (désormais assemblé à
l'exécution). Ceci ne concerne pas DEP-001 (preuve OSRM), qui reste ouverte.

---

## DEP-006 — Clés Supabase et extension PostGIS

|                           |                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Bloque**                | J1.5, J1.6 ; fonctions géographiques de J2                                                                 |
| **Responsable**           | Patrick ADOM                                                                                               |
| **Source attendue**       | Dashboard Supabase                                                                                         |
| **Critère d'acceptation** | Clés publishable et secret créées ; PostGIS activée ; build et tests au vert avec configuration renseignée |
| **Statut**                | **LEVÉE** (15 août 2026)                                                                                   |

Procédure détaillée : `docs/CONFIGURATION_SUPABASE.md` §3.

---

## DEP-007 — Nom commercial et Sender ID

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| **Bloque**                | Dépôt du Sender ID, réservation du domaine, charte graphique |
| **Responsable**           | Patrick ADOM                                                 |
| **Source attendue**       | Décision                                                     |
| **Critère d'acceptation** | ADR-001 close ; `product.ts` mis à jour                      |
| **Statut**                | OUVERTE                                                      |

Le délai administratif du Sender ID court **à partir de la décision de marque**, pas du développement : 5 jours ouvrés annoncés côté Orange, 15 côté MTN. Plus l'arbitrage tarde, plus il contraint la date de mise en service de l'authentification.

---

## DEP-008 — Fournisseurs SMS : prix, SLA, taux de livraison

|                           |                                                                    |
| ------------------------- | ------------------------------------------------------------------ |
| **Bloque**                | Choix des fournisseurs, seuils de limitation de débit, budget      |
| **Responsable**           | `À DÉSIGNER`                                                       |
| **Source attendue**       | Réponses d'Orange CI, MTN CI, Moov CI et agrégateurs               |
| **Critère d'acceptation** | Les 10 questions de `SPEC_Module_OTP_SMS` §10.2 obtiennent réponse |
| **Statut**                | OUVERTE                                                            |

---

## DEP-009 — Source de trafic en temps réel

|                           |                                                                  |
| ------------------------- | ---------------------------------------------------------------- |
| **Bloque**                | Remplacement du profil horaire type ; ajustement des durées      |
| **Responsable**           | `À DÉSIGNER`                                                     |
| **Source attendue**       | Fournisseur de données trafic (ou observations terrain agrégées) |
| **Critère d'acceptation** | Une mesure datée remplace le profil simulé, avec source citée    |
| **Statut**                | OUVERTE                                                          |

En attendant, l'UI affiche un profil horaire type d'Abidjan, étiqueté « simulé », qui n'ajuste pas les durées.

---

## DEP-010 — Assistant IA serveur

|                           |                                                                     |
| ------------------------- | ------------------------------------------------------------------- |
| **Bloque**                | Remplacement de l'assistant guidé par une IA conversationnelle      |
| **Responsable**           | `À DÉSIGNER`                                                        |
| **Source attendue**       | Hébergement backend + budget d'inférence + charte d'usage           |
| **Critère d'acceptation** | Réponses générées côté serveur, journalisées sans données sensibles |
| **Statut**                | OUVERTE                                                             |

L'assistant actuel est guidé : intentions et réponses préécrites, exécutées sur l'appareil, sans réseau.

---

## DEP-011 — Revue juridique des CGU

|                           |                                                                |
| ------------------------- | -------------------------------------------------------------- |
| **Bloque**                | Passage des CGU de « provisoires » à opposables                |
| **Responsable**           | `À DÉSIGNER` (juriste ivoirien)                                |
| **Source attendue**       | Revue au regard de la loi n° 2013-450 (ARTCI) et du décret VTC |
| **Critère d'acceptation** | CGU validées, datées, mention « provisoire » retirée           |
| **Statut**                | OUVERTE                                                        |

---

## Synthèse

| #   | Dépendance                  | Responsable | Bloque               |
| --- | --------------------------- | ----------- | -------------------- |
| 001 | Environnement Docker + OSM  | Patrick     | Clôture J2           |
| 002 | Grille tarifaire officielle | À désigner  | Validation tarifaire |
| 003 | Assiette de la taxe         | À désigner  | H5                   |
| 004 | Relevés terrain             | À désigner  | H3, H4, confiance    |
| 005 | Playwright                  | Patrick     | Parcours navigateur  |
| 006 | Clés Supabase, PostGIS      | Patrick     | **Levée 15/08/2026** |
| 007 | Nom commercial              | Patrick     | Sender ID, domaine   |
| 008 | Fournisseurs SMS            | À désigner  | Choix, budget OTP    |
| 009 | Trafic temps réel           | À désigner  | Durées ajustées      |
| 010 | Assistant IA serveur        | À désigner  | IA conversationnelle |
| 011 | Revue juridique CGU         | À désigner  | CGU opposables       |

Quatre dépendances attendent la désignation d'un responsable. Ce sont aussi les quatre les plus longues à lever.
