/**
 * LOGIQUE DE VERDICT — PROTOCOLE J2.3
 * =============================================================================
 * Fonctions pures, sans I/O. Testables sans Docker ni réseau, ce qui est le
 * seul moyen de prouver que le protocole échoue honnêtement AVANT de disposer
 * d'une machine capable de l'exécuter.
 *
 * Un protocole de preuve qui n'aurait jamais été vu échouer ne prouverait rien.
 * =============================================================================
 */

/** Coordonnées de référence. Approximatives — servent au contrôle de cohérence. */
export const YOPOUGON = { lat: 5.345, lng: -4.07 };
export const PLATEAU = { lat: 5.32, lng: -4.02 };

/**
 * Bornes de plausibilité. Volontairement LARGES : leur rôle est de détecter
 * une aberration franche, pas de valider une valeur précise. Un dépassement
 * donne INCONCLUSIVE, jamais FAIL — c'est un signal à examiner, pas une preuve
 * de dysfonctionnement.
 */
export const PLAUSIBILITY = {
  /** Rapport distance routière / distance à vol d'oiseau. */
  detourRatioMin: 1.0,
  detourRatioMax: 5.0,
  /** Vitesse moyenne en km/h. */
  averageSpeedMinKmh: 5,
  averageSpeedMaxKmh: 80,
  /** Écart maximal toléré entre point demandé et point accroché au graphe. */
  maxSnapDistanceMeters: 500,
  /** Longueur minimale d'une géométrie encodée crédible. */
  minGeometryLength: 20,
};

/** Distance orthodromique en mètres. */
export function haversineMeters(a, b) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Un contrôle produit un statut et une raison.
 *   pass          le contrôle est satisfait
 *   fail          le contrôle est violé — bloquant
 *   inconclusive  impossible de conclure — bloquant pour un PASS global
 */
export function check(id, label, status, detail, blocking = true) {
  return { id, label, status, detail, blocking };
}

/**
 * Analyse la réponse de routage et produit la liste des contrôles.
 * `payload` est la réponse brute du service, telle que reçue.
 */
