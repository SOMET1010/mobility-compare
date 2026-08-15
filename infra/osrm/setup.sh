#!/usr/bin/env bash
# Prépare les données OSRM pour la Côte d'Ivoire (DEP-001).
# Prérequis : Docker installé, ~2 Go d'espace disque libre.
# Durée totale sur un VPS 2 vCPU / 4 Go : ≈ 15-30 minutes.
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p data

PBF=data/ivory-coast-latest.osm.pbf
IMAGE=ghcr.io/project-osrm/osrm-backend:v5.27.1

if [ ! -f "$PBF" ]; then
  echo "→ Téléchargement de l'extrait OpenStreetMap Côte d'Ivoire (Geofabrik)…"
  curl -fL -o "$PBF" https://download.geofabrik.de/africa/ivory-coast-latest.osm.pbf
fi

echo "→ Extraction (profil voiture)…"
docker run --rm -v "$PWD/data:/data" "$IMAGE" \
  osrm-extract -p /opt/car.lua /data/ivory-coast-latest.osm.pbf

echo "→ Partition + personnalisation (algorithme MLD)…"
docker run --rm -v "$PWD/data:/data" "$IMAGE" \
  osrm-partition /data/ivory-coast-latest.osrm
docker run --rm -v "$PWD/data:/data" "$IMAGE" \
  osrm-customize /data/ivory-coast-latest.osrm

echo "✓ Données prêtes. Lancer : docker compose up -d"
echo "  Test local : curl 'http://127.0.0.1:5000/route/v1/driving/-4.017,5.32;-3.983,5.359'"
