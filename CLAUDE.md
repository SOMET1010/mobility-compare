# CLAUDE.md — Règles du dépôt

Lis ce fichier en entier avant toute modification. Ce n'est pas un document d'accueil, c'est une **barrière de sécurité**. Le projet repose sur des garde-fous qu'un agent peut casser sans s'en apercevoir.

---

## 1. Mission et doctrine

Comparateur de mobilité multimodale pour Abidjan — VTC, taxi compteur, woro-woro, gbaka. Projet privé. Nom commercial non arrêté (ADR-001) : le nom de travail est `MobilityCompare`, confiné à un seul fichier.

**Doctrine : prouvé, pas déclaré.**

Un jalon n'est terminé que lorsqu'une preuve exécutée existe. Une architecture correcte, des tests verts et une documentation soignée ne prouvent que ce qu'ils couvrent — jamais davantage. Quand tu ne peux pas produire une preuve, dis-le clairement plutôt que de qualifier autrement ce que tu as fait.

Quatre principes hérités, non négociables :

- **Absence honnête > présence trompeuse.** Une donnée manquante s'affiche comme manquante, jamais comme une valeur par défaut.
- **Zéro donnée inventée.** Aucun tarif, aucune mesure, aucune source qui n'ait été collectée.
- **Un front à la fois.**
- **Audit en lecture seule avant toute écriture.**

---

## 2. Partage des responsabilités

| Domaine                                  | Session de conception  | Toi (Claude Code)                   |
| ---------------------------------------- | ---------------------- | ----------------------------------- |
| Domaine pur, invariants, contrats, tests | **Principal**          | Lecture seule, sauf tâche explicite |
| Docker, OSRM, Playwright                 | —                      | **Principal**                       |
| GitHub, CI, push, vérification distante  | —                      | **Principal**                       |
| Supabase et migrations                   | Conception             | **Exécution et preuve**             |
| UI Lovable                               | Préparation éventuelle | Hors périmètre                      |
| Arbitrages métier et hypothèses          | **Principal**          | **Ne décide pas**                   |

Tu es l'exécutant de tout ce qui exige une machine réelle. C'est ta valeur : la session de conception ne dispose ni de Docker, ni de navigateur, ni d'accès réseau sortant, ni de credentials Git.

---

## 3. Interdiction centrale

**Ne corrige jamais pour faire passer un contrôle de preuve.**

Si un contrôle échoue, le défaut est présumé dans ce qui est contrôlé, pas dans le contrôle. Un contrôle qui gêne est le plus souvent un contrôle qui fonctionne.

Exigent un **arbitrage explicite du propriétaire du projet**, jamais une initiative :

- modifier un seuil de plausibilité ou de verdict (`scripts/j2.3/lib/verdict.mjs`)
- affaiblir la garde anti-simulation
- modifier ou désactiver un test d'architecture (`tests/architecture/`)
- modifier un invariant I1–I4
- ajouter une exception au détecteur de secrets
- élargir une liste d'exclusion
- changer une politique tarifaire ou son statut `UNVALIDATED`
- passer un test en `skip`

Si tu penses qu'un contrôle est réellement faux : **documente le défaut, produis la preuve du faux positif, et demande l'arbitrage.** Ne modifie rien.

---

## 4. Ce qui ne constitue pas une preuve

Cette section est la plus importante. Les confusions ci-dessous sont exactement celles qui feraient déclarer un jalon terminé à tort.

| Ce que tu observes                     | Ce que cela ne prouve pas                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Un conteneur OSRM démarre              | Que le graphe d'Abidjan est chargé. OSRM démarre aussi sur un graphe vide ou sur une autre région.               |
| OSRM répond HTTP 200                   | Que les points demandés sont dans le graphe. Vérifie l'écart entre coordonnées demandées et waypoints retournés. |
| Une réponse contient distance et durée | Que l'itinéraire est réel. Sans géométrie, il n'y a pas de tracé, donc pas de preuve.                            |
| Les tests unitaires sont verts         | Que l'infrastructure fonctionne. Ils prouvent le respect d'un contrat, pas l'existence d'un serveur.             |
| Les fixtures OSRM passent              | Qu'un serveur OSRM répond ainsi. Elles sont **écrites à la main**, jamais capturées.                             |
| Playwright est vert                    | Que la grille tarifaire est réelle. Les hypothèses `UNVALIDATED` restent actives.                                |
| Le build passe                         | Que le produit est utilisable. Le socle n'a aucun écran métier.                                                  |
| Un prix s'affiche                      | Qu'il correspond au marché. `confidenceScore: 0` signifie « aucune observation terrain ».                        |
| Un rapport J2.3 existe                 | Que le verdict est PASS. Lis le verdict. `INCONCLUSIVE` n'est pas un succès.                                     |

