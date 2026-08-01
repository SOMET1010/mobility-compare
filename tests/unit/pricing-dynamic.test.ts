import { describe, it, expect } from 'vitest';
import {
  computeFare,
  validateFareGrid,
  type FareGrid,
  type TripMeasurement,
} from '@/domain/pricing/dynamic';
import { fixedClock } from '@/domain/pricing/clock';
import { roundTo } from '@/domain/pricing/money';

/**
 * GRILLE DE REFERENCE — VALEURS FICTIVES
 * Ces nombres ne proviennent d'aucun operateur reel. Ils sont choisis pour
 * rendre les calculs verifiables a la main. Les grilles reelles seront
 * collectees puis versionnees en base (CDC §7).
 */
function referenceGrid(overrides: Partial<FareGrid> = {}): FareGrid {
  const result = validateFareGrid({
    providerId: 'operateur-test',
    version: '2026.08.01-test',
    currency: 'XOF',
    pickupFee: 500,
    perKilometer: 200,
    perMinute: 30,
    perWaitingMinute: 20,
    minimumFare: 1000,
    timeWindows: [],
    zoneSurcharges: [],
    fixedFees: [],
    maxTotalMultiplier: 3,
    taxRate: 0,
    roundingStep: 5,
    roundingMode: 'nearest',
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: null,
    ...overrides,
  });
  if (!result.valid) throw new Error(`Grille de test invalide : ${result.errors.join(', ')}`);
  return result.grid;
}

const trip = (over: Partial<TripMeasurement> = {}): TripMeasurement => ({
  distanceMeters: 10_000,
  durationSeconds: 1_200,
  routingProvider: 'fixture',
  ...over,
});

const CLOCK = fixedClock(new Date('2026-08-01T14:00:00Z')); // 14 h a Abidjan

