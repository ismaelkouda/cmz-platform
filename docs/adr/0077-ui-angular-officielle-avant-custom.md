# ADR-0077 — UI Angular officielle avant comportement custom

- **Statut :** Accepted
- **Date :** 2026-10-01
- **Supersède :** uniquement « Material pour toute primitive interactive » dans
  [ADR-0041](./0041-angular-material-tailwind-defaults.md) ; son thème M3, sa
  coexistence Tailwind et ses recettes restent applicables

## Contexte

Le profil Angular du dépôt privilégie Material et Tailwind, tandis que plusieurs
applications possèdent un contrat visuel propre et utilisent déjà HTML, CSS et
CDK directement. Angular 22 rend Angular Aria stable : ses directives headless
portent les comportements WAI-ARIA sans imposer de style.

Sans ordre de décision explicite, un humain ou un LLM peut soit réécrire
clavier, focus et attributs ARIA, soit ajouter Material/Aria/CDK à un contrôle
HTML déjà suffisant. Les deux choix augmentent les risques et la maintenance.

## Options envisagées

### Option A — Tout construire localement

- avantage : contrôle total du DOM et du style ;
- inconvénients : expertise a11y dupliquée, tests lourds, dérive clavier/focus.

### Option B — Angular Material pour toute interaction

- avantage : composants complets, thème M3 et harnesses ;
- inconvénients : surcoût pour HTML simple et conflit avec les contrats visuels
  headless des applications qui n'ont pas adopté Material.

### Option C — Hiérarchie officielle selon la sémantique

- avantage : complexité minimale par besoin, API maintenues, visuel libre quand
  nécessaire ;
- coût : chaque interaction doit être classée avant implémentation.

## Décision

**Option C.** Une UI Angular choisit dans cet ordre : HTML/CSS natifs, Angular
core/forms/router, Angular Material ou Angular Aria selon le contrat visuel,
Angular CDK pour les briques manquantes, puis code spécifique borné.

Angular Material est retenu pour un composant visuel M3 dans une application qui
l'a adopté. Angular Aria est retenu pour un motif WAI-ARIA composite dont le
style reste propre au produit. Les deux ne possèdent jamais le même comportement
sur un contrôle. Tailwind et SCSS ne portent que la présentation.

Une dépendance officielle sans configuration répétable est ajoutée au catalogue
avec son premier usage réel ; elle ne reçoit pas artificiellement une recette
`add-library`. Une recette devient candidate après deux applications exigeant le
même setup observable.

Angular Aria est adopté motif par motif, jamais comme renderer universel. En
particulier, son Accordion applique `role=region` à chaque panel : au-delà
d'environ six panels simultanément expansibles, le renderer doit regrouper les
critères ou choisir un disclosure sans prolifération de landmarks.

## Justification

HTML fournit la sémantique et les comportements les plus robustes pour les
contrôles simples. Material réduit le coût d'une UI M3 complète. Angular Aria
réduit le code a11y des motifs headless. CDK reste utile pour les mécanismes bas
niveau, mais ne doit pas devenir un framework de composants local.

Cette hiérarchie suit les frontières officielles et préserve la lisibilité : la
bibliothèque porte l'interaction générique ; la page porte le métier.

## Conséquences

### Positives

- moins de clavier, focus et ARIA écrits à la main ;
- moins de dépendances ajoutées aux contrôles simples ;
- décision reproductible par un développeur ou un LLM ;
- tests plus stables grâce aux harnesses officiels ;
- styles propres au produit conservés avec Angular Aria.

### Négatives / dette acceptée

- Angular Aria stable en v22 reste jeune et exige des tests de non-régression ;
- les transferts de focus dictés par le métier restent applicatifs ;
- SSR/hydratation nécessite une preuve séparée ;
- aucune primitive partagée n'est créée avant deux usages réels.

### Points à réévaluer

- apparition d'un setup Aria commun dans deux applications ;
- besoin d'une data-grid interactive plutôt qu'un tableau de lecture ;
- cible SSR/SSG ;
- régression de bundle ou d'assistance technique après upgrade Angular.

## Références

- [Audit détaillé](../architecture/ui-angular-officiel-avant-custom-2026-10-01.md)
- [Angular Aria](https://angular.dev/guide/aria/overview)
- [Angular roadmap](https://angular.dev/roadmap)
- [WAI-ARIA APG — Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- [ARIA in HTML](https://www.w3.org/TR/html-aria/)
- [Angular Material](https://material.angular.dev/)
- [Angular CDK](https://material.angular.dev/cdk/categories)
