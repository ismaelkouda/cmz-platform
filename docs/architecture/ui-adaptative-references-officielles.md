# UI adaptative — doctrine officielle et règles d'application

- **Work item :** ADAPT-1
- **Date de vérification des sources :** 2026-09-28
- **Statut :** doctrine documentée ; aucune migration UI implicite
- **Périmètre :** applications web générées, avec Angular comme première cible

## 1. Objectif

Ce document transforme les recommandations officielles Material 3, Android
Adaptive, Angular Material et Angular CDK en règles utilisables par le projet.
Il ne crée pas un nouveau framework de layout et ne rend pas Material
obligatoire dans une application qui ne l'a pas adopté.

Une UI adaptative ne consiste pas à réduire une page desktop. Elle conserve les
mêmes capacités, données et états tout en changeant leur organisation lorsque
l'espace réellement disponible l'exige.

## 2. Hiérarchie d'autorité

Les sources ne répondent pas aux mêmes questions. En cas de conflit, l'ordre
suivant s'applique :

1. **Contrats produit et sécurité approuvés** : données, permissions,
   validations, effets et comportements métier.
2. **Accessibilité du Web** : WCAG, sémantique HTML et comportements clavier.
3. **Preuve de présentation approuvée** : hiérarchie visuelle, disposition et
   états représentés, avec l'autorité bornée définie par ADR-0066.
4. **Material Design 3** : principes UX, scaffold, layouts canoniques, tokens et
   états d'interaction.
5. **Documentation officielle de la cible** : Angular Material et Angular CDK
   pour une application Angular qui les déclare.
6. **Preuves locales** : tests de composant, tests navigateur, accessibilité et
   inspection humaine des rendus.

Une maquette ne peut donc pas masquer une donnée, affaiblir une validation ou
accorder un droit. Inversement, une implémentation techniquement correcte ne
peut pas ignorer une exigence d'accessibilité.

## 3. Rôle exact de chaque référence

| Source officielle                       | Autorité dans le projet                                                                  | Ce qu'elle ne décide pas                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Material 3 Foundations                  | vocabulaire de design, accessibilité, tokens, états et layout                            | contrats API, permissions, état métier ou API Angular           |
| Layouts canoniques M3                   | choix raisonné entre `feed`, `list-detail`, `supporting pane` et composition du scaffold | composant web précis ou seuil numérique imposé                  |
| Android Adaptive / `material3-adaptive` | référence éprouvée pour raisonner en taille de fenêtre, panes et changement dynamique    | dépendance ou code réutilisable dans Angular                    |
| Angular Material                        | composants Angular maintenus, thème M3, comportements documentés et harnesses            | architecture métier ou obligation de remplacer une UI existante |
| Angular CDK                             | primitives de layout, overlay, focus, clavier et annonces accessibles                    | design produit complet ou breakpoint métier universel           |

Les exemples Compose sont donc des **références de comportement**, jamais une
API cible pour le Web. Les valeurs Android exprimées en `dp` ne sont pas
recopiées automatiquement comme pixels CSS.

## 4. Vocabulaire commun

- **Responsive** : les dimensions et la disposition s'ajustent de manière
  continue, principalement en CSS.
- **Adaptatif** : la structure ou le mode d'interaction change à un seuil
  justifié, par exemple un panneau modal qui devient persistant.
- **Fenêtre disponible** : espace réel donné à l'application ou au conteneur, et
  non nom supposé de l'appareil (`mobile`, `tablet`, `desktop`).
- **Breakpoint** : seuil où le contenu ou l'ergonomie exige un changement. Ce
  n'est pas une détection du matériel.
- **Scaffold** : structure de haut niveau assemblant les régions `bar`, `rail`
  et `pane`.

Les décisions utilisent au minimum les rôles sémantiques `compact`, `medium` et
`expanded`. `large` ou `extra-large` ne seront ajoutés que lorsqu'un cas et un
oracle prouvent un comportement distinct. Les seuils numériques du Web sont
versionnés avec le design de l'application et testés à leurs limites ; ils ne
sont pas cachés dans plusieurs composants.

La largeur ne suffit pas toujours. La hauteur disponible peut interdire un mode
multi-pane, notamment en paysage, en fenêtre desktop basse ou avec clavier
virtuel. La décision de layout considère donc largeur, hauteur et minima du
contenu ; elle ne se résume jamais à un type de terminal.

## 5. Sélection d'un layout canonique

Le choix dépend de la relation entre les contenus, pas de leur apparence :

- **Feed** : ensemble de contenus équivalents à parcourir, souvent sous forme de
  grille ou de cartes.
- **List-detail** : un élément sélectionné dans la liste contrôle le détail
  affiché à côté. Sans cette relation de sélection, ce classement est faux.
- **Supporting pane** : un contenu principal et un contenu secondaire qui l'aide
  sans être le détail d'un élément sélectionné.
- **Layered task pane** : panneau temporaire au-dessus ou à côté du contenu
  principal pour accomplir une tâche focalisée.

