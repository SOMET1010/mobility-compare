#!/usr/bin/env bash
# Exporte les lieux nommés du Grand Abidjan depuis la base Nominatim du
# serveur vers l'index de saisie tolérant aux fautes (table lieux_index,
# via l'Edge Function lieux-import, authentifiée par le jeton de routage).
# Des lieux publics uniquement — aucune donnée personnelle.
# Usage : bash export-lieux.sh   (relancer après chaque réimport OSM)
set -euo pipefail
cd "$(dirname "$0")"

# shellcheck disable=SC1091
source .env
: "${JETON_ROUTAGE:?JETON_ROUTAGE absent de .env}"
FONCTION="https://stnjiagjdayrbwhszxwk.supabase.co/functions/v1/lieux-import"

echo "→ Extraction des lieux nommés (Grand Abidjan)…"
docker compose exec -T nominatim psql -U nominatim -d nominatim -c "COPY (
  SELECT
    place_id,
    trim(coalesce(name->'name:fr', name->'name')) AS nom,
    trim(coalesce(address->'suburb', address->'quarter', address->'city', address->'town', '')) AS detail,
    ST_Y(centroid) AS lat,
    ST_X(centroid) AS lng,
    coalesce(importance, 0) AS imp
  FROM placex
  WHERE name ? 'name'
    AND centroid && ST_MakeEnvelope(-4.6, 5.0, -3.5, 5.7, 4326)
    AND class IN ('amenity','shop','tourism','leisure','office','aeroway',
                  'railway','highway','place','building','healthcare','man_made')
) TO STDOUT WITH (FORMAT csv)" > /tmp/lieux-abidjan.csv

echo "→ $(wc -l < /tmp/lieux-abidjan.csv) lignes extraites. Envoi par lots…"

python3 - "$FONCTION" "$JETON_ROUTAGE" <<'PY'
import csv, json, sys, urllib.request

fonction, jeton = sys.argv[1], sys.argv[2]
lignes = []
with open('/tmp/lieux-abidjan.csv', newline='', encoding='utf-8') as f:
    for row in csv.reader(f):
        if len(row) < 6:
            continue
        pid, nom, detail, lat, lng, imp = row[:6]
        nom = nom.strip()
        if not nom or len(nom) > 120:
            continue
        try:
            lignes.append({'id': int(pid), 'nom': nom, 'detail': detail.strip()[:80],
                           'lat': float(lat), 'lng': float(lng), 'imp': float(imp)})
        except ValueError:
            continue

total, envoyes = len(lignes), 0
for i in range(0, total, 1000):
    corps = json.dumps({'jeton': jeton, 'purge': i == 0,
                        'lignes': lignes[i:i + 1000]}).encode()
    req = urllib.request.Request(fonction, data=corps,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=90) as r:
        rep = json.load(r)
    if not rep.get('ok'):
        raise SystemExit(f'ECHEC au lot {i // 1000 + 1} : {rep}')
    envoyes += rep.get('inseres', 0)
    print(f'  lot {i // 1000 + 1} : {envoyes} lieux envoyés')

print(f'TERMINE : {envoyes} lieux indexés (sur {total} extraits)')
PY
