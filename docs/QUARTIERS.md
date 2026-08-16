# Quartiers du comparateur — points de repère à confirmer

> **Pourquoi** (remarque du décideur) : les communes d'Abidjan sont vastes —
> Cocody s'étend sur ~12 km, Yopougon est la plus grande commune d'Afrique.
> Un point unique par commune fausse l'estimation. Le comparateur propose donc
> des **quartiers**, regroupés par commune dans les sélecteurs.
>
> **Statut des positions** : centroïdes approchés (±1 km), posés de mémoire
> géographique — suffisants pour une estimation « à vol d'oiseau × facteur
> route », mais **à confirmer via OpenStreetMap**. La vérification est
> automatisée : `node scripts/geocoder-quartiers.mjs` (depuis une machine
> connectée) interroge Nominatim (1 req/s, politique d'usage respectée) et
> imprime le bloc corrigé à coller dans `scenario.ts`, avec l'écart en mètres
> pour chaque lieu. Les écarts > 1,5 km sont signalés pour contrôle manuel
> (homonymes). À défaut, cocher à la main lors des relevés terrain (DEP-004).
>
> **Adresse exacte = plus tard, et c'est voulu** : la précision à l'adresse
> exige le routage OSRM (DEP-001, infra prête) — et l'adresse précise est une
> donnée personnelle. Le quartier est le bon équilibre précision/anonymat
> pour la V1.

| Vérifié | id             | Quartier       | Commune     | lat   | lng    |
| ------- | -------------- | -------------- | ----------- | ----- | ------ |
| ☐       | riviera-golf   | Riviera Golf   | Cocody      | 5.348 | -3.965 |
| ☐       | niangon        | Niangon        | Yopougon    | 5.325 | -4.100 |
| ☐       | adjame-liberte | Adjamé Liberté | Adjamé      | 5.358 | -4.024 |
| ☐       | abobo-gare     | Abobo Gare     | Abobo       | 5.426 | -4.015 |
| ☐       | anyama         | Anyama         | Anyama      | 5.494 | -4.052 |
| ☐       | zone3          | Zone 3         | Treichville | 5.297 | -4.001 |
| ☐       | bietry         | Biétry         | Marcory     | 5.290 | -3.982 |
| ☐       | gonzagueville  | Gonzagueville  | Port-Bouët  | 5.253 | -3.897 |

Les lieux préexistants (Angré, Deux-Plateaux, Riviera, Palmeraie, Danga,
Siporex, Williamsville, Zone 4, Vridi, Aéroport FHB…) suivent la même règle et
sont rattachés à leur commune dans `src/demo/scenario.ts`.

**Pour ajouter un quartier** : une ligne dans `COMMUNES` (id, nom, commune de
rattachement, lat/lng vérifiés) — les sélecteurs, le moteur de distance, la
carte et l'assistant le prennent en compte automatiquement. Les tests
`tests/unit/places.test.ts` vérifient l'unicité et la vraisemblance des
positions.
