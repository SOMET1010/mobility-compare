/**
 * FIXTURES OSRM — DONNEES FIGEES, NON PROBANTES
 * =============================================================================
 * ATTENTION : ces reponses sont ECRITES A LA MAIN d'apres le format documente
 * du protocole OSRM. Elles ne proviennent d'AUCUN serveur reel.
 *
 * CE QU'ELLES PROUVENT
 *   Le comportement de l'adaptateur face a la FORME du contrat OSRM.
 *
 * CE QU'ELLES NE PROUVENT PAS
 *   - qu'un serveur OSRM reel repond ainsi
 *   - que le graphe d'Abidjan est correct
 *   - que les distances et durees sont plausibles sur le terrain
 *   - que la geometrie correspond a un itineraire reel
 *
 * Les valeurs numeriques sont VRAISEMBLABLES, pas MESUREES. Les coordonnees
 * de Yopougon et du Plateau sont approximatives et servent uniquement a
 * former des requetes bien construites.
 *
 * La preuve de cloture de J2 reste une requete Yopougon -> Plateau executee
 * sur une instance reelle. Aucune fixture ne s'y substitue.
 * =============================================================================
 */

/** Points de reference approximatifs, a usage de test uniquement. */
export const YOPOUGON = { lat: 5.345, lng: -4.07 };
export const PLATEAU = { lat: 5.32, lng: -4.02 };

/** Reponse nominale. Valeurs vraisemblables, NON mesurees. */
export const OSRM_OK = {
  code: 'Ok',
  routes: [
    {
      distance: 11_420.3,
      duration: 1_680.5,
      geometry: 'yzq@|xnJdAaGvB{HrCgJ|@_D',
      legs: [],
      weight: 1_680.5,
      weight_name: 'routability',
    },
  ],
  waypoints: [],
};

/** Aucun itineraire entre les deux points. */
export const OSRM_NO_ROUTE = { code: 'NoRoute', message: 'Impossible to find route' };

/** Point hors du graphe charge. */
export const OSRM_NO_SEGMENT = {
  code: 'NoSegment',
  message: 'Could not find a matching segment for coordinate',
};

/** Reponse Ok mais sans itineraire : incoherence protocolaire. */
export const OSRM_OK_EMPTY_ROUTES = { code: 'Ok', routes: [] };

/** Geometrie absente : l'adaptateur doit refuser, jamais approximer. */
export const OSRM_MISSING_GEOMETRY = {
  code: 'Ok',
  routes: [{ distance: 11_420.3, duration: 1_680.5, legs: [] }],
};

/** Geometrie vide : meme traitement qu'une geometrie absente. */
export const OSRM_EMPTY_GEOMETRY = {
  code: 'Ok',
  routes: [{ distance: 11_420.3, duration: 1_680.5, geometry: '' }],
};

/** Distance non numerique. */
export const OSRM_INVALID_DISTANCE = {
  code: 'Ok',
  routes: [{ distance: 'onze kilometres', duration: 1_680.5, geometry: 'abc' }],
};

/** Duree negative. */
export const OSRM_NEGATIVE_DURATION = {
  code: 'Ok',
  routes: [{ distance: 11_420.3, duration: -5, geometry: 'abc' }],
};

/** Code inconnu du protocole. */
export const OSRM_UNKNOWN_CODE = { code: 'TeapotError', message: 'Je suis une theiere' };
