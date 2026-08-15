# Sortir de la démo — guide opérationnel

> Feuille de route pour passer de la démonstration publique au produit réel,
> alignée sur le CDC v1.0 (§10, §12, §13) et le registre des dépendances.
> Principe : **le code n'est plus le blocage**. Chaque étape ci-dessous est une
> décision ou une ressource du décideur ; à chaque livraison, le développement
> suit en jours, pas en semaines.

## Vue d'ensemble — l'ordre qui débloque le plus vite

| Ordre | Étape                           | Vous (décideur)                      | Délai externe  | Ça débloque                                   |
| ----- | ------------------------------- | ------------------------------------ | -------------- | --------------------------------------------- |
| 1     | **Nom commercial** (ADR-001)    | Une décision                         | 0 j (décision) | Sender ID, domaine, marque, CGU définitives   |
| 2     | **Supabase** (DEP-006)          | Créer le projet, fournir les clés    | 1 h            | Comptes réels, contributions réelles, favoris |
| 3     | **Relevés terrain** (DEP-004)   | Lancer la collecte sur 3 corridors   | 1-2 semaines   | Indice de confiance > 0 — le cœur du produit  |
| 4     | **VM OSRM** (DEP-001)           | Louer un petit serveur Linux         | 1 j            | Distances et durées réelles par les rues      |
| 5     | **Grille officielle** (DEP-002) | Démarche DGTTC/ARTI                  | inconnu        | Tarif taxi `REGULATORY` sourcé                |
| 6     | **Fournisseurs SMS** (DEP-008)  | Devis Orange/MTN/Moov (après le nom) | 5-15 j ouvrés  | OTP réel en production                        |

Les étapes 2, 3 et 4 sont indépendantes : elles peuvent avancer en parallèle.
La numérotation renvoie au registre (`docs/REGISTRE_DEPENDANCES_EXTERNES.md`).

---

## Étape 1 — Trancher le nom (ADR-001 / DEP-007)

**Pourquoi d'abord :** le délai administratif du Sender ID court à partir de la
décision (5 j ouvrés annoncés côté Orange, 15 côté MTN — CDC §13.6). Tout
retard ici retarde mécaniquement l'authentification réelle.

**À faire :**

1. Vérifier la disponibilité de « MOBILIS » (ou trancher un autre nom) :
   recherche d'antériorité OAPI + vérification de non-confusion avec l'opérateur
   télécom algérien « Mobilis » (risque documenté dans `src/config/product.ts`).
2. Réserver le domaine (ex. `.ci`) et déposer la demande de Sender ID.
3. Me notifier la décision.

**Ce que je fais ensuite (≈ 1 jour) :** `product.ts` (nom, domaine, Sender ID),
CGU définitives, manifeste PWA, redirection du `pages.dev` vers le domaine.

---

## Étape 2 — Créer le projet Supabase (DEP-006)

**Pourquoi :** c'est la seule pièce manquante entre « simulation locale » et
« vrai produit avec des comptes et des contributions ». Palier gratuit suffisant
pour le pilote.

**À faire (≈ 1 heure) :**

