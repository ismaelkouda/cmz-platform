# C5 ADAPT-2 — audit de placement multi-fenêtre

- **Date :** 2026-09-28
- **Statut :** approuvé produit le 2026-09-28 ; revue technique de PR requise
- **Périmètre :** page C5 « Gestion des utilisateurs », de `320px` au très grand
  écran, zoom et redimensionnement compris
- **Autorités :** contrats C5, WCAG 2.2, preuve de présentation approuvée,
  Material 3, Android Adaptive, Angular Material/CDK `22.0.5`, preuves locales

## 1. Verdict

Le FAB n'est pas une correction isolée. La page doit être traitée comme un
scaffold adaptatif complet dont chaque région change selon **l'espace réellement
disponible à l'application**, et jamais selon le nom supposé de l'appareil.

L'implémentation actuelle prouve correctement une partie de la continuité au
resize, mais elle ne peut pas encore devenir une baseline :

1. en compact, `.filter-actions` masque « Effacer » et « Appliquer » ; un filtre
   `select` n'a donc plus de chemin explicite de validation ;
2. le système ne possède que deux projections CSS, `<=800px` et `>=801px` ; le
   mode `expanded` persistant n'existe pas ;
3. les cartes compactes n'affichent pas « Mise à jour », présent dans la table ;
   la parité de capacité n'est ni décidée ni prouvée ;
4. à `1024px`, la table passe, mais la rangée de filtres atteint sa limite et le
   libellé de statut est comprimé ;
5. le formulaire en erreur répète la même panne dans un résumé, sous l'email et
   dans un toast ;
6. le bouton compact pleine largeur, le FAB étendu et le bouton de heading
   restent des candidats tant que la création n'est pas confirmée comme action
   principale et fréquente ;
7. les hauteurs faibles, le clavier virtuel, le zoom, le texte agrandi, les
   libellés longs, le paysage et les très grandes largeurs ne sont pas prouvés.
8. les bordures `#c7d3e3` qui matérialisent les champs et boutons secondaires
   atteignent seulement `1.52:1` sur blanc ; lorsqu'elles sont nécessaires pour
   identifier le contrôle, le minimum WCAG non textuel est `3:1`.

Les points 1 et 2 bloquent une baseline. Les autres bloquent la promotion d'une
présentation adaptative réputée générale.

## 2. Méthode et limites

L'audit combine :

- inspection du HTML et du SCSS réels ;
- inspection des quatre candidats Playwright existants ;
- preuve automatique `799/800/801px` et `390 -> 1024px` ;
- documentation officielle M3, Android Adaptive, Angular Material/CDK et W3C ;
- vérification des types effectivement installés : Angular `22.0.7`, Material
  et CDK `22.0.5`.

Les recommandations Android exprimées en `dp` sont des précédents de design,
pas des pixels CSS à recopier. Les seuils Web doivent être dérivés du contenu,
testés juste avant, au seuil et juste après, puis centralisés.

L'audit ne mesure pas encore les contrastes calculés, ne simule pas un vrai
clavier mobile et ne constitue pas un test utilisateur. Ces preuves restent
obligatoires avant promotion.

## 3. Modèle de fenêtre retenu

La largeur choisit l'organisation principale ; la hauteur peut la refuser. Une
fenêtre `1024x500` n'est pas équivalente à `1024x768`.

| Profil sémantique | Intention produit | Point de preuve initial | Règle de hauteur |
| --- | --- | --- | --- |
| `compact` | une tâche et une colonne ; résultats en cartes | `320`, `390`, `800px` | le formulaire doit rester utilisable avec clavier virtuel et footer visible |
| `medium` | liste prioritaire ; tâche en couche temporaire | `801`, `1024px` | une hauteur compacte conserve le mode temporaire et évite deux panneaux exigus |
| `expanded` | liste et tâche visibles côte à côte quand la création est ouverte | candidat `>=1200px`, à calibrer | le mode côte à côte n'est permis que si les deux panneaux gardent leurs minima |
| `large/xlarge` | même sémantique que `expanded`, contenu borné | `1440`, `1920`, `2560px` | ne pas étirer table, formulaire ou lignes à l'infini |