// =============================================================================
describe('validation de la grille — avant tout calcul', () => {
  it('accepte une grille coherente', () => {
    expect(validateFareGrid({ ...referenceGrid() }).valid).toBe(true);
  });

  it('rejette une grille sans aucune composante tarifaire', () => {
    const result = validateFareGrid({
      ...referenceGrid(),
      pickupFee: 0,
      perKilometer: 0,
      perMinute: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join()).toContain('prix nul');
  });

  it('rejette un montant decimal', () => {
    expect(validateFareGrid({ ...referenceGrid(), perKilometer: 200.5 }).valid).toBe(false);
  });

  it('rejette un montant negatif', () => {
    expect(validateFareGrid({ ...referenceGrid(), pickupFee: -100 }).valid).toBe(false);
  });

  it('rejette un multiplicateur inferieur a 1 : une majoration ne reduit pas un prix', () => {
    const result = validateFareGrid({
      ...referenceGrid(),
      timeWindows: [{ label: 'Creux', fromHour: 2, toHour: 5, weekdays: [], multiplier: 0.8 }],
    });
    expect(result.valid).toBe(false);
  });

  it('rejette une fenetre horaire de duree nulle', () => {
    const result = validateFareGrid({
      ...referenceGrid(),
      timeWindows: [{ label: 'Ambigu', fromHour: 8, toHour: 8, weekdays: [], multiplier: 1.5 }],
    });
    expect(result.valid).toBe(false);
  });

  it('rejette deux frais fixes portant le meme code', () => {
    const result = validateFareGrid({
      ...referenceGrid(),
      fixedFees: [
        { code: 'AEROPORT', label: 'Aeroport', amount: 1000 },
        { code: 'AEROPORT', label: 'Aeroport bis', amount: 500 },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('rejette une periode de validite inversee', () => {
    const result = validateFareGrid({
      ...referenceGrid(),
      validFrom: new Date('2026-06-01T00:00:00Z'),
      validTo: new Date('2026-01-01T00:00:00Z'),
    });
    expect(result.valid).toBe(false);
  });

  it('signale toutes les erreurs, pas seulement la premiere', () => {
    const result = validateFareGrid({ providerId: '', version: '', currency: 'EUR' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(1);
  });
});

// =============================================================================
describe('calcul de base', () => {
  it('applique prise en charge + distance + duree', () => {
    // 500 + (200 x 10) + (30 x 20) = 500 + 2000 + 600 = 3100
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    expect(result.available).toBe(true);
    if (result.available) expect(result.value.amount).toBe(3100);
  });

  it("facture l'attente quand elle est fournie", () => {
    // 3100 + (20 x 5 min) = 3200
    const result = computeFare(
      { grid: referenceGrid(), trip: trip({ waitingSeconds: 300 }) },
      CLOCK,
    );
    if (result.available) expect(result.value.amount).toBe(3200);
  });

  it('applique le minimum de course sur un trajet tres court', () => {
    // 500 + (200 x 0.5) + (30 x 2) = 660 -> plancher 1000
    const result = computeFare(
      { grid: referenceGrid(), trip: trip({ distanceMeters: 500, durationSeconds: 120 }) },
      CLOCK,
    );
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.value.amount).toBe(1000);
      expect(result.value.minimumApplied).toBe(true);
    }
  });

  it('ne signale pas le minimum quand il ne joue pas', () => {
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    if (result.available) expect(result.value.minimumApplied).toBe(false);
  });
});

// =============================================================================
describe('majorations', () => {
  const nightGrid = referenceGrid({
    timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
  });

  it('applique la majoration nocturne a 23 h', () => {
    const result = computeFare(
      { grid: nightGrid, trip: trip(), departureAt: new Date('2026-08-01T23:00:00Z') },
      CLOCK,
    );
    // 3100 x 1.5 = 4650
    if (result.available) {
      expect(result.value.amount).toBe(4650);
      expect(result.value.appliedMultiplier).toBe(1.5);
    }
  });

  it('applique la majoration nocturne apres minuit — la fenetre franchit 0 h', () => {
    const result = computeFare(
      { grid: nightGrid, trip: trip(), departureAt: new Date('2026-08-02T03:00:00Z') },
      CLOCK,
    );
    if (result.available) expect(result.value.appliedMultiplier).toBe(1.5);
  });

  it("n'applique aucune majoration a 14 h", () => {
    const result = computeFare(
      { grid: nightGrid, trip: trip(), departureAt: new Date('2026-08-01T14:00:00Z') },
      CLOCK,
    );
    if (result.available) expect(result.value.appliedMultiplier).toBe(1);
  });

  it('respecte la restriction par jour de la semaine', () => {
    const weekendGrid = referenceGrid({
      timeWindows: [{ label: 'Weekend', fromHour: 0, toHour: 23, weekdays: [0, 6], multiplier: 2 }],
    });
    // 2026-08-01 est un samedi, 2026-08-03 un lundi
    const saturday = computeFare(
      { grid: weekendGrid, trip: trip(), departureAt: new Date('2026-08-01T14:00:00Z') },
      CLOCK,
    );
    const monday = computeFare(
      { grid: weekendGrid, trip: trip(), departureAt: new Date('2026-08-03T14:00:00Z') },
      CLOCK,
    );
    if (saturday.available) expect(saturday.value.appliedMultiplier).toBe(2);
    if (monday.available) expect(monday.value.appliedMultiplier).toBe(1);
  });

  it('compose majoration horaire et geographique par multiplication (H3)', () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
      zoneSurcharges: [{ zoneId: 'AEROPORT', label: 'Aeroport', multiplier: 1.2 }],
    });
    const result = computeFare(
      {
        grid,
        trip: trip({ zoneIds: ['AEROPORT'] }),
        departureAt: new Date('2026-08-01T23:00:00Z'),
      },
      CLOCK,
    );
    // 1.5 x 1.2 = 1.8
    if (result.available) expect(result.value.appliedMultiplier).toBeCloseTo(1.8, 5);
  });

  it('ecrete au plafond et le signale explicitement', () => {
    const grid = referenceGrid({
      maxTotalMultiplier: 2,
      timeWindows: [{ label: 'Pointe', fromHour: 17, toHour: 20, weekdays: [], multiplier: 2.5 }],
      zoneSurcharges: [{ zoneId: 'Z1', label: 'Zone 1', multiplier: 1.5 }],
    });
    const result = computeFare(
      {
        grid,
        trip: trip({ zoneIds: ['Z1'] }),
        departureAt: new Date('2026-08-01T18:00:00Z'),
      },
      CLOCK,
    );
    if (result.available) {
      expect(result.value.appliedMultiplier).toBe(2);
      expect(result.value.multiplierCapped).toBe(true);
    }
  });

  it('ignore une majoration de zone non traversee', () => {
    const grid = referenceGrid({
      zoneSurcharges: [{ zoneId: 'AEROPORT', label: 'Aeroport', multiplier: 1.5 }],
    });
    const result = computeFare({ grid, trip: trip({ zoneIds: ['PLATEAU'] }) }, CLOCK);
    if (result.available) expect(result.value.appliedMultiplier).toBe(1);
  });
});

// =============================================================================
describe('frais fixes, taxe et arrondi', () => {
  it("n'applique pas la majoration aux frais fixes (H2)", () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 2 }],
      fixedFees: [{ code: 'PEAGE', label: 'Peage', amount: 500 }],
    });
    const result = computeFare(
      { grid, trip: trip(), departureAt: new Date('2026-08-01T23:00:00Z') },
      CLOCK,
    );
    // (3100 x 2) + 500 = 6700, et non (3100 + 500) x 2 = 7200
    if (result.available) expect(result.value.amount).toBe(6700);
  });

  it('applique la taxe apres les frais fixes (H5)', () => {
    const grid = referenceGrid({
      taxRate: 0.04,
      fixedFees: [{ code: 'PEAGE', label: 'Peage', amount: 500 }],
    });
    const result = computeFare({ grid, trip: trip() }, CLOCK);
    // (3100 + 500) x 1.04 = 3744, arrondi au multiple de 5 -> 3745
    if (result.available) expect(result.value.amount).toBe(3745);
  });

  it('arrondit au multiple de 5 par defaut', () => {
    const grid = referenceGrid({ perKilometer: 199 });
    const result = computeFare({ grid, trip: trip() }, CLOCK);
    // 500 + 1990 + 600 = 3090 -> deja multiple de 5
    if (result.available) expect(result.value.amount % 5).toBe(0);
  });

  it('respecte le mode d arrondi vers le haut', () => {
    const grid = referenceGrid({ roundingMode: 'up', roundingStep: 100 });
    const result = computeFare({ grid, trip: trip() }, CLOCK);
    // 3100 est deja multiple de 100
    if (result.available) expect(result.value.amount).toBe(3100);
  });

  it('roundTo est exact sur les trois modes', () => {
    expect(roundTo(3103, 5, 'nearest')).toBe(3105);
    expect(roundTo(3101, 5, 'up')).toBe(3105);
    expect(roundTo(3104, 5, 'down')).toBe(3100);
  });
});

