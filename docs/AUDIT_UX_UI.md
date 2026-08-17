# Audit UX/UI — MOBILIS

**Date : 17 août 2026 · Périmètre : tout le code d'interface (`src/`) + parcours du site en ligne.**
**Contexte : produit construit par couches à partir d'une démonstration ; audit en vue d'un
éventuel refactoring. Chaque constat est prouvé par `fichier:ligne`. Le décideur arbitre.**

---

## A. Synthèse — les 5 problèmes qui coûtent le plus cher à l'usager

1. **L'écran bouge sous les yeux (« flashs »).** Huit sources de décalage de mise en page
   identifiées, sans aucune transition : recalcul de TOUS les prix à l'arrivée de la distance
   serveur (`DemoPage.tsx:303-316` → `useMemo :423`), insertion en bloc de la section lignes
   (`:973`), pastilles opérateurs puis relevés qui grossissent les cartes déjà affichées
   (`:940-961`), bandeau d'installation qui surgit en pleine lecture (`InstallPrompt.tsx:47`),
   météo qui apparaît dans la bande collante (`Conditions.tsx:18`), recadrage sec de la carte,
   liste « Adresses » qui se décale sous le doigt (`PlaceField.tsx:248`). Le projet compte
   9 classes de transition en tout et 0 animation d'entrée sur du contenu asynchrone.

2. **Des impasses silencieuses.** Si la comparaison échoue (`cmp === null`), le `<main>` ne rend
   RIEN — page blanche sous l'en-tête, sans message ni retour (`DemoPage.tsx:603`, gardes
   `:766`, `:1299`, `:1308`). Échec réseau et « aucun résultat » sont indistinguables pour les
   adresses (`adresse` → `PlaceField.tsx:103`) comme pour les lignes (`:320`). Les toasts de
   succès et d'échec sont visuellement identiques (15 appels, tous `toast()` neutre — jamais
   `toast.success`/`toast.error`).

3. **L'honnêteté, dite trop souvent, s'entend moins.** La doctrine est « pastilles courtes,
   jamais en paragraphes » ; or `/comparer` empile TROIS bandes avant le contenu (SiteHeader +
   HonestyBanner + ConditionsBar, toutes dans le header collant, `SiteHeader.tsx:103`),
   `Method.tsx` répète deux fois mot pour mot le même énoncé de neutralité (`:117-123` et
   `:235-239`), `/compte` dit « simulation » 4 fois sur un seul écran, et le lexique
   (`simul`/`honnête`/`jamais`/`inventé`) sature toutes les pages. Les blocs les plus longs de
   DemoPage sont aussi les plus petits et les moins contrastés (`text-[11px]` muted).

4. **Un système visuel érodé par les couches.** 32 valeurs hexadécimales distinctes en dur
   (dont 23 uniques), le token de marque existant (`--brand-*`, `index.css:62-65`) utilisé dans
   UNE page sur neuf ; 23 tailles de texte (dont 6 séparées de 0,5 px) ; le MÊME toggle rendu à
   deux hauteurs différentes selon la vue (`DemoPage.tsx:619` vs `:831`) ; 10 rembourrages
   différents pour la même carte ; 4 implémentations du bouton « ← retour » ; footer dupliqué
   5 fois et absent de 3 pages. Chaque incohérence est petite ; l'accumulation abîme la
   confiance perçue — mortelle pour un produit dont l'argument est la rigueur.

5. **Accessibilité incomplète sur les points chauds.** Les 3 dialogues (onboarding, assistant,
   sélecteur de lieu) n'ont ni piège de focus ni fermeture Escape fiable ; le champ de
   recherche déclare `role="combobox"` sans listbox/options ni `aria-activedescendant`
   (`PlaceField.tsx:185`) ; toutes les lignes de la liste de lieux ont un focus sans anneau
   (`:281`) ; l'alternative textuelle de la carte est statique et ignore départ/arrivée/tracés
   (`StreetMap.tsx:113`) ; le bouton flottant de l'assistant occupe la zone d'apparition des
   toasts (`Assistant.tsx:102` vs Toaster sans position, `App.tsx:65`).

**Deux contradictions factuelles à corriger avant tout le reste :**

- `Terms.tsx:58-59` affirme « pas de mesure d'audience » alors que le compteur souverain envoie
  un POST par page vue (`beacon.ts:46-51`) — la page juridique est en retard d'une couche.
  (La date `UPDATED = '15 août 2026'` est en dur, `Terms.tsx:14`.)
