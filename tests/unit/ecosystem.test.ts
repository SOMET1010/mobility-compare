import { describe, expect, it } from 'vitest';
import { estimateTraffic, weatherLabel } from '@/demo/ecosystem';
import { answer, findCommunes, normalize } from '@/demo/assistant';

const at = (h: number, m = 0) => new Date(2026, 7, 15, h, m, 0);

describe('écosystème — trafic (profil horaire type, déterministe)', () => {
  it('sature les pointes du matin et du soir', () => {
    expect(estimateTraffic(at(7, 30)).level).toBe('SATURE');
    expect(estimateTraffic(at(18, 0)).level).toBe('SATURE');
  });

  it('est fluide la nuit', () => {
    expect(estimateTraffic(at(2, 0)).level).toBe('FLUIDE');
    expect(estimateTraffic(at(23, 0)).level).toBe('FLUIDE');
  });

  it('est dense entre les pointes', () => {
    expect(estimateTraffic(at(10, 30)).level).toBe('DENSE');
    expect(estimateTraffic(at(21, 0)).level).toBe('DENSE');
  });

  it('borne les fenêtres au bon endroit (6h29 vs 6h30, 20h00 vs 19h59)', () => {
    expect(estimateTraffic(at(6, 29)).level).toBe('DENSE');
    expect(estimateTraffic(at(6, 30)).level).toBe('SATURE');
    expect(estimateTraffic(at(19, 59)).level).toBe('SATURE');
    expect(estimateTraffic(at(20, 0)).level).toBe('DENSE');
  });

  it('trace toujours la fenêtre horaire qui justifie le niveau', () => {
    expect(estimateTraffic(at(7, 0)).window).toContain('6h30');
  });
});

describe('écosystème — météo (libellés WMO)', () => {
  it('traduit les codes courants', () => {
    expect(weatherLabel(0)).toBe('Ciel dégagé');
    expect(weatherLabel(3)).toBe('Couvert');
    expect(weatherLabel(61)).toBe('Pluie');
    expect(weatherLabel(95)).toBe('Orage');
  });

  it("reste honnête sur un code inconnu — pas d'invention", () => {
    expect(weatherLabel(42)).toBe('Conditions inconnues');
  });
});

describe('assistant guidé — détection de communes', () => {
  it('normalise accents et ponctuation', () => {
    expect(normalize('Attécoubé, s’il vous plaît !')).toBe('attecoube s il vous plait');
  });

  it('détecte deux communes dans leur ordre d’apparition', () => {
    expect(findCommunes('je vais de Yopougon au Plateau')).toEqual(['yopougon', 'plateau']);
  });

  it('comprend les alias (aéroport, port bouet)', () => {
    expect(findCommunes('de Cocody à l’aéroport')).toEqual(['cocody', 'aeroport']);
  });

  it('ignore les mots qui ne sont pas des communes', () => {
    expect(findCommunes('bonjour comment ça va')).toEqual([]);
  });
});

describe('assistant guidé — intentions', () => {
  it('propose la comparaison quand deux communes sont citées', () => {
    const r = answer('Combien de Cocody à Plateau ?');
    expect(r.intent).toBe('trip');
    expect(r.actions?.[0]?.to).toBe('/comparer?de=cocody&a=plateau&tri=PRICE_TIME');
  });

  it('répond sur la neutralité', () => {
    expect(answer('le classement est-il neutre ?').intent).toBe('neutrality');
  });

  it('répond sur les modes', () => {
    expect(answer('c’est quoi un gbaka').intent).toBe('modes');
  });

  it('répond sur le trafic et la météo', () => {
    expect(answer('il y a des embouteillages ?').intent).toBe('traffic');
    expect(answer('quel temps fait-il, pluie ?').intent).toBe('weather');
  });

  it('offre une aide par défaut plutôt que d’inventer', () => {
    const r = answer('xyzzy');
    expect(r.intent).toBe('help');
    expect(r.actions?.length).toBeGreaterThan(0);
  });
});
