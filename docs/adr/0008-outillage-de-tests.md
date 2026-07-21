# ADR-0008 — Outillage de tests

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :** application en Phase 05
- **Origine :** observation O4 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Contexte

Le projet d'origine teste avec Karma + Jasmine en unitaire, et **Protractor** en
end-to-end. Protractor est abandonné depuis Angular 12 : il n'y a rien à migrer
de ce côté, seulement à réécrire. Karma, de son côté, est déprécié en amont par
l'équipe Angular.

Le contexte a changé depuis la mise en place du projet d'origine : Angular 21
embarque un support natif de Vitest via le builder `@angular/build:unit-test`,
et les nouveaux projets de la CLI Angular l'utilisent par défaut. Nx s'appuie
sur ce même builder pour les nouveaux projets Angular.

Le choix doit être arrêté avant la Phase 05, car il conditionne la façon dont
chaque package sera généré.

## Options envisagées

### Tests unitaires

| Option          | Évaluation                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Karma + Jasmine | Identique à l'existant, mais déprécié en amont — on migrerait vers une impasse                                                    |
| Jest            | Standard Nx historique, écosystème mature, mais plus le défaut d'Angular 21                                                       |
| Vitest          | Défaut d'Angular 21 et de la CLI, démarrage à froid et watch nettement plus rapides, même builder esbuild que le build applicatif |

### Tests end-to-end

| Option     | Évaluation                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Protractor | Abandonné, à exclure                                                                                                      |
| Cypress    | Très répandu, bonne expérience de mise au point, mais un seul navigateur par exécution et architecture plus contraignante |
| Playwright | Multi-navigateurs, exécution parallèle native, attentes automatiques, intégration Nx de première classe                   |

## Décision

- **Tests unitaires : Vitest**, via le builder `@angular/build:unit-test`
  d'Angular 21.
- **Tests end-to-end : Playwright.**
- Les tests d'un package vivent **dans ce package**, pas dans un projet de test
  centralisé — cohérent avec le mode package-based
  ([ADR-0001](./0001-monorepo-nx-package-based.md)) et nécessaire pour que
  `nx affected` sache quels tests rejouer.

## Justification

Pour l'unitaire, le critère décisif est l'alignement avec l'amont : Angular 21
et Nx convergent tous deux vers Vitest, et le même moteur esbuild sert le build
applicatif et les tests. Choisir Karma reviendrait à migrer vers une technologie
dépréciée ; choisir Jest ajouterait une chaîne de transformation distincte de
celle du build.

Pour l'end-to-end, Playwright l'emporte surtout par ses attentes automatiques,
qui suppriment la principale source d'instabilité des suites e2e — les
temporisations arbitraires. Sur une application de 149 composants et 18
domaines, une suite instable est une suite qu'on finit par désactiver.

## Conséquences

### Positives

- Retours plus rapides en développement, ce qui compte sur une base de cette
  taille.
- Une seule chaîne de transformation entre build et tests, donc moins de
  divergences de configuration.
- Playwright couvre plusieurs navigateurs sans multiplier les configurations.

### Négatives / dette acceptée

- Les tests unitaires existants écrits pour Jasmine devront être adaptés. L'API
  de Vitest en est proche, mais les `spy` et les doublures diffèrent : à prévoir
  dans la charge de la Phase 07.
- Playwright télécharge ses navigateurs — à mettre en cache en CI, faute de quoi
  chaque exécution paiera ce coût.
- Vitest sur Angular est plus récent que Jest : moins de réponses disponibles en
  cas de problème inhabituel.

### Points à réévaluer

- Si le support Vitest d'Angular se révélait instable sur un cas précis, Jest
  reste une porte de sortie documentée par Nx.

## Références

- Angular 21 : builder `@angular/build:unit-test`, Vitest par défaut sur les
  nouveaux projets de la CLI.
- [Modern Angular Testing with Nx](https://nx.dev/blog/modern-angular-testing-with-nx)
- [Revue de socle du 2026-07-21, observation O4](../reviews/2026-07-21-revue-socle-avant-phase-02.md)