- Le commentaire de `StreetMap.tsx:5-9` (« LIGNE DIRECTE… OSRM pas encore branché ») est
  périmé : le routage est branché ; `Method.tsx:26` et `DemoPage.tsx:759` disent l'inverse.

---

## B. Ce qui est solide — à ne PAS casser au refactoring

- **La doctrine servie par le code.** Absence honnête réellement implémentée (repli silencieux,
  aucune valeur inventée), trace de calcul ligne à ligne, neutralité bloquée en CI, 377 tests
  verts + tests d'architecture anti-secrets. C'est la colonne vertébrale : le refactoring
  s'appuie dessus, il n'y touche pas.
- **Les fondations du système visuel existent.** Tokens HSL complets (`tailwind.config.ts:10-29`,
  `index.css:24-52`), 4 tokens de marque, primitives shadcn présentes (16 fichiers) — elles sont
  simplement contournées, pas absentes.
- **Les bons motifs récents** : PlaceSheet en portail plein écran (à la Yango), « une option =
  une carte » avec coût d'opportunité chiffré, ★ meilleure ligne désignée, tracés tactiles,
  fiche détail décisionnelle. C'est la cible ; le reste doit la rejoindre.
- **Deux modèles internes à généraliser** : `Observatory.tsx:36` (seul état à 3 branches
  chargement/erreur/vide explicites) et `Terms.tsx:16-116` (contenu en données, rendu unique).
- **L'accessibilité déjà posée** : 202 `focus-visible`, `aria-pressed` sur les toggles,
  `role="group"`, un défaut global de focus (`index.css:109`). Il faut compléter, pas refaire.

---

## C. Constats détaillés par axe

### C1. Architecture d'écrans et navigation — gravité MOYENNE

- **Aucun layout partagé** : pas de `<Route element={<Layout/>}>`, pas d'`<Outlet/>`
  (`App.tsx:49-60`). Le `SiteHeader` est appelé 8 fois avec des listes de liens recopiées ;
  le footer existe en 5 exemplaires divergents et manque sur `/comparer`, `/compte`,
  `/moderation` ; 6 largeurs de contenu différentes selon la page (max-w-6xl → max-w-md).
- `<main>` absent de Home, Method, Partners (structure sémantique incohérente).
- Deux éléments `sticky top-0 z-30` superposés sur `/comparer` (`SiteHeader.tsx:35` et le
  sélecteur de critère `DemoPage.tsx:844`).
- Le burger mobile s'affiche même quand il n'y a qu'un lien (`SiteHeader.tsx:68-86`).

### C2. Parcours critiques — gravité HAUTE (les impasses), MOYENNE (le reste)

