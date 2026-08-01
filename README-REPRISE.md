# README-REPRISE — Comparateur de Mobilité Abidjan

**Nom de travail** : MobilityCompare — **provisoire**, voir `docs/adr/ADR-001`.
**État** : J1 clôturé sous réserves, J2.1 et J2.2 validés, J2 en attente de preuve d'intégration OSRM réelle. Dépôt initialisé, architecture posée, socle technique repris de NOLI. **Aucune fonctionnalité métier implémentée.**
**Date** : 1er août 2026

Ce document est la source de vérité pour reprendre le projet. Il n'y a aucune dépendance à une session de travail antérieure.

---

> **Agent automatisé** : lis `CLAUDE.md` à la racine avant toute modification.
> Il fixe les règles du dépôt, les invariants, ce qui exige un arbitrage et ce
> qui ne constitue pas une preuve.

## 1. Ce qui existe et ce qui n'existe pas

**Existe** : arborescence, outillage complet, identité produit centralisée, contrats `RoutingProvider` et `SmsProvider`, type `Estimation` (absence honnête), 16 composants shadcn, thème neutre, logger avec masquage des données sensibles, taxonomie d'erreurs, monitoring Sentry filtré, ErrorBoundary, guards de routes, configuration TanStack Query, primitives Zod, validation d'environnement, 49 tests, pipeline CI.

**N'existe pas** : aucun moteur de calcul, aucune migration, aucun écran métier, aucune connexion à Supabase, aucun adaptateur de fournisseur. Les dossiers correspondants contiennent un `README.md` décrivant leur rôle et leurs contraintes.

C'est délibéré. Le socle est posé, la construction métier commence à J2.

Voir `docs/INVENTAIRE_REPRISE_NOLI.md` pour la traçabilité complète de la reprise.

### Contrôle obligatoire en attente

Les tests Playwright sont écrits et configurés mais **n'ont jamais été exécutés** : le téléchargement des navigateurs échoue dans l'environnement de construction, dont le réseau est restreint.

**Ce contrôle est obligatoire avant la validation du premier parcours navigateur.** Il ne rouvre pas J1.3 : le socle est validé. Mais aucun parcours utilisateur ne peut être déclaré fonctionnel tant que cette preuve n'a pas été obtenue.

```bash
npx playwright install chromium
npm run test:e2e
```

---

## 2. Démarrage

```bash
npm install
cp .env.example .env.local     # puis renseigner
npm run dev
```

Aucune variable n'est requise pour que `npm run dev` démarre le socle. Elles le deviendront à la première connexion Supabase.

### Commandes

| Commande                    | Effet                                    |
| --------------------------- | ---------------------------------------- |
| `npm run dev`               | Serveur de développement                 |
| `npm run build`             | Typecheck puis build de production       |
| `npm run typecheck`         | Vérification TypeScript seule            |
| `npm run lint` / `lint:fix` | ESLint                                   |
| `npm run format`            | Prettier                                 |
| `npm test`                  | Tous les tests                           |
| `npm run test:arch`         | **Invariants d'architecture uniquement** |

---

## 3. Pousser le dépôt

Le dépôt a été construit hors de tout environnement disposant d'accès GitHub. Il est livré sous deux formes redondantes : l'arborescence complète avec son `.git`, et un **Git bundle** (`mobility-compare.bundle`) qui contient l'intégralité de l'historique dans un fichier unique.

### Depuis l'archive

```bash
unzip mobility-compare-j1.zip
cd mobility-compare
git log --oneline                      # vérifier l'historique
git remote add origin git@github.com:<compte>/mobility-compare.git
git push -u origin main
```

### Depuis le bundle (voie de secours)

```bash
git clone mobility-compare.bundle mobility-compare
cd mobility-compare
git remote set-url origin git@github.com:<compte>/mobility-compare.git
git push -u origin main
```

Le bundle est vérifiable avant usage : `git bundle verify mobility-compare.bundle`.

---

## 4. Conventions Git

### Branches

| Type           | Format                        | Usage                           |
| -------------- | ----------------------------- | ------------------------------- |
| Principale     | `main`                        | Toujours dans un état qui build |
| Fonctionnalité | `feat/<portée>-<description>` | `feat/routing-osrm-adapter`     |
| Correction     | `fix/<portée>-<description>`  | `fix/otp-rate-limit`            |
| Technique      | `chore/<description>`         | `chore/ci-cache`                |
| Documentation  | `docs/<description>`          | `docs/adr-002-secrets`          |

Une branche par chantier. Pas de branche fourre-tout. **Aucune pull request n'est ouverte sans demande explicite.**

### Commits

Format _Conventional Commits_, vérifié par commitlint :

```
<type>(<portée>): <description à l'impératif>
```

Types : `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`.
Portées autorisées : `config`, `arch`, `routing`, `sms`, `otp`, `pricing`, `ranking`, `geo`, `search`, `comparison`, `contributions`, `account`, `ui`, `db`, `ci`, `docs`, `deps`.

