# @cmz/backoffice-angular

Application back-office CMZ, reconstruction de `cmz-backoffice-frontend` en
Angular 22.

- **Généré par :** `@nx/angular:application` 23.1.0
- **Angular :** 22.0.7 (via le catalog —
  [ADR-0005](../../docs/adr/0005-versions-du-socle.md))
- **Build :** `@angular/build` (esbuild)
- **Tests unitaires :** Vitest (`vitest-angular`)
- **État :** squelette généré ; contenu métier à reconstruire par génération
  ([plan d'exécution](../../docs/architecture/plan-d-execution.md), Phase 07)

## Commandes

```bash
bunx nx build backoffice-angular      # build de production
bunx nx serve backoffice-angular      # serveur de développement
bunx nx test  backoffice-angular      # tests Vitest
bunx nx lint  backoffice-angular      # ESLint + frontières
```

## Notes d'intégration (Phase 02)

- Le générateur `@nx/angular` est **intégré-first** : il a placé les dépendances
  Angular à la racine du workspace (pas dans un `package.json` propre à l'app)
  et créé un `tsconfig.base.json` racine. Ces dépendances ont été **converties
  en références `catalog:`** pour préserver la source unique de vérité
  ([ADR-0005](../../docs/adr/0005-versions-du-socle.md)).
- Le découpage de l'app en bibliothèques par couche et par module
  ([ADR-0004](../../docs/adr/0004-graphe-de-dependances-declarees.md), D2) est
  l'objet des Phases 03–04, pas de cette génération initiale.
- Cible de dépréciation notée : l'exécuteur `@nx/eslint:lint` sera retiré en Nx
  v24 ; migrer via `nx g @nx/eslint:convert-to-inferred` en Phase 06.
