import { describe, it, expect } from 'vitest';
// @ts-expect-error module JavaScript pur, partagé avec les scripts Node
import {
  checkRouteResponse,
  checkEnvironment,
  verdict,
  haversineMeters,
  YOPOUGON,
  PLATEAU,
  PLAUSIBILITY,
  // @ts-expect-error idem
} from '../../scripts/j2.3/lib/verdict.mjs';

/**
 * Le protocole J2.3 ne peut pas être exécuté ici : ni Docker, ni accès OSM.
 * Ce qui PEUT être prouvé, c'est qu'il échoue honnêtement — qu'aucune réponse
 * incomplète, simulée ou incohérente ne produit un PASS.
 *
 * Un protocole de preuve qu'on n'a jamais vu échouer ne prouve rien.
 */

const REQUEST = { origin: YOPOUGON, destination: PLATEAU };

/** Environnement nominal : tous les faits attendus sont présents. */
const HEALTHY_FACTS = {
  dockerVersion: 'Docker version 27.0.0',
  endpoint: 'http://localhost:5000',
  serviceReached: true,
  httpStatus: 200,
  graphSizeBytes: 250_000_000,
  osmExtractSha256: 'a'.repeat(64),
  prepareDurationSeconds: 420,
  loadDurationSeconds: 12,
  residentMemoryBytes: 1_500_000_000,
};

/** Réponse nominale plausible pour Yopougon → Plateau. */
function healthyResponse() {
  const crowFlies = haversineMeters(YOPOUGON, PLATEAU);
  return {
    code: 'Ok',
    routes: [
      {
        distance: crowFlies * 1.6,
        duration: 1_500,
        geometry: 'yzq@|xnJdAaGvB{HrCgJ|@_DfBqGvCkJ|@_DrCgJ',
      },
    ],
    waypoints: [
      { location: [YOPOUGON.lng, YOPOUGON.lat] },
      { location: [PLATEAU.lng, PLATEAU.lat] },
    ],
  };
}

function fullVerdict(payload: unknown, facts = HEALTHY_FACTS) {
  return verdict([...checkEnvironment(facts), ...checkRouteResponse(payload, REQUEST)]);
}

// =============================================================================
describe('cas nominal — le protocole sait aussi conclure PASS', () => {
  it('accorde PASS sur un environnement et une réponse complets', () => {
    expect(fullVerdict(healthyResponse()).verdict).toBe('PASS');
  });
});

// =============================================================================
describe('échecs honnêtes — aucun PASS sur une preuve incomplète', () => {
  it('géométrie absente → FAIL', () => {
    const payload = healthyResponse();
    delete (payload.routes[0] as Record<string, unknown>)['geometry'];
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('FAIL');
    expect(result.reason).toContain('RESP_GEOMETRY');
  });

  it('géométrie vide → FAIL', () => {
    const payload = healthyResponse();
    payload.routes[0].geometry = '';
    expect(fullVerdict(payload).verdict).toBe('FAIL');
  });

  it('code NoRoute → FAIL', () => {
    expect(fullVerdict({ code: 'NoRoute' }).verdict).toBe('FAIL');
  });

  it('coordonnées hors graphe — accrochage trop lointain → FAIL', () => {
    const payload = healthyResponse();
    // Point accroché à ~30 km : OSRM répond, mais pour un autre endroit.
    payload.waypoints[0] = { location: [-4.35, 5.35] };
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('FAIL');
    expect(result.reason).toContain('GRAPH_SNAP');
  });

  it('service non interrogé → FAIL', () => {
    const result = fullVerdict(healthyResponse(), {
      ...HEALTHY_FACTS,
      serviceReached: false,
    });
    expect(result.verdict).toBe('FAIL');
    expect(result.reason).toContain('INFRA_LIVE');
  });

  it('Docker absent → FAIL', () => {
    const result = fullVerdict(healthyResponse(), { ...HEALTHY_FACTS, dockerVersion: null });
    expect(result.verdict).toBe('FAIL');
    expect(result.reason).toContain('INFRA_DOCKER');
  });

  it('réponse Ok sans itinéraire → FAIL', () => {
    expect(fullVerdict({ code: 'Ok', routes: [] }).verdict).toBe('FAIL');
  });

  it('distance non numérique → FAIL', () => {
    const payload = healthyResponse();
    (payload.routes[0] as Record<string, unknown>)['distance'] = 'onze kilomètres';
    expect(fullVerdict(payload).verdict).toBe('FAIL');
  });

  it('durée nulle → FAIL', () => {
    const payload = healthyResponse();
    payload.routes[0].duration = 0;
    expect(fullVerdict(payload).verdict).toBe('FAIL');
  });

  it('corps absent → FAIL', () => {
    expect(fullVerdict(null).verdict).toBe('FAIL');
  });
});

