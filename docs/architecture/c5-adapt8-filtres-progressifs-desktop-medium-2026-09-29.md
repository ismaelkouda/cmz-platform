# C5 ADAPT-8 — filtres progressifs Desktop et Medium

- **Statut :** décision, références, publication et oracles ADAPT-8d fusionnés ;
  ADAPT-8d2 aligne les anciens oracles avant le runtime
- **Périmètre :** recherche, raccourcis de colonnes et panneau progressif C5
  intégrés à la surface tabulaire en fenêtres `medium` et `expanded`
- **Hors périmètre :** compact, adoption d'AG Grid, modification runtime dans ce
  lot, nouvelles capacités métier
- **Décision structurante :**
  [ADR-0074 accepté](../adr/0074-filtres-progressifs-par-blocs-actifs.md)

## 1. Résultat de l'analyse des trois captures

Les trois captures tierces représentent trois états successifs d'un même
parcours sur une fenêtre de `3296 × 1356`, et non trois breakpoints :

1. panneau vide avec `Ajouter un filtre` ;
2. recherche et sélection du champ ;
3. critère choisi affiché dans un bloc indépendant.

Elles constituent une bonne observation pour le Desktop très large. Elles ne
prouvent pas le comportement Medium, l'accessibilité, les appels réseau ou la
compatibilité avec le contrat C5. Elles restent non suivies par Git et ne
doivent pas rejoindre le manifeste de présentation.

## 2. Décision retenue et précision ADAPT-8b

La page conserve le modèle `draftFilters`/`appliedFilters` réalisé par ADAPT-6.
La validation visuelle ADAPT-8b précise toutefois la géométrie initialement
envisagée : en `medium` comme en `expanded`, la recherche, les raccourcis et le
panneau appartiennent à une seule surface tabulaire. Le panneau ne forme plus un
side sheet modal ou un supporting pane adjacent à cette surface ; il se
superpose à sa partie droite, sous la barre interne :

```text
Filtres
──────────────────────────
┌ Statut              − × ┐
│ ○ Tous  ● Actif  ○ Inactif
└─────────────────────────┘

┌ Rôle                > × ┐
│ Administrateur         │  résumé replié
└─────────────────────────┘

[ + Ajouter un filtre ]
──────────────────────────
Réinitialiser     Appliquer
```

Les blocs représentent les critères présents dans le brouillon. Les chips et les
raccourcis de colonnes représentent uniquement les valeurs appliquées. Cette
séparation doit être perceptible dans les libellés, le focus, les annonces
accessibles et les tests réseau.

La recherche combinée `Nom, prénom ou email` se place dans la barre interne, à
gauche de `Filtres`. Une seconde ligne d'en-tête propose uniquement les
raccourcis compatibles avec le backend : `Profil`, `Rôle` et `Statut`. Les
colonnes `Nom`, `Prénom`, `Email` et `Mise à jour` ne reçoivent aucun faux
filtre individuel.

## 3. Desktop / expanded

- panneau droit non modal superposé aux colonnes dans la surface du tableau ;
- largeur C5 bornée à `360–440px` ;
- blocs actifs empilés dans un corps scrollable ;
- header et footer fixes ;
- barre interne recherche/`Filtres` toujours visible ;
- pas de backdrop, de modalité ou de focus trap ;
- les largeurs des colonnes et le `scrollLeft` sont préservés ;
- le rail horizontal et le viewport visible s'arrêtent au bord gauche du
  panneau, tandis que les colonnes continuent derrière lui ;
- les éléments recouverts ne restent ni cliquables ni atteignables au clavier.

La disposition peut s'inspirer de la densité d'un data workspace, mais ne copie
pas les fonctions de démonstration inutiles à C5 : regroupement, déplacement de
lignes, choix des colonnes, filtre pour une capacité backend absente, pivot ou
édition. Les trois raccourcis sous les en-têtes ne sont admis que parce qu'ils
projettent les paramètres serveur `profile`, `role` et `is_active`.

## 4. Medium

- le même contenu est superposé à droite dans la surface tabulaire ;
- le panneau ne reçoit ni backdrop, ni `aria-modal`, ni focus trap ;
- sa largeur est bornée par l'espace nécessaire pour garder un contexte de
  colonnes exploitable ;
- le scroll horizontal permet d'atteindre les raccourcis `Profil`, `Rôle` et
  `Statut`, puis sa limite visible s'arrête au bord gauche du panneau ;
- fermer restitue le focus au bouton `Filtres` sans recréer les contrôles ;
- seule la pile de blocs défile ; header et footer restent visibles.

Les six références propres au dépôt couvrent les états zéro, un et plusieurs
filtres aux viewports `1024 × 768` et `1440 × 1024`. Elles sont des décisions de
présentation, pas des preuves runtime, réseau ou accessibilité.

## 5. Ajout et cycle de vie d'un bloc

### Ajouter

- `Ajouter un filtre` affiche uniquement les champs contractuels disponibles ;
- une recherche de champ est activée lorsque la liste devient difficile à
  parcourir, sans seuil universel codé dans le moteur ;
