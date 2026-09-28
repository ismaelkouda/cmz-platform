# ADR-0072 — Guider l'UI adaptative par M3 et les API officielles de la cible

- **Statut :** accepté
- **Date :** 2026-09-28
- **Décision :** utiliser Material 3 comme doctrine de design adaptatif, puis
  implémenter avec les API officielles de la cible sans importer le runtime
  adaptatif d'une autre plateforme

## Contexte

La preuve C5 couvre un viewport mobile et un viewport desktop. Elle ne prouve ni
tablette, ni redimensionnement en cours d'utilisation. Son modèle binaire
risquerait de devenir une convention implicite alors que le projet vise des
applications de formes variées.

Material 3 documente le scaffold et trois layouts canoniques sur des breakpoints
compacts, moyens et étendus. Compose Material 3 Adaptive fournit une
implémentation Android de ces concepts. Angular Material et Angular CDK
fournissent de leur côté les composants et primitives Web maintenus pour
Angular. Ces couches sont complémentaires, mais non interchangeables.

## Options envisagées

### Option A — Conserver mobile/desktop au cas par cas

- Avantage : aucun travail de formalisation immédiat.
- Inconvénients : tablette non prouvée, seuils dispersés, états perdus au resize
  et décisions différentes entre pages.

### Option B — Reproduire directement Compose Material 3 Adaptive

- Avantage : modèle adaptatif documenté et composants canoniques disponibles.
- Inconvénients : API Kotlin/Android étrangère à Angular, unités et cycle de vie
  différents, création d'une abstraction locale difficile à maintenir.

### Option C — Doctrine M3, implémentation officielle propre à la cible

- Avantages : vocabulaire UX commun, composants supportés par Angular,
  accessibilité réutilisée et absence de runtime parallèle.
- Inconvénient : chaque cible doit prouver son mapping et certaines briques M3
  peuvent ne pas exister telles quelles sur le Web.

## Décision

**Option C.** La hiérarchie, les layouts canoniques et les principes
d'adaptation viennent de Material 3. Les exemples Android servent de référence
comportementale. Une cible Angular utilise CSS, Angular Material et Angular CDK
selon les bibliothèques explicitement adoptées par l'application.

Les classes `compact`, `medium` et `expanded` décrivent l'espace disponible,
jamais un type d'appareil. Les seuils Web sont centralisés, justifiés par le
contenu et testés aux limites ; les valeurs Android en `dp` ne sont pas
transposées aveuglément en pixels CSS.

C5 est classé **liste principale + panneau de tâche/support**, pas
`list-detail`. La création ne montre pas le détail d'un utilisateur sélectionné.
Une preuve `medium` est requise avant sa baseline visuelle définitive.

## Invariants

- mêmes contrats, façades et instances d'exécution à toutes les tailles ;
- aucun appel réseau, reset métier ou invalidation provoqué par le resize ;
- état de liste et de formulaire conservé lors d'un changement de classe ;
- mode modal avec focus borné, mode persistant sans focus trap ;
- CSS pour la présentation, observation Angular seulement si le comportement ou
  la structure change ;
- Angular Material/CDK restent opt-in conformément à ADR-0044 ;
- aucune surcharge des détails DOM/CSS privés d'Angular Material.

## Conséquences

### Positives

- mobile, tablette et desktop partagent une doctrine explicite ;
- un LLM reçoit des règles vérifiables au lieu d'inventer un responsive ;
- l'accessibilité et le changement dynamique deviennent des critères de sortie ;
- le cœur `list-query` / `action-request` reste indépendant du design system.

### Négatives / dette acceptée

- C5 doit recevoir une référence et un scénario navigateur `medium` avant sa
  baseline ;
- la documentation officielle est vivante : le mapping vers les API doit être
  revérifié à chaque montée majeure Angular/Material ;
- M3 ne couvre pas nécessairement chaque composant sur le Web, ce qui peut
  conduire à composer une primitive CDK locale plutôt qu'à copier Android.

### Points à réévaluer

- ajout de `large`/`extra-large` seulement après un cas produit réel ;
- promotion d'un scaffold partagé seulement après deux applications prouvant le
  même besoin ;
- éventuelle adoption de Material par C5 dans un work order séparé, jamais comme
  conséquence cachée de cette décision.

## Références

- [Doctrine détaillée ADAPT-1](../architecture/ui-adaptative-references-officielles.md)
- [ADR-0041](./0041-angular-material-tailwind-defaults.md)
- [ADR-0044](./0044-bibliotheques-ui-opt-in-apres-create-app.md)
- [ADR-0066](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0070](./0070-harnais-navigateur-avant-baseline-visuelle.md)
- [ADR-0071](./0071-arbitrer-ecarts-c5-avant-baseline-chromium.md)
- [Material 3 — canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Android — window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
- [Angular Material](https://material.angular.dev/)
- [Angular CDK — layout](https://material.angular.dev/cdk/layout/overview)