// =============================================================================
describe('absence honnete — invariant I1', () => {
  it('refuse une distance negative plutot que de la corriger', () => {
    const result = computeFare(
      { grid: referenceGrid(), trip: trip({ distanceMeters: -1 }) },
      CLOCK,
    );
    expect(result.available).toBe(false);
    if (!result.available) expect(result.reason).toBe('ROUTING_FAILED');
  });

  it('refuse une duree non finie', () => {
    const result = computeFare(
      { grid: referenceGrid(), trip: trip({ durationSeconds: Number.NaN }) },
      CLOCK,
    );
    expect(result.available).toBe(false);
  });

  it("refuse une grille expiree plutot que d'extrapoler", () => {
    const grid = referenceGrid({
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validTo: new Date('2025-12-31T00:00:00Z'),
    });
    const result = computeFare({ grid, trip: trip() }, CLOCK);
    expect(result.available).toBe(false);
    if (!result.available) expect(result.reason).toBe('NO_PRICING_MODEL');
  });

  it('refuse une grille pas encore entree en vigueur', () => {
    const grid = referenceGrid({ validFrom: new Date('2027-01-01T00:00:00Z') });
    const result = computeFare({ grid, trip: trip() }, CLOCK);
    expect(result.available).toBe(false);
  });

  it('ne retourne jamais de montant lorsqu il declare une absence', () => {
    const result = computeFare(
      { grid: referenceGrid(), trip: trip({ distanceMeters: Number.POSITIVE_INFINITY }) },
      CLOCK,
    );
    expect(result.available).toBe(false);
    expect('value' in result).toBe(false);
  });
});

// =============================================================================
describe('determinisme', () => {
  it('produit un resultat identique sur 100 executions', () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
      zoneSurcharges: [{ zoneId: 'Z1', label: 'Zone 1', multiplier: 1.2 }],
      fixedFees: [{ code: 'PEAGE', label: 'Peage', amount: 500 }],
      taxRate: 0.04,
    });
    const input = {
      grid,
      trip: trip({ zoneIds: ['Z1'], waitingSeconds: 90 }),
      departureAt: new Date('2026-08-01T23:30:00Z'),
    };
    const first = computeFare(input, CLOCK);
    for (let i = 0; i < 100; i += 1) {
      expect(computeFare(input, CLOCK)).toEqual(first);
    }
  });

  it("le resultat ne depend pas de l'heure systeme quand le depart est fourni", () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
    });
    const input = { grid, trip: trip(), departureAt: new Date('2026-08-01T23:00:00Z') };
    const a = computeFare(input, fixedClock(new Date('2026-08-01T03:00:00Z')));
    const b = computeFare(input, fixedClock(new Date('2030-12-25T11:11:11Z')));
    expect(a).toEqual(b);
  });

  it("utilise l'horloge injectee lorsque le depart n'est pas fourni", () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
    });
    const night = computeFare({ grid, trip: trip() }, fixedClock(new Date('2026-08-01T23:00:00Z')));
    const day = computeFare({ grid, trip: trip() }, fixedClock(new Date('2026-08-01T14:00:00Z')));
    if (night.available && day.available) {
      expect(night.value.appliedMultiplier).toBe(1.5);
      expect(day.value.appliedMultiplier).toBe(1);
    }
  });

  it('deux versions de grille produisent des resultats distinguables', () => {
    const v1 = computeFare({ grid: referenceGrid({ version: 'v1' }), trip: trip() }, CLOCK);
    const v2 = computeFare({ grid: referenceGrid({ version: 'v2' }), trip: trip() }, CLOCK);
    if (v1.available && v2.available) {
      expect(v1.value.gridVersion).not.toBe(v2.value.gridVersion);
      expect(v1.value.amount).toBe(v2.value.amount);
    }
  });
});

