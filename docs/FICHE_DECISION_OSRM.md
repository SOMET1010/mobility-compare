# FICHE DE DÉCISION — HÉBERGEMENT OSRM

**Jalon** J2.3 · **Statut** OUVERTE — hébergeur et budget `À DÉFINIR`
**Ne bloque pas** J2.1 ni J2.2.

---

## 1. Décision d'architecture acquise

OSRM tourne comme **service autonome sur une VM Linux dédiée compatible Docker**, séparée du frontend, de Supabase, du moteur tarifaire et des fonctions serveur applicatives.

**Le frontend n'appelle jamais OSRM directement.** L'accès passe par notre couche de services, avec authentification, quotas, délais d'expiration et journalisation sans données sensibles.

Conséquence sur le code : `VITE_ROUTING_BASE_URL` pointe vers notre couche de services, **jamais** vers OSRM. Corrigé en J2.2 dans `.env.example`, `env-registry.js`, `env.ts` et `vite-env.d.ts`.

```
Navigateur → couche de services (auth, quotas, journalisation) → OSRM (VM privée)
```

Une position de départ et d'arrivée est une donnée personnelle. Elle ne doit pas transiter en clair vers un service tiers ni être journalisée telle quelle (voir le masquage des coordonnées déjà implémenté dans le logger).

---

## 2. Mesures à produire avant tout choix

Aucun hébergeur ni dimensionnement ne peut être arrêté sans ces chiffres. Ils s'obtiennent par une extraction de test, pas par estimation.

| #   | Mesure                            | Méthode                                                  | Valeur       |
| --- | --------------------------------- | -------------------------------------------------------- | ------------ |
| 1   | Périmètre géographique initial    | Décision : Abidjan seul ou Côte d'Ivoire entière         | `À ARBITRER` |
| 2   | Taille du graphe après extraction | `osrm-extract` puis `osrm-contract`, mesure de `.osrm.*` | `À MESURER`  |
| 3   | Mémoire au chargement             | RSS de `osrm-routed` après démarrage                     | `À MESURER`  |
| 4   | Temps de préparation des données  | Chronométrage extract + partition + customize            | `À MESURER`  |
| 5   | Fréquence de mise à jour OSM      | Décision produit : hebdomadaire, mensuelle, à la demande | `À ARBITRER` |
| 6   | Volume de requêtes estimé         | Modèle : sessions/jour × recherches/session × modes      | `À ESTIMER`  |
| 7   | Exigences de disponibilité        | Décision produit                                         | `À ARBITRER` |
| 8   | Sauvegarde et reconstruction      | Le graphe est reconstructible : sauvegarder ou rejouer ? | `À ARBITRER` |
| 9   | Coût mensuel estimatif            | Découle de 2, 3, 6, 7                                    | `À CALCULER` |
| 10  | Staging et production             | Deux VM, ou une VM et un conteneur ?                     | `À ARBITRER` |

---

## 3. Éléments de cadrage

### Sur le périmètre (mesure 1)

Abidjan seul réduit fortement le graphe, mais un trajet vers Bassam ou Yamoussoukro sortirait de la couverture — et le moteur retournerait honnêtement `OUT_OF_COVERAGE`, ce qui est correct mais frustrant.

Le CDC limite la V1 au district d'Abidjan. Extraire la Côte d'Ivoire entière coûte surtout à la préparation, moins à l'exécution. **La mesure 2 tranchera** : si l'écart est faible, prendre le pays entier évite une migration ultérieure.

### Sur l'algorithme (impacte 3 et 4)

OSRM propose deux modes, aux profils opposés :

|                       | MLD (`partition` + `customize`) | CH (`contract`)         |
| --------------------- | ------------------------------- | ----------------------- |
| Préparation           | Plus rapide                     | Plus lente              |
| Requêtes              | Légèrement plus lentes          | Plus rapides            |
| Mise à jour du trafic | Possible sans reconstruction    | Reconstruction complète |

MLD paraît préférable si des pénalités de trafic sont envisagées un jour — les embouteillages d'Abidjan sont structurels et un temps de trajet qui les ignore serait faux aux heures de pointe. **À confirmer par la mesure.**

### Sur la reconstruction (mesure 8)

Le graphe OSRM est **entièrement reconstructible** depuis l'extrait OSM. Sauvegarder les fichiers `.osrm.*` n'a d'intérêt que si le temps de reconstruction dépasse la tolérance d'indisponibilité. La mesure 4 le dira.

### Sur le volume (mesure 6)

Une recherche multimodale déclenche **plusieurs** requêtes de routage, pas une seule. Le modèle d'estimation doit en tenir compte, ainsi que de la mise en cache : les corridors les plus demandés se répètent, et un cache sur les trajets fréquents réduirait probablement fortement la charge réelle.

---

## 4. Protocole de mesure

À exécuter dans un environnement disposant de Docker et d'un accès aux données OSM :

1. Télécharger l'extrait Côte d'Ivoire (Geofabrik)
2. Découper un extrait Abidjan par emprise géographique
3. Préparer les deux, en chronométrant chaque étape
4. Mesurer la taille des fichiers produits et la mémoire de `osrm-routed`
5. Exécuter la requête de référence **Yopougon → Plateau** et vérifier la cohérence de la distance, de la durée et de la géométrie
6. Charge de test sur un échantillon de corridors représentatifs

L'étape 5 est la **preuve obligatoire de J2.3**. Elle ne sera remplacée par aucune fixture.

---

## 5. Prérequis restants

- Un environnement compatible Docker, autorisé à télécharger les données OSM
- L'arbitrage sur le périmètre (mesure 1) — les autres mesures en dépendent

Tant que ces mesures n'existent pas, tout choix d'hébergeur serait une décision prise sans information.
