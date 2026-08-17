# Contrats d'API — MOBILIS

**17 août 2026 · Les contrats EN SERVICE sont constatés dans le code déployé ;
les contrats À VENIR sont des brouillons à valider par le décideur avant toute
implémentation.**

Base provisoire : `https://stnjiagjdayrbwhszxwk.supabase.co/functions/v1/`
(sera masquée derrière le domaine définitif). Tous les appels sont en
`POST` + JSON sauf mention contraire.

## 0. Principes valables pour TOUS les contrats

1. **Absence honnête.** Un service qui ne peut pas répondre renvoie
   `{ "disponible": false }` (HTTP 503, ou 404 pour « pas de donnée ») —
   jamais une valeur par défaut. Le client n'affiche alors **rien**.
2. **Aucune donnée personnelle** ne transite ni n'est stockée, hors les cas
   explicitement contractualisés (contact professionnel des candidatures,
   téléphone de l'OTP à venir).
3. **Compatibilité additive.** Un champ peut être AJOUTÉ à une réponse sans
   préavis ; un champ n'est jamais renommé ni supprimé sans nouvelle version.
   Les clients doivent ignorer les champs inconnus.
4. **Erreurs communes** : `400 { "erreur": "…" }` (entrée invalide, message
   en français), `401 { "error": "non autorisé" }` (jeton), `405` (méthode),
   `503 { "disponible": false }` (amont indisponible).
5. **Périmètre géographique** : toutes les coordonnées sont bornées à la
   Côte d'Ivoire (lat 4.2–10.9, lng −8.7–−2.3) — hors bornes ⇒ 400.

---

## 1. Contrats EN SERVICE

### 1.1 `itineraire` (v1) — distance et durée routières réelles

Requête : `{ "depart": {"lat","lng"}, "arrivee": {"lat","lng"} }`
Réponse : `{ "disponible": true, "distance_m": 8722, "duree_s": 941 }`
Notes : seule porte vers notre serveur OSRM (le jeton de routage ne quitte
jamais cette fonction) ; délai amont 6 s puis 503.

### 1.2 `adresse` (v3) — géocodage souverain, fautes pardonnées

Requête : `{ "q": "texte de 3 à 80 caractères" }`
Réponse : `{ "disponible": true, "resultats": [{ "nom", "detail", "lat", "lng" }] }`
Notes : index local trigramme d'abord (54 805 lieux), complément Nominatim,
fusion dédoublonnée ; ≤ ~10 résultats.

### 1.3 `lignes` (v5) — réseau cartographié (OpenStreetMap)

Deux modes sur le même point d'entrée :

- **Desserte** — requête `{ "depart": {...}, "arrivee": {...} }` ; réponse
  `{ "disponible": true,
   "lignes": [{ "id", "nom", "mode", "ref", "montee_m", "descente_m" }],
   "correspondances": [{ "ligne1_id","ligne1","mode1","ref1","montee_m",
      "ligne2_id","ligne2","mode2","ref2","descente_m",
      "correspondance_m","gare","corr_lat","corr_lng" }] }`
  `mode ∈ {GBAKA, WORO, BUS, BATEAU}` ; `gare` est nulle si aucun lieu connu
  à ≤ 250 m du point de changement (jamais inventée) ; les correspondances ne
  sont cherchées que si < 3 lignes directes.
- **Tracé** — requête `{ "trace": <id de ligne> }` ; réponse
  `{ "disponible": true, "points": [[lat,lng], …] }` (≤ 500 points, ordre du
  tracé ; < 2 points ⇒ 404). Les clients doivent couper l'affichage aux sauts
  > 2 km (aller/retour des relations OSM).

### 1.4 `audience` (v1) — compteur souverain

- Balise (navigateur) : `POST { "page": "/comparer", "visite": true|false }` —
  pages hors liste blanche ignorées ; ni IP, ni identifiant, ni user-agent.
- Lecture (modérateur) : `GET` avec en-tête `x-moderation-token` ; réponse
  `{ "jours": [{ "jour", "page", "vues", "visites" }] }` (30 jours).

### 1.5 `candidature` (v1) — un opérateur postule

Requête : `{ "nom" (2–120), "mode" ∈ {VTC,TAXI,WORO,GBAKA,MOTO,TRICYCLE,CARGO},
"contact" (5–200), "reference_agrement"?, "message"?, "site" (pot de miel,
laisser vide) }`
Réponse : `{ "enregistree": true }`. Rien n'est publié automatiquement :
examen puis vérification d'agrément datée et sourcée (invariant I4).

### 1.6 `moderation` (v2) — espace protégé

En-tête obligatoire `x-moderation-token` (comparé par empreinte SHA-256).
Actions (`{ "action": … }`) : `list` (relevés PENDING) · `decide`
(`{id, decision: APPROVED|REJECTED}`) · `candidatures` (RECUE/EN_EXAMEN) ·
`candidature_decide` (`{id, statut: EN_EXAMEN|ACCEPTEE|REFUSEE}`).

### 1.7 `assistant` (v9) — IA sous charte

Conversation relayée vers le fournisseur configuré côté serveur (clé jamais
dans le navigateur) ; charte : aucun prix inventé, neutralité, pas de données
personnelles. Contrat détaillé volontairement non publié (usage interne).

### 1.8 Relevés de prix (contribution)

Dépôt via le SDK Supabase (clé publishable + RLS) dans `fare_observations` :
`{ from_commune, to_commune, mode, price_xof, rush_hour }` — anonyme par
conception, file de modération avant publication.
`lieux-import` / `lignes-import` : fonctions internes de peuplement, hors
contrat public.

---

## 2. Contrats À VENIR (brouillons — le décideur valide avant implémentation)

### 2.1 Client externe (application d'Ismaël, intégrateurs)

Les points d'entrée publics (1.1 à 1.3) sont le contrat : un client tiers les
consomme tels quels, avec les mêmes règles d'absence honnête.
À AJOUTER avant d'ouvrir officiellement :

- en-tête `X-Client: <identifiant convenu>` sur chaque appel (mesure d'usage
  par client, sans identifier l'usager final) ;
- quotas par client (à définir) ; 429 en dépassement ;
- gel de compatibilité : les champs listés en §1 ne changent pas sans
  nouvelle version annoncée.

### 2.2 OTP / SMS — passerelle ANSUT (provisoire), Sender ID `MOBILIS`

- `POST /otp` — `{ "telephone": "+225XXXXXXXXXX" }` →
  `{ "envoye": true, "expire_s": 300 }`. Numéros ivoiriens uniquement ;
  1 envoi / 60 s / numéro.
- `POST /otp-verification` — `{ "telephone", "code" (6 chiffres) }` →
  `{ "valide": true }` ou `400` ; 3 essais puis code invalidé.
- Données : le téléphone n'est conservé que haché après vérification ;
  jamais transmis à un tiers autre que la passerelle d'envoi.
- Dépendances : Sender ID MOBILIS déposé (Orange ~5 j, MTN ~15 j) ; accord
  ANSUT. Les Conditions (§3) seront mises à jour le jour du branchement.

### 2.3 Grilles tarifaires d'opérateurs (le moteur réel les attend déjà)

Format de dépôt = le `FareGrid` du moteur de tarification :

```json
{
  "providerId": "…", "version": "2026-08",
  "currency": "XOF",
  "pickupFee": 0, "perKilometer": 0, "perMinute": 0,
  "perWaitingMinute": 0, "minimumFare": 0,
  "fixedFees": [{ "code", "label", "amount" }],
  "maxTotalMultiplier": 3, "taxRate": 0,
  "roundingStep": 5, "roundingMode": "nearest",
  "validFrom": "…", "validTo": null,
  "sourceRef": "OBLIGATOIRE — document daté (arrêté, grille publiée)"
}
```

Circuit : opérateur accepté (§1.5) → dépôt de grille → vérification de la
source → publication datée. Une grille sans source vérifiable est refusée —
c'est le contrat, pas une politesse.

### 2.4 Relevés terrain en lot (campagnes)

CSV UTF-8, une ligne par relevé :
`observed_at;from_commune;to_commune;mode;price_xof;rush_hour`
→ import dans la file de modération existante (aucune publication directe).

---

## 3. Ce que ces contrats INTERDISENT

Renvoyer une estimation à la place d'une absence · exiger une clé secrète
côté client · publier une grille non sourcée · payer pour le classement
(aucun champ du contrat ne le permet, et la CI le vérifie).
