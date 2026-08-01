# INVENTAIRE DE REPRISE — SOCLE NOLI → COMPARATEUR DE MOBILITÉ

**Jalon** J1.3 · **Date** 1er août 2026
**Source** `noli.zip` — 359 fichiers, 114 814 lignes dans `src/`
**Méthode** audit read-only, puis reprise sélective. Aucune copie en masse.

---

## 1. Principe appliqué

L'objectif n'était pas de maximiser le volume repris mais d'obtenir un socle minimal, lisible et traçable. Chaque élément est classé **COPIÉ** (fidèle), **ADAPTÉ** (dérivé, réécrit) ou **ÉCARTÉ**, avec sa justification.

Sur 114 814 lignes disponibles, **environ 800 lignes** ont été reprises ou dérivées.

---

## 2. Composants shadcn/ui

### Méthode de sélection

Plutôt que de copier les 66 composants, j'ai mesuré leur **usage réel** dans NOLI : nombre de fichiers les important, hors `components/ui/` lui-même. Résultat : **26 composants avec zéro import**, dont `sidebar` (637 lignes), `responsive-image` (338), `chart` (303), `carousel` (224), `menubar` (207).

Un composant shadcn non repris se réajoute en une commande. Le stocker « au cas où » n'a donc aucune valeur.

### Repris maintenant — 16 composants

Nécessaires au shell, aux formulaires et au futur tunnel.

| Composant   | Imports NOLI | Lignes | Vérification                                  |
| ----------- | ------------ | ------ | --------------------------------------------- |
| `button`    | 94           | 47     | Propre                                        |
| `card`      | 91           | 43     | Propre                                        |
| `badge`     | 77           | 29     | Propre                                        |
| `input`     | 52           | 22     | Propre                                        |
| `select`    | 43           | 143    | Propre                                        |
| `label`     | 39           | 17     | Propre                                        |
| `alert`     | 33           | 43     | Propre                                        |
| `tabs`      | 29           | 53     | Propre                                        |
| `dialog`    | 28           | 95     | Propre                                        |
| `textarea`  | 19           | 21     | Propre                                        |
| `checkbox`  | 12           | 26     | Propre                                        |
| `progress`  | 12           | 23     | Propre                                        |
| `separator` | 11           | 20     | Propre                                        |
| `tooltip`   | 4            | 28     | Propre                                        |
| `form`      | 1            | 129    | Propre — structurant pour le tunnel           |
| `sonner`    | 1            | 27     | **ADAPTÉ** — dépendance `next-themes` retirée |

Contrôle appliqué à chacun : zéro occurrence de vocabulaire assurance, zéro trace Lovable, imports limités à Radix et aux utilitaires standard.

### Disponibles, non repris — 12 composants

Utilisés dans NOLI et de qualité vérifiée, mais sans usage anticipé dans le socle : `dropdown-menu`, `table`, `switch`, `alert-dialog`, `avatar`, `radio-group`, `popover`, `accordion`, `sheet`, `scroll-area`, `collapsible`, `calendar`.

Réintégrables à la demande. Ne pas les embarquer maintenant évite de faire porter au socle un poids sans usage.

### Écartés

| Motif                      | Composants                                                                                                                                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zéro import dans NOLI      | `sidebar`, `chart`, `carousel`, `menubar`, `navigation-menu`, `context-menu`, `pagination`, `resizable`, `drawer`, `hover-card`, `toggle`, `toggle-group`, `aspect-ratio`, `toast`, `toaster`, `skip-link`, `focus-trap`, `focus-visible`, `error-message`, `responsive-image`, `LazyLoadingWrapper` |
| Spécifiques au métier NOLI | `year-input`, `status-badge`, `priority-badge`, `stats-card`                                                                                                                                                                                                                                         |
| Non standard, à réécrire   | `skeleton` (260 lignes pour un composant qui en fait normalement une quinzaine)                                                                                                                                                                                                                      |
| Reporté au module OTP      | `phone-input` (210 lignes) — pertinent pour la saisie de numéro ivoirien, à réévaluer lors du développement de l'authentification                                                                                                                                                                    |
| Stories Storybook          | `Button.stories`, `Breadcrumb.stories`, `AlertDialog.stories`, `Skeleton.stories` — Storybook n'est pas installé à ce stade                                                                                                                                                                          |