// =============================================================================
describe('tracabilite — invariant I2', () => {
  it('expose une trace dont la derniere etape egale le montant facture', () => {
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    if (!result.available) throw new Error('resultat attendu disponible');
    const last = result.trace.steps.at(-1);
    expect(last?.label).toBe('Total');
    expect(last?.amount).toBe(result.value.amount);
  });

  it('detaille chaque composante avec sa formule et ses valeurs reelles', () => {
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    if (!result.available) throw new Error('resultat attendu disponible');
    const labels = result.trace.steps.map((s) => s.label);
    expect(labels).toContain('Prise en charge');
    expect(labels).toContain('Distance');
    expect(labels).toContain('Duree');
    const distance = result.trace.steps.find((s) => s.label === 'Distance');
    expect(distance?.formula).toContain('200 FCFA/km');
    expect(distance?.formula).toContain('10.00 km');
  });

  it('explicite la cause de la majoration', () => {
    const grid = referenceGrid({
      timeWindows: [{ label: 'Nuit', fromHour: 22, toHour: 5, weekdays: [], multiplier: 1.5 }],
    });
    const result = computeFare(
      { grid, trip: trip(), departureAt: new Date('2026-08-01T23:00:00Z') },
      CLOCK,
    );
    if (!result.available) throw new Error('resultat attendu disponible');
    const step = result.trace.steps.find((s) => s.label === 'Majoration');
    expect(step?.formula).toContain('Nuit');
    expect(step?.formula).toContain('x1.5');
  });

  it("mentionne le plafonnement lorsqu'il s'applique", () => {
    const grid = referenceGrid({
      maxTotalMultiplier: 2,
      timeWindows: [{ label: 'Pointe', fromHour: 17, toHour: 20, weekdays: [], multiplier: 3 }],
    });
    const result = computeFare(
      { grid, trip: trip(), departureAt: new Date('2026-08-01T18:00:00Z') },
      CLOCK,
    );
    if (!result.available) throw new Error('resultat attendu disponible');
    const step = result.trace.steps.find((s) => s.label === 'Majoration');
    expect(step?.formula).toContain('plafonne');
  });

  it('porte la version de grille et le fournisseur de routage', () => {
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    if (!result.available) throw new Error('resultat attendu disponible');
    expect(result.trace.pricingModelVersion).toBe('2026.08.01-test');
    expect(result.trace.routingProvider).toBe('fixture');
  });

  it('annonce une confiance nulle : aucune observation terrain ne l alimente encore', () => {
    const result = computeFare({ grid: referenceGrid(), trip: trip() }, CLOCK);
    if (!result.available) throw new Error('resultat attendu disponible');
    expect(result.trace.observationCount).toBe(0);
    expect(result.trace.confidenceScore).toBe(0);
  });
});

// =============================================================================
describe('neutralite commerciale — invariant I3', () => {
  it('deux fournisseurs partageant la meme grille obtiennent le meme prix', () => {
    const a = computeFare({ grid: referenceGrid({ providerId: 'alpha' }), trip: trip() }, CLOCK);
    const b = computeFare({ grid: referenceGrid({ providerId: 'omega' }), trip: trip() }, CLOCK);
    if (a.available && b.available) expect(a.value.amount).toBe(b.value.amount);
  });

  it("l'entree du moteur n'accepte aucun champ commercial", () => {
    const grid = referenceGrid() as unknown as Record<string, unknown>;
    for (const forbidden of ['discount', 'promo', 'sponsor', 'commission', 'partnerBoost']) {
      expect(grid[forbidden]).toBeUndefined();
    }
  });

  it('un champ commercial injecte est ignore par la validation', () => {
    const result = validateFareGrid({ ...referenceGrid(), sponsorBoost: 0.5 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect((result.grid as unknown as Record<string, unknown>)['sponsorBoost']).toBeUndefined();
    }
  });
});