Règle générale : **un contrôle qui n'a pas pu conclure n'est pas un contrôle réussi.**

---

## 5. Carte du dépôt

```
src/
  config/        product.ts (nom, ADR-001) · env.ts · env-registry.js (portées)
  domain/        MÉTIER PUR — aucun réseau, aucune base, aucune horloge système
    result.ts        Estimation<T> = Available<T> | Absent  (invariant I1)
    pricing/         money.ts (XOF entier) · clock.ts (horloge injectée)
      dynamic/       grid.ts (modèle + validation) · engine.ts (calcul)
    ranking/         classement naturel — AUCUN accès au sponsoring (I3)
  modules/       techniques réutilisables, internes au dépôt
    routing/       provider.ts (contrat) · adapters/osrm.ts · circuit-breaker.ts
    logger/        masquage des données sensibles au cœur
    monitoring/    Sentry filtré, inactif en local
  components/    16 primitives shadcn, non modifiées
  guards/        RouteGuard, hiérarchie de rôles

scripts/
  check-client-secrets.mjs   porte prebuild — bloque le build
  check-bundle.mjs           porte postbuild — inspecte dist/
  j2.3/                      protocole de preuve OSRM

tests/
  architecture/  invariants, secrets, dépendances, séparation client/serveur
  unit/          logique métier
  e2e/           Playwright — EXÉCUTÉ (local + CI), 2 smoke tests verts
  fixtures/      données figées, NON PROBANTES

docs/
  REGISTRE_DEPENDANCES_EXTERNES.md   ← état réel des blocages
  HYPOTHESES_TARIFAIRES.md           ← ce qui n'est pas validé
  FICHE_DECISION_OSRM.md             ← mesures à produire
  CONFIGURATION_SUPABASE.md          ← actions manuelles
  INVENTAIRE_REPRISE_NOLI.md
  adr/                               ← décisions
README-REPRISE.md                    ← point d'entrée
```

**Fichiers portant l'état réel du projet** : `README-REPRISE.md`, `docs/REGISTRE_DEPENDANCES_EXTERNES.md`, `docs/adr/`, `docs/HYPOTHESES_TARIFAIRES.md`, `scripts/j2.3/README.md`. Mets-les à jour quand l'état change — ils sont la mémoire du projet entre les sessions.

---

## 6. Commandes de validation obligatoires

Avant tout commit, les cinq doivent passer :

```bash
npm run typecheck
npm run lint
npm test               # 234 tests
npm run build          # enchaîne prebuild → build → postbuild
git status --porcelain # doit être vide
```

Le build **échoue réellement** si un secret est référencé côté client ou détecté dans le bundle. Ce ne sont pas des avertissements.

Autres :

```bash
npm run test:arch      # invariants seuls
npm run check:secrets  # porte pre-build seule
npm run check:bundle   # inspection du bundle
npm run test:e2e       # Playwright — nécessite npx playwright install chromium
```

---

## 7. Invariants I1–I4

**I1 — Absence honnête.** `Estimation<T> = Available<T> | Absent(raison)`. Le typage rend impossible de lire une valeur sans avoir testé sa disponibilité. Aucune valeur par défaut, aucun repli silencieux. `Math.random` est interdit par règle ESLint dans le code applicatif : une valeur affichée est calculée ou absente.

**I2 — Traçabilité.** Toute valeur disponible porte sa `CalculationTrace` : étapes, formules avec valeurs réelles, version du modèle, provenance du routage, nombre et fraîcheur des observations. Un prix affiché doit toujours pouvoir être expliqué.

