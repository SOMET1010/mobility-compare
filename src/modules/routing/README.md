# Module de routage

Contrat independant d'OSRM. Le code applicatif ne connait que `provider.ts`.

- `provider.ts` — contrat public : `RouteRequest`, `RouteResult`, `RouteFailure`,
  `RouteOutcome`, `RoutingProvider`, `RouteOrigin`
- `adapters/osrm.ts` — traduction du protocole OSRM. Aucun vocabulaire OSRM
  ne franchit cette frontiere
- `circuit-breaker.ts` — disjoncteur deterministe, horloge injectee
- `guarded-provider.ts` — enveloppe un fournisseur : circuit ouvert = aucun appel

## Frontiere d'infrastructure

`VITE_ROUTING_BASE_URL` designe NOTRE couche de services, jamais OSRM.

    navigateur -> couche de services -> OSRM (VM privee)

La couche de services porte authentification, quotas, delais et journalisation
sans donnees sensibles. Une origine et une destination sont des donnees
personnelles.

## Interdits par conception

- **Aucun repli a vol d'oiseau.** Une distance orthodromique n'est pas une
  distance routiere. Routage indisponible = pas de resultat = pas de prix.
- **Aucun resultat sur echec.** `RouteOutcome` est une union : un echec ne
  porte structurellement pas de `result`.
- **Aucune geometrie manquante toleree.** Sans trace, c'est un echec.

## Provenance

`RouteResult.origin` vaut `live`, `cache`, `fixture` ou `mock`. Une fixture ne
prouve rien sur un serveur reel : voir `tests/fixtures/osrm-responses.ts`.