export function checkRouteResponse(payload, request) {
  const checks = [];

  if (payload === null || typeof payload !== 'object') {
    checks.push(check('RESP_SHAPE', 'Réponse exploitable', 'fail', 'Corps absent ou non objet'));
    return checks;
  }

  // --- Code protocolaire -----------------------------------------------------
  if (payload.code !== 'Ok') {
    checks.push(
      check(
        'RESP_CODE',
        'Code de réponse',
        'fail',
        `Code « ${String(payload.code ?? 'absent')} » — le service n'a pas produit d'itinéraire`,
      ),
    );
    return checks;
  }
  checks.push(check('RESP_CODE', 'Code de réponse', 'pass', 'Ok'));

  // --- Présence d'un itinéraire ---------------------------------------------
  const routes = Array.isArray(payload.routes) ? payload.routes : [];
  if (routes.length === 0) {
    checks.push(check('RESP_ROUTE', 'Itinéraire présent', 'fail', 'Réponse Ok sans itinéraire'));
    return checks;
  }
  const route = routes[0];
  checks.push(check('RESP_ROUTE', 'Itinéraire présent', 'pass', `${routes.length} itinéraire(s)`));

  // --- Distance --------------------------------------------------------------
  const distance = route.distance;
  const distanceOk = typeof distance === 'number' && Number.isFinite(distance) && distance > 0;
  checks.push(
    check(
      'RESP_DISTANCE',
      'Distance retournée',
      distanceOk ? 'pass' : 'fail',
      distanceOk ? `${Math.round(distance)} m` : `Valeur inexploitable : ${String(distance)}`,
    ),
  );

  // --- Durée -----------------------------------------------------------------
  const duration = route.duration;
  const durationOk = typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
  checks.push(
    check(
      'RESP_DURATION',
      'Durée retournée',
      durationOk ? 'pass' : 'fail',
      durationOk ? `${Math.round(duration)} s` : `Valeur inexploitable : ${String(duration)}`,
    ),
  );

  // --- Géométrie — jamais tolérée absente ------------------------------------
  const geometry = route.geometry;
  const hasGeometry = typeof geometry === 'string' && geometry.length > 0;
  const geometryCredible = hasGeometry && geometry.length >= PLAUSIBILITY.minGeometryLength;
  checks.push(
    check(
      'RESP_GEOMETRY',
      'Géométrie retournée',
      !hasGeometry ? 'fail' : geometryCredible ? 'pass' : 'inconclusive',
      !hasGeometry
        ? 'Géométrie absente ou vide — sans tracé, il n’y a pas de preuve d’itinéraire'
        : `${geometry.length} caractères encodés`,
    ),
  );

  if (!distanceOk || !durationOk) return checks;

  // --- Cohérence géométrique -------------------------------------------------
  const crowFlies = haversineMeters(request.origin, request.destination);
  const ratio = crowFlies > 0 ? distance / crowFlies : Number.POSITIVE_INFINITY;
  const ratioOk = ratio >= PLAUSIBILITY.detourRatioMin && ratio <= PLAUSIBILITY.detourRatioMax;
  checks.push(
    check(
      'COHERENCE_DETOUR',
      'Rapport détour / vol d’oiseau',
      ratioOk ? 'pass' : 'inconclusive',
      `${ratio.toFixed(2)} (vol d’oiseau ${Math.round(crowFlies)} m) — bornes ${PLAUSIBILITY.detourRatioMin}–${PLAUSIBILITY.detourRatioMax}`,
    ),
  );

  // --- Cohérence temporelle --------------------------------------------------
  const speedKmh = distance / 1000 / (duration / 3600);
  const speedOk =
    speedKmh >= PLAUSIBILITY.averageSpeedMinKmh && speedKmh <= PLAUSIBILITY.averageSpeedMaxKmh;
  checks.push(
    check(
      'COHERENCE_SPEED',
      'Vitesse moyenne implicite',
      speedOk ? 'pass' : 'inconclusive',
      `${speedKmh.toFixed(1)} km/h — bornes ${PLAUSIBILITY.averageSpeedMinKmh}–${PLAUSIBILITY.averageSpeedMaxKmh}`,
    ),
  );

  // --- Accrochage au graphe --------------------------------------------------
  // Un point accroché très loin signale que la zone n'est pas dans le graphe :
  // OSRM répond, mais pour un autre endroit que celui demandé.
  const waypoints = Array.isArray(payload.waypoints) ? payload.waypoints : [];
  if (waypoints.length < 2) {
    checks.push(
      check(
        'GRAPH_SNAP',
        'Accrochage au graphe',
        'inconclusive',
        'Waypoints absents : impossible de vérifier que les points demandés sont dans le graphe',
      ),
    );
  } else {
    const requested = [request.origin, request.destination];
    const distances = waypoints.slice(0, 2).map((wp, index) => {
      const loc = Array.isArray(wp?.location) ? wp.location : null;
      if (!loc || loc.length < 2) return Number.POSITIVE_INFINITY;
      return haversineMeters({ lat: loc[1], lng: loc[0] }, requested[index]);
    });
    const worst = Math.max(...distances);
    const snapOk = worst <= PLAUSIBILITY.maxSnapDistanceMeters;
    checks.push(
      check(
        'GRAPH_SNAP',
        'Accrochage au graphe',
        snapOk ? 'pass' : 'fail',
        Number.isFinite(worst)
          ? `écart maximal ${Math.round(worst)} m — seuil ${PLAUSIBILITY.maxSnapDistanceMeters} m`
          : 'Position de waypoint illisible',
      ),
    );
  }

  return checks;
}

/**
 * Contrôles d'infrastructure et de graphe, à partir de faits collectés par
 * le script d'orchestration.
 */