`1200px` n'est pas une règle de plateforme. C'est un point de départ calculable :
environ `720px` pour la liste, `360px` pour le formulaire, un gutter de `24px`
et les marges du shell. La preuve de contenu peut déplacer ce seuil. Aucun
profil supplémentaire n'est créé sans comportement distinct.

## 4. Scaffold cible, élément par élément

### 4.1 App bar et shell

**Invariant :** une seule app bar, un seul `<main>`, un titre de page unique et
un ordre DOM stable.

- `compact` : hauteur bornée, marges latérales compactes, marque et identité
  sans troncature destructrice ; aucun contrôle métier ajouté à la navigation
  globale ;
- `medium` : mêmes régions, marges croissantes mais bornées ;
- `expanded` : contenu centré ou organisé en panes avec une largeur maximale ;
  les pourcentages seuls sont refusés sur ultra-wide.

La page doit être vérifiée avec identité longue, traduction longue, zoom `200%`
et reflow équivalent à `320 CSS px`.

### 4.2 Titre, description et action principale

**Invariant :** le titre précède la zone de travail dans le DOM ; l'action
existe une seule fois et conserve permission, nom accessible et déclencheur de
retour du focus.

- `compact` : candidat préféré **si l'action est confirmée principale et
  fréquente** : FAB étendu « + Créer un utilisateur », ancré au scaffold ; le
  contenu reçoit un espace inférieur suffisant pour ne pas être recouvert ;
- `medium` : bouton borné dans le heading ; un FAB peut rester pertinent dans
  une interface orientée défilement, mais ce n'est pas automatique ;
- `expanded` : bouton dans le heading ; lorsque le panneau est déjà ouvert,
  masquer ou désactiver le déclencheur selon la décision produit, sans le
  dupliquer.

Un FAB icône seul est refusé à ce stade. Le bouton pleine largeur actuel reste
fonctionnel mais n'est pas le candidat recommandé : il consomme une rangée et
étire un contrôle court. Angular Material ne sera ajouté que via son mécanisme
d'adoption explicite ; sinon le pattern est réalisé avec un bouton natif.

### 4.3 Recherche, filtres et actions de filtres

**Invariant :** toute valeur modifiable a un chemin explicite pour être
appliquée et effacée ; `Enter` dans la recherche ne remplace pas les actions des
listes déroulantes.

- `compact` : recherche toujours visible ; filtres secondaires derrière un
  bouton « Filtres » avec état ouvert/fermé, compteur ou résumé des filtres
  actifs ; « Appliquer » et « Effacer » restent visibles dans la région
  déployée ;
- `medium` : grille de deux colonnes ou deux rangées, actions sur une rangée
  dédiée ; la grille actuelle à cinq colonnes est refusée à `1024px` tant que
  les libellés et valeurs longues ne passent pas ;
- `expanded` : une ou deux rangées selon la largeur réelle du pane principal,
  pas selon la largeur totale de la fenêtre.

Le composant dépend ici de son conteneur quand le panneau persistant est ouvert.
Une container query est donc un candidat plus juste qu'une seconde détection de
l'appareil, à condition de garder les seuils centralisés et testables.

### 4.4 Résultats : table et cartes

**Invariant :** même requête, mêmes éléments, mêmes droits et mêmes décisions
possibles. Une projection peut condenser l'information mais ne doit pas perdre
une donnée métier nécessaire.

- `compact` : cartes en une colonne ; email long repliable ; libellés explicites
  pour profil, rôle, statut et éventuelle date de mise à jour ;
- `medium` : table native si son contenu réel tient ; sinon cartes ou table dans
  un conteneur horizontal local et clairement opérable, jamais un scroll
  horizontal de toute la page ;
- `expanded` : table native dans le pane principal, colonnes dimensionnées par
  priorité et non étirées artificiellement.

Décision produit requise : « Mise à jour » est-elle nécessaire à la décision de
l'utilisateur ? Si oui, elle doit apparaître dans la carte. Sinon, son affichage
desktop est un enrichissement explicitement non essentiel. Une différence
silencieuse est refusée.

Le tableau reste un tableau HTML statique tant qu'il n'offre ni édition de
cellule ni navigation composite. Lui donner `role="grid"` sans implémenter le
clavier de grille serait une régression.

### 4.5 Comptage, rechargement et pagination

**Invariant :** total, position courante et navigation restent compréhensibles ;
le resize ne change ni page ni requêtes.