- un champ déjà présent disparaît des choix, sauf répétabilité explicitement
  définie ;
- sélectionner ajoute le bloc, l'ouvre et focalise son premier contrôle ;
- aucun GET n'est émis.

### Modifier et replier

- la valeur modifie uniquement le brouillon ;
- replier conserve le contrôle et affiche un résumé non trompeur ;
- une erreur empêche le repli automatique et associe son message au contrôle ;
- l'ordre des blocs ne change pas spontanément.

### Supprimer

- supprimer un bloc retire le critère du brouillon ;
- aucune requête n'est émise avant `Appliquer` ;
- le focus revient au bloc logique suivant, au précédent ou à
  `Ajouter un filtre` ;
- une suppression de chip hors panneau reste une modification immédiatement
  appliquée et peut produire au plus un GET, conformément à ADAPT-6.

### Appliquer ou fermer

- `Appliquer` valide tout le brouillon, met à jour les chips, revient à la page
  1 et produit au plus un GET ;
- fermer le panneau sans appliquer abandonne le brouillon en `medium` comme en
  `expanded` ;
- `Réinitialiser` ne produit aucun GET tant que l'utilisateur n'applique pas.

## 6. Politique de complexité

Le profil progressif n'est pas une règle `nombre de champs → composant` :

| Situation                                          | Présentation candidate                       |
| -------------------------------------------------- | -------------------------------------------- |
| très peu de critères simples et toujours utilisés  | champs directs                               |
| quelques essentiels plus des critères occasionnels | essentiels épinglés + blocs ajoutés          |
| nombreux critères optionnels                       | blocs progressifs + sélecteur                |
| opérateurs, groupes `ET/OU`, vues enregistrées     | data-workbench dédié après contrat explicite |

C5 prouve le troisième profil pour tester la montée en densité. Le générateur ne
l'étend à une autre page qu'à partir d'une décision de présentation explicite.
Un second cas réel reste requis avant extraction d'une primitive partagée.

## 7. Points de refus de la revue

Soumaila doit refuser le lot suivant si :

1. un bloc brouillon ressemble à une valeur déjà appliquée ;
2. les chips extérieures reflètent le brouillon ;
3. ajouter, modifier, supprimer ou réinitialiser déclenche un GET ;
4. ouvrir le panneau redimensionne les colonnes ou perd le `scrollLeft` ;
5. Medium ou Expanded ajoute un backdrop, `aria-modal` ou un focus trap ;
6. un resize recrée les contrôles, perd l'état ou déclenche le réseau ;
7. le sélecteur invente un champ, une valeur ou un opérateur ;
8. le même critère est ajouté deux fois sans contrat de répétabilité ;
9. le footer sort du viewport ou masque le dernier contrôle ;
10. les captures tierces sont committées ou présentées comme preuve ;
11. AG Grid est ajouté sans décision séparée de coût, licence, bundle et
    accessibilité ;
12. une primitive générique est extraite à partir du seul cas C5.

## 8. Séquence de réalisation

1. **ADAPT-7b** : terminer d'abord la correction compacte déjà bornée par ses
   oracles ; elle ne doit pas être mélangée à cette refonte.
2. **ADAPT-8a** : faire relire et fusionner la présente décision et ADR-0074 —
   terminé.
3. **ADAPT-8b** : produire des références déterministes Medium et Expanded,
   propres au dépôt, montrant zéro, un et plusieurs blocs — terminé et approuvé
   par le porteur produit le 2026-09-29.
4. **ADAPT-8c** : publier les références exactes et retirer du manifeste les
   anciennes autorités Medium/Expanded contradictoires — terminé. Soumaila a
   approuvé le commit exact `c1aba98edb910f2f9149b0ee669c74809d66f468`, fusionné
   par la PR #144 dans `fe9e3e558539ef062173febfe17fcd5eb6ee2754` ; les 17
   contrôles de PR et la CI post-fusion `36644233400` sont verts.
5. **ADAPT-8d** : écrire les oracles comportementaux, réseau, focus, resize,
   hauteur courte et densité ; constater leur échec exact sur `main` — terminé.
   Neuf scénarios futurs sont bornés par quatre signatures historiques exactes,
   sans `skip`, sans timeout utilisé comme verdict et sans modification runtime.
   Le passage ciblé donne `19/19` : dix succès réels hérités et neuf échecs
   attendus ; la régression C5 complète donne `53/53`. Le support réseau et
   responsive commun est extrait dans le seul harnais E2E afin d'éviter la
   duplication, sans créer de primitive applicative. Soumaila a approuvé le
   commit exact `44e6b95ae6dc1d158b060e2e3d3438bdab5ee74c`, fusionné par la PR
   #167 dans `82a9f7cf9c267af8b6100c80f1d50a71375eca15` ; les 17 contrôles de PR
   et les 17 jobs de la CI post-fusion `36826709105` sont verts.