Commits **atomiques** : un commit = un changement cohérent. Fréquents plutôt que volumineux.

---

## 5. Architecture — décisions structurantes

**Produit unique, pas de monorepo, pas de package partagé.** Les modules techniques réutilisables vivent dans `src/modules/`, à l'intérieur du dépôt. Aucune extraction en package partagé avant qu'un **second cas d'usage concret** ne le justifie. On conserve la modularité sans construire une plateforme abstraite dont le besoin n'est pas démontré.

```
src/
  config/      identité produit, validation d'environnement
  domain/      métier pur — aucun réseau, aucune base, aucun nom de produit
    pricing/dynamic/      VTC, taxi compteur
    pricing/fixed-graph/  gbaka, woro-woro (V1.5)
    ranking/              classement naturel — sans accès au sponsoring
    geo/
  modules/     techniques réutilisables : routing, sms, otp, logger, monitoring
  features/    fonctionnalités usager
  components/  UI
```

### Invariants — vérifiés en CI

| #      | Invariant                          | Matérialisation                                                                                                                         |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **I1** | Absence honnête                    | Type `Estimation<T> = Available<T> \| Absent`. Impossible de lire une valeur sans avoir testé sa disponibilité. Aucun repli par défaut. |
| **I2** | Traçabilité                        | Toute valeur disponible porte sa `CalculationTrace`.                                                                                    |
| **I3** | Classement non biaisé              | `src/domain/ranking/` n'a structurellement pas accès au sponsoring. Test d'architecture.                                                |
| **I4** | Statut réglementaire administrable | Aucun statut d'agrément en dur. Vit en base, daté et sourcé.                                                                            |

`Math.random` est interdit par règle ESLint dans le code applicatif : une valeur affichée est calculée ou absente.

---

## 6. Sécurité — règles non négociables

**Aucune variable préfixée `VITE_` ne porte un secret.** Vite injecte toute variable `VITE_*` dans le bundle client : elle est publique. Un test d'architecture fait échouer la CI si un motif de secret apparaît derrière ce préfixe.

Cette règle vient d'un constat réel sur NOLI, où une clé `service_role` portait le préfixe `VITE_`. Elle n'avait pas fui dans le bundle, mais rien ne l'en empêchait. Voir `docs/adr/ADR-002`.

Front → clé **publishable** (`sb_publishable_...`). Serveur → clé **secret** (`sb_secret_...`), dans les secrets Supabase, jamais dans le dépôt.

---

## 7. Décisions ouvertes

| ADR     | Sujet                                              | Statut      |
| ------- | -------------------------------------------------- | ----------- |
| ADR-001 | Nom commercial et Sender ID                        | **Ouverte** |
| ADR-002 | Gestion des secrets et migration des clés Supabase | Acceptée    |

Dépendances externes bloquantes : `docs/REGISTRE_DEPENDANCES_EXTERNES.md` — 8 dépendances suivies, avec responsable, source attendue et critère d'acceptation.

Protocole de levée du verrou J2 : `./scripts/j2.3/run-proof.sh` (voir `scripts/j2.3/README.md`).

Autres points non tranchés, hors ADR :

- Budget SMS mensuel plafond — bloquant pour le dimensionnement, les contrats fournisseurs et les seuils de limitation de débit
- Hébergement de la VM OSRM et budget associé
- Fournisseurs SMS à consulter (voir la liste de 10 questions dans la spec OTP §10.2)
- Protocole et budget de la campagne de collecte terrain — **véritable chemin critique du projet**
- Corridors d'amorçage : proposition Yopougon↔Plateau, Cocody↔Plateau, Abobo↔Adjamé

---

## 8. Documents de référence

Produits en amont, hors dépôt, à y intégrer :

1. `CDC_Comparateur_Mobilite_Abidjan_v0.1.md` — cahier des charges
2. `PLAN_TECHNIQUE_V0_Comparateur_Mobilite_Abidjan.md` — architecture, schéma de données, jalons
3. `NOTE_J0_Audit_Reutilisabilite_NOLI.md` — audit de réutilisabilité et constats de sécurité
4. `SPEC_Module_OTP_SMS_v0.1.md` — spécification du module d'authentification

---

## 9. Suite

| Étape | Contenu                                                                    | Prérequis                 |
| ----- | -------------------------------------------------------------------------- | ------------------------- |
| J1.3  | Reprise et nettoyage du socle NOLI (UI shadcn, logger, monitoring, guards) | —                         |
| J1.4  | Remplacement des variables legacy                                          | Clés créées côté Supabase |
| J1.5  | Build, tests, scripts                                                      | J1.4                      |
| J1.6  | Désactivation des clés legacy                                              | J1.5 validé               |
| J2    | Infrastructure OSRM Abidjan                                                | Décision d'hébergement    |

Rien n'est écrit sans validation préalable du plan correspondant.
