# Dossier financier — investissement CAPEX / OPEX

> **Statut : document de travail (15 août 2026, v2 — échelle nationale).**
> Compagnon du classeur `MOBILIS_dossier_financier_v2.xlsx` (36 mois, 3
> scénarios côte à côte, valeurs calculées, remis au décideur — hors dépôt ;
> une version « dynamique » à formules existe aussi). Doctrine du projet appliquée aux chiffres :
> chaque nombre est un **fait sourcé** ou une **hypothèse marquée**. Un dossier
> qui distingue les deux est plus solide devant un investisseur qu'un dossier
> qui les confond.

## 1. L'opportunité (faits — CDC v1.0 §2, sources publiques août 2026)

| Fait                              | Valeur                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Dépenses de déplacement à Abidjan | **~4 milliards FCFA / jour**                                                      |
| Véhicules VTC déclarés            | > 25 000                                                                          |
| Structure du marché VTC           | Yango ~70 % ; Heetch agréée ; Uber retiré (25/09/2025) ; InDrive non agréé        |
| Fiscalité                         | Taxe de 4 % sur les courses depuis octobre 2024                                   |
| Régulateurs                       | ARTI et DGTTC (Ministère des Transports)                                          |
| Signal de marché                  | **La DGTTC a annoncé publiquement un comparateur de prix VTC** (7info, août 2026) |

La douleur visée : l'opacité et la volatilité du prix. L'annonce de la DGTTC
valide le besoin au plus haut niveau — MOBILIS existe déjà, en ligne, neutre et
démontrable, ce qui en fait l'interlocuteur naturel de ce chantier (scénario B
du CDC §3 : une grille officielle s'intègre sans refonte).

## 2. Ce qui existe déjà (traction — vérifiable en ligne)

- Produit en ligne : comparateur VTC-first (Yango, Heetch), observatoire public
  des prix, contribution communautaire avec **modération humaine**, assistant,
  comptes, CGU — <https://mobility-compare.pages.dev>.
- Socle prouvé : 302 tests automatisés, CI verte, **neutralité du classement
  vérifiée à chaque livraison** (invariant I3) — l'actif différenciant.
- Backend réel opérationnel (PostgreSQL/PostGIS), première observation de prix
  collectée et modérée le 15/08/2026 ; registre des opérateurs daté et sourcé
  (invariant I4).
- Le développement déjà réalisé est traité en **apport en nature** (valorisation
  hypothèse : 18 M FCFA en équivalent prestation) — il n'est **pas** dans le
  besoin de financement.

## 3. Structure du modèle financier

Le classeur Excel comprend : `Lisez-moi` (conventions), `Hypothèses` (toutes
les entrées, **cellules jaunes modifiables**, sélecteur de scénario
prudent/central/ambitieux), `CAPEX`, `OPEX` (36 mois), `Revenus` (36 mois),
`P&L` (EBITDA, trésorerie cumulée, synthèse annuelle), `Synthèse`
(besoin de financement = creux de trésorerie maximal, point d'équilibre, MAU).

### CAPEX (décaissements one-shot — hypothèses à confirmer par devis)

**Applications mobiles natives (~25 M)** · identité de marque définitive ·
OAPI/PI · **structuration juridique complète + ARTCI** (loi n° 2013-450) ·
matériel et bureau · **campagne de lancement national (~15 M)** ·
**extension 3 villes** (Bouaké, Yamoussoukro, San-Pédro) · réserve 10 %.
Ordre de grandeur : **~74 M FCFA** (hors apport en nature).

### OPEX (mensuels, pilotés par hypothèses)

- **Techniques (faits ou tarifs publics)** : Supabase (10 USD/mois constaté,
  puis palier pro), hébergement front (gratuit en pilote), VPS OSRM (~25 000
  FCFA/mois, devis à confirmer), **SMS OTP (prix unitaire = hypothèse forte,
  devis Orange/MTN/Moov en attente — DEP-008)**.
- **Équipe (hypothèses de salaires locaux)** : montée à **12 salariés + 6
  enquêteurs** au mois 36 — CEO et CTO dès le mois 1, mobile/data/community en
  phase pilote, commercial et support en consolidation, équipe villes en phase
  nationale. Enquêteurs terrain dès le mois 1 (DEP-004 = poste de dépense, pas
  une option). OPEX An 1 ≈ **64 M FCFA**.
- Marketing par paliers (0,5 → 2 → 4 → 6 M FCFA/mois), bureau, compta/juridique,
  imprévus 8 %.

### Revenus (CDC M8 — règles non négociables)

**Aucune monétisation avant preuve d'audience** (recommandation CDC §13.7 —
activation au mois 13 dans le scénario central), et **un placement sponsorisé
est identifié comme tel et ne touche jamais le classement** (invariant I3 —
c'est l'actif de confiance qui rend l'audience monétisable durablement).

Canaux modélisés : publicité native identifiée · affiliation assurance
auto/VTC · placements sponsorisés (hors classement) · **données agrégées et
anonymisées B2B/institutionnel** (DGTTC, collectivités, études — le canal le
plus aligné avec le positionnement) · premium.

## 4. Ce que le modèle ne prétend pas savoir

- Le **CPM publicitaire local** et les **taux de conversion** sont des
  hypothèses à confronter au réel dès les premiers mois d'audience mesurée.
- Le **prix du SMS** attend les devis (DEP-008) ; le modèle expose la
  sensibilité directement (cellule jaune).
- Les coûts OAPI/juridiques attendent des devis.
- Aucune part de marché n'est « prise » sur les 4 Md FCFA/jour : le comparateur
  monétise de l'audience et de la donnée, pas des courses.

## 5. Utilisation du financement (logique)

1. **Calibrer** : campagne terrain DEP-004 (enquêteurs), OSRM, grilles — le
   produit passe de « démonstration » à « fiable ».
2. **Faire connaître** : lancement + marketing récurrent — construire l'audience
   qui conditionne toute monétisation.
3. **Tenir** : OPEX jusqu'à l'équilibre — le besoin de financement est le creux
   de trésorerie maximal, lisible dans `Synthèse` :
   **~248 M FCFA (central, équilibre au mois 32)** · ~308 M (prudent,
   équilibre au-delà de 36 mois — affiché, pas caché) · ~238 M (ambitieux,
   mois 30). Soit un tour de table d'environ **380 à 470 k€**.

## 6. Risques financiers (repris du CDC §9, traités)

| Risque                     | Traitement                                                             |
| -------------------------- | ---------------------------------------------------------------------- |
| Écart estimation/réel      | Indice de confiance visible, recalibrage terrain continu               |
| Contestation plateforme    | Estimations indépendantes, usage nominatif descriptif, pas de scraping |
| Données personnelles       | Anonymat par conception, loi 2013-450, déclaration ARTCI (au CAPEX)    |
| Manipulation crowdsourcing | Modération humaine (en place), bornes de vraisemblance, pondération    |
| Coût routage à l'échelle   | Auto-hébergement OSRM + cache corridors                                |
| Dépendance décideur        | Nom (ADR-001) et devis SMS conditionnent le calendrier, pas le produit |
