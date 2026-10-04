# ADR-0081 — Choisir une surface de création selon la tâche et l'espace utile

- **Statut :** Accepted
- **Date :** 2026-10-03
- **Remplace :**
  [ADR-0076 retiré](./0076-surface-creation-adaptative-bornee-par-contenu.md)
- **Version Angular vérifiée :** 22.2.0
- **Sources officielles revérifiées :** 2026-10-03

## Contexte

Une première décision C5 associait directement une géométrie de création à
chaque classe de fenêtre. La revue des sources officielles montre que ce mapping
n'est pas normatif :

- les classes de fenêtre aident à prendre des décisions de layout de haut
  niveau, mais ne prescrivent pas la géométrie d'un formulaire ;
- Angular CDK fournit un dialogue centré par défaut et permet une stratégie de
  position explicite, sans recommander un ancrage droit pour une création ;
- SAP Fiori centre les dialogues et recommande le plein écran sur smartphone ;
- Material distingue les dialogues basiques et plein écran, tandis qu'un bottom
  sheet répond à une autre famille d'interactions ;
- WAI-ARIA définit la modalité, le nom et le focus, pas une largeur ou une
  position visuelle universelle.

Le dépôt doit donc préserver les règles officielles et laisser la preuve de
présentation décider uniquement ce que les standards ne décident pas.

## Options envisagées

### Option A — Conserver une matrice géométrique par breakpoint

- avantage : génération et tests simples ;
- limites : faux sentiment de standard, mauvaise adaptation aux formulaires
  différents et mélange entre filtre, side sheet et dialogue transactionnel.

### Option B — Laisser chaque renderer improviser

- avantage : liberté maximale ;
- limites : incohérences, recherche répétée, décisions impossibles à auditer et
  accessibilité dépendante de chaque implémentation.

### Option C — Algorithme de choix borné par la tâche et l'espace utile

- avantages : primitives officielles par défaut, adaptation au contenu,
  exceptions justifiées et critères testables ;
- coût : la géométrie finale exige une preuve produit propre à la
  fonctionnalité.

## Décision

**Option C.** Une surface de création est choisie en deux temps : d'abord la
nature de la tâche, ensuite l'espace réellement disponible. Un nom de terminal
ou de breakpoint ne suffit jamais à décider seul.

### 1. Choisir la famille de surface

Utiliser par défaut :

1. un **dialogue modal** pour une création courte, transactionnelle et
   interruptive, lorsque conserver le contexte arrière aide l'utilisateur ;
2. un **dialogue plein écran** lorsque le clavier, le zoom, la hauteur, les
   erreurs ou la densité rendent le dialogue borné inconfortable ;
3. une **page dédiée** pour un parcours long, multi-étapes, partageable par URL,
   récupérable plus tard ou nécessitant beaucoup de contexte ;
4. un **bottom sheet** seulement pour une tâche courte dont le contenu, le
   clavier et les erreurs ont été prouvés dans la hauteur disponible ;
5. une **side sheet** seulement lorsque la relation au contenu principal et
   l'accès simultané à ce contenu constituent un besoin produit explicite.

Un formulaire de création ne devient donc ni bottom sheet sur toute petite
fenêtre, ni side sheet à droite sur toute fenêtre intermédiaire.

### 2. Placement par défaut

Le dialogue modal est **centré par défaut**, conformément à la stratégie de
position initiale d'Angular CDK et au comportement documenté par SAP Fiori.

Une autre position doit posséder :

- une raison liée à la tâche, pas une simple ressemblance visuelle ;
- une preuve que le déclencheur et la surface conservent une relation utile ;
- une vérification clavier, zoom, lecture droite-à-gauche et redimensionnement ;
- un oracle propre à la fonctionnalité.

### 3. Dimensionnement

La surface utilise une taille naturelle bornée par l'espace utile :

- marges provenant des tokens du design system adopté ;
- largeur maximale déterminée par la lisibilité du contenu et validée par la
  présentation, non par une fourchette globale du générateur ;
- hauteur maximale respectant viewport, safe areas et clavier virtuel ;
- header et actions stables lorsque le corps doit défiler ;
- aucun scroll horizontal de document ou de formulaire pour compenser une
  largeur insuffisante.

Les valeurs propres à Material, Fiori ou une autre bibliothèque sont appliquées
par leur composant officiel. Elles ne deviennent pas des constantes universelles
de la plateforme.

### 4. Colonnes du formulaire

Une colonne est le défaut le plus robuste. Deux colonnes sont admises lorsque :

- les champs sont logiquement associés ;
- chaque contrôle, label, aide et erreur conserve sa largeur minimale ;
- l'ordre DOM, visuel et clavier reste cohérent ;
- le zoom et les textes longs ne créent ni collision ni ordre ambigu ;
- la disposition reflue immédiatement en une colonne quand ces conditions ne
  sont plus vraies.

Le nombre de colonnes dépend donc de la largeur **intérieure du formulaire**, et
non directement de `compact`, `medium` ou `expanded`.

### 5. Vocabulaire adaptatif

Les classes Material restent une aide de raisonnement pour l'application. Une
preuve Web peut employer des seuils propres au conteneur, mais elle doit les
nommer et les versionner sans prétendre qu'ils sont les breakpoints officiels.

Pour éviter l'ambiguïté, une preuve locale qui ne suit pas les seuils Material
emploie de préférence `narrow`, `regular` et `wide`, ou documente explicitement
la différence.

### 6. Implémentation Angular

Pour Angular 22.2 :

