#!/usr/bin/env bash
# Exporte les lignes de transport cartographiées (gbaka, woro-woro, bus,
# bateaux-bus) depuis notre extrait OpenStreetMap vers les tables
# lignes_transport / lignes_points (via l'Edge Function lignes-import).
# Prérequis : osmium-tool installé, /root/donnees/lignes-transport.osm.pbf
# produit par `osmium tags-filter … r/route=bus,share_taxi,minibus,ferry`.
# Usage : bash export-lignes.sh   (relancer après chaque réimport OSM)
set -euo pipefail
cd "$(dirname "$0")"

# shellcheck disable=SC1091
source .env
: "${JETON_ROUTAGE:?JETON_ROUTAGE absent de .env}"
FONCTION="https://stnjiagjdayrbwhszxwk.supabase.co/functions/v1/lignes-import"
PBF="/root/donnees/lignes-transport.osm.pbf"
[ -f "$PBF" ] || { echo "Introuvable : $PBF (lancer d'abord l'extraction osmium)"; exit 1; }

echo "→ Lecture des relations, arrêts et tracés…"
osmium cat "$PBF" -f osm | python3 - "$FONCTION" "$JETON_ROUTAGE" <<'PY'
import json, sys, urllib.request
import xml.etree.ElementTree as ET

fonction, jeton = sys.argv[1], sys.argv[2]
MODES = {'minibus': 'GBAKA', 'share_taxi': 'WORO', 'bus': 'BUS', 'ferry': 'BATEAU'}

noeuds, chemins, lignes = {}, {}, []
for _, el in ET.iterparse(sys.stdin, events=('end',)):
    if el.tag == 'node':
        noeuds[el.get('id')] = (float(el.get('lat')), float(el.get('lon')))
    elif el.tag == 'way':
        chemins[el.get('id')] = [nd.get('ref') for nd in el.findall('nd')]
    elif el.tag == 'relation':
        tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
        mode = MODES.get(tags.get('route', ''))
        if mode:
            arrets, voies = [], []
            for m in el.findall('member'):
                role = m.get('role') or ''
                if m.get('type') == 'node' and ('stop' in role or 'platform' in role):
                    arrets.append(m.get('ref'))
                elif m.get('type') == 'way':
                    voies.append(m.get('ref'))
            lignes.append((tags, arrets, voies))
    if el.tag in ('node', 'way', 'relation'):
        el.clear()

prets = []
for tags, arrets, voies in lignes:
    nom = tags.get('name') or ''
    if not nom:
        de, vers = tags.get('from', ''), tags.get('to', '')
        if de and vers:
            nom = f'{de} → {vers}'
        elif tags.get('ref'):
            nom = f"Ligne {tags['ref']}"
    if not nom:
        continue
    pts = [noeuds[a] for a in arrets if a in noeuds]
    trace = [noeuds[n] for v in voies for n in chemins.get(v, []) if n in noeuds]
    reste = 80 - len(pts)
    if trace and reste > 2:
        pas = max(1, len(trace) // reste)
        pts += trace[::pas][:reste]
    # Dédoublonnage grossier (~30 m) pour ne pas gonfler la table.
    vus, uniques = set(), []
    for lat, lng in pts:
        cle = (round(lat, 4), round(lng, 4))
        if cle not in vus:
            vus.add(cle)
            uniques.append([lat, lng])
    if len(uniques) < 2:
        continue
    prets.append({
        'id': len(prets) + 1,  # identifiant stable par rang d'export
        'nom': nom[:160],
        'mode': MODES[tags['route']],
        'ref': (tags.get('ref') or '')[:40],
        'operateur': (tags.get('operator') or tags.get('network') or '')[:80],
        'points': uniques[:80],
    })

print(f'→ {len(prets)} lignes exploitables. Envoi par lots…')
envoyees = 0
for i in range(0, len(prets), 50):
    corps = json.dumps({'jeton': jeton, 'purge': i == 0,
                        'lignes': prets[i:i + 50]}).encode()
    req = urllib.request.Request(fonction, data=corps,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        rep = json.load(r)
    if not rep.get('ok'):
        raise SystemExit(f'ECHEC au lot {i // 50 + 1} : {rep}')
    envoyees += rep.get('inserees', 0)
    print(f'  lot {i // 50 + 1} : {envoyees}/{len(prets)} lignes')

print(f'TERMINE : {envoyees} lignes de transport indexées')
PY
