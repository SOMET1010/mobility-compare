# Contrat d'interface — plateformes VTC et livraison (Yango, Heetch, Glovo, …)

**17 août 2026 · Document à présenter aux plateformes. Le décideur signe ;
rien n'est branché sans son accord et sans ce contrat accepté.**

## 1. Objet

MOBILIS est le comparateur neutre des mobilités d'Abidjan — **courses de
personnes ET livraisons de colis**. Il affiche aujourd'hui des **estimations
marquées comme telles**. Ce contrat définit comment une plateforme (Yango,
Heetch, Glovo, ou tout opérateur agréé — VTC comme coursiers) fournit ses
**prix réels** pour qu'ils remplacent l'estimation — au bénéfice de la
plateforme (prix exact, trafic qualifié envoyé vers son application) et de
l'usager (vérité des prix).

Le même contrat couvre les deux services : une course et une livraison sont,
du point de vue du devis, la même question — un départ, une arrivée, un prix,
une attente, une durée. Seul le champ `produit` change (« standard »,
« confort » côté course ; « moto », « tricycle », « cargo » côté colis).

## 2. Ce que MOBILIS demande à la plateforme

### Option A — Service de devis (préférée)

Un point d'accès HTTPS que NOTRE serveur appelle (jamais le navigateur de
l'usager) :

- **Requête** : `POST <adresse convenue>` —
  `{ "depart": {"lat","lng"}, "arrivee": {"lat","lng"}, "produit"?: "…" }`
  Pour une plateforme de livraison, `produit` désigne la classe de véhicule
  ou de colis (ex. « moto », « cargo ») ; MOBILIS envoie la classe convenue
  lors de la mise en œuvre.
- **Réponse** :
  `{ "prix_min": 3500, "prix_max": 4200, "devise": "XOF",
 "attente_s": 240, "duree_s": 1500, "produit": "standard" }`
- **Exigences** : réponse < 2 s ; fraîcheur temps réel ; authentification par
  clé serveur fournie par la plateforme (stockée côté serveur MOBILIS,
  jamais dans un navigateur) ; quota convenu (ordre de grandeur :
  1 appel/devis affiché, mise en cache ≤ 60 s).
- **Si le service ne répond pas** : MOBILIS retombe sur son estimation
  marquée « estimation » — jamais un faux prix réel (absence honnête).
- **L'attente est contractuelle** : `attente_s` est l'engagement réel de la
  plateforme à cet instant — c'est elle que MOBILIS affiche et que le
  classement « plus rapide » compte (porte-à-porte = attente + trajet).
  Avec certaines compagnies, l'attente est le vrai souci des usagers —
  et en livraison, l'attente du coursier EST l'essentiel du délai perçu :
  une attente sincère vaut mieux qu'une attente flatteuse démentie au
  premier trajet.

### Option B — Grille tarifaire officielle (repli sans API)

La plateforme fournit sa grille au format `FareGrid`
(`docs/CONTRATS_API.md` §2.3) avec **source datée obligatoire**. MOBILIS
calcule alors lui-même, en affichant la formule ligne à ligne et la date de
la grille. Une grille par classe (course standard, moto-coursier, cargo…)
est acceptée.

### Dans les deux cas — lien profond

Une adresse d'ouverture de l'application avec départ/arrivée préremplis
(app link / deep link), pour le bouton « Ouvrir <plateforme> » de la fiche
détail. À défaut, le site officiel (déjà en service via `site_url`).

## 3. Ce que MOBILIS garantit à la plateforme

1. **Attribution horodatée** : « prix fourni par <plateforme> à HH:MM » sur
   chaque affichage issu de son service.
2. **Neutralité absolue** : le classement (moins cher / plus rapide /
   compromis) est calculé de façon identique pour tous ; **aucun paiement ne
   peut l'influencer** — c'est vérifié automatiquement à chaque livraison.
   Fournir ses prix réels ne donne aucun avantage de rang ; ne pas les
   fournir ne pénalise pas le rang (mais l'affichage reste « estimation »).
3. **Aucune revente ni conservation** des devis au-delà du cache convenu ;
   aucun profil d'usager transmis (MOBILIS n'en a pas).
4. **Trafic qualifié** : le bouton « Ouvrir <plateforme> » envoie l'usager
   directement dans l'application de la plateforme, trajet prérempli.
5. **Transparence des volumes** : MOBILIS communique sur demande le nombre
   d'appels et d'ouvertures générés (compteur souverain, anonyme).

## 4. Ce que ce contrat exclut

Mise en avant payante · commission sur course ou livraison · exclusivité ·
accès aux données d'autres plateformes · tout champ qui influencerait le
classement.

## 5. État des lieux (constaté au 17/08/2026)

Contexte réglementaire : la DGTTC a réuni le 13/08/2026 à Abidjan les
plateformes VTC **et livraison** (dont Yango et Glovo) pour une concertation
sur les réformes du secteur — les deux métiers sont traités ensemble, comme
dans ce contrat.

### Côté courses (VTC)

- **Yango** : programme partenaires actif et intégrations tierces existantes
  (une intégration ChatGPT donnant prix exact et ETA a été lancée
  publiquement) — la capacité de devis existe donc ; l'accès passe par un
  accord partenaire. Statut d'agrément à Abidjan : vérifié et publié sur
  MOBILIS (note ARTI/DGTTC du 28/01/2025).
- **Heetch** : aucune API publique documentée connue — commencer par
  l'option B (grille + lien profond) et négocier l'option A.

### Côté livraison

- **Glovo** : présent à Abidjan depuis 2019, acteur majeur de la livraison
  en 2026. Publie une **API partenaires documentée publiquement**, dont une
  offre « LaaS » (logistique à la demande) — la capacité technique de
  l'option A existe donc ; l'accès passe par un accord partenaire.
- **Yango Delivery** : actif à Abidjan (moto-coursier, et « Cargo Express »
  pour les volumineux — ce qui correspond à nos classes MOTO et CARGO) ;
  même canal partenaire que Yango côté courses.
- **Jumia** : **Jumia Food a fermé fin décembre 2023** en Côte d'Ivoire
  (décision groupe, 7 pays). Jumia y reste un site de e-commerce avec sa
  propre logistique interne — ce n'est pas un service de course à la
  demande comparable ; rien à afficher tant que cela ne change pas
  (absence honnête). La porte reste ouverte si un service à la demande
  rouvre.

Les plateformes déjà publiées sur MOBILIS le sont avec statut d'agrément
daté et sourcé (invariant I4) ; les autres passent par la candidature §6.

## 6. Adhésion et mise en œuvre

1. **La demande se fait EN LIGNE** : formulaire de candidature sur
   `/partenaires` — le sélecteur de mode couvre les courses (VTC, taxi…)
   comme la livraison (moto, tricycle, cargo), et la section
   « 🔌 Intégration API » est remplissable directement (adresse du service
   de devis + contact technique).
2. Examen dans l'espace de modération (les champs d'intégration y sont
   affichés) ; prise de contact technique ; échange des clés côté serveur.
3. Recette sur un corridor de test ; vérification de l'attribution et du
   repli honnête.
4. Mise en service — annoncée sur la fiche de la plateforme.
5. Résiliation : à tout moment, par simple notification ; MOBILIS repasse en
   estimations marquées dans l'heure.

## 7. Contacts

Canal officiel en cours de mise en place (domaine réservé au nom MOBILIS,
ADR-001) ; dans l'intervalle, le contact fourni lors de la candidature fait
foi dans les deux sens.