Une page peut combiner un layout canonique avec une stratégie de superposition,
mais cette combinaison doit être nommée et prouvée. Le shell de navigation
(`bar`, `rail`, drawer de navigation) est décidé au niveau de l'application ;
une page métier ne doit pas inventer une seconde navigation globale.

### 5.1 Action principale et FAB

Un FAB n'est pas la décoration mobile par défaut d'une action de création. Il
est réservé à **une seule action de plus haute importance**, idéalement le
parcours le plus courant de la vue. Le verbe `create` ne suffit donc pas à
l'inférer : fréquence, priorité produit, concurrence avec les autres actions et
preuve de présentation doivent le confirmer.

Lorsqu'un FAB est justifié :

- préférer un FAB étendu avec libellé tant que l'icône seule n'est pas prouvée
  suffisamment compréhensible ;
- l'ancrer au scaffold pour qu'il reste disponible au scroll, sans le confondre
  avec une action de navigation ;
- ne rendre qu'un seul contrôle DOM, repositionné par le layout plutôt que
  dupliqué entre header et coin inférieur ;
- réserver l'espace de scroll, respecter les safe areas et le clavier virtuel,
  et prouver qu'aucun contenu ou focus n'est masqué ;
- conserver un bouton natif et un nom accessible explicite ; un FAB icône seul
  exige au minimum un libellé accessible et un tooltip utilisable ;
- ne pas importer Angular Material dans une application non déclarante. Un
  `MatFabButton` devient le choix officiel seulement après adoption explicite de
  la bibliothèque ; le pattern de placement peut rester réalisé localement.

Le plein écran compact n'autorise pas à étirer systématiquement un bouton sur
toute la largeur. La recommandation adaptative officielle préfère une
présentation bornée ou un changement de composant quand l'espace varie. Un choix
entre bouton de heading et FAB doit donc être un arbitrage produit, pas une
conséquence automatique du breakpoint.

## 6. Application à C5 « Gestion des utilisateurs »

C5 n'est pas un `list-detail` : le formulaire crée un nouvel utilisateur et ne
présente pas le détail de la ligne sélectionnée. La classification retenue est
une **liste principale avec panneau de tâche/support de création**.

| Classe     | Comportement candidat                                                                  | Invariants                                                                          |
| ---------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `compact`  | liste seule ; la création ouvre une vue modale ou plein écran                          | retour explicite, focus initial et restauré, aucune perte de liste ou de formulaire |
| `medium`   | liste conservée avec panneau temporaire ou latéral, à arbitrer par une preuve tablette | espace suffisant pour les champs et actions, arrière-plan et focus cohérents        |
| `expanded` | liste et panneau de création côte à côte                                               | contenu principal majoritaire, panneau borné, toast non recouvert                   |

Le changement de classe pendant l'exécution ne doit produire :

- ni nouvelle instance de query ou de commande ;
- ni GET, POST ou invalidation déclenché seulement par le resize ;
- ni perte des filtres, page courante, résultats, valeurs de formulaire, erreurs
  ou soumission en cours ;
- ni duplication d'un contrôle interactif sous deux layouts simultanés ;
- ni perte de focus silencieuse.

La composition C5 `medium` temporaire et la composition `expanded` persistante
ont été approuvées le 2026-09-28 avec le candidat compact. Cette approbation
porte sur leur placement et leur sémantique ; les oracles runtime de modalité,
focus et continuité restent requis avant toute baseline visuelle.

## 7. Règles d'implémentation Angular

Le workspace courant aligne Angular `22.0.7`, Angular Material `22.0.5` et CDK
`22.0.5` dans son catalogue. Toute réalisation doit consulter la documentation
de cette version effective plutôt qu'un exemple historique trouvé sur le Web.

### 7.1 CSS avant JavaScript

- Utiliser CSS pour les changements purement visuels : grille, largeur,
  espacement, ordre non sémantique et wrapping.
- Utiliser `BreakpointObserver` seulement lorsqu'un changement de taille modifie
  réellement la structure, le mode d'interaction ou un état Angular.
- Centraliser les media queries sémantiques ; ne pas répéter des tests
  `window.innerWidth` dans les composants.
- Employer une container query uniquement lorsque le composant dépend de son
  propre espace et non de la fenêtre de l'application.
- Isoler les API navigateur derrière une abstraction testable lorsqu'une cible
  SSR ou hydratée les exécute.

### 7.2 Angular Material et CDK restent opt-in

ADR-0044 reste l'autorité d'installation. Une application qui ne déclare que
Transloco ne reçoit pas Material par une modification de page cachée. Après
adoption explicite :

- préférer le composant Material officiel lorsqu'il couvre le comportement ;
- utiliser CDK Layout, Overlay et A11y pour les primitives manquantes ;
- utiliser les API de thème M3 pour couleur, typographie et densité ;
- ne jamais cibler la structure DOM ou les classes CSS internes de Material ;
- tester les composants Material avec leurs component harnesses ;
- éviter un wrapper générique qui recopierait toute l'API Material.