**I3 — Classement non biaisé.** `src/domain/ranking` et `src/domain/pricing` n'ont structurellement aucun accès au sponsoring. Un identifiant contenant `sponsor`, `promo`, `discount`, `commission` ou `partnerBoost` y fait échouer la CI. Les badges « moins cher », « plus rapide », « meilleur rapport prix/temps » sont calculés exclusivement par le moteur naturel.

**I4 — Statut réglementaire administrable.** Aucun agrément en dur. Il vit en base, daté, sourcé, avec auteur de vérification.

---

## 8. Interdictions architecturales

- **Aucun secret préfixé `VITE_`.** Vite injecte toute variable `VITE_*` dans le bundle client : elle est publique. Front → clé publishable. Serveur → clé secret, dans le gestionnaire de secrets de l'hébergeur **qui exécute le traitement**.
- **Aucun repli à vol d'oiseau.** Une distance orthodromique n'est pas une distance routière. Routage indisponible = pas de résultat = pas de prix.
- **Aucun appel direct à OSRM depuis le navigateur.** `VITE_ROUTING_BASE_URL` désigne notre couche de services. OSRM tourne sur une VM privée.
- **Aucun monorepo, aucun package partagé.** Produit unique, modules internes. Pas d'extraction avant un second cas d'usage démontré.
- **Aucun nom de produit** dans le domaine métier, les migrations, les buckets, les Edge Functions ou les noms de secrets.
- **Aucune donnée sensible journalisée.** Numéros, codes OTP, coordonnées GPS sont masqués au cœur du logger.
- **Aucune dépendance déclarée sans être importée.** Un test le vérifie.

---

## 9. Statut exact des jalons

| Jalon                                   | Statut                                       |
| --------------------------------------- | -------------------------------------------- |
| J0 — Audit NOLI                         | Validé                                       |
| J1.1–J1.4 — Socle, reprise, secrets     | Clôturé **sous réserves** (DEP-005, DEP-006) |
| J2.1 — Moteur tarifaire dynamique       | **Validé**                                   |
| J2.2 — Contrats de routage, disjoncteur | **Validé**                                   |
| J2.3 — Protocole de preuve              | **Validé (protocole)**                       |
| **J2 — preuve d'intégration réelle**    | **EN ATTENTE**                               |
| Classement naturel                      | **Validé**                                   |

**Condition de clôture de J2** : une exécution de `./scripts/j2.3/run-proof.sh` sur une machine Docker, avec rapport final **PASS**.

Ne qualifie pas J2 de terminé avant cela. La logique du protocole est validée ; son exécution ne l'est pas.

---

## 10. Limites connues du protocole J2.3

Deux réserves inscrites au statut de livraison :

1. **L'orchestration Bash `run-proof.sh` n'a jamais été exécutée.** Seule sa syntaxe a été vérifiée (`bash -n`). Attends-toi à des défauts d'exécution réels — chemins, permissions, options Docker, comportement de `docker stats`.
2. **La couche I/O de `verify.mjs` n'a jamais été éprouvée contre un serveur réel.** La boucle `fetch` était bloquée dans l'environnement de conception.

La logique pure (`lib/verdict.mjs`, `lib/report.mjs`) est couverte par 39 tests et **ne doit pas être modifiée** pour faire passer une exécution. Si un défaut apparaît, distingue :

- **défaut d'orchestration** → corrigeable dans `run-proof.sh`, documente le correctif
- **défaut d'I/O** → corrigeable dans `verify.mjs` hors logique de verdict
- **défaut de logique** → **arbitrage requis**, ne touche pas

---

## 11. Dépendances externes

Huit dépendances suivies dans `docs/REGISTRE_DEPENDANCES_EXTERNES.md`, avec fonction responsable, source attendue et critère d'acceptation. Elles **ne bloquent aucun développement prouvable**, mais bloquent la validation correspondante.

Les plus structurantes : DEP-001 machine Docker (clôture J2), DEP-002 grille tarifaire officielle, DEP-004 relevés terrain — **chemin critique réel du projet**, sans lequel le moteur reste théorique.

Tu peux lever DEP-001 et DEP-005 par toi-même. Les autres relèvent d'une démarche externe.

---

## 12. Git

**Branches** : `main` toujours dans un état qui build. `feat/<portée>-<description>`, `fix/…`, `chore/…`, `docs/…`. Une branche par chantier.

