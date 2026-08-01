/**
 * CLASSEMENT NATUREL — MOTEUR
 * Domaine pur. Aucun acces reseau, aucune base, aucun levier commercial.
 */

import type {
  Badge,
  ExcludedOption,
  RankableOption,
  RankedOption,
  RankingOptions,
  RankingResult,
} from './types';

/** Duree totale percue : trajet plus attente eventuelle. */
function totalSeconds(option: RankableOption, includeWait: boolean): number | null {
  if (option.durationSeconds === null) return null;
  if (!includeWait) return option.durationSeconds;
  return option.durationSeconds + (option.waitSeconds ?? 0);
}

/** Filtre les options exploitables et motive chaque exclusion. */
function partition(
  options: readonly RankableOption[],
  criterion: RankingOptions['criterion'],
  minimumConfidence: number,
  includeWait: boolean,
): { eligible: RankableOption[]; excluded: ExcludedOption[] } {
  const eligible: RankableOption[] = [];
  const excluded: ExcludedOption[] = [];

  for (const option of options) {
    const needsPrice = criterion === 'PRICE' || criterion === 'PRICE_TIME';
    const needsDuration = criterion === 'DURATION' || criterion === 'PRICE_TIME';

    if (needsPrice && !option.fare.available) {
      excluded.push({
        option,
        reason: 'NO_FARE',
        explanation: "Prix indisponible : cette option n'est pas comparable sur ce critere",
      });
      continue;
    }
    if (needsDuration && totalSeconds(option, includeWait) === null) {
      excluded.push({
        option,
        reason: 'NO_DURATION',
        explanation: "Duree indisponible : cette option n'est pas comparable sur ce critere",
      });
      continue;
    }
    if (
      minimumConfidence > 0 &&
      option.fare.available &&
      option.fare.trace.confidenceScore < minimumConfidence
    ) {
      excluded.push({
        option,
        reason: 'BELOW_CONFIDENCE_THRESHOLD',
        explanation: `Estimation trop incertaine (confiance ${option.fare.trace.confidenceScore} < ${minimumConfidence})`,
      });
      continue;
    }
    eligible.push(option);
  }

  return { eligible, excluded };
}

/** Valeur de tri et sa formule, selon le critere. */
function score(
  option: RankableOption,
  criterion: RankingOptions['criterion'],
  timeValue: number,
  includeWait: boolean,
): { value: number; explanation: string } {
  const seconds = totalSeconds(option, includeWait) ?? 0;
  const minutes = seconds / 60;
  const price = option.fare.available ? option.fare.value.amount : 0;

  switch (criterion) {
    case 'PRICE':
      return { value: price, explanation: `${price} FCFA` };
    case 'DURATION':
      return {
        value: seconds,
        explanation: includeWait
          ? `${minutes.toFixed(1)} min (trajet + attente)`
          : `${minutes.toFixed(1)} min`,
      };
    case 'PRICE_TIME': {
      const value = price + timeValue * minutes;
      return {
        value,
        explanation: `${price} FCFA + ${timeValue} FCFA/min x ${minutes.toFixed(1)} min = ${Math.round(value)}`,
      };
    }
  }
}

/**
 * Attribue un badge uniquement si le gagnant est STRICT.
 * En cas d'ex aequo au sommet, aucun badge : designer arbitrairement l'un des
 * deux serait un choix non justifie, donc indistinguable d'un favoritisme.
 */
function strictWinner(
  entries: readonly { optionId: string; value: number }[],
): { optionId: string; value: number } | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const best = sorted[0]!;
  const second = sorted[1]!;
  return best.value < second.value ? best : null;
}

/**
 * Classe les options selon le critere demande.
 *
 * Deterministe : a entrees egales, sortie identique. Les ex aequo sont
 * departages par `optionId` lexicographique, jamais par ordre d'arrivee —
 * l'ordre d'arrivee dependrait de l'ordre des reponses reseau.
 */
export function rankOptions(
  options: readonly RankableOption[],
  rankingOptions: RankingOptions,
): RankingResult {
  const {
    criterion,
    timeValueXofPerMinute = 0,
    minimumConfidence = 0,
    includeWaitInDuration = false,
  } = rankingOptions;

  if (criterion === 'PRICE_TIME' && timeValueXofPerMinute <= 0) {
    throw new Error(
      'Le critere PRICE_TIME exige une valeur du temps strictement positive : ' +
        'sans elle, la ponderation serait implicite donc invérifiable',
    );
  }

  const { eligible, excluded } = partition(
    options,
    criterion,
    minimumConfidence,
    includeWaitInDuration,
  );

  const scored = eligible.map((option) => ({
    option,
    ...score(option, criterion, timeValueXofPerMinute, includeWaitInDuration),
  }));

  scored.sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    return a.option.optionId.localeCompare(b.option.optionId);
  });

  const ranked: RankedOption[] = scored.map((entry, index) => ({
    option: entry.option,
    position: index + 1,
    sortValue: entry.value,
    sortExplanation: entry.explanation,
  }));

  const insufficientForBadges = eligible.length < 2;
  const badges: Badge[] = insufficientForBadges
    ? []
    : computeBadges(eligible, timeValueXofPerMinute, includeWaitInDuration);

  return { criterion, ranked, excluded, badges, insufficientForBadges };
}

/**
 * Les badges sont calcules sur TOUTES les options eligibles, independamment du
 * critere de tri : « moins cher » reste « moins cher » meme si l'usager trie
 * par duree.
 */
function computeBadges(
  eligible: readonly RankableOption[],
  timeValue: number,
  includeWait: boolean,
): Badge[] {
  const badges: Badge[] = [];

  const priced = eligible
    .filter((o) => o.fare.available)
    .map((o) => ({ optionId: o.optionId, value: o.fare.available ? o.fare.value.amount : 0 }));
  const cheapest = strictWinner(priced);
  if (cheapest) {
    badges.push({
      code: 'CHEAPEST',
      optionId: cheapest.optionId,
      justification: `Prix estime le plus bas : ${cheapest.value} FCFA`,
    });
  }

  const timed = eligible
    .map((o) => ({ optionId: o.optionId, seconds: totalSeconds(o, includeWait) }))
    .filter((e): e is { optionId: string; seconds: number } => e.seconds !== null)
    .map((e) => ({ optionId: e.optionId, value: e.seconds }));
  const fastest = strictWinner(timed);
  if (fastest) {
    badges.push({
      code: 'FASTEST',
      optionId: fastest.optionId,
      justification: `Duree estimee la plus courte : ${(fastest.value / 60).toFixed(1)} min`,
    });
  }

  // Le rapport prix/temps n'a de sens qu'avec une valeur du temps explicite.
  if (timeValue > 0) {
    const combined = eligible
      .filter((o) => o.fare.available && totalSeconds(o, includeWait) !== null)
      .map((o) => ({
        optionId: o.optionId,
        value:
          (o.fare.available ? o.fare.value.amount : 0) +
          (timeValue * (totalSeconds(o, includeWait) ?? 0)) / 60,
      }));
    const bestValue = strictWinner(combined);
    if (bestValue) {
      badges.push({
        code: 'BEST_VALUE',
        optionId: bestValue.optionId,
        justification: `Cout total le plus bas a ${timeValue} FCFA/min : ${Math.round(bestValue.value)}`,
      });
    }
  }

  return badges;
}