- Comparer un trajet : bon (2 gestes grâce à l'enchaînement départ→arrivée).
- Impasses : cmp null → page blanche ; option introuvable → `DetailView` rend null (`:1377`).
- `TripWidget` (Home) duplique intégralement la logique de sélection de DemoPage
  (`Home.tsx:341-430` vs `DemoPage.tsx:1334-1344`) : deux implémentations à maintenir pour le
  même parcours d'entrée.
- Contribution : l'écran se ferme en même temps que le toast s'affiche (`:1682`) — le retour
  visuel se joue pendant un changement d'écran.

### C3. Hiérarchie et densité de texte — gravité MOYENNE

- 7 des 10 plus longs blocs du produit sont sur `Method.tsx` ou dans les vues secondaires de
  DemoPage ; deux doublons mot à mot dans Method ; `Terms` §4 = ~700 caractères d'un seul
  paragraphe gris (`:55-69`).
- Les mentions d'honnêteté les plus importantes sont rendues dans les plus petits corps
  (`text-[10px]`/`text-[11px]` muted) — l'inverse de la doctrine « pastilles courtes visibles ».
- Home est saine (plus long paragraphe : 139 caractères) — preuve que la cible est atteignable.

### C4. Cohérence du système visuel — gravité HAUTE (à l'échelle du produit)

- Couleurs : 32 hex distincts ; `#B9722A` écrit 43 fois, `#5C6B2E` 35 fois, `#26301C` 22 fois ;
  aliasing partiel et local (constantes `AMBER/WARN/TRACE1/TRACE2` dans DemoPage seulement,
  re-déclarées dans StreetMap). Le mode sombre défini dans `index.css:68-96` est inopérant
  puisque les hex en dur l'ignorent.
- Typographie : 23 tailles (12 arbitraires `text-[Npx]` + 10 de l'échelle + 1 rem), 5 variantes
  du même libellé majuscule (45 occurrences), 3 `tracking-*` concurrents.
- Composants refaits à la main : cartes (10 paddings), champs (9 terminaisons), toggles
  (3 variantes, 2 hauteurs), retours (4 styles), bouton ⇄ dupliqué à 2 tailles, icônes SVG
  recopiées (shield ×3, route ×2, chevron ×2), `GLYPH` et `XOF` déclarés deux fois.
- 13 des 16 primitives shadcn ne sont importées nulle part.

### C5. États d'interface — gravité HAUTE

- Zéro spinner/squelette dans DemoPage ; chargement, vide et échec confondus pour les lignes
  et les adresses ; deux seuls textes de chargement (tracés).
- Boutons `disabled` sans style disabled (`:1010`, `:1084`) : ligne non traçable = bouton mort
  visuellement identique.
- « Recherche… » de la géolocalisation change la largeur du bouton, 8 s sans indicateur
  (`UseMyLocation.tsx:66`).
- Carte : aucune gestion d'échec des tuiles — rectangle vide de 240 px le cas échéant.

### C6. Accessibilité — gravité HAUTE (dialogues, combobox), MOYENNE (le reste)

- Détail complet en section A-5. S'ajoutent : 11 cas de texte muted sur fond muted (les plus
  serrés en 9-10 px : `AdSlot.tsx:23`, `PlaceField.tsx:234`, `:249`) ; anneaux de focus posés
  sur 6 couleurs différentes ; zéro `aria-*` dans Method, Terms, AccountPage, Moderation,
  InstallPrompt, ErrorBoundary.

### C7. Mobile — gravité MOYENNE

- 3 bandes empilées avant le contenu sur `/comparer` (l'écran utile commence bas).
- Bouton assistant flottant sur la zone des toasts ; masque le coin de la carte.
- Cibles < 44 px : boutons « Plus tard » de l'InstallPrompt, chips de partage en texte 12 px,
  boutons ✕ de 24 px (`PlaceField.tsx:205`).

### C8. Cohérence courses / livraisons — gravité BASSE

- La bascule est claire et l'URL la garde. Reste : le même toggle à 2 hauteurs selon la vue,
  et l'absence d'un rappel du mode « colis » sur la fiche détail (on peut oublier où l'on est).

### C9. Dette de démo — gravité MOYENNE

- Contradictions factuelles (Terms/audience, StreetMap/OSRM) — voir synthèse.
- `AccountPage` : état `'done'` jamais utilisé (`:26`, `:72`) ; 4 mentions « simulation » à
  l'écran ; OTP entièrement simulé alors que le reste du produit est devenu réel.
- `AdSlot` : placeholder permanent identique sur 3 pages, en plus petit texte du site.
- `UseMyLocation` variante `inline` : aucun appelant (`:76-85`, code mort).
- React Query installé et monté (`App.tsx:47`) : 0 usage.

### C10. Santé du code UI — gravité HAUTE (pour la maintenabilité)

- `DemoPage.tsx` : **1 762 lignes**, composant principal de 1 098 lignes, 19 `useState`,
  5 `useEffect`, 3 IIFE dans le JSX (dont une de 101 lignes), 2 `Record` recréés à chaque
  rendu (`:1399-1408`). La seule vue résultats (532 l.) dépasse 4 pages entières du projet.
- `Moderation.tsx` 666 l. et `Home.tsx` 559 l. : gros mais structurés en sous-composants —
  moins urgents.

---

## D. Plan de refactoring priorisé — 3 lots

**Garde-fous permanents : les 377 tests + la CI (neutralité, anti-secrets, typecheck) passent
à CHAQUE commit ; un lot = plusieurs petits commits, jamais un « big bang ».**

### Lot 1 — Corrections rapides, sans risque _(effort : ~1 session · risque : quasi nul)_

1. **Vérité d'abord** : corriger `Terms` §4 (dire le compteur souverain tel qu'il est : sans
   cookie ni IP), mettre la date à jour ; réécrire le commentaire périmé de `StreetMap`.
2. Écran « aucun résultat » quand `cmp === null` (message + bouton retour) au lieu du blanc.
3. `toast.success` / `toast.error` partout (15 appels) ; `<Toaster richColors closeButton />`
   et position qui évite le bouton assistant.
4. Style `disabled` sur les lignes non traçables ; anneau de focus sur `SheetRow` et
   `UseMyLocation` ; spinner minimal (ou largeur fixe) sur « Recherche… ».
5. Fusionner HonestyBanner dans ConditionsBar : UNE bande compacte sous le header
   (● pilote · météo · circulation), au lieu de trois.
6. Supprimer le code mort (`variant="inline"`, état `'done'`), sortir `CRIT_BADGE`/`HEADLINE`
   du rendu.

### Lot 2 — Système de design unifié _(effort : 2-3 sessions · risque : faible, visuel)_

1. **Tokens** : étendre `tailwind.config.ts` — `brand.{ink,paper,olive,ochre}`, `warn`,
   `trace.{1,2}` + échelle `fontSize` réduite à ~7 tailles nommées. Puis migration mécanique
   des 32 hex et des 23 tailles, fichier par fichier (un commit par fichier, diff lisible).
   Décision à prendre au passage : finir le mode sombre ou retirer `.dark` (aujourd'hui il
   ment).
2. **Composants partagés** (dans `src/components/ui-mobilis/`) : `Segmented` (toggles/onglets),
   `SectionLabel` (libellé majuscule), `Card` (3 variantes : pleine, pointillée, encart),
   `Field` (input/select/textarea), `BackLink`, `Chevron`/icônes factorisées. Chaque motif
   remplacé là où il est dupliqué — comportement identique, tests inchangés.
3. **Layout d'application** : `<Layout>` avec Outlet — SiteHeader nourri par une config de
   navigation unique, footer unique à variantes, largeur de contenu par défaut. Supprime les
   8 appels recopiés et les 5 footers.

### Lot 3 — Restructurations profondes _(effort : 3-4 sessions · risque : moyen, encadré)_

1. **Découper DemoPage** : `comparateur/SearchView.tsx`, `ResultsView.tsx`, `DetailView.tsx`,
   `ContributeView.tsx`, `TransitSection.tsx` + hooks extraits (`useComparison`, `useTransit`,
   `useTraces`, `useObserved`). Ordre sûr : d'abord extraire les vues déjà quasi autonomes
   (Detail, Contribute), puis la section lignes, enfin l'état. Un commit par extraction.
2. **États asynchrones sans flash** : réserver les hauteurs (squelettes légers), transitions
   d'opacité à l'arrivée des données, distance serveur fusionnée SANS re-render brutal
   (afficher « distance affinée ✓ » plutôt que remplacer tous les chiffres d'un coup) ;
   basculer les fetchs sur React Query (déjà installé) pour les états
   chargement/erreur/succès uniformes.
3. **Unifier l'entrée de parcours** : TripWidget (Home) consomme les mêmes composants que la
   vue recherche de `/comparer` (un seul code de sélection de lieux).
4. **Accessibilité des dialogues** : piège de focus + Escape + focus initial dans un hook
   partagé (`useDialog`), combobox conforme (listbox/options/activedescendant), alternative
   textuelle dynamique de la carte (« Trajet Angré → Plateau, tracé du Bus 82 affiché »).

**Ordre recommandé : Lot 1 immédiatement (il corrige des choses vraies), Lot 2 avant toute
nouvelle fonctionnalité d'écran (chaque couche ajoutée sans système aggrave la dette), Lot 3
quand une fenêtre calme le permet — c'est lui qui rend les couches suivantes bon marché.**

---

## E. Ce que nous ne recommandons PAS

- **Pas de refonte visuelle.** La palette crème/encre/ocre, la voix du produit et les motifs
  récents (cartes classées, insight chiffré, tracés) fonctionnent — le problème est la
  cohérence d'application, pas la direction artistique.
- **Pas de migration de framework ni d'adoption massive de shadcn.** Les primitives inutilisées
  peuvent être supprimées plutôt qu'imposées ; nos composants maison (Lot 2) suffisent.
- **Pas de « grand soir » sur DemoPage.** 1 762 lignes se découpent par extractions successives
  testées, jamais en une réécriture.
- **Ne pas toucher aux invariants ni aux moteurs** (tarif tracé, classement, absence honnête) :
  le refactoring est strictement présentation et structure.
- **Ne pas ajouter de bibliothèque d'animation** : les transitions nécessaires (opacité,
  hauteur) tiennent en CSS.