// =============================================================================
describe('anti-simulation — une fixture ne peut pas produire une preuve', () => {
  it.each([
    'http://localhost:5000/__fixture',
    'https://services.exemple.test/routing',
    'http://mock-osrm.local',
    'http://stub.internal/route',
  ])('rejette un endpoint évoquant une simulation : %s', (endpoint) => {
    const result = fullVerdict(healthyResponse(), { ...HEALTHY_FACTS, endpoint });
    expect(result.verdict).toBe('FAIL');
    expect(result.reason).toContain('INFRA_NOT_SIMULATED');
  });

  it('accepte un endpoint réel', () => {
    const result = fullVerdict(healthyResponse(), {
      ...HEALTHY_FACTS,
      endpoint: 'http://10.0.3.14:5000',
    });
    expect(result.verdict).toBe('PASS');
  });
});

// =============================================================================
describe('mesures manquantes — INCONCLUSIVE, jamais PASS', () => {
  it.each(['prepareDurationSeconds', 'loadDurationSeconds', 'residentMemoryBytes'])(
    'mesure absente (%s) → INCONCLUSIVE',
    (key) => {
      const result = fullVerdict(healthyResponse(), { ...HEALTHY_FACTS, [key]: null });
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.reason).toContain('MEASURES_PRESENT');
    },
  );

  it('empreinte de l’extrait manquante → INCONCLUSIVE', () => {
    const result = fullVerdict(healthyResponse(), { ...HEALTHY_FACTS, osmExtractSha256: null });
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('GRAPH_BUILT');
  });

  it('waypoints absents → INCONCLUSIVE, on ne peut pas vérifier le graphe', () => {
    const payload = healthyResponse();
    delete (payload as Record<string, unknown>)['waypoints'];
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('GRAPH_SNAP');
  });
});

// =============================================================================
describe('cohérence — une aberration ne vaut pas un échec, mais interdit le PASS', () => {
  it('détour invraisemblable → INCONCLUSIVE', () => {
    const payload = healthyResponse();
    payload.routes[0].distance = haversineMeters(YOPOUGON, PLATEAU) * 20;
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('COHERENCE_DETOUR');
  });

  it('vitesse moyenne invraisemblable → INCONCLUSIVE', () => {
    const payload = healthyResponse();
    payload.routes[0].duration = 30; // ~1 100 km/h
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('COHERENCE_SPEED');
  });

  it('une distance inférieure au vol d’oiseau est physiquement impossible', () => {
    const payload = healthyResponse();
    payload.routes[0].distance = haversineMeters(YOPOUGON, PLATEAU) * 0.5;
    expect(fullVerdict(payload).verdict).toBe('INCONCLUSIVE');
  });

  it('géométrie trop courte pour être crédible → INCONCLUSIVE', () => {
    const payload = healthyResponse();
    payload.routes[0].geometry = 'ab';
    const result = fullVerdict(payload);
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('RESP_GEOMETRY');
  });
});

// =============================================================================
describe('logique de verdict', () => {
  it('un échec prime sur un contrôle non concluant', () => {
    const result = verdict([
      { id: 'A', label: 'a', status: 'fail', detail: '', blocking: true },
      { id: 'B', label: 'b', status: 'inconclusive', detail: '', blocking: true },
    ]);
    expect(result.verdict).toBe('FAIL');
  });

  it('sans aucun contrôle bloquant, on ne conclut pas', () => {
    expect(verdict([]).verdict).toBe('INCONCLUSIVE');
    expect(
      verdict([{ id: 'A', label: 'a', status: 'pass', detail: '', blocking: false }]).verdict,
    ).toBe('INCONCLUSIVE');
  });

  it('le verdict nomme les contrôles fautifs', () => {
    const result = verdict([
      { id: 'RESP_GEOMETRY', label: 'g', status: 'fail', detail: '', blocking: true },
    ]);
    expect(result.reason).toContain('RESP_GEOMETRY');
  });
});