- `compact` : résumé `N utilisateurs` et `Page X / Y`, boutons Précédent/Suivant
  pleine cible ; les numéros peuvent être omis visuellement si l'information de
  position demeure ;
- `medium/expanded` : plage de résultats, numéros utiles, précédent/suivant ;
- tous profils : `aria-current="page"`, groupe nommé, états désactivés natifs,
  annonce polie après chargement sans déplacer le focus.

### 4.6 Surface de création

La création est une **tâche focalisée**, pas le détail d'une ligne. Le précédent
M3 pertinent est le `layered task pane`; le supporting pane donne la règle de
partage quand la tâche devient persistante.

- `compact` : dialogue plein écran ou vue de tâche ; arrière-plan inerte,
  `aria-modal`, focus initial contrôlé, piège de focus, Échap/retour et
  restauration au déclencheur ;
- `medium` : side sheet modale temporaire et bornée ; backdrop, focus trap et
  restauration ;
- `expanded` : pane latéral `side` persistant lorsque la création est ouverte ;
  **pas** de backdrop, `aria-modal` ni focus trap ; liste environ `70%`, pane
  environ `30%`, corrigés par `min/max` de contenu ;
- hauteur compacte : revenir au mode temporaire si le formulaire et ses actions
  ne peuvent pas rester opérables côte à côte.

Le composant Angular Material adéquat dépend de l'adoption : `MatDialog` ou
overlay pour la modalité, `MatDrawer` en `over` pour le temporaire et en `side`
pour le persistant. Les types locaux confirment que `side` ne déplace pas le
focus automatiquement par défaut, contrairement aux modes temporaires. Sans
Material, ces mêmes sémantiques restent à implémenter et tester localement.

### 4.7 Formulaire et actions

**Invariant :** labels visibles, champs requis annoncés, erreurs reliées aux
champs, état conservé au resize, validation client et serveur distinctes.

- largeur du formulaire bornée ; ne pas étirer les champs sur un ultra-wide ;
- footer d'actions visible ou sticky uniquement si aucun champ focalisé n'est
  masqué ; prévoir `scroll-padding` et l'occlusion du clavier ;
- ordre principal puis secondaire cohérent avec la plateforme et le DOM ;
- un seul affordance d'annulation explicite suffit en compact, sauf preuve que
  « Fermer » et « Annuler » ont des effets différents ;
- au submit invalide, amener le focus au premier champ invalide ou au résumé
  d'erreurs selon une règle documentée ; conserver le focus sur l'email après
  un conflit serveur est correct.

### 4.8 Erreurs, succès et toasts

**Invariant :** une information a une source principale et une annonce
assistive ; elle n'est pas criée trois fois.

- erreur de champ connue, comme email existant : message inline associé au
  champ, éventuellement résumé unique si plusieurs erreurs ; pas de toast
  concurrent portant le même échec ;
- panne globale de création : résumé persistant dans le formulaire ; toast
  seulement si le formulaire n'est plus visible ou si le message est réellement
  transversal ;
- succès : fermer la tâche, restaurer le focus selon le nouveau contexte,
  rafraîchir la liste puis annoncer un statut poli ;
- panne partielle de query : bannière persistante près des résultats et données
  déjà chargées conservées.

Un snackbar ne reçoit pas le focus. Un `role="alert"` est réservé à l'urgence ;
les succès et progressions utilisent une annonce polie. Le toast fixe doit
respecter safe areas, clavier, FAB et focus visible.

### 4.9 Loading, vide et reloading

- chargement initial : état nommé, spinner décoratif ou progressbar correctement
  libellé, pas de faux tableau vide ;
- reloading : résultats conservés, `aria-busy`, annonce polie non répétitive ;
- vide filtré : proposer d'effacer les filtres ;
- vide initial : proposer la création seulement si elle est autorisée ;
- erreur partielle : distinguer données périmées et absence totale de données.

### 4.10 Contraste, focus et états d'interaction

La mesure locale des couleurs déclarées donne notamment :

