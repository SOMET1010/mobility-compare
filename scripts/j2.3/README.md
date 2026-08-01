# Protocole J2.3 — preuve d'integration OSRM reelle

Leve le dernier verrou de J2 : une requete Yopougon -> Plateau sur une instance
OSRM reelle, retournant distance, duree et geometrie coherentes.

## Prerequis

- Docker fonctionnel
- acces reseau a Geofabrik (ou un extrait `.osm.pbf` fourni localement)
- Node 22+
- environ 10 Go d'espace disque libre

## Lancer

```bash
./scripts/j2.3/run-proof.sh                            # Cote d'Ivoire, MLD
./scripts/j2.3/run-proof.sh --extract abidjan.osm.pbf  # extrait local
./scripts/j2.3/run-proof.sh --algorithm ch             # Contraction Hierarchies
./scripts/j2.3/run-proof.sh --force                    # tout reconstruire
```

Le script est **idempotent** : extrait deja telecharge et graphe deja construit
pour la meme empreinte sont reutilises. `--force` refait tout.

Sortie : `scripts/j2.3/rapports/j2.3-<horodatage>.md` et `.json`.
Code de sortie 0 uniquement si le verdict est PASS.

## Verdicts

| Verdict        | Signification                                     |
| -------------- | ------------------------------------------------- |
| `PASS`         | tous les controles bloquants satisfaits           |
| `FAIL`         | au moins un controle bloquant viole               |
| `INCONCLUSIVE` | aucun echec, mais un controle n'a pas pu conclure |

L'absence d'echec ne suffit pas : une mesure manquante empeche de declarer la
preuve obtenue.

## Ce qui fait echouer le protocole

- geometrie absente ou vide
- code de reponse different de `Ok`, ou `Ok` sans itineraire
- distance ou duree inexploitable
- point accroche a plus de 500 m du point demande — la zone n'est pas dans le graphe
- service non reellement interrogé
- Docker absent
- endpoint evoquant une simulation (`fixture`, `mock`, `stub`, TLD `.test`...)

## Ce qui donne INCONCLUSIVE

- mesures de performance manquantes
- empreinte de l'extrait absente
- waypoints absents : impossible de verifier l'appartenance au graphe
- detour ou vitesse moyenne hors des bornes de plausibilite
- geometrie trop courte pour etre credible

Les bornes de plausibilite sont **larges** : elles detectent une aberration
franche, elles ne valident pas une valeur precise.

## Etat de la preuve du protocole lui-meme

La logique de verdict et de rapport est couverte par 39 tests
(`tests/unit/osrm-proof-verdict.test.ts`), executables sans Docker.
Ils prouvent que le protocole **echoue honnetement**.

La boucle `fetch` de `verify.mjs` et l'orchestration `run-proof.sh` n'ont pas pu
etre executees dans l'environnement de developpement (ni Docker, ni acces OSM,
ni sortie reseau depuis un sous-processus). Leur premiere execution reelle est
elle-meme a verifier.