6. **ADAPT-8d2** : supprimer la contradiction résiduelle des oracles ADAPT-6
   avant le runtime. Trois scénarios imposaient encore un side sheet Medium
   modal, un supporting pane Expanded adjacent et un fieldset groupé ; ils sont
   remplacés, avec une couverture plus forte, par les oracles progressifs
   fusionnés. Les sept invariants encore valides deviennent compatibles avec les
   deux générations d'interface sans relâcher leurs assertions réseau, resize,
   unicité, contrat et filtres appliqués. Le passage ciblé donne `16/16` : sept
   succès réels et neuf échecs futurs attendus.
7. **ADAPT-8e** : intégrer `@angular/aria` dans le vrai composant, recalculer le
   work order après le prérequis, réaliser seulement les fichiers autorisés,
   puis exécuter Angular, Playwright, accessibilité et inspection visuelle.
8. **ADAPT-8f** : faire approuver et fusionner, vérifier la CI post-fusion, puis
   seulement reprendre la décision de baseline Chromium.

### Preuve locale ADAPT-8d au 2026-10-01

Les neuf nouveaux oracles couvrent exactement :

1. l'intégration de la recherche, du déclencheur et des trois seuls raccourcis
   contractuels à la surface tabulaire ;
2. l'application serveur d'un raccourci, le retour page 1 et l'unique GET ;
3. la superposition Medium non modale sans variation de géométrie ou de scroll ;
4. la superposition Expanded et l'inaccessibilité clavier des contrôles
   recouverts ;
5. l'ajout progressif, la disponibilité des champs et le focus initial ;
6. le cycle brouillon/repli/suppression/application et son budget réseau ;
7. l'abandon du brouillon à la fermeture en Medium comme en Expanded ;
8. le resize Medium ↔ Expanded sans recréation, perte de focus, de scroll ou
   appel réseau ;
9. le stress de quinze blocs en hauteur courte, avec seul le corps scrollable.

Les détecteurs refusent seulement les quatre formes actuellement observées :
barre d'outils détachée, fieldset groupé à trois selects, side sheet Medium
modal et supporting pane Expanded adjacent. Si une signature disparaît, le
scénario poursuit immédiatement les assertions du contrat futur ; un échec ne
peut donc pas être masqué par un `todo`, un `skip` ou un détecteur générique.

### Cohérence des générations d'oracles

La prélecture du runtime a révélé que trois scénarios antérieurs exprimaient
encore les géométries explicitement remplacées par ADAPT-8 : modal Medium,
panneau adjacent Expanded et formulaire groupé toujours entièrement rendu. Les
conserver aurait rendu le contrat impossible à satisfaire. ADAPT-8d2 ne retire
aucune capacité : les scénarios progressifs vérifient déjà ces mêmes dimensions
avec les nouvelles décisions, et les sept scénarios transverses conservés
continuent de contrôler le réseau, le brouillon, le resize, les frontières, les
identifiants et la neutralité backend.

`@angular/aria` `22.2.1`, aligné sur `@angular/cdk` `22.2.1` et compatible avec
Angular `22.2.0`, est retenu pour les comportements accessibles qui seront
réellement consommés par la réalisation. La dépendance ne doit jamais être
masquée dans Knip : elle sera déclarée dans le même lot final que son premier
usage. Le work order provisoire `1c8a9d49…`, calculé avant ces prérequis, est
invalide et ne doit autoriser aucune écriture runtime.

## 9. Pourquoi AG Grid reste une inspiration et non une dépendance

La documentation officielle confirme que ses Tool Panels rassemblent des
opérations de filtrage et que son nouveau panneau sait grouper les changements
avant une requête serveur. Elle documente aussi des compromis d'accessibilité
liés à la virtualisation, à l'ordre DOM et aux fonctions avancées. C5 possède
déjà une pagination serveur, sept colonnes et un tableau sémantique ; aucune
mesure ne justifie aujourd'hui de remplacer ce socle.

L'adoption éventuelle d'une vraie data grid restera un profil opt-in réservé à
un besoin mesuré : grand volume visible, nombreuses colonnes, sélection de
masse, édition, regroupement ou navigation de cellules. Elle exigera une ADR
séparée avec licence, bundle, modèle serveur, accessibilité et coût de
maintenance.

## Références

- [ADR-0074 accepté](../adr/0074-filtres-progressifs-par-blocs-actifs.md)
- [Références ADAPT-8b approuvées](../../examples/users-management-proof/presentation/progressive-filter-candidates/proposal.md)
- [ADAPT-6](./c5-adapt6-filtres-multi-fenetres-2026-09-28.md)
- [AG Grid — Tool Panels](https://www.ag-grid.com/angular-data-grid/tool-panel/)
- [AG Grid — New Filters Tool Panel](https://www.ag-grid.com/javascript-data-grid/tool-panel-filters-new/)
- [AG Grid — filtrage serveur groupé](https://www.ag-grid.com/angular-data-grid/server-side-model-filtering/)
- [AG Grid — accessibilité](https://www.ag-grid.com/angular-data-grid/accessibility/)
- [Material 3 — side sheets](https://m3.material.io/components/side-sheets/overview)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)