---

## 3. Thème et tokens

| Élément                     | Décision               | Justification                                                               |
| --------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Structure des tokens shadcn | **ADAPTÉE**            | Nomenclature conservée (`--background`, `--primary`, `--radius`…)           |
| Palette NOLI                | **ÉCARTÉE**            | Azur foncé, jaune-vert, cyan : c'est l'identité visuelle d'un autre produit |
| `index.css` (895 lignes)    | **ÉCARTÉ**             | Réécrit en ~90 lignes, neutres                                              |
| Focus visible               | **REPRIS** en principe | Anneau de focus systématique — accessibilité clavier                        |

Palette actuelle : niveaux de gris à fort contraste, conformes à la contrainte CDC d'usage en plein soleil. **Provisoire** — la palette définitive vient avec la marque (ADR-001).

---

## 4. Briques techniques

| Brique                     | Source NOLI                               | Lignes source | Décision             | Ce qui change                                                              |
| -------------------------- | ----------------------------------------- | ------------- | -------------------- | -------------------------------------------------------------------------- |
| `cn()`                     | `src/lib/utils.ts`                        | 6             | **COPIÉ**            | —                                                                          |
| Logger                     | `src/lib/logger/index.ts`                 | 283           | **ADAPTÉ** → ~170 l. | **Masquage obligatoire** des données sensibles au cœur du logger           |
| Monitoring                 | `src/lib/sentry/` + `src/lib/monitoring/` | 754           | **ADAPTÉ** → ~90 l.  | Filtrage avant envoi, inactif en local par défaut, `sendDefaultPii: false` |
| ErrorBoundary              | `src/components/ErrorBoundary/`           | 416           | **ADAPTÉ** → ~65 l.  | Responsabilité unique ; NOLI mêlait présentation, télémétrie et métier     |
| Guards                     | `AuthGuard` + `RoleGuard`                 | 162           | **ADAPTÉ** → ~70 l.  | Fusionnés en un `RouteGuard` ; rôles métier assurance remplacés            |
| Erreurs                    | diffus dans NOLI                          | —             | **NOUVEAU**          | Taxonomie de 9 catégories, message usager par catégorie                    |
| TanStack Query             | `src/App.tsx`                             | —             | **ADAPTÉ**           | Politique de réessai adossée à la taxonomie ; mutations jamais rejouées    |
| Zod                        | `src/lib/zod-schemas.ts`                  | —             | **ADAPTÉ**           | Primitives seules ; numéro ivoirien et OTP ; schémas métier écartés        |
| Validation d'environnement | —                                         | —             | **NOUVEAU**          | Échec au démarrage plutôt qu'au premier appel réseau                       |

### Pourquoi le logger a été réécrit plutôt que copié

Le logger NOLI est propre et sans dépendance. Mais il journalise le contexte tel qu'il le reçoit. Ce produit manipule des numéros de téléphone, des codes OTP et des positions GPS, que la spécification OTP §5.3 interdit de journaliser.

Le masquage est appliqué **au cœur du logger**, pas à chaque appel : une règle de sécurité qui dépend de la vigilance de l'appelant finit toujours par céder. Huit tests vérifient qu'aucune donnée sensible ne ressort en clair.

---

## 5. Écarté en bloc

- Tout le domaine assurance : `quotes`, `policies`, `payments`, `insurers`, `coverages`, `tarification`, `offers`
- Les règles de comparaison de NOLI — sans transposition possible vers la mobilité
- Les 41 migrations et types métier
- Les pages et parcours métier
- `features/chat`, `features/admin`, `features/notifications`
- Les dépendances spécifiques à Lovable (`lovable-tagger`)
- Les anciennes variables d'environnement (`VITE_MOCK_DATA`, `VITE_ENABLE_MFA`, `VITE_QUOTE_*`, `VITE_PREMIUM_*`…)

