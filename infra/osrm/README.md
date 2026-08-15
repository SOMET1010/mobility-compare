# OSRM auto-hébergé — mode d'emploi (DEP-001)

> Tout est prêt : le jour où une VM Linux existe, la mise en service prend
> moins d'une heure. Aucune de ces étapes ne modifie le produit tant que la
> couche de services n'est pas branchée.

## Prérequis (côté décideur)

- Un VPS Linux (2 vCPU / 4 Go RAM / 10 Go disque suffisent pour la
  Côte d'Ivoire), avec Docker installé.
- Un accès SSH.

## Mise en service

```bash
# Sur la VM :
git clone <ce dépôt> && cd <dépôt>/infra/osrm
./setup.sh          # télécharge l'extrait OSM CI (Geofabrik) et prépare les données
docker compose up -d
```

Vérification :

```bash
curl 'http://127.0.0.1:5000/route/v1/driving/-4.017,5.32;-3.983,5.359'
# → JSON avec distance (m) et duration (s) Plateau → Cocody par les rues
```

## Règles non négociables (CDC §7)

1. **Le frontend n'appelle jamais OSRM directement.** Une origine et une
   destination sont des données personnelles. Le port 5000 n'écoute qu'en
   local ; l'accès public passera par la couche de services (authentification,
   quotas, délais, journalisation sans données sensibles).
2. Le contrat de routage et le disjoncteur existent déjà côté application
   (`src/modules/routing`) — la bascule des distances simulées vers OSRM se
   fait sans refonte, et la trace de calcul citera le fournisseur réel.

## Mise à jour des données

L'extrait OSM évolue. Pour rafraîchir : supprimer `data/*.osm.pbf`, relancer
`./setup.sh`, puis `docker compose restart`.
