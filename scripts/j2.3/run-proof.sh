#!/usr/bin/env bash
#
# PROTOCOLE J2.3 — PREUVE D'INTEGRATION OSRM REELLE
# =============================================================================
# Script unique et idempotent. Enchaine :
#   1. verification de l'environnement Docker
#   2. recuperation de l'extrait OSM (ou reutilisation d'un extrait fourni)
#   3. construction du graphe
#   4. demarrage d'OSRM et attente de l'etat pret
#   5. requete reelle Yopougon -> Plateau
#   6. generation d'un rapport horodate avec verdict
#
# IDEMPOTENCE : chaque etape est ignoree si son artefact existe deja et que son
# empreinte correspond. Relancer le script ne reconstruit pas inutilement.
# Utiliser --force pour tout refaire.
#
# USAGE
#   ./run-proof.sh                          extrait Cote d'Ivoire, algorithme MLD
#   ./run-proof.sh --extract chemin.osm.pbf utiliser un extrait local
#   ./run-proof.sh --algorithm ch           utiliser Contraction Hierarchies
#   ./run-proof.sh --force                  tout reconstruire
#
# CE SCRIPT NE PEUT PAS ETRE EXECUTE DANS UN ENVIRONNEMENT SANS DOCKER
# NI ACCES AUX DONNEES OSM. C'est precisement ce qu'il sert a lever.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${SCRIPT_DIR}/.work"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_DIR="${SCRIPT_DIR}/rapports"
REPORT_PREFIX="${REPORT_DIR}/j2.3-${STAMP}"
FACTS="${WORK_DIR}/facts.json"

OSM_URL="https://download.geofabrik.de/africa/ivory-coast-latest.osm.pbf"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"
ALGORITHM="mld"
PORT=5000
EXTRACT_PATH=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extract)   EXTRACT_PATH="$2"; shift 2 ;;
    --algorithm) ALGORITHM="$2";    shift 2 ;;
    --port)      PORT="$2";         shift 2 ;;
    --url)       OSM_URL="$2";      shift 2 ;;
    --force)     FORCE=1;           shift ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

mkdir -p "${WORK_DIR}" "${REPORT_DIR}"
CONTAINER="osrm-j2-3-proof"

log()  { printf '\n[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fatal() {
  printf '\n[ECHEC] %s\n' "$*" >&2
  printf 'Aucune preuve produite. Le verrou J2 reste ferme.\n' >&2
  exit 1
}