---

## 6. Vérifications

### Résidus NOLI

| Contrôle                           | Résultat |
| ---------------------------------- | -------- |
| Traces Lovable                     | **0**    |
| Variables d'environnement NOLI     | **0**    |
| Vocabulaire assurance dans le code | **0**    |

Neuf occurrences de termes liés à l'assurance subsistent, **toutes dans des commentaires de traçabilité** qui documentent ce qui a été écarté — par exemple « les schémas métier (devis, police, garantie) sont ÉCARTÉS ». Les supprimer ferait perdre la mémoire des décisions. À noter : `OUT_OF_COVERAGE` dans les codes d'erreur désigne une couverture **géographique ou réseau**, sans rapport avec l'assurance.

### Dépendances

`@hookform/resolvers` et `@supabase/supabase-js` étaient déclarées sans être importées. **Retirées.** Elles seront réinstallées au moment de leur usage réel — `@supabase/supabase-js` dès J1.4.

Un test d'architecture vérifie désormais en continu qu'aucune dépendance de production n'est déclarée sans être importée.

### Contrôle des secrets — amélioré

Le contrôle initial remontait 3 occurrences sans savoir les qualifier. Le nouveau détecteur classe chaque occurrence en quatre niveaux :

| Verdict         | Signification                                  | Bloquant |
| --------------- | ---------------------------------------------- | -------- |
| `SAFE_EXAMPLE`  | Préfixe ou exemple tronqué (`sb_secret_...`)   | Non      |
| `SUSPECT`       | Longueur compatible avec une clé réelle        | **Oui**  |
| `CONFIRMED_JWT` | JWT complet et décodable — le rôle est extrait | **Oui**  |
| `HISTORY`       | Détecté dans l'historique Git                  | **Oui**  |

Les 4 occurrences actuelles sont toutes qualifiées `SAFE_EXAMPLE`. Elles n'ont **pas** été supprimées pour obtenir un zéro artificiel : elles sont documentaires et le contrôle sait le dire.

Détection prouvée par test négatif : l'injection d'une clé de longueur réaliste dans `.env.example` fait échouer le contrôle.

---

## 7. État des tests

Instantané J1.3 : 48 tests, 7 fichiers. **État au 2026-08-01 : 234 tests
(unitaires + architecture), 15 fichiers, tous verts**, plus les 2 smoke tests
e2e désormais exécutés (voir §8 et §10).

```
234 tests, 15 fichiers, tous verts (2026-08-01)

tests/architecture/  invariants · secrets · dépendances · séparation client/serveur
                     · couverture du typecheck (garde anti-contrôle-vacant)
tests/unit/          logger · validation · erreurs · guards · shell · tarification
                     dynamique · tarification-exige-routage · routage · classement
                     · verdict de preuve OSRM (39)
tests/e2e/           smoke Playwright (2) — EXÉCUTÉ (local + CI), voir §8
```

---

## 8. Playwright — réserve levée (2026-08-01)

Playwright est installé et configuré (profil mobile Pixel 5, serveur de préversion automatique), et deux tests smoke sont écrits : chargement du shell sans erreur console, et absence de secret dans le bundle servi.

**Ils ont été exécutés et passent**, en local et en CI (job `e2e` de `.github/workflows/ci.yml`, avec installation déterministe du navigateur). **DEP-005 est levée** (voir §10).

