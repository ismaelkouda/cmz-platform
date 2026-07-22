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

## Résultat de l'étape 02.5 — validation du pattern sur Angular 22

**Positive.** Un module de référence SEOS (`crud-entity`, entité `resources`,
106 fichiers) a été généré dans l'app et confronté à Angular 22 + TypeScript
6.0.3 :

- `check-pattern.js` : **106/106** (conformité structurelle).
- `tsc --noEmit` : 298 erreurs, **toutes imputables à l'absence du noyau
  transverse, aucune à Angular 22** :
    - 251 × `TS2307` — modules `@shared/@core/@pages` non présents (Phase 05) ;
    - 36 × `TS2571` — `catch (e)` non narrowé, dû à la tsconfig plus stricte de
      l'app neuve (`useUnknownInCatchVariables`) ;
    - 11 × `TS2339` — membres d'une classe de base du noyau `@shared` absent.
- **0 erreur de syntaxe (`TS1xxx`), 0 erreur de décorateur, 0 API Angular
  disparue.** Le module de référence compile à 0 erreur dans le projet source
  (Angular 21, noyau présent) : la seule variable ici est le noyau absent + la
  sévérité tsconfig, pas la version d'Angular.

Le pattern tient sur Angular 22 au niveau structurel et langage.

**Enseignement à porter dans les contrats d'archétype
([ADR-0010](../../docs/adr/0010-flux-de-generation-assistee-par-ia.md))** :
l'app cible est plus stricte que le projet source. L'archétype de gestion
d'erreur doit narrower les exceptions (`e instanceof Error`) — candidat pour une
règle `check-semantics` (couverture de bugs par processus).

Le module de test a été retiré après validation (non branché, non conservé).