export function checkEnvironment(facts) {
  const checks = [];

  checks.push(
    check(
      'INFRA_DOCKER',
      'Docker disponible',
      facts.dockerVersion ? 'pass' : 'fail',
      facts.dockerVersion ?? 'Commande docker introuvable',
    ),
  );

  checks.push(
    check(
      'INFRA_LIVE',
      'Service réellement interrogé',
      facts.serviceReached ? 'pass' : 'fail',
      facts.serviceReached
        ? `Réponse HTTP ${facts.httpStatus} depuis ${facts.endpoint}`
        : 'Aucune réponse : le service n’a pas été interrogé',
    ),
  );

  // Anti-simulation : un endpoint de fixture ou de mock invalide la preuve.
  const endpoint = String(facts.endpoint ?? '');
  // Le TLD `.test` est reserve aux tests par la RFC 2606 : jamais une instance reelle.
  const looksSimulated = /fixture|mock|stub|fake|dummy|exemple|example|\.test(?::\d+)?(?:\/|$)|\/__/i.test(
    endpoint,
  );
  checks.push(
    check(
      'INFRA_NOT_SIMULATED',
      'Endpoint non simulé',
      looksSimulated ? 'fail' : 'pass',
      looksSimulated
        ? `L’endpoint « ${endpoint} » évoque une simulation : la preuve serait sans valeur`
        : endpoint,
    ),
  );

  const graphOk =
    typeof facts.graphSizeBytes === 'number' &&
    facts.graphSizeBytes > 0 &&
    typeof facts.osmExtractSha256 === 'string' &&
    facts.osmExtractSha256.length === 64;
  checks.push(
    check(
      'GRAPH_BUILT',
      'Graphe construit et tracé',
      graphOk ? 'pass' : 'inconclusive',
      graphOk
        ? `${(facts.graphSizeBytes / 1e6).toFixed(1)} Mo, extrait ${facts.osmExtractSha256.slice(0, 12)}…`
        : 'Taille ou empreinte de l’extrait manquante',
    ),
  );

  const measures = ['prepareDurationSeconds', 'loadDurationSeconds', 'residentMemoryBytes'];
  const missing = measures.filter((key) => typeof facts[key] !== 'number' || facts[key] <= 0);
  checks.push(
    check(
      'MEASURES_PRESENT',
      'Mesures de performance collectées',
      missing.length === 0 ? 'pass' : 'inconclusive',
      missing.length === 0 ? measures.join(', ') : `Manquantes : ${missing.join(', ')}`,
    ),
  );

  return checks;
}

/**
 * Verdict global.
 *   FAIL          au moins un contrôle bloquant en échec
 *   INCONCLUSIVE  aucun échec, mais au moins un contrôle bloquant non concluant
 *   PASS          tous les contrôles bloquants satisfaits
 *
 * L'absence d'échec ne suffit pas : un contrôle qui n'a pas pu conclure empêche
 * de déclarer la preuve obtenue.
 */
export function verdict(checks) {
  const blocking = checks.filter((c) => c.blocking);
  if (blocking.length === 0) {
    return { verdict: 'INCONCLUSIVE', reason: 'Aucun contrôle bloquant exécuté' };
  }
  const failed = blocking.filter((c) => c.status === 'fail');
  if (failed.length > 0) {
    return {
      verdict: 'FAIL',
      reason: `${failed.length} contrôle(s) en échec : ${failed.map((c) => c.id).join(', ')}`,
    };
  }
  const unclear = blocking.filter((c) => c.status === 'inconclusive');
  if (unclear.length > 0) {
    return {
      verdict: 'INCONCLUSIVE',
      reason: `${unclear.length} contrôle(s) non concluant(s) : ${unclear.map((c) => c.id).join(', ')}`,
    };
  }
  return { verdict: 'PASS', reason: `${blocking.length} contrôles bloquants satisfaits` };
}
