# C5 ADAPT-2 — preuve `medium` et invariants de redimensionnement

- **Date :** 2026-09-28
- **Statut :** audit produit approuvé le 2026-09-28 ; revue technique de PR requise
- **Périmètre :** harnais navigateur C5, sans modification de la page Angular
- **Autorité :** ADR-0072 et doctrine UI adaptative officielle

L'audit de placement élargi est consigné dans
[`c5-adapt2-audit-placement-multifenetre-2026-09-28.md`](./c5-adapt2-audit-placement-multifenetre-2026-09-28.md).
Il devient l'autorité sur les blockers de présentation ; le présent document
reste la preuve technique du viewport `medium` et de la continuité au resize.

## 1. Objectif borné

Ce lot ne redessine pas C5 et ne choisit pas silencieusement un design system.
Il répond à deux questions avant toute baseline pixel :

1. le rendu intermédiaire est-il utilisable avec la vraie application Angular ?
2. un changement de largeur conserve-t-il l'état sans déclencher d'appel API ?

Angular Material n'est ni ajouté ni migré. Les mêmes instances de `list-query`,
`action-request`, formulaire et composition restent utilisées.

## 2. Viewport candidat

Le point de preuve est **1024 × 768**. Il ne signifie pas « tablette = 1024 » :
il représente une fenêtre située au-dessus de la frontière compacte actuelle
(`800px`) mais encore trop contrainte pour afficher simultanément une table
complète et un panneau persistant de `520px` sans dégrader le contenu principal.

Le comportement candidat est donc :

- liste tabulaire quand le formulaire est fermé ;
- panneau de tâche temporaire et modal quand la création est ouverte ;
- liste conservée derrière le panneau, sans duplication de données ou de
  contrôles.

Les images produites par Playwright et jointes comme artefacts CI sont :

- `medium-ready.actual.png` ;
- `medium-create-error-after-resize.actual.png`.

Ce sont des **candidats**, pas des références pixel approuvées.

## 3. Preuves automatisées

Le scénario navigateur réel vérifie désormais :

- `799px` et `800px` : projection compacte en cartes ;
- `801px` : projection tabulaire ;
- aucun appel `/api/**` supplémentaire aux deux changements de frontière ;
- passage dans une même session de `390 × 844` à `1024 × 768` ;
- conservation de la page courante, du filtre saisi, des valeurs du formulaire,
  du conflit email, du message d'erreur et du focus ;
- égalité exacte de la séquence des requêtes avant et après resize ;
- absence de débordement horizontal de la page au point `medium` ;
- génération des deux PNG depuis le vrai build Angular et le backend simulé
  fermé aux routes inconnues.

L'égalité porte sur les requêtes réellement observées, méthode, chemin et query
string compris. Le test ne se contente donc pas d'attendre qu'aucune erreur ne
soit visible.

## 4. Inspection humaine préparatoire

Le rendu `medium-ready` garde les sept colonnes lisibles et ne crée pas de
scroll horizontal de page. Le rendu après resize conserve la liste et affiche le
formulaire en panneau temporaire de `520px`; le toast reste à gauche du panneau
et le focus reste sur l'email rejeté.

La densité de la rangée de filtres est proche de sa limite à `1024px`. Le
libellé sélectionné « Tous les statuts » est visuellement très serré. Ce point
ne justifie pas une correction automatique : la revue doit décider entre
accepter cette densité, faire passer les filtres sur deux lignes ou déplacer la
projection en cartes à une largeur supérieure.

L'inspection compacte a en outre trouvé un défaut fonctionnel : le media query
masque `.filter-actions`, donc « Effacer » et « Appliquer ». Ce défaut doit être
corrigé avant toute baseline, indépendamment du choix FAB/bouton.

La mesure des tokens actuels trouve aussi `1.52:1` entre la bordure
`#c7d3e3` et le fond blanc. Cette bordure ne satisfait pas `3:1` lorsqu'elle est
la seule limite perceptible d'un champ ou d'un bouton secondaire ; l'audit
multi-fenêtre exige une correction et une preuve axe/humaine.

### Action compacte réouverte après revue M3

Le bouton mobile pleine largeur « Créer un utilisateur » vient du wireframe
approuvé ; aucun oracle n'avait établi qu'il était préférable. La revue des
recommandations officielles conclut :

- un FAB convient à l'unique action de plus haute importance et la garde
  disponible pendant le scroll ;
- la création d'un élément est un cas d'usage reconnu, mais le mot `create` ne
  prouve pas à lui seul que l'action est la plus fréquente ;
- le bouton pleine largeur actuel occupe une ligne entière et contredit la
  recommandation de ne pas étirer les contrôles par défaut ;
- pour C5, **un FAB étendu `+ Créer un utilisateur` est le meilleur candidat
  compact si la création est confirmée comme action principale** ; un bouton
  icône seul est refusé à ce stade pour sa moindre explicitation ;
- le contrôle doit rester unique dans le DOM, devenir un bouton de heading aux
  largeurs supérieures, ne masquer ni pagination ni focus et respecter la safe
  area ;
- C5 ne déclarant que Transloco, ce candidat ne justifie pas une installation
  implicite d'Angular Material.

Cette conclusion rouvre uniquement la présentation compacte. Elle ne modifie pas
le contrat métier ni la validité des preuves de resize. Un nouveau candidat
mobile est requis avant la baseline.

## 5. Ce que Soumaila doit vérifier

Avant fusion, la revue doit :

1. ouvrir les deux artefacts `medium` produits par la CI ;
2. confirmer que le panneau temporaire est le bon mode d'interaction à cette
   largeur ;
3. vérifier lisibilité des filtres, table, pagination, erreur et actions ;
4. confirmer que l'arrière-plan partiellement masqué est acceptable pour une
   tâche modale ;
5. refuser la preuve si la densité exige un nouveau candidat.

La revue doit en plus confirmer si la création est bien l'action principale de
la vue. Sans cette information produit, le passage au FAB ne peut pas être
présenté comme une règle définitive.

L'approbation de la PR valide le candidat `medium`; elle ne valide pas encore
une baseline Chromium ni le futur mode `expanded` persistant.

## 6. Limites et suite

- Le seuil `800/801` est le comportement historique observé et désormais
  verrouillé, pas encore une vérité universelle de plateforme.
- Le mode `expanded` courant reste modal. ADR-0072 exige une sémantique sans
  focus trap lorsqu'un panneau devient réellement persistant.
- Après approbation du candidat `medium`, le prochain lot doit traiter cette
  transition `expanded` et centraliser les classes de fenêtre, sans recréer le
  state ni ajouter Material implicitement.
- La variante compacte doit comparer le bouton de heading borné au FAB étendu,
  puis tester scroll, non-recouvrement, focus, permission et ouverture modale.
- L'audit multi-fenêtre doit être relu avant la modification de la page ; il
  couvre aussi filtres, résultats, pagination, formulaire, feedback, hauteur,
  zoom, clavier virtuel et ultra-wide.
- La calibration puis la baseline pixel bloquante ne commencent qu'après ces
  arbitrages.

## Références

- [Doctrine UI adaptative](./ui-adaptative-references-officielles.md)
- [ADR-0072](../adr/0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [Dossier C5](./c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [Android — FAB](https://developer.android.com/develop/ui/compose/components/fab)
- [Android — layout actions](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [Android — adapt layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout)
- [Angular Material — button](https://material.angular.dev/components/button/overview)
- [WCAG — focus non masqué](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
