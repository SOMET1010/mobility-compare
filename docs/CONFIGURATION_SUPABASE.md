# CONFIGURATION SUPABASE

**Jalon** J1.4 · **Date** 1er août 2026
**Portée** : préparation des variables, validation et contrôles. **Aucune clé n'a été créée, affichée ou commitée.** Aucun client Supabase n'est instancié.

---

## 1. Principe de séparation

|              | Client (navigateur)                     | Serveur                                     |
| ------------ | --------------------------------------- | ------------------------------------------- |
| Préfixe      | `VITE_` obligatoire                     | `VITE_` **interdit**                        |
| Visibilité   | **Publique** — embarquée dans le bundle | Secrète                                     |
| Clé Supabase | `sb_publishable_...` uniquement         | `sb_secret_...`                             |
| Privilèges   | Faibles, soumis aux RLS                 | Contourne les RLS                           |
| Emplacement  | `.env.local`, variables de build        | Secrets Supabase / plateforme d'hébergement |

Vite injecte **toute** variable `VITE_*` dans le bundle. Ce n'est pas une convention d'équipe : c'est le comportement de l'outil. Une clé privilégiée qui porte ce préfixe est publiée, définitivement.

Le registre des variables et de leur portée vit dans un fichier unique : `src/config/env-registry.js`. Il est lu à la fois par les scripts de contrôle et par les tests — la documentation et la vérification ne peuvent donc pas diverger.

---

## 2. Contrôles automatiques

### Avant le build — `prebuild`

`npm run build` **échoue** si :

1. une variable serveur est référencée depuis `src/`
2. une variable `VITE_*` contient `SECRET`, `SERVICE_ROLE`, `SERVICE_KEY`, `PRIVATE`, `PASSWORD`, `CREDENTIAL`, `PEPPER`, `JWT_SECRET`, `ADMIN_KEY` ou `DB_URL`
3. `.env.example` renseigne une valeur pour une variable serveur

Le point 2 est un filet pour les variables que personne n'a encore écrites : une liste nominative ne peut pas anticiper le futur.

### Après le build — `postbuild`

Le bundle réellement produit est inspecté. Détecte une clé `sb_secret_`, un JWT dont le rôle n'est pas `anon`, ou un nom de variable serveur.

Ce contrôle décode la **signature complète** du JWT. Leçon de l'audit NOLI : les jetons `anon` et `service_role` partagent le même en-tête, un contrôle sur le préfixe produit un faux positif.

### Au démarrage de l'application

La validation Zod rejette une clé `sb_secret_...` ou un JWT privilégié placé dans `VITE_SUPABASE_PUBLISHABLE_KEY`. Une configuration partielle (URL sans clé) est traitée comme une absence de configuration.

### Preuves obtenues

Les quatre portes ont été vérifiées par test négatif — chacune bloque effectivement :

| Violation injectée                                | Résultat       |
| ------------------------------------------------- | -------------- |
| `import.meta.env.SUPABASE_SECRET_KEY` dans `src/` | Build bloqué   |
| `VITE_SUPABASE_SERVICE_KEY`                       | Build bloqué   |
| Valeur serveur renseignée dans `.env.example`     | Build bloqué   |
| JWT `service_role` injecté dans le bundle         | Secret détecté |

---

## 3. Actions manuelles — dashboard Supabase

Ces opérations te reviennent. **Je n'ai besoin d'aucune valeur de clé**, ni maintenant ni plus tard : les clés se renseignent dans `.env.local` et dans les secrets Supabase, jamais dans une conversation ni dans le dépôt.

### A. Créer les nouvelles clés — sans risque

**Settings → API Keys → « Create new API keys »**

Opération additive : elle ajoute une clé publishable et une clé secret **à côté** des clés existantes. Les clés legacy continuent de fonctionner. Rien ne casse.

### B. Renseigner le client

Dans `.env.local` (jamais commité) et dans les variables de la plateforme de déploiement :

```
VITE_SUPABASE_URL=<URL du projet>
VITE_SUPABASE_PUBLISHABLE_KEY=<clé sb_publishable_...>
```

Si tu colles par erreur une clé `sb_secret_...`, l'application refuse de démarrer avec un message explicite.

### C. Déclarer les secrets serveur

`SUPABASE_SECRET_KEY` se stocke **là où s'exécute le traitement qui l'utilise**, et nulle part ailleurs :

| Où tourne le traitement                           | Où stocker la clé                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Edge Function Supabase                            | Secrets Supabase                                                  |
| Autre hébergeur (VM, conteneur, fonction managée) | Gestionnaire de secrets de **cet** hébergeur                      |
| Script local d'exploitation                       | Variable d'environnement de la session, jamais un fichier commité |

La placer dans les secrets Supabase « par défaut » n'a de sens que si une Edge Function la lit. Un secret déclaré à un endroit qui ne l'utilise pas est une surface d'exposition sans contrepartie.

Ce point n'est pas théorique : l'orchestration OTP est prévue en Edge Function (spec OTP §9), mais OSRM tournera sur une VM dédiée. Les deux n'ont pas le même magasin de secrets.

**Dans tous les cas, et quel que soit l'hébergeur : jamais exposée au frontend, jamais préfixée `VITE_`, jamais dans le dépôt.**

Les autres secrets (`OTP_HASH_PEPPER`, identifiants SMS) suivront la même règle, au moment du module d'authentification.

### D. Migrer NOLI — projet distinct, même méthode

Cette étape concerne le projet **NOLI**, pas celui-ci. Ordre strict, sous peine de casser la production :

1. Créer les nouvelles clés (additif)
2. Remplacer les références : `anon` → publishable, `service_role` → secret **sans préfixe `VITE_`**
3. Vérifier : build, tests, scripts
4. **Seulement ensuite** : désactiver les clés legacy dans Settings → API Keys
5. Secret JWT : Project Settings → JWT Keys → _Migrate JWT secret_, puis _Rotate keys_, puis **révoquer** explicitement l'ancienne clé

Inverser les étapes 2 et 4 casse NOLI en production. Sans révocation explicite à l'étape 5, l'ancienne clé reste valide.

### E. Extension PostGIS — à prévoir

Le graphe tarifaire fixe et les calculs de proximité en dépendent. À activer avant J2, pas maintenant.

---

## 4. Ce qui n'a délibérément pas été fait

**`@supabase/supabase-js` n'est pas installé.** La librairie sera ajoutée au premier usage réel — première requête, première authentification — conformément à la règle « pas de dépendance sans usage ». Un test d'architecture vérifie en continu qu'aucune dépendance de production n'est déclarée sans être importée.

`src/config/env.ts` expose `getSupabaseConfig()`, qui retourne la configuration validée ou `null`. Aucun client n'est instancié.

---

## 5. Vérifier soi-même

```bash
npm run check:secrets   # contrôle pre-build seul
npm run check:bundle    # inspection du bundle (après build)
npm run test:arch       # invariants, séparation client/serveur, détecteur
npm run build           # enchaîne prebuild → build → postbuild
```

Un build qui passe est une preuve que le contrôle a tourné : il ne peut pas être contourné par oubli.