// =============================================================================
describe('haversine — base des contrôles de cohérence', () => {
  it('donne zéro pour deux points identiques', () => {
    expect(haversineMeters(YOPOUGON, YOPOUGON)).toBeCloseTo(0, 3);
  });

  it('est symétrique', () => {
    expect(haversineMeters(YOPOUGON, PLATEAU)).toBeCloseTo(haversineMeters(PLATEAU, YOPOUGON), 6);
  });

  it('donne un ordre de grandeur cohérent entre Yopougon et le Plateau', () => {
    const d = haversineMeters(YOPOUGON, PLATEAU);
    expect(d).toBeGreaterThan(3_000);
    expect(d).toBeLessThan(15_000);
  });

  it('expose des bornes de plausibilité larges, non des valeurs attendues', () => {
    expect(PLAUSIBILITY.detourRatioMax / PLAUSIBILITY.detourRatioMin).toBeGreaterThanOrEqual(4);
    expect(
      PLAUSIBILITY.averageSpeedMaxKmh / PLAUSIBILITY.averageSpeedMinKmh,
    ).toBeGreaterThanOrEqual(8);
  });
});

// =============================================================================
// @ts-expect-error module JavaScript pur
import { buildReport, renderReport, routeUrl } from '../../scripts/j2.3/lib/report.mjs';

describe('rapport — structure et rendu', () => {
  const base = {
    facts: HEALTHY_FACTS,
    endpoint: 'http://10.0.3.14:5000',
    reached: true,
    httpStatus: 200,
    latencyMs: 42,
    networkError: null,
    generatedAt: new Date('2026-08-01T12:00:00Z'),
  };

  it("l'URL interroge bien Yopougon puis le Plateau, en longitude,latitude", () => {
    const url = routeUrl('http://x:5000');
    expect(url).toContain(`${YOPOUGON.lng},${YOPOUGON.lat};${PLATEAU.lng},${PLATEAU.lat}`);
    expect(url).toContain('overview=full');
  });

  it('produit les quatre sections attendues', () => {
    const report = buildReport({ ...base, payload: healthyResponse() });
    expect(Object.keys(report.sections)).toEqual([
      'infrastructure',
      'graphe',
      'reponseFonctionnelle',
      'mesures',
    ]);
    for (const section of Object.values(report.sections)) {
      expect((section as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('expose artefacts, empreintes et mesures', () => {
    const report = buildReport({ ...base, payload: healthyResponse() });
    expect(report.artefacts.osmExtractSha256).toHaveLength(64);
    expect(report.performance.prepareDurationSeconds).toBe(420);
    expect(report.performance.routeLatencyMs).toBe(42);
    expect(report.observed.distanceMeters).toBeGreaterThan(0);
  });

  it('conclut PASS sur un cas nominal complet', () => {
    expect(buildReport({ ...base, payload: healthyResponse() }).verdict).toBe('PASS');
  });

  it('service injoignable → FAIL, sans observation', () => {
    const report = buildReport({
      ...base,
      payload: null,
      reached: false,
      networkError: 'ECONNREFUSED',
    });
    expect(report.verdict).toBe('FAIL');
    expect(report.observed).toBeNull();
    expect(report.checks.find((c: { id: string }) => c.id === 'RESP_SHAPE').detail).toContain(
      'ECONNREFUSED',
    );
  });

  it('le rendu affiche le verdict et rappelle la portée de la preuve', () => {
    const rendered = renderReport(buildReport({ ...base, payload: healthyResponse() }));
    expect(rendered).toContain('## VERDICT : PASS');
    expect(rendered).toContain('1. Preuve d infrastructure');
    expect(rendered).toContain('2. Preuve de chargement du graphe');
    expect(rendered).toContain('3. Preuve de reponse fonctionnelle');
    expect(rendered).toContain('Il ne valide AUCUNE grille tarifaire');
  });

  it('le rendu marque visuellement chaque échec', () => {
    const payload = healthyResponse();
    payload.routes[0].geometry = '';
    const rendered = renderReport(buildReport({ ...base, payload }));
    expect(rendered).toContain('## VERDICT : FAIL');
    expect(rendered).toContain('[FAIL]');
  });
});