cleanup() { docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# --- 1. Environnement --------------------------------------------------------
log "1/6 Verification de l'environnement"
command -v docker >/dev/null 2>&1 || fatal "docker introuvable. Ce protocole exige Docker."
DOCKER_VERSION="$(docker --version)"
docker info >/dev/null 2>&1 || fatal "Le demon Docker ne repond pas."
command -v node >/dev/null 2>&1 || fatal "node introuvable (requis par verify.mjs)."
echo "  ${DOCKER_VERSION}"

# --- 2. Extrait OSM ----------------------------------------------------------
log "2/6 Extrait OSM"
if [[ -n "${EXTRACT_PATH}" ]]; then
  [[ -f "${EXTRACT_PATH}" ]] || fatal "Extrait introuvable : ${EXTRACT_PATH}"
  cp -n "${EXTRACT_PATH}" "${WORK_DIR}/data.osm.pbf" 2>/dev/null || true
  OSM_SOURCE="${EXTRACT_PATH}"
else
  OSM_SOURCE="${OSM_URL}"
  if [[ -f "${WORK_DIR}/data.osm.pbf" && ${FORCE} -eq 0 ]]; then
    echo "  Extrait deja present, telechargement ignore (--force pour refaire)"
  else
    echo "  Telechargement depuis ${OSM_URL}"
    curl -fL --progress-bar -o "${WORK_DIR}/data.osm.pbf.part" "${OSM_URL}" \
      || fatal "Telechargement impossible. Verifier l'acces reseau a Geofabrik."
    mv "${WORK_DIR}/data.osm.pbf.part" "${WORK_DIR}/data.osm.pbf"
  fi
fi

OSM_SHA="$(sha256sum "${WORK_DIR}/data.osm.pbf" | cut -d' ' -f1)"
OSM_BYTES="$(stat -c%s "${WORK_DIR}/data.osm.pbf")"
echo "  Empreinte  ${OSM_SHA}"
echo "  Taille     $((OSM_BYTES / 1000000)) Mo"

# --- 3. Construction du graphe -----------------------------------------------
log "3/6 Construction du graphe (algorithme ${ALGORITHM})"
PREPARE_START=$(date +%s)

if [[ -f "${WORK_DIR}/.built-${ALGORITHM}-${OSM_SHA}" && ${FORCE} -eq 0 ]]; then
  echo "  Graphe deja construit pour cette empreinte, etape ignoree"
  PREPARE_SECONDS="$(cat "${WORK_DIR}/.built-${ALGORITHM}-${OSM_SHA}")"
else
  rm -f "${WORK_DIR}"/data.osrm* "${WORK_DIR}"/.built-* 2>/dev/null || true
  DOCKER_RUN=(docker run --rm -v "${WORK_DIR}:/data" "${OSRM_IMAGE}")

  "${DOCKER_RUN[@]}" osrm-extract -p /opt/car.lua /data/data.osm.pbf \
    || fatal "osrm-extract a echoue."

  if [[ "${ALGORITHM}" == "ch" ]]; then
    "${DOCKER_RUN[@]}" osrm-contract /data/data.osrm || fatal "osrm-contract a echoue."
  else
    "${DOCKER_RUN[@]}" osrm-partition /data/data.osrm || fatal "osrm-partition a echoue."
    "${DOCKER_RUN[@]}" osrm-customize /data/data.osrm || fatal "osrm-customize a echoue."
  fi

  PREPARE_SECONDS=$(( $(date +%s) - PREPARE_START ))
  echo "${PREPARE_SECONDS}" > "${WORK_DIR}/.built-${ALGORITHM}-${OSM_SHA}"
fi

GRAPH_BYTES="$(du -cb "${WORK_DIR}"/data.osrm* 2>/dev/null | tail -1 | cut -f1)"
echo "  Preparation  ${PREPARE_SECONDS} s"
echo "  Graphe       $((GRAPH_BYTES / 1000000)) Mo"

# --- 4. Demarrage et attente de l'etat pret ----------------------------------
log "4/6 Demarrage d'OSRM"
cleanup
LOAD_START=$(date +%s)
docker run -d --name "${CONTAINER}" -p "${PORT}:5000" -v "${WORK_DIR}:/data" \
  "${OSRM_IMAGE}" osrm-routed --algorithm "${ALGORITHM}" /data/data.osrm >/dev/null \
  || fatal "Demarrage du conteneur impossible."

READY=0
for _ in $(seq 1 60); do
  if curl -fs "http://localhost:${PORT}/route/v1/driving/-4.02,5.32;-4.03,5.33" >/dev/null 2>&1; then
    READY=1; break
  fi
  sleep 1
done
LOAD_SECONDS=$(( $(date +%s) - LOAD_START ))
[[ ${READY} -eq 1 ]] || { docker logs "${CONTAINER}" 2>&1 | tail -20; fatal "OSRM n'est pas devenu pret en 60 s."; }

MEMORY_BYTES="$(docker stats --no-stream --format '{{.MemUsage}}' "${CONTAINER}" \
  | awk '{print $1}' | sed 's/MiB//' | awk '{printf "%d", $1 * 1048576}')"
echo "  Pret en      ${LOAD_SECONDS} s"
echo "  Memoire      $((MEMORY_BYTES / 1000000)) Mo"

# --- 5. Faits collectes ------------------------------------------------------
cat > "${FACTS}" <<JSON
{
  "dockerVersion": "${DOCKER_VERSION}",
  "osrmImage": "${OSRM_IMAGE}",
  "osrmAlgorithm": "${ALGORITHM}",
  "osmExtractUrl": "${OSM_SOURCE}",
  "osmExtractSha256": "${OSM_SHA}",
  "osmExtractBytes": ${OSM_BYTES},
  "graphSizeBytes": ${GRAPH_BYTES},
  "prepareDurationSeconds": ${PREPARE_SECONDS},
  "loadDurationSeconds": ${LOAD_SECONDS},
  "residentMemoryBytes": ${MEMORY_BYTES}
}
JSON

# --- 6. Requete de preuve et rapport -----------------------------------------
log "5/6 Requete Yopougon -> Plateau"
set +e
node "${SCRIPT_DIR}/verify.mjs" \
  --endpoint "http://localhost:${PORT}" \
  --facts "${FACTS}" \
  --out "${REPORT_PREFIX}"
VERIFY_CODE=$?
set -e

log "6/6 Termine"
echo "  Rapports : ${REPORT_PREFIX}.md et .json"
[[ ${VERIFY_CODE} -eq 0 ]] \
  && echo "  Verdict PASS — le verrou J2 peut etre leve avec ce rapport." \
  || echo "  Verdict non PASS — le verrou J2 reste ferme. Voir le rapport."
exit ${VERIFY_CODE}
