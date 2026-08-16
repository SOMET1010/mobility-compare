# Sources officielles — AMUGA, DGTTC, ARTI (reconnaissance du 16/08/2026)

> Demande du décideur : « regarder ce que nous pouvons récupérer comme
> données » sur les sites de l'AMUGA, de la DGTTC et du régulateur.
> Chaque source est notée avec ce qu'elle peut lever dans le registre
> des dépendances. Règle inchangée : une donnée n'entre dans le produit
> qu'avec sa **source datée** (invariant I4, `sourceRef`).

## 1. ARTI + DGTTC — les agréments VTC (exploitable IMMÉDIATEMENT)

**Trouvaille clé** : note conjointe ARTI/DGTTC du **28 janvier 2025**
(DG ARTI N'Zi Assamoua Désiré, DG DGTTC Oumar Sacko) — **seules trois
entreprises sont autorisées** à opérer comme VTC en Côte d'Ivoire :
**Uber, Yango, Heetch**.

- Ce qu'elle lève : la table `operators` (invariant I4) peut citer cette
  note comme `status_source`, avec sa date. Uber peut être ajouté aux
  opérateurs affichés (il manque aujourd'hui).
- Cadre juridique : **décret n° 2021-860 du 15 décembre 2021** portant
  organisation des services de transport public particulier de personnes
  (base légale du régime VTC) — référence à citer dans les CGU et /methode.
- Sites : arti.ci · transports.gouv.ci (actualités et communiqués officiels).
- Action : récupérer le PDF de la note (ou sa reproduction presse) et
  archiver la copie dans le dépôt (preuve datée).

## 2. AMUGA — cartographie du réseau et statistiques

- **amuga.ci/cartographie-du-reseau/** : projet de cartographie des
  transports conventionnels ET artisanaux (bus, bateaux-bus lagunaires,
  **gbakas**) du Grand Abidjan.
- **Données ouvertes, licence libre** (projet Systra + Jungle Bus, 2019,
  hébergé par DigitalTransport4Africa) :
  - GTFS complet : `git.digitaltransport4africa.org/data/africa/abidjan`
    (archive : `…/raw/master/Données/abidjan.zip`)
  - Présentation : `sites.digitaltransport.io/abidjantransport/`
  - Documentation : `doc.digitaltransport.io/abidjantransport/`
- Ce qu'elle peut lever : **le backlog « marche + correspondances »**
  (lignes et arrêts gbaka réels !) — la donnée que l'on croyait devoir
  relever nous-mêmes existe en partie, sous licence libre. Vigilance :
  millésime 2019, à confronter au terrain avant tout affichage (I1 :
  étiqueter la date de la donnée).
- **amuga.ci/statistiques/** : indicateurs de mobilité — à inventorier
  (le détail n'a pas pu être lu depuis l'environnement de développement,
  accès réseau restreint ; à ouvrir depuis un navigateur normal).

## 3. DGTTC — grille tarifaire taxi compteur (DEP-002 : PAS ENCORE TROUVÉE)

- La recherche publique ne fait pas remonter d'arrêté tarifaire récent
  en ligne (le plus ancien indexé : arrêté interministériel n° 53 du
  12 octobre 1978 ; les tarifs **aéroport** ont été réglementés plus
  récemment — piste à creuser).
- Conclusion honnête : la grille officielle actuelle ne semble **pas
  publiée en ligne** → DEP-002 se lèvera probablement par **demande
  écrite à la DGTTC** ou visite, pas par téléchargement.
- L'atelier ARTI/Ministère sur les textes VTC (transports.gouv.ci)
  confirme que le corpus réglementaire existe et se consolide.

## Priorités d'exploitation (proposées)

1. **Uber + note du 28/01/2025 dans la table `operators`** — un geste,
   effet immédiat sur la crédibilité (statuts sourcés à l'écran).
2. **Télécharger le GTFS Abidjan** et l'archiver dans l'infrastructure
   (licence libre) — puis étudier l'intégration « lignes gbaka » avec
   étiquette de millésime.
3. **Courrier type à la DGTTC** pour la grille taxi compteur (DEP-002).
4. Inventaire de `amuga.ci/statistiques/` depuis un navigateur.

Sources : recherches du 16/08/2026 — amuga.ci, arti.ci, transports.gouv.ci,
digitaltransport4africa.org, junglebus.io, presse ivoirienne (7info, KOACI,
Abidjan.net).