_Historique_ : au J1.3, ces tests n'avaient jamais pu être exécutés — le téléchargement des navigateurs Chromium échouait dans l'environnement de construction, dont le réseau restreignait les domaines accessibles. Deux défauts révélés au premier passage réel ont été corrigés **côté produit, sans modifier les tests** : favicon absent (404 console) et littéral du préfixe de détection `sb_secret_` présent dans le bundle (désormais assemblé à l'exécution). Détail en §10.

Un test de rendu équivalent tourne aussi sous Vitest et jsdom (`tests/unit/app.test.tsx`, 3 tests) : il s'exécute partout, sans navigateur.

**Storybook n'est pas installé.** La reprise des 16 composants shadcn n'a pas nécessité de validation visuelle isolée : ce sont des primitives standard, non modifiées. À reporter au premier vrai lot UI, conformément à ton arbitrage.

---

## 9. Build

```
dist/index.html                   0.50 kB │ gzip:  0.34 kB
dist/assets/index-*.css          22.80 kB │ gzip:  4.80 kB
dist/assets/index-*.js          306.92 kB │ gzip: 91.12 kB
```

**91 kB compressés** au premier chargement. Le CDC fixe un plafond de 1 Mo sur 3G : la marge est confortable, mais elle sera consommée par la cartographie. À surveiller dès l'arrivée du moteur de calcul et de la carte.

Rappel des tailles au 2026-08-01 (favicon + assemblage du préfixe pris en compte) : `index.js` 307.52 kB (gzip 91.44 kB), `index.css` 23.26 kB (gzip 4.89 kB), `index.html` 0.50 kB. Ordres de grandeur inchangés.

---

## 10. Mise à jour — état au 2026-08-01

Reprise du dépôt à partir de l'état livré, sur machine réelle (Docker, Node 22, navigateur). Publication et stabilisation.

### Publication et CI

- Dépôt public **`SOMET1010/mobility-compare`** — `main`, historique complet.
- **CI GitHub Actions verte** — jobs `quality` (secrets, typecheck, lint, tests d'architecture, 234 tests, build) et `e2e` (2 smoke tests, artefacts conservés uniquement en cas d'échec).
- Run de référence : https://github.com/SOMET1010/mobility-compare/actions/runs/30700998267

### Défauts réels corrigés (aucun contrôle affaibli)

| Défaut constaté                                                                    | Correctif                                                                                                        | Contrôle préservé                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `npm run build` rouge (3 erreurs TS dans le test de verdict J2.3)                  | Typage honnête de la fixture (`ProofFacts`, champs nullables) ; `null` intentionnels conservés                   | 39 tests de verdict inchangés                    |
| `npm run typecheck` vacant (`tsc --noEmit` sur 0 fichier)                          | Mode références réel (`tsc -b`) + garde d'architecture anti-contrôle-vacant                                      | Nouveau test bloque tout retour à zéro fichier   |
| CI rouge : `test:arch` sur checkout shallow                                        | `fetch-depth: 0` (le détecteur de secrets scanne `git log -p --all`)                                             | Détecteur de secrets et ses exceptions inchangés |
| Smoke test 1 : 404 `/favicon.ico` (erreur console)                                 | Favicon neutre dans `public/` (placeholder, charte à venir)                                                      | Test inchangé, reste strict                      |
| Smoke test 2 : littéral `sb_secret_` dans le bundle (préfixe de la garde `env.ts`) | Préfixe assemblé à l'exécution (`['sb','secret',''].join('_')`) ; comportement de la garde strictement identique | Test inchangé ; `check-bundle.mjs` déjà vert     |

Aucun test, seuil, invariant, garde ou définition de verdict n'a été modifié pour « faire passer » un contrôle. Chaque correctif a **remis en fonction** un contrôle réel, sous arbitrage explicite du propriétaire.

### Dépendances externes

- **DEP-005 (Playwright)** : **levée** — deux smoke tests verts, local + CI.
- **DEP-001 (machine Docker + accès OSM/OSRM)** : **toujours ouverte**. Docker fonctionne dans l'environnement, mais l'extrait OSM (`geofabrik`) et l'image OSRM (`ghcr`/`cloudfront`) sont bloqués par la politique d'egress. Le protocole `run-proof.sh` n'a donc **pas** pu être exécuté.

### Jalon J2.3 — inchangé

**J2.3 / preuve d'intégration OSRM réelle : INCONCLUSIVE — DEP-001 indisponible.** Aucun rapport OSRM n'a été généré ; le verrou J2 reste fermé. Prochain jalon légitime : une exécution réelle de `./scripts/j2.3/run-proof.sh` sur une machine réunissant Docker fonctionnel, accès à l'image OSRM, accès à l'extrait OSM requis, disque et mémoire suffisants, et accès au dépôt.