1. Créer un compte sur supabase.com et un projet (région Europe de l'Ouest,
   la plus proche d'Abidjan en latence).
2. Activer l'extension **PostGIS** (Dashboard → Database → Extensions).
3. Me transmettre : l'URL du projet et la clé **publishable** (côté client).
   La clé `service_role` reste secrète — jamais dans le frontend (le build
   bloque si elle y apparaît, c'est testé).

**Ce que je fais ensuite (2-4 jours) :** migrations (profils, contributions,
grilles versionnées avec `basis`/`sourceRef`, statuts d'agrément I4),
contribution réelle avec modération, favoris/synchronisation, RLS.

---

## Étape 3 — Lancer les relevés terrain (DEP-004) ⚠ chemin critique

**Pourquoi :** le CDC est formel (§12) — sans observations réelles, « aucun
affichage public n'est légitime ». C'est l'étape qui transforme le moteur
théorique en produit crédible. Elle ne coûte que du temps de terrain.

**Protocole minimal (corridors d'amorçage du CDC §13.8) :**

| Corridor           | Modes à relever             | Objectif          |
| ------------------ | --------------------------- | ----------------- |
| Yopougon ↔ Plateau | VTC, taxi, woro-woro, gbaka | ≥ 30 observations |
| Cocody ↔ Plateau   | VTC, taxi, woro-woro        | ≥ 30 observations |
| Abobo ↔ Adjamé     | woro-woro, gbaka            | ≥ 30 observations |

Par observation : date/heure, mode, prix payé (FCFA), point de départ et
d'arrivée approximatifs, heure de pointe ou non. Un tableur suffit pour
commencer ; dès l'étape 2 livrée, la page « Contribuer un tarif » devient le
canal de saisie réel.

**Ce que je fais ensuite :** import des observations, calibrage des grilles
`OBSERVED`, montée de l'indice de confiance affiché, détection d'aberrations
(anti-abus M4).

---

## Étape 4 — Louer la machine OSRM (DEP-001)

**Pourquoi :** remplace la distance « à vol d'oiseau × facteur » par le vrai
calcul par les rues. Le CDC impose l'auto-hébergement derrière notre couche de
services (une origine/destination est une donnée personnelle — jamais d'appel
direct du navigateur à un tiers).

**À faire (≈ 1 jour) :**

1. Louer un petit VPS Linux (2 vCPU / 4 Go de RAM suffisent pour la
   Côte d'Ivoire ; offre d'entrée de gamme chez n'importe quel hébergeur).
2. Me donner un accès (ou exécuter le script que je fournirai) : l'extrait
   OpenStreetMap Côte d'Ivoire se télécharge librement (Geofabrik) et se
   prépare avec Docker en moins d'une heure.

**Ce que je fais ensuite (2-3 jours) :** conteneurs OSRM + couche de services
(authentification, quotas, journalisation sans données sensibles — le contrat
et le disjoncteur existent déjà, testés), bascule du produit sur les distances
et durées réelles, trace de calcul citant OSRM.

---

## Étape 5 — Grille officielle (DEP-002) et relation DGTTC

**Contexte nouveau :** la DGTTC a annoncé publiquement un comparateur de prix
officiel pour les VTC (7info, août 2026 — M. Oumar Sacko, DG). C'est une
fenêtre : le scénario B du CDC (§3) prévoit exactement cette articulation, sans
refonte (une grille porte `basis: REGULATORY` + `sourceRef`).

**À faire :** solliciter un rendez-vous DGTTC/ARTI avec la démonstration
publique comme support (c'est son rôle), demander : grille officielle du taxi
compteur datée, liste des plateformes agréées (débloque l'invariant I4), et
poser les 5 questions du CDC §3 sur une éventuelle API.

**Prudence :** ne pas suspendre le développement à cette réponse (recommandation
du CDC). Le scénario A (estimation autonome + terrain) reste le socle.

---

## Étape 6 — Fournisseurs SMS (DEP-008)

Après le nom (étape 1) : demander les devis Orange CI, MTN CI, Moov CI et
agrégateurs — les 10 questions à poser sont déjà rédigées dans
`SPEC_Module_OTP_SMS` §10.2. Multi-fournisseurs obligatoire (couverture
85-90 % du parc = Orange + MTN). Le moteur OTP est prouvé ; il ne manque que
le transport.

---

## Arbitrages à trancher en chemin (CDC §13)

Sans eux, certaines valeurs restent étiquetées « non validées » :

1. **Assiette de la taxe de 4 %** — compteur seul ou total ? (les deux options
   sont implémentées et testées, il faut choisir).
2. **Plafond de majoration** — borne mesurée sur le terrain ou règle sourcée.
3. **Taxi compteur** — afficher l'estimation réglementaire, l'observée, ou les
   deux côte à côte.
4. **Monétisation V1** — recommandation CDC : aucune avant preuve d'audience.

---

## Ce qui reste à ma main (aucun blocage décideur)

Développements possibles dès maintenant, dans l'ordre de valeur :

- **Favoris + trajets récents hors-ligne** (M1/M6, exigence « offline partiel »
  du CDC) — stockage local, puis synchronisés quand Supabase arrive.
- **PWA installable** (manifeste déjà en place, il manque le service worker).
- **Préparation OSRM** : docker-compose + couche de services prêts à déployer
  le jour où la VM existe.
- **Import terrain** : format de fichier + écran d'import pour vos premiers
  relevés en tableur.

---

_Document créé le 15 août 2026. À mettre à jour à chaque dépendance levée._
