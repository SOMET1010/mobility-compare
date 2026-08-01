# ADR-002 — Gestion des secrets et migration des cles Supabase

- **Statut** : ACCEPTEE
- **Date** : 1er aout 2026

## Contexte

L'audit read-only de NOLI (jalon J0) a revele une variable `VITE_SUPABASE_SERVICE_KEY`
contenant un JWT `service_role` valide — une cle qui contourne l'integralite des
politiques RLS.

Verification effectuee par recherche de la signature JWT complete dans les 107 fichiers
du bundle de production : **la cle n'avait pas fui**. Elle n'etait utilisee que dans
`scripts/` via `process.env`. Le risque etait donc latent, pas realise.

Latent mais reel : Vite expose automatiquement toute variable `VITE_*` via
`import.meta.env`. Une seule ligne ecrite par inadvertance dans `src/` aurait suffi a
publier la cle en production, sans aucun avertissement.

Note de methode : un premier controle portant sur les 60 premiers caracteres du token
avait produit un faux positif — les JWT Supabase `anon` et `service_role` partagent le
meme en-tete. Seule la signature complete discrimine.

## Decision

1. **Aucun secret ne porte le prefixe `VITE_`.** Sans exception.
2. Front : cle **publishable** (`sb_publishable_...`).
3. Serveur : cle **secret** (`sb_secret_...`), stockee dans les secrets Supabase.
4. `.env.example` ne contient aucune valeur renseignee.
5. Un test d'architecture fait echouer la CI sur tout motif de secret derriere `VITE_`.

## Migration des cles legacy

La rotation directe des cles legacy n'est plus possible. Le chemin est une migration,
dans cet ordre strict :

1. Creer les nouvelles cles — operation additive, les cles legacy continuent de fonctionner
2. Remplacer toutes les references : `anon` vers publishable, `service_role` vers secret,
   sans prefixe `VITE_`
3. Verifier : build, tests, scripts
4. **Seulement ensuite** : desactiver les cles legacy
5. Secret JWT : migration, rotation, puis revocation explicite de l'ancienne cle

Inverser les etapes 2 et 4 casse la production.

## Consequences

Le cout est une discipline permanente sur le nommage des variables. Le benefice est
qu'une erreur de manipulation devient visible en CI plutot qu'en production.
