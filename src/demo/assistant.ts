import { COMMUNES } from './scenario';

/**
 * Assistant guidé — moteur d'intentions 100 % local et déterministe.
 *
 * Honnêteté : ce n'est PAS une IA. Les réponses sont préécrites et le
 * raisonnement est un jeu de règles lisible ci-dessous. Un assistant IA
 * serveur est une dépendance ouverte (DEP-010). L'UI l'affiche clairement.
 */

export type AssistantIntent =
  | 'trip'
  | 'modes'
  | 'pricing'
  | 'neutrality'
  | 'weather'
  | 'traffic'
  | 'data'
  | 'greeting'
  | 'help';

export interface AssistantAction {
  readonly label: string;
  /** Chemin interne de l'application (react-router). */
  readonly to: string;
}

export interface AssistantReply {
  readonly intent: AssistantIntent;
  readonly text: string;
  readonly actions?: readonly AssistantAction[];
}

export const ASSISTANT_DISCLAIMER =
  'Assistant guidé : réponses préécrites, calculées sur votre appareil — aucune IA serveur (DEP-010).';

/** Normalise pour la détection : minuscules, sans accents ni ponctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Alias parlés → id de commune (complète les noms officiels). */
const COMMUNE_ALIASES: Record<string, string> = {
  aeroport: 'aeroport',
  fhb: 'aeroport',
  'felix houphouet boigny': 'aeroport',
  'port bouet': 'portbouet',
  'deux plateaux': 'deux-plateaux',
  '2 plateaux': 'deux-plateaux',
};

/** Détecte les communes citées, dans leur ordre d'apparition dans le texte. */
export function findCommunes(input: string): string[] {
  const text = ` ${normalize(input)} `;
  const hits: { id: string; pos: number }[] = [];
  const push = (id: string, pos: number) => {
    if (pos >= 0 && !hits.some((h) => h.id === id)) hits.push({ id, pos });
  };
  for (const c of COMMUNES) {
    push(c.id, text.indexOf(` ${normalize(c.name)} `));
  }
  for (const [alias, id] of Object.entries(COMMUNE_ALIASES)) {
    push(id, text.indexOf(` ${alias} `));
  }
  return hits.sort((a, b) => a.pos - b.pos).map((h) => h.id);
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

/** Règle de réponse — pure : (message) → réponse préécrite + actions. */
export function answer(input: string): AssistantReply {
  const t = normalize(input);

  // 1. Trajet : deux communes citées → proposer la comparaison.
  const communes = findCommunes(input);
  if (communes.length >= 2) {
    const from = COMMUNES.find((c) => c.id === communes[0])!;
    const to = COMMUNES.find((c) => c.id === communes[1])!;
    return {
      intent: 'trip',
      text: `Je peux comparer ${from.name} → ${to.name} sur les 4 modes (VTC, taxi compteur, woro-woro, gbaka) — prix, durée et meilleur compromis.`,
      actions: [
        {
          label: `Comparer ${from.name} → ${to.name}`,
          to: `/comparer?de=${from.id}&a=${to.id}&tri=PRICE_TIME`,
        },
      ],
    };
  }

  if (has(t, 'meteo', 'pluie', 'pleut', 'temps qu il fait', 'orage')) {
    return {
      intent: 'weather',
      text: 'La météo affichée dans le comparateur est réelle (source Open-Meteo, heure d’Abidjan). Ouvrez une comparaison : elle apparaît dans le bloc « Conditions ».',
      actions: [{ label: 'Ouvrir le comparateur', to: '/comparer' }],
    };
  }

  if (has(t, 'trafic', 'embouteillage', 'bouchon', 'circulation')) {
    return {
      intent: 'traffic',
      text: 'Le comparateur affiche un niveau de circulation type selon l’heure (pointes 6h30–9h30 et 16h30–20h). C’est un profil simulé, honnêtement étiqueté — la mesure temps réel est une dépendance ouverte (DEP-009).',
      actions: [{ label: 'Ouvrir le comparateur', to: '/comparer' }],
    };
  }

  if (has(t, 'gbaka', 'woro', 'vtc', 'taxi', 'mode')) {
    return {
      intent: 'modes',
      text: 'Quatre modes sont comparés : VTC (réservé, porte-à-porte), taxi compteur (direct, au compteur), woro-woro (taxi partagé à tarif fixe) et gbaka (minibus de ligne). Chacun est classé sans favoritisme.',
      actions: [{ label: 'Voir les modes en action', to: '/comparer' }],
    };
  }

  if (has(t, 'prix', 'tarif', 'cout', 'combien', 'fcfa', 'cher')) {
    return {
      intent: 'pricing',
      text: 'Chaque prix expose sa formule : prise en charge + distance + temps + suppléments, ligne par ligne. Dans la version pilote les montants sont indicatifs (indice de confiance 0) — les grilles officielles et relevés de terrain sont des dépendances ouvertes (DEP-002, DEP-004).',
      actions: [{ label: 'Voir la méthode', to: '/methode' }],
    };
  }

  if (has(t, 'neutre', 'neutralite', 'sponsor', 'pub', 'commission', 'confiance')) {
    return {
      intent: 'neutrality',
      text: 'Le classement n’a aucun accès à un identifiant de sponsor, de promotion ou de commission : une vérification automatique bloque la publication si un tel levier apparaît. La neutralité est une règle du code, testée à chaque livraison.',
      actions: [{ label: 'Lire la méthode', to: '/methode' }],
    };
  }

  if (has(t, 'donnee', 'reel', 'simule', 'fictif', 'vrai')) {
    return {
      intent: 'data',
      text: 'Ce qui est réel : le moteur de calcul, le classement neutre, les positions des communes, la météo. Ce qui est simulé (et étiqueté) : prix, durées, trafic. Rien n’est inventé en silence.',
      actions: [{ label: 'Questions fréquentes', to: '/methode#faq' }],
    };
  }

  if (has(t, 'bonjour', 'bonsoir', 'salut', 'hello', 'merci')) {
    return {
      intent: 'greeting',
      text: 'Bonjour ! Dites-moi un trajet (ex. « Cocody Plateau ») ou posez une question sur les modes, les prix, la neutralité, la météo ou le trafic.',
    };
  }

  return {
    intent: 'help',
    text: 'Je peux : comparer un trajet si vous citez deux communes (ex. « Yopougon Plateau ») · expliquer les modes, les prix ou la neutralité · indiquer la météo et le trafic.',
    actions: [
      { label: 'Comparer Cocody → Plateau', to: '/comparer?de=cocody&a=plateau&tri=PRICE_TIME' },
    ],
  };
}