| Usage | Rapport mesuré | Lecture |
| --- | ---: | --- |
| bouton primaire `#2864e8` / blanc | `5.15:1` | texte normal conforme AA |
| texte secondaire `#526581` / blanc | `5.94:1` | texte normal conforme AA |
| statut vert `#087b34` / blanc | `5.39:1` | texte normal conforme AA |
| statut rouge `#c21d1d` / blanc | `6.02:1` | texte normal conforme AA |
| bordure de contrôle `#c7d3e3` / blanc | `1.52:1` | insuffisant si la bordure identifie le contrôle |
| séparateur `#d8e1ed` / blanc | `1.32:1` | acceptable seulement s'il n'est pas porteur d'information |

Ces rapports ne valident pas à eux seuls les composants. Le prochain lot doit :

- donner aux champs et boutons secondaires une frontière ou un fond perceptible
  à `3:1` lorsqu'ils sont nécessaires à leur identification ;
- conserver un indicateur `:focus-visible` distinct, suffisamment contrasté et
  non masqué dans tous les profils ;
- prouver disabled, hover, pressed, selected, invalid et loading sans dépendre
  uniquement de la couleur ;
- exécuter axe sur les états représentatifs puis compléter par une inspection
  clavier et lecteur d'écran, car un scan automatique ne juge ni l'ordre mental
  ni la pertinence des messages.

### 4.11 Densité et modalités d'entrée

Une grande fenêtre n'implique pas une souris, et une petite fenêtre n'implique
pas le tactile. Un ordinateur peut avoir un écran tactile ; une tablette peut
avoir clavier et trackpad ; une fenêtre desktop peut être réduite à `390px`.

- conserver clavier, pointeur précis, toucher et technologies d'assistance dans
  tous les profils ;
- ne jamais révéler une action uniquement au hover ; tout contenu additionnel
  déclenché au hover/focus doit être dismissible, hoverable et persistant ;
- ne pas réduire les cibles seulement parce que la fenêtre est `expanded` ; une
  densité plus compacte est une préférence ou un signal d'entrée distinct, pas
  une conséquence automatique de la largeur ;
- éviter toute opération uniquement par swipe ou drag ; pagination, fermeture
  et filtres disposent déjà d'actions ponctuelles explicites ;
- vérifier ordre de tabulation, activation `Enter`/`Space`, scroll clavier,
  molette/trackpad et toucher sans gestionnaire spécifique inutile.

## 5. Matrice de décision compacte

| Élément | `compact` | `medium` | `expanded` | Oracle indispensable |
| --- | --- | --- | --- | --- |
| shell | colonne, marges compactes | marges bornées | panes + max-width | 320px, 200%, texte long |
| création | FAB étendu conditionnel | bouton heading | bouton heading | permission, scroll, focus |
| filtres | recherche + disclosure | grille 2 colonnes | adaptée au pane | appliquer/effacer toujours accessibles |
| résultats | cartes | table si elle tient | table | mêmes items et capacité |
| pagination | résumé + précédent/suivant | complète | complète | page conservée au resize |
| formulaire | dialogue plein écran | side sheet modale | pane persistant | modalité et focus exacts |
| feedback | inline + statut borné | idem | idem | une annonce, aucun recouvrement |

## 6. Matrice de preuve minimale

### Dimensions

- `320x568` : reflow minimal ;
- `390x844` : compact approuvé existant ;
- `800x900`, `801x900` : frontière historique exacte ;
- `844x390` : paysage large mais très bas ;
- `1024x768` : medium candidat ;
- `1280x720` : desktop de faible hauteur ;
- `1440x1024` : expanded approuvé existant ;
- `1920x1080` et `2560x1440` : étirement et largeur maximale.

### Variations d'accès et de contenu

- zoom navigateur `200%` sans perte ; reflow à une largeur équivalente à
  `320 CSS px`/zoom `400%` sans scroll bidirectionnel hors contenu tabulaire ;
- espacement de texte WCAG ; orientation portrait et paysage ;
- clavier seul, lecteur d'écran au minimum sur les parcours critiques ;
- clavier virtuel réel sur un navigateur mobile représentatif ;
- texte français long, autre locale plus expansive, nom et email sans coupure
  possible ;
- permission de création accordée et refusée ;
- 0, 1, 5 et beaucoup de résultats ; pages première, intermédiaire et dernière ;
- loading initial, ready, reloading, vide, erreur partielle, succès, validation
  locale, conflit email, panne globale ;
- formulaire fermé, vierge, rempli, invalide et soumis pendant chaque resize.