`MatDrawer`/`MatSidenav`, `MatDialog` ou CDK Overlay sont des candidats, pas une
décision automatique. Le choix dépend de la sémantique : navigation globale,
panneau de contenu persistant ou tâche modale.

### 7.3 État unique, présentations multiples

La composition `list-query` + `action-request` reste indépendante du layout et
de Material. Une adaptation de présentation consomme les mêmes façades et le
même état. Elle ne recrée pas les appels API dans chaque branche de template et
ne déplace pas la coordination métier dans un composant visuel.

## 8. Accessibilité non négociable

Chaque mode doit préserver :

- ordre de lecture et titres cohérents ;
- navigation clavier complète et Échap lorsque le panneau est modal ;
- focus initial, focus piégé uniquement en modal, puis retour au déclencheur ;
- libellés accessibles pour les icônes et contrôles ;
- annonces des succès, erreurs et changements asynchrones ;
- reflow et zoom sans perte de contenu ni défilement bidimensionnel évitable ;
- cible tactile, contraste, réduction de mouvement et états visuels indépendants
  de la seule couleur.

La preuve couvre au minimum le reflow à `320 CSS px`, le zoom texte à `200%`,
l'espacement de texte, les deux orientations et les contenus longs. Les éléments
fixes ou sticky — app bar, FAB, snackbar, footer d'actions — ne doivent masquer
ni contenu opérable ni focus, y compris avec un clavier virtuel.

Un panneau persistant ne doit pas conserver un focus trap modal. Un changement
de classe doit donc adapter la sémantique d'interaction, pas seulement sa
largeur.

## 9. Oracle minimal avant promotion

### Tests déterministes

1. tester les seuils juste en dessous, au seuil et juste au-dessus ;
2. tester `compact`, `medium` et `expanded` avec contenu court et débordant ;
3. redimensionner dans une même session avec liste et formulaire déjà remplis ;
4. prouver zéro appel réseau causé par le resize ;
5. prouver focus, Échap, retour du focus et annonces accessibles ;
6. tester loading, vide, erreur partielle, succès et erreur de création ;
7. utiliser les harnesses officiels si Angular Material est adopté ;
8. inspecter humainement les candidats avant de figer une baseline pixel.

### Critères de sortie ADAPT-1

- matrice des trois classes approuvée ;
- preuve `medium` produite et revue pour C5 ;
- seuils centralisés et justifiés par le contenu ;
- aucune migration Material implicite ;
- mêmes contrats et mêmes instances d'exécution dans tous les layouts ;
- tests de transition de taille et d'accessibilité verts ;
- baseline Chromium créée seulement après ces preuves.

## 10. Anti-patterns refusés

- `isMobile` binaire comme modèle durable de l'application ;
- détection par user-agent ou marque de l'appareil ;
- copie directe des seuils `dp` Android en pixels CSS ;
- branche de template qui duplique query, commande ou formulaire ;
- adoption de Material par import isolé sans manifeste ni recette ;
- surcharge des sélecteurs internes Angular Material ;
- baseline desktop/mobile présentée comme preuve tablette ;
- fidélité pixel qui dégrade contenu, validation ou accessibilité.

## Références officielles

### Doctrine de design

- [Material Design 3](https://m3.material.io/)
- [M3 Foundations](https://m3.material.io/foundations/)
- [M3 — Canonical layout examples](https://m3.material.io/foundations/layout/canonical-examples/overview)

### Référence adaptative Android, non importable dans Angular

- [Android — Adaptive apps](https://developer.android.com/develop/adaptive-apps)
- [Android — Support different display sizes](https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes)
- [Android — Use window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
- [Android — Adaptive do's and don'ts](https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts)
- [Compose Material 3 Adaptive API](https://developer.android.com/reference/kotlin/androidx/compose/material3/adaptive/package-summary)
- [Android — Floating action button](https://developer.android.com/develop/ui/compose/components/fab)
- [Android — Layout actions et FAB dans le scaffold](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [Android — Adapt layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout)

### Implémentation Angular

- [Angular Material](https://material.angular.dev/)
- [Angular Material — components](https://material.angular.dev/components/categories)
- [Angular Material — theming](https://material.angular.dev/guide/theming)
- [Angular Material — sidenav et drawer](https://material.angular.dev/components/sidenav/overview)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [Angular CDK — layout](https://material.angular.dev/cdk/layout/overview)
- [Angular CDK — accessibility](https://material.angular.dev/cdk/a11y/overview)
- [Angular CDK — overlay](https://material.angular.dev/cdk/overlay/overview)
- [Angular Material — component harnesses](https://material.angular.dev/guide/using-component-harnesses)

### Normes Web

- [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WAI-ARIA — Modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [WCAG 2.2 — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.2 — Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)
- [WCAG 2.2 — Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)
- [WCAG 2.2 — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [WCAG 2.2 — Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)
- [WCAG 2.2 — Input Modalities](https://www.w3.org/WAI/WCAG22/Understanding/input-modalities)
- [WCAG 2.2 — Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation)
- [WAI — Forms tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [Chrome — VirtualKeyboard API](https://developer.chrome.com/docs/web-platform/virtual-keyboard)
