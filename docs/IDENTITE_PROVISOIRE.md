# Identité visuelle provisoire

> **Statut : PROVISOIRE.** Cette identité est un placeholder de travail. Elle sera
> remplacée par l'identité définitive lors de l'arbitrage de marque
> (**ADR-001** — nom commercial et Sender ID, statut OUVERTE ; **DEP-007** — nom
> commercial). Aucun dépôt de marque, nom de domaine ou Sender ID ne s'appuie
> sur elle.

## Décision

- **Piste retenue :** « Voies qui convergent ».
- **Variante retenue :** **A — convergence radiale** (recommandation du décideur,
  1er août 2026).
- **Motif :** des voies symétriques (soleil à huit rayons) convergent vers un
  **point de décision** unique. Aucun mode (VTC, taxi compteur, woro-woro, gbaka)
  ni opérateur n'est codé graphiquement — la neutralité du comparateur est portée
  par la forme elle-même. Pas de flèches : rien ne suggère une recommandation
  imposée. Forme radiale simple, lisible jusqu'au favicon 16 px.

Les autres variantes explorées (B « multimodal » à points de mode colorés,
C « point de décision » à halo) sont écartées pour l'usage courant ; elles restent
consultables dans la planche de revue archivée hors dépôt.

## Palette (crème & vert olive — tons terre)

| Rôle                | Nom            | Hex       |
| ------------------- | -------------- | --------- |
| Fond sombre / texte | Encre          | `#26301C` |
| Fond clair          | Crème (Papier) | `#F3EEDF` |
| Primaire            | Olive          | `#5C6B2E` |
| Accent / logo       | Ocre           | `#B9722A` |

### Contrastes (WCAG, mesurés) et règles d'usage

| Paire         | Ratio   | Usage autorisé                                         |
| ------------- | ------- | ------------------------------------------------------ |
| Encre / Crème | 11.90:1 | Texte ✓ (jusqu'à AAA)                                  |
| Olive / Crème | 5.03:1  | Texte ✓ (AA)                                           |
| Ocre / Crème  | 3.29:1  | Grands titres, logo, aplats — **pas de texte courant** |
| Blanc / Ocre  | 3.82:1  | Texte de bouton (gras) sur aplat ocre                  |

Contrainte produit : contrastes élevés, l'application est utilisée en plein soleil
sur des écrans de faible qualité. Règle : l'ocre ne porte pas de texte courant sur
fond clair — réservé aux grands titres, au logo et aux boutons (texte gras).

## Fichiers concernés

| Fichier                       | Rôle                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `public/favicon.svg`          | Favicon vectoriel, variante A, trait adapté au thème clair/sombre du navigateur.                       |
| `public/favicon.ico`          | Repli neutre pour navigateurs sans support SVG (inchangé).                                             |
| `public/icon-app.svg`         | Icône d'application mobile / PWA (`maskable`) : marque sur fond Encre.                                 |
| `public/manifest.webmanifest` | Manifeste PWA — nom marqué « provisoire », couleurs de thème.                                          |
| `index.html`                  | Déclare favicon SVG, `apple-touch-icon`, manifeste, `theme-color`.                                     |
| `src/index.css`               | Tokens shadcn re-teintés en crème/olive (`--primary` olive, `--background` crème…) + bloc `--brand-*`. |

La palette crème & vert olive **est appliquée** aux tokens de thème shadcn
(`--primary`, `--background`, …) : elle habille toute l'interface. Elle reste
**provisoire** jusqu'à l'arbitrage de marque — le passage à l'identité définitive
se fera en re-teintant ces mêmes tokens, sans réécriture de l'UI.

## Remplacement par l'identité définitive

Lorsque ADR-001 / DEP-007 seront arbitrées :

1. Remplacer le tracé dans `public/favicon.svg` et `public/icon-app.svg`.
2. Mettre à jour `name` / `short_name` dans `public/manifest.webmanifest` et le
   `<title>` de `index.html`.
3. Reporter la palette définitive dans les tokens shadcn de `src/index.css` (ce qui
   applique la marque à toute l'interface).
4. Retirer les mentions « provisoire » et clore ce document.
