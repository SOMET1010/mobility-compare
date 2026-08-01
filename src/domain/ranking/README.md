# Classement naturel

**INVARIANT I3.** Ce dossier n'a structurellement aucun acces au sponsoring, a
la monetisation ou a un levier commercial. Un test d'architecture fait echouer
la CI si un identifiant contenant `sponsor`, `promo`, `discount`, `commission`
ou `partnerBoost` y apparait.

Les badges « moins cher », « plus rapide » et « meilleur rapport prix/temps »
sont calcules exclusivement ici. Ils ne peuvent pas etre achetes : le code qui
les attribue ignore l'existence d'un annonceur.

## Regles

- **Options non classables mises a part, jamais releguees en fin de liste.**
  Les placer en dernier suggererait qu'elles sont moins bonnes, alors qu'on ne
  sait simplement pas. Chaque exclusion porte sa raison.
- **Aucun badge sur un ex aequo.** Departager arbitrairement serait
  indistinguable d'un favoritisme.
- **Aucun badge en dessous de deux options eligibles.** « Moins cher » sur une
  seule option est trompeur.
- **Ponderation explicite.** Le critere prix/temps exige une valeur du temps en
  FCFA par minute. Un score composite sans unite serait inverifiable, et un
  classement inverifiable est indistinguable d'un classement biaise.
- **Departage deterministe** par `optionId`, jamais par ordre d'arrivee :
  l'ordre d'arrivee dependrait de l'ordre des reponses reseau.
