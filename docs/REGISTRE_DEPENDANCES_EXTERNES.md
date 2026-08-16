# REGISTRE DES DÉPENDANCES EXTERNES

**Objet** : suivre les éléments qui ne peuvent pas être produits par le développement, et qui conditionnent certaines validations.

**Règle** : ces dépendances **ne bloquent aucun développement prouvable**. Elles bloquent en revanche toute prétention de validation correspondante. Une hypothèse `UNVALIDATED` le reste tant que sa dépendance n'est pas levée.

**Règle de propriété** : chaque dépendance porte une **fonction responsable**, même lorsque la personne n'est pas encore désignée. Une dépendance sans propriétaire n'est suivie par personne et finit par disparaître du radar.

Dernière mise à jour : 16 août 2026.

---

## DEP-001 — Environnement Docker avec accès aux données OSM

|                           |                                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| **Bloque**                | Clôture de J2                                                        |
| **Responsable**           | Le décideur                                                          |
| **Source attendue**       | VM Linux ou poste avec Docker, accès réseau à Geofabrik              |
| **Critère d'acceptation** | `./scripts/j2.3/run-proof.sh` produit un rapport de verdict **PASS** |
| **Statut**                | **LEVÉE (16/08/2026)** — serveur de routage en production            |

**Résolution (16/08/2026)** : serveur cloud dédié provisionné par le décideur
(Hetzner, Helsinki). `infra/osrm/setup.sh` exécuté sur place : extrait
Côte d'Ivoire de Geofabrik, chaîne `osrm-extract`/`partition`/`customize`
(algorithme MLD), puis OSRM v5.27.1 en service via `docker compose`
(écoute locale uniquement). Exposition publique sécurisée : reverse proxy
Caddy, TLS automatique (Let's Encrypt) sur le nom d'hôte fourni par
l'hébergeur, jeton d'accès obligatoire — toute requête sans jeton reçoit
401. Seul client autorisé : l'Edge Function `itineraire` (jeton dans la
table `routing_config`, RLS sans politique — service role uniquement,
jamais dans le navigateur ni le dépôt). Chaîne complète vérifiée le jour
même : fonction → serveur → `{"disponible":true,"distance_m":8722,"duree_s":764}`
(Plateau → Cocody). Le critère initial (rapport `run-proof.sh`) est dépassé
par plus fort : le service répond en production. La matrice routière 29×29
embarquée (`src/demo/distances.ts`) reste le repli honnête si le serveur
est injoignable (invariant I1).

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
| **Responsable**           | Le décideur                                                   |
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
l'exécution). Ceci ne concerne pas DEP-001 (preuve OSRM), levée à son tour
le 16/08/2026.

---

## DEP-006 — Clés Supabase et extension PostGIS

|                           |                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Bloque**                | J1.5, J1.6 ; fonctions géographiques de J2                                                                 |
| **Responsable**           | Le décideur                                                                                                |
| **Source attendue**       | Dashboard Supabase                                                                                         |
| **Critère d'acceptation** | Clés publishable et secret créées ; PostGIS activée ; build et tests au vert avec configuration renseignée |
| **Statut**                | **LEVÉE** (15 août 2026)                                                                                   |

Procédure détaillée : `docs/CONFIGURATION_SUPABASE.md` §3.

---

## DEP-007 — Nom commercial et Sender ID

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| **Bloque**                | Dépôt du Sender ID, réservation du domaine, charte graphique |
| **Responsable**           | Le décideur                                                  |
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
| **Responsable**           | Le décideur (clé d'API du fournisseur)                              |
| **Source attendue**       | Hébergement backend + budget d'inférence + charte d'usage           |
| **Critère d'acceptation** | Réponses générées côté serveur, journalisées sans données sensibles |
| **Statut**                | **LEVÉE (16/08/2026)** — clé posée, testée en réel (kimi-k3)        |

Levée technique : Edge Function `assistant` déployée (fournisseur Kimi/Moonshot,
API compatible OpenAI), charte intégrée côté serveur (aucun prix inventé,
neutralité, aucune donnée personnelle), origines bornées, entrées bornées
(8 messages × 500 caractères), clé en secret de fonction — jamais dans le
navigateur ni le dépôt. L'assistant du produit est hybride : réponses guidées
locales pour les intentions connues, IA pour les questions libres, repli guidé
en cas d'indisponibilité. La configuration (clé, modèle, adresse — toute API
au format OpenAI) se fait dans l'écran protégé `/moderation`, section
« Assistant IA » : la clé est stockée dans la table `assistant_config` (RLS
sans politique, service role uniquement), jamais renvoyée au navigateur
(empreinte masquée), testable en un clic. Un secret d'environnement
`KIMI_API_KEY` reste prioritaire s'il existe. Reste ouvert : le suivi du
budget d'inférence.

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
| 001 | Environnement Docker + OSM  | Décideur    | **Levée 16/08/2026** |
| 002 | Grille tarifaire officielle | À désigner  | Validation tarifaire |
| 003 | Assiette de la taxe         | À désigner  | H5                   |
| 004 | Relevés terrain             | À désigner  | H3, H4, confiance    |
| 005 | Playwright                  | Décideur    | Parcours navigateur  |
| 006 | Clés Supabase, PostGIS      | Décideur    | **Levée 15/08/2026** |
| 007 | Nom commercial              | Décideur    | Sender ID, domaine   |
| 008 | Fournisseurs SMS            | À désigner  | Choix, budget OTP    |
| 009 | Trafic temps réel           | À désigner  | Durées ajustées      |
| 010 | Assistant IA serveur        | Décideur    | **Levée 16/08/2026** |
| 011 | Revue juridique CGU         | À désigner  | CGU opposables       |

Six dépendances restent sans responsable désigné (002, 003, 004, 008, 009,
011). Ce sont aussi les plus longues à lever — et 004 (relevés terrain) reste
le chemin critique du projet.