### Invariants automatisés

1. zéro GET, POST ou invalidation causé par le resize ;
2. même instance de composition et même état ;
3. aucune action interactive dupliquée dans deux projections visibles ;
4. page, filtres, données, formulaire, erreur et focus conservés ;
5. pas de scroll horizontal de page ;
6. aucun focus caché par app bar, FAB, toast, footer ou clavier ;
7. sémantique modale uniquement dans les modes modaux ;
8. cibles au moins conformes WCAG `24x24 CSS px`, avec taille plus généreuse
   pour les actions tactiles fréquentes ;
9. snapshots uniquement après approbation humaine des états représentatifs.
10. contraste texte et non-texte mesuré sur chaque état, puis scan axe sans
    violation critique ou sérieuse non arbitrée.

## 7. Séquence de réalisation recommandée

L'audit et ses choix ont été approuvés par le porteur produit le 2026-09-28.
Cette approbation autorise la préparation des lots ; elle ne remplace pas la
revue technique de la PR ni les preuves visuelles des futures réalisations.

1. faire relire techniquement cet audit et les deux PNG `medium` ;
2. corriger d'abord le défaut fonctionnel des filtres compacts dans un work
   order borné ;
3. obtenir la décision produit « création = action principale/fréquente » et la
   décision de parité sur `updated_at` ;
4. produire trois candidats cohérents : compact avec action, medium temporaire,
   expanded persistant ;
5. faire approuver placement, hiérarchie et sémantique avant code visuel ;
6. centraliser les classes de fenêtre et implémenter sans recréer la
   composition ;
7. exécuter la matrice fonctionnelle, accessibilité et redimensionnement ;
8. seulement ensuite calibrer et figer la baseline Chromium.

L'ordre évite d'automatiser une mauvaise disposition et empêche une baseline de
sanctuariser les defects actuels.

## 8. Décisions refusées

- `create -> FAB` comme règle de génération ;
- `mobile/tablette/desktop` déduits du user-agent ;
- copie de `600dp/840dp` en `600px/840px` sans preuve de contenu ;
- deux DOM interactifs, l'un caché par CSS ;
- piège de focus dans un pane persistant ;
- table transformée en grille ARIA sans clavier de grille ;
- filtres modifiables sans action explicite ;
- toast, résumé et champ annonçant simultanément la même erreur ;
- plein écran étirant boutons, champs et table sans largeur maximale ;
- baseline créée avant résolution des blockers.

## 9. Références officielles

### Layout et adaptation

- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Android — support different display sizes](https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes)
- [Android — use window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
- [Android — canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
- [Android — adapt layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout)
- [Android — desktop foundations](https://developer.android.com/design/ui/desktop/guides/foundations/get-started)
- [Android — FAB](https://developer.android.com/develop/ui/compose/components/fab)
- [Android — Scaffold](https://developer.android.com/develop/ui/compose/components/scaffold)

### Angular `22.0.x`

- [Angular Material — button/FAB](https://material.angular.dev/components/button/overview)
- [Angular Material — table](https://material.angular.dev/components/table/overview)
- [Angular Material — paginator](https://material.angular.dev/components/paginator/overview)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [Angular Material — sidenav/drawer](https://material.angular.dev/components/sidenav/overview)
- [Angular Material — snackbar](https://material.angular.dev/components/snack-bar/overview)
- [Angular CDK — layout](https://material.angular.dev/cdk/layout/overview)
- [Angular CDK — accessibility](https://material.angular.dev/cdk/a11y/overview)

### Web et accessibilité

- [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
- [WCAG 2.2 — Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)
- [WCAG 2.2 — Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)
- [WCAG 2.2 — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [WCAG 2.2 — Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)
- [WCAG 2.2 — Input Modalities](https://www.w3.org/WAI/WCAG22/Understanding/input-modalities)
- [Android Adaptive — input beyond touch](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps)
- [WCAG 2.2 — Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation)
- [WCAG 2.2 — Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order)
- [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [WCAG 2.2 — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WAI — forms labels, instructions and validation](https://www.w3.org/WAI/tutorials/forms/)
- [WAI-ARIA APG — table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [Chrome — VirtualKeyboard API](https://developer.chrome.com/docs/web-platform/virtual-keyboard)