**Commits** : _Conventional Commits_, vérifiés par commitlint. Portées autorisées : `config`, `arch`, `routing`, `sms`, `otp`, `pricing`, `ranking`, `geo`, `search`, `comparison`, `contributions`, `account`, `ui`, `db`, `ci`, `docs`, `deps`.

Commits **atomiques** : un commit = un changement cohérent. Fréquents plutôt que volumineux.

**Aucune pull request sans demande explicite.**

Hooks actifs : `pre-commit` (lint-staged), `commit-msg` (commitlint), `pre-push` (typecheck + invariants). Ne les contourne pas avec `--no-verify`.

---

## 13. Escalade en cas d'ambiguïté

Le propriétaire du projet est **Patrick SOMET**. Il arbitre.

**Escalade — ne décide pas seul :**

- toute modification listée au §3
- tout arbitrage métier : politique tarifaire, seuil, valeur du temps, présentation
- tout changement d'architecture
- toute information manquante pour agir correctement
- tout doute sur le fait qu'une preuve soit suffisante

**Comment escalader** : décris le blocage, ce que tu as vérifié, les options avec leur conséquence, ta recommandation. Puis **attends**. Ne prends pas l'option la plus probable.

Une information manquante s'écrit `À DÉFINIR` et se pose comme question. Elle ne s'invente pas.

---

## 14. Tâches initiales — ordre strict

### Tâche 1 — Exécuter J2.3

```bash
./scripts/j2.3/run-proof.sh
```

**Ne modifie pas le protocole**, sauf défaut d'exécution prouvé (cf. §10, avec la distinction des trois types de défaut).

**Acceptation** : un rapport horodaté dans `scripts/j2.3/rapports/` avec verdict **PASS**, contenant l'empreinte SHA-256 de l'extrait OSM, la taille du graphe, la mémoire résidente, les durées de préparation et de chargement, et une distance, une durée et une géométrie non vide pour Yopougon → Plateau.

**Non acceptable** : un verdict `INCONCLUSIVE`, un rapport aux mesures manquantes, un protocole modifié pour obtenir un PASS.

Ensuite : reporte les mesures dans `docs/FICHE_DECISION_OSRM.md` §2, mets à jour DEP-001 et le statut J2.

### Tâche 2 — Exécuter Playwright

```bash
npx playwright install chromium
npm run test:e2e
```

Deux tests smoke : chargement du shell sans erreur console, absence de secret dans le bundle servi.

**Acceptation** : les deux passent, **ou** chaque échec est documenté avec sa cause classée :

- **défaut produit** → à corriger, avec test de non-régression
- **défaut de test** → le test est faux ; corrige-le en expliquant pourquoi il l'était
- **défaut d'environnement** → ni l'un ni l'autre ; documente et n'altère rien

Ne classe pas un échec en « défaut d'environnement » par commodité. C'est la sortie la plus tentante et la plus rarement vraie.

Ensuite : mets à jour DEP-005 et la réserve du `README-REPRISE.md`.

### Tâche 3 — Créer le dépôt GitHub et pousser

**Uniquement après** vérification, dans cet ordre :

```bash
git bundle verify mobility-compare.bundle   # doit dire : complete history
npm run test:arch                            # secrets, invariants
git status --porcelain                       # doit être vide
ls -la .husky/                               # hooks présents et exécutables
grep -rn "VITE_.*SECRET\|sb_secret_" src/    # aucun secret
```

Puis :

```bash
git remote add origin git@github.com:<compte>/mobility-compare.git
git push -u origin main
```

**Acceptation** : les 62 commits présents à distance, la CI GitHub Actions au vert, aucun `.env` poussé, `.env.example` sans valeur.

**Ne crée pas de pull request.** Ne force jamais un push.

---

## 15. Avant de déclarer une tâche terminée

Réponds à ces questions dans ton rapport :

1. Quelle preuve exécutée as-tu produite ? Colle la sortie.
2. Qu'est-ce qui reste non prouvé ?
3. As-tu modifié un contrôle, un seuil, un invariant ou un test ? Si oui, **c'était une erreur** — signale-le.
4. Quels fichiers d'état as-tu mis à jour ?
5. Quelle est la question ouverte suivante ?

Une tâche livrée avec une réserve honnête vaut mieux qu'une tâche déclarée terminée sur une preuve absente.
