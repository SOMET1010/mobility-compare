/**
 * CONSTRUCTION DU RAPPORT — FONCTION PURE
 * Aucune I/O : ni reseau, ni fichier. `verify.mjs` collecte les faits et
 * ecrit le resultat ; toute la logique de rapport est ici, donc testable
 * sans Docker ni serveur.
 */

import { checkRouteResponse, checkEnvironment, verdict, YOPOUGON, PLATEAU } from './verdict.mjs';

export const REQUEST = { origin: YOPOUGON, destination: PLATEAU };

export function routeUrl(endpoint) {
  const { origin, destination } = REQUEST;
  return (
    `${endpoint}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?overview=full&geometries=polyline`
  );
}

/**
 * @param {object} input
 * @param {unknown} input.payload      corps de la reponse, ou null
 * @param {object} input.facts         faits collectes par l'orchestrateur
 * @param {string} input.endpoint
 * @param {boolean} input.reached      le service a-t-il repondu ?
 * @param {number|null} input.httpStatus
 * @param {number|null} input.latencyMs
 * @param {string|null} input.networkError
 * @param {Date} input.generatedAt
 */
export function buildReport(input) {
  const { payload, facts, endpoint, reached, httpStatus, latencyMs, networkError, generatedAt } =
    input;

  const environmentFacts = { ...facts, endpoint, serviceReached: reached, httpStatus };
  const checks = [
    ...checkEnvironment(environmentFacts),
    ...(reached && payload !== null && payload !== undefined
      ? checkRouteResponse(payload, REQUEST)
      : [
          {
            id: 'RESP_SHAPE',
            label: 'Reponse exploitable',
            status: 'fail',
            detail: networkError ?? 'Service injoignable',
            blocking: true,
          },
        ]),
  ];

  const result = verdict(checks);
  const route = payload?.routes?.[0] ?? null;

  return {
    protocol: 'J2.3 — preuve d integration OSRM reelle',
    generatedAt: generatedAt.toISOString(),
    endpoint,
    request: { from: 'Yopougon', to: 'Plateau', ...REQUEST },
    verdict: result.verdict,
    verdictReason: result.reason,
    sections: {
      infrastructure: checks.filter((c) => c.id.startsWith('INFRA_')),
      graphe: checks.filter((c) => c.id.startsWith('GRAPH_')),
      reponseFonctionnelle: checks.filter(
        (c) => c.id.startsWith('RESP_') || c.id.startsWith('COHERENCE_'),
      ),
      mesures: checks.filter((c) => c.id.startsWith('MEASURES_')),
    },
    performance: {
      routeLatencyMs: latencyMs,
      prepareDurationSeconds: facts.prepareDurationSeconds ?? null,
      loadDurationSeconds: facts.loadDurationSeconds ?? null,
      residentMemoryBytes: facts.residentMemoryBytes ?? null,
      graphSizeBytes: facts.graphSizeBytes ?? null,
    },
    artefacts: {
      osmExtractUrl: facts.osmExtractUrl ?? null,
      osmExtractSha256: facts.osmExtractSha256 ?? null,
      osmExtractBytes: facts.osmExtractBytes ?? null,
      osrmImage: facts.osrmImage ?? null,
      osrmAlgorithm: facts.osrmAlgorithm ?? null,
      dockerVersion: facts.dockerVersion ?? null,
    },
    observed: route
      ? {
          distanceMeters: route.distance ?? null,
          durationSeconds: route.duration ?? null,
          geometryLength: typeof route.geometry === 'string' ? route.geometry.length : 0,
        }
      : null,
    checks,
  };
}

const ICON = { pass: '[OK]  ', fail: '[FAIL]', inconclusive: '[????]' };

/** Rendu lisible du rapport. */
export function renderReport(report) {
  const lines = [];
  lines.push(`# RAPPORT J2.3 — PREUVE D'INTEGRATION OSRM`, '');
  lines.push(`Genere le : ${report.generatedAt}`);
  lines.push(`Endpoint  : ${report.endpoint}`);
  lines.push(`Requete   : Yopougon -> Plateau`, '');
  lines.push(`## VERDICT : ${report.verdict}`, '', report.verdictReason, '');

  for (const [title, items] of [
    ['1. Preuve d infrastructure', report.sections.infrastructure],
    ['2. Preuve de chargement du graphe', report.sections.graphe],
    ['3. Preuve de reponse fonctionnelle', report.sections.reponseFonctionnelle],
    ['4. Mesures de performance', report.sections.mesures],
  ]) {
    lines.push(`## ${title}`, '');
    if (items.length === 0) lines.push('  (aucun controle)');
    for (const c of items) {
      lines.push(`  ${ICON[c.status]} ${c.id.padEnd(20)} ${c.label}`, `         ${c.detail}`);
    }
    lines.push('');
  }

  lines.push('## 5. Mesures relevees', '');
  for (const [k, v] of Object.entries(report.performance)) {
    lines.push(`  ${k.padEnd(28)} ${v ?? 'non mesure'}`);
  }
  lines.push('', '## 6. Artefacts et empreintes', '');
  for (const [k, v] of Object.entries(report.artefacts)) {
    lines.push(`  ${k.padEnd(28)} ${v ?? 'non renseigne'}`);
  }
  lines.push('', '## 7. Portee de cette preuve', '');
  lines.push('  Ce rapport ne vaut que pour l instance interrogee, a la date indiquee,');
  lines.push('  avec l extrait OSM dont l empreinte figure ci-dessus.');
  lines.push('  Il ne valide AUCUNE grille tarifaire : les hypotheses UNVALIDATED restent actives.');
  lines.push('');
  return lines.join('\n');
}
