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
- **Motif :** six voies symétriques convergent vers un **point de décision** unique.
  Aucun mode (VTC, taxi compteur, woro-woro, gbaka) ni opérateur n'est codé
  graphiquement — la neutralité du comparateur est portée par la forme elle-même.
  Pas de flèches : rien ne suggère une recommandation imposée. La simplicité du
  tracé est aussi ce qui résiste le mieux au favicon 16 px.

Les autres variantes explorées (B « multimodal » à points de mode colorés,
C « point de décision » à halo) sont écartées pour l'usage courant ; elles restent
consultables dans la planche de revue archivée hors dépôt.

## Palette

| Rôle                       | Nom    | Hex       |
| -------------------------- | ------ | --------- |
| Fond sombre / texte        | Encre  | `#0E1B1F` |
| Fond clair                 | Papier | `#F4F6F5` |
| Accent / point de décision | Soleil | `#E8920A` |
| Accent secondaire          | Lagune | `#0F8B8D` |

### Contrastes (WCAG, mesurés) et règles d'usage

| Paire           | Ratio   | Usage autorisé                                                                 |
| --------------- | ------- | ------------------------------------------------------------------------------ |
| Encre / Papier  | 16.19:1 | Texte ✓                                                                        |
| Soleil / Encre  | 8.26:1  | Texte ✓ (sur fond sombre)                                                      |
| Soleil / Papier | 2.26:1  | **Insuffisant** — logo / aplats uniquement, **jamais** de texte sur fond clair |
| Lagune / Papier | 3.80:1  | Logo & grands titres uniquement                                                |

Contrainte produit : contrastes élevés, l'application est utilisée en plein soleil
sur des écrans de faible qualité. La règle « Soleil jamais en texte sur fond clair »
est un garde-fou d'accessibilité, pas une préférence esthétique.

## Fichiers concernés

| Fichier                       | Rôle                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `public/favicon.svg`          | Favicon vectoriel, variante A, trait adapté au thème clair/sombre du navigateur.                     |
| `public/favicon.ico`          | Repli neutre pour navigateurs sans support SVG (inchangé).                                           |
| `public/icon-app.svg`         | Icône d'application mobile / PWA (`maskable`) : marque sur fond Encre.                               |
| `public/manifest.webmanifest` | Manifeste PWA — nom marqué « provisoire », couleurs de thème.                                        |
| `index.html`                  | Déclare favicon SVG, `apple-touch-icon`, manifeste, `theme-color`.                                   |
| `src/index.css`               | Bloc `--brand-*` : palette enregistrée pour référence, **sans** remplacer les tokens shadcn neutres. |

Les tokens de thème shadcn (`--primary`, `--background`, …) restent **volontairement
neutres et à fort contraste**. La palette de marque est enregistrée à part et n'est
pas encore appliquée à l'interface : le passage à l'identité définitive se fera d'un
seul geste, sans réécriture de l'UI.

## Remplacement par l'identité définitive

Lorsque ADR-001 / DEP-007 seront arbitrées :

1. Remplacer le tracé dans `public/favicon.svg` et `public/icon-app.svg`.
2. Mettre à jour `name` / `short_name` dans `public/manifest.webmanifest` et le
   `<title>` de `index.html`.
3. Reporter la palette définitive dans les tokens shadcn de `src/index.css` (ce qui
   applique la marque à toute l'interface).
4. Retirer les mentions « provisoire » et clore ce document.
