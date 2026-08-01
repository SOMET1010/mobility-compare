# FICHE DE DÉCISION — HÉBERGEMENT OSRM

**Jalon** J2.3 · **Statut** OUVERTE — hébergeur et budget `À DÉFINIR`
**Ne bloque pas** J2.1 ni J2.2.

> **Prêt pour l'exécution J2 (2026-08-01).** Les mesures du §2 se remplissent en
> reportant le rapport produit par `./scripts/j2.3/run-proof.sh` — voir le
> **gabarit vierge du §6**. Tant que ce protocole n'a pas été exécuté sur une
> machine réunissant **DEP-001** (Docker fonctionnel + accès à l'image OSRM +
> accès à l'extrait OSM + disque/mémoire suffisants), les valeurs restent
> `À MESURER` et **J2.3 demeure INCONCLUSIVE**. Aucune valeur ne s'estime ni ne
> se copie d'une fixture.

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

Le protocole est **implémenté et automatisé** par `./scripts/j2.3/run-proof.sh`
(idempotent). Sa logique pure (verdict, rapport) est couverte par 39 tests. Il
enchaîne, dans un environnement disposant de Docker et d'un accès aux données OSM :

1. Vérification de l'environnement Docker
2. Récupération de l'extrait OSM (Geofabrik) — ou réutilisation d'un extrait local via `--extract`
3. Construction du graphe (`osrm-extract` puis `partition`+`customize` en MLD, ou `contract` en CH), chronométrée
4. Démarrage d'`osrm-routed`, attente de l'état prêt, mesure de la mémoire résidente
5. Requête de référence **Yopougon → Plateau** et vérification de la distance, de la durée et de la géométrie
6. Génération d'un **rapport horodaté** (`scripts/j2.3/rapports/j2.3-<STAMP>.md` et `.json`) avec verdict

```bash
./scripts/j2.3/run-proof.sh                          # extrait Côte d'Ivoire, algorithme MLD
./scripts/j2.3/run-proof.sh --extract abidjan.osm.pbf # extrait local (ex. découpe Abidjan)
./scripts/j2.3/run-proof.sh --algorithm ch            # Contraction Hierarchies
```

L'étape 5 est la **preuve obligatoire de J2.3**. Elle ne sera remplacée par
aucune fixture. Le découpage d'un extrait Abidjan (mesure 1) et une charge de
test sur des corridors représentatifs (mesure 6) restent à mener en complément.

**Acceptation (CLAUDE.md §14)** : un rapport avec verdict **PASS** contenant
l'empreinte SHA-256 de l'extrait OSM, la taille du graphe, la mémoire résidente,
les durées de préparation et de chargement, et une distance, une durée et une
géométrie **non vide** pour Yopougon → Plateau. Un verdict `INCONCLUSIVE`, des
mesures manquantes ou un protocole modifié pour obtenir un PASS ne sont **pas**
acceptables.

---

## 5. Prérequis restants

- Un environnement compatible Docker, autorisé à télécharger les données OSM
- L'arbitrage sur le périmètre (mesure 1) — les autres mesures en dépendent

Tant que ces mesures n'existent pas, tout choix d'hébergeur serait une décision prise sans information.

---

## 6. Report des mesures — gabarit vierge (à remplir après une exécution PASS)

> **Ne rien saisir ici sans un rapport `scripts/j2.3/rapports/j2.3-<STAMP>.json`
> de verdict PASS sous la main.** Copier les valeurs telles quelles depuis le
> rapport ; ne rien estimer, arrondir approximativement, ni reprendre d'une
> fixture. Tant que ce tableau porte des `À MESURER`, **J2.3 = INCONCLUSIVE —
> DEP-001 indisponible**, et le §2 reste ouvert.

**Contexte d'exécution** (à renseigner)

| Champ                                     | Valeur                                  |
| ----------------------------------------- | --------------------------------------- |
| Date (UTC)                                | `À RENSEIGNER`                          |
| Machine / hébergeur d'essai               | `À RENSEIGNER`                          |
| Version Docker (`docker --version`)       | `À RENSEIGNER`                          |
| Image OSRM (`osrmImage`)                  | `À RENSEIGNER`                          |
| Algorithme (`osrmAlgorithm`)              | `mld` par défaut — `À CONFIRMER`        |
| Extrait OSM / périmètre (`osmExtractUrl`) | `À RENSEIGNER` (lie la mesure 1)        |
| Chemin du rapport                         | `scripts/j2.3/rapports/j2.3-<STAMP>.md` |

**Mesures produites par le protocole** (report depuis `facts.json` / rapport)

| Champ du rapport J2.3              | Clé (`facts.json`)       | Mesure §2   | Valeur      |
| ---------------------------------- | ------------------------ | ----------- | ----------- |
| Empreinte SHA-256 de l'extrait OSM | `osmExtractSha256`       | traçabilité | `À MESURER` |
| Taille de l'extrait OSM (octets)   | `osmExtractBytes`        | —           | `À MESURER` |
| Taille du graphe `.osrm.*`         | `graphSizeBytes`         | **#2**      | `À MESURER` |
| Mémoire résidente d'`osrm-routed`  | `residentMemoryBytes`    | **#3**      | `À MESURER` |
| Durée de préparation (s)           | `prepareDurationSeconds` | **#4**      | `À MESURER` |
| Durée de chargement (s)            | `loadDurationSeconds`    | **#4**      | `À MESURER` |

**Requête de référence Yopougon → Plateau** (preuve obligatoire — §4 étape 5)

| Élément                           | Source  | Valeur                           |
| --------------------------------- | ------- | -------------------------------- |
| Distance (m)                      | rapport | `À MESURER`                      |
| Durée (s)                         | rapport | `À MESURER`                      |
| Géométrie non vide (tracé encodé) | rapport | `À MESURER` (doit être présente) |
| Écart d'accrochage max au graphe  | rapport | `À MESURER`                      |
| **Verdict global**                | rapport | **doit être PASS**               |

**Décisions produit à arbitrer une fois les mesures obtenues** (ne se déduisent
pas du protocole) : mesures §2 n°1, 5, 6, 7, 8, 9, 10.

Une fois ce gabarit rempli depuis un rapport PASS : reporter les valeurs dans le
tableau du §2, mettre à jour **DEP-001** et le **statut J2** (README-REPRISE.md,
docs/REGISTRE_DEPENDANCES_EXTERNES.md), et joindre le rapport horodaté. Seul ce
report factuel autorise à qualifier J2 de terminé.