1. utiliser `MatDialog` lorsque l'application a adopté Angular Material ;
2. sinon utiliser `@angular/cdk/dialog` et les primitives CDK officielles avant
   de construire un overlay local ;
3. conserver le centrage fourni par défaut sauf décision produit prouvée ;
4. utiliser `maxWidth`, `maxHeight`, la stratégie de scroll et les APIs de
   restitution du focus plutôt que reproduire leur comportement ;
5. préférer CSS et les container/media queries pour un simple reflow ;
6. utiliser `BreakpointObserver` seulement si le mode d'interaction ou la
   structure change réellement ;
7. conserver une seule instance métier du formulaire pendant le resize.

Cette hiérarchie complète ADR-0077 : primitive officielle d'abord, adaptation
locale bornée ensuite.

## Application à C5

Le formulaire C5 comporte cinq champs et un POST. Le runtime applique désormais
la proposition suivante, avec des preuves navigateur comportementales. Elle ne
constitue pas encore une nouvelle baseline visuelle de page :

| Espace utile                   | Proposition par défaut                                                  | Statut    |
| ------------------------------ | ----------------------------------------------------------------------- | --------- |
| étroit ou clavier contraignant | dialogue plein écran, une colonne                                       | prouvé au runtime |
| régulier                       | dialogue modal centré, une colonne                                      | prouvé au runtime |
| large                          | dialogue modal centré, une ou deux colonnes selon la largeur intérieure | prouvé au runtime |

Le bottom sheet compact, l'ancrage droit intermédiaire et les fourchettes
`520–640` / `640–760` sont retirés des invariants. Une nouvelle preuve peut
retrouver l'un de ces choix, mais uniquement à partir de tests de contenu et
d'une validation produit explicite.

## Critères de validation d'une surface

### Choix de surface

- la nature modale, plein écran ou page dédiée est justifiée par la tâche ;
- la géométrie ne provient pas seulement d'un breakpoint ;
- toute dérogation à la primitive officielle est documentée.

### Présentation

- les champs, erreurs et actions restent lisibles sans collision ;
- la largeur est bornée sans étirement inutile ;
- une colonne reste disponible comme repli sûr ;
- seul le corps défile lorsque le contenu dépasse la hauteur utile ;
- les actions essentielles restent atteignables.

### Adaptation

- 320 CSS px, hauteur courte, zoom 200 % et clavier virtuel sont testés ;
- les textes longs et localisés sont testés ;
- le resize conserve valeurs, erreurs, soumission et focus ;
- la classe de largeur et la classe de hauteur sont considérées séparément.

### Modalité et accessibilité

- nom, rôle et description programmatiques ;
- arrière-plan réellement inerte et focus borné lorsque la surface est modale ;
- fermeture, abandon du brouillon et restitution du focus cohérents ;
- erreurs annoncées et liées aux champs ;
- aucun critère visuel ne remplace les preuves clavier et lecteur d'écran.

### Réseau et état

- zéro POST lorsque la validation locale échoue ;
- une seule soumission en vol ;
- brouillon conservé après erreur distante ;
- fermeture, notification et actualisation exécutées exactement une fois après
  succès.

Une capture ne peut valider que la partie présentation. Une surface n'est
validée qu'après réunion des preuves visuelles, comportementales et
d'accessibilité.

## Conséquences

### Positives

- disparition des géométries arbitraires du contrat générique ;
- alignement avec Angular CDK/Material et les recommandations Fiori ;
- meilleure réutilisation sur des formulaires de tailles différentes ;
- séparation claire entre norme officielle, décision produit et preuve locale.

### Coûts et dette temporaire

- les références ADAPT-10 ne sont plus des autorités actives ;
- les assertions Playwright qui imposent leur géométrie doivent être remplacées
  ;
- C5 nécessite de nouveaux candidats avant toute baseline visuelle bloquante ;
- la surface runtime actuelle peut rester fonctionnelle sans être considérée
  comme la géométrie définitive.

## État de la migration

1. les assertions géométriques issues d'ADR-0076 ont été retirées sans affaiblir
   les oracles de modalité, focus, validation et réseau ;
2. le runtime et les scénarios C5 emploient `étroit`, `régulier` et `large` ;
3. le cas étroit plein écran est vérifié avec erreurs, zoom 200 % et 320 CSS px ;
4. le passage une/deux colonnes est prouvé à partir de la largeur intérieure ;
5. les références et protocoles incompatibles sont archivés avec
   `authority: none` ;
6. une future baseline visuelle devra faire l'objet d'une validation humaine
   explicite avant publication. L'absence de baseline n'affaiblit pas les
   oracles comportementaux actuels.

## Références officielles

- [Angular CDK — Dialog API](https://material.angular.dev/cdk/dialog/api)
- [Angular Material — Dialog](https://material.angular.dev/components/dialog/overview)
- [Angular Material — Dialog API](https://material.angular.dev/components/dialog/api)
- [SAP Fiori — Dialog](https://experience.sap.com/fiori-design-web/dialog-web-component/)
- [Material 3 — Dialogs](https://m3.material.io/components/dialogs/guidelines)
- [Material 3 — Bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines)
- [Android — Window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
- [Android — Adaptive do's and don'ts](https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts)
- [WAI-ARIA APG — Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Références du dépôt

- [ADR-0072 — UI adaptative guidée par M3](./0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [ADR-0077 — UI Angular officielle avant custom](./0077-ui-angular-officielle-avant-custom.md)
- [Autorité C5 d'accessibilité et de mise en page](../architecture/c5-adapt11c-autorite-accessibilite-mise-en-page-2026-10-02.md)
