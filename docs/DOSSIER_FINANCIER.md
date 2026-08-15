# Dossier financier — investissement CAPEX / OPEX

> **Statut : document de travail (15 août 2026).** Compagnon du modèle Excel
> `MOBILIS_modele_financier.xlsx` (36 mois, 3 scénarios, hypothèses modifiables,
> remis au décideur — hors dépôt). Doctrine du projet appliquée aux chiffres :
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

Marque OAPI et conseil PI · identité visuelle définitive · domaine ·
matériel et formation terrain · **revue juridique CGU + déclaration ARTCI**
(loi n° 2013-450) · campagne de lancement · réserve 10 %.
Ordre de grandeur : **~7,5 M FCFA** (hors apport en nature).

### OPEX (mensuels, pilotés par hypothèses)

- **Techniques (faits ou tarifs publics)** : Supabase (10 USD/mois constaté,
  puis palier pro), hébergement front (gratuit en pilote), VPS OSRM (~25 000
  FCFA/mois, devis à confirmer), **SMS OTP (prix unitaire = hypothèse forte,
  devis Orange/MTN/Moov en attente — DEP-008)**.
- **Équipe (hypothèses de salaires locaux)** : enquêteurs terrain dès le mois 1
  (le chemin critique DEP-004 est un poste de dépense, pas une option),
  fondateur/community à partir du mois 7, développeur au mois 10.
- Marketing récurrent, comptabilité/juridique, imprévus 8 %.

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
3. **Tenir** : OPEX jusqu'à l'équilibre — le besoin de financement du modèle est
   le creux de trésorerie maximal, lisible en un coup d'œil dans `Synthèse`,
   scénario par scénario.

## 6. Risques financiers (repris du CDC §9, traités)

| Risque                     | Traitement                                                             |
| -------------------------- | ---------------------------------------------------------------------- |
| Écart estimation/réel      | Indice de confiance visible, recalibrage terrain continu               |
| Contestation plateforme    | Estimations indépendantes, usage nominatif descriptif, pas de scraping |
| Données personnelles       | Anonymat par conception, loi 2013-450, déclaration ARTCI (au CAPEX)    |
| Manipulation crowdsourcing | Modération humaine (en place), bornes de vraisemblance, pondération    |
| Coût routage à l'échelle   | Auto-hébergement OSRM + cache corridors                                |
| Dépendance décideur        | Nom (ADR-001) et devis SMS conditionnent le calendrier, pas le produit |
