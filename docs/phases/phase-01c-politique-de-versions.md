# Phase 01c — Politique de version unique

- **Statut :** ✅ Terminée
- **Date :** 2026-07-21
- **Prérequis :** [Phase 01b](./phase-01b-corrections-socle.md)
- **ADR associé :**
  [ADR-0005 — Politique de version unique](../adr/0005-politique-de-version-unique.md)
- **Origine :** point C4 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Objectif

Empêcher la divergence de versions du socle (Angular, TypeScript, RxJS) entre
packages, avant que le premier package Angular n'existe.

## Périmètre

### Inclus

- Catalog bun à la racine : versions du socle centralisées.
- Script de vérification `check:versions`, utilisable en CI.

### Explicitement exclu

- Dépendances métier (PrimeNG, NgRx, Tailwind, i18n…) : leur ajout au catalog
  relève de la Phase 04, quand elles seront introduites.
- Branchement effectif sur la CI : Phase 06.
- Mécanismes équivalents pour les stacks non-JS : à traiter à leur intégration.

## Étapes exécutées

### 1. Catalog bun

Le champ `workspaces` passe de la forme tableau à la forme objet, qui seule
accepte un catalog :

```json
"workspaces": {
  "packages": ["apps/*", "libs/*"],
  "catalog": {
    "@angular/core": "21.2.16",
    "@angular/common": "21.2.16",
    "rxjs": "7.8.2",
    "zone.js": "0.16.2",
    "tslib": "2.8.1"
  },
  "catalogs": {
    "tooling": {
      "@angular/build": "21.2.16",
      "@angular/cli": "21.2.16",
      "@angular/compiler-cli": "21.2.16",
      "typescript": "6.0.3"
    }
  }
}
```

Deux catalogs plutôt qu'un seul : l'exécution et la compilation n'évoluent pas
au même rythme et ne concernent pas les mêmes packages — une bibliothèque de
domaine a besoin de TypeScript, pas de la CLI Angular.

Les packages déclareront ensuite :

```json
{
    "dependencies": { "@angular/core": "catalog:" },
    "devDependencies": { "typescript": "catalog:tooling" }
}
```

Les versions retenues sont celles **effectivement résolues** dans le projet
d'origine (relevées dans son `node_modules`, et non dans les plages `^` de son
`package.json`), afin de partir de la base exacte de l'application à
reconstruire.

### 2. Script de vérification

`tools/check-catalog-usage.mjs`, exposé via `bun run check:versions`.

Le catalog garantit qu'une dépendance déclarée `catalog:` résout vers la bonne
version — il ne garantit pas qu'un package _utilise_ le catalog. Écrire
`"@angular/core": "^20.0.0"` en dur reste accepté par `bun install`. Le script
ferme cette brèche : toute dépendance présente au catalog doit être déclarée
`catalog:` ou `catalog:<nom>` par les packages qui l'utilisent, sous peine de
sortie en code 1.

## Vérifications

Le script a été validé sur trois cas, dont un cas d'échec délibéré — un
garde-fou qui n'a jamais échoué n'est pas un garde-fou vérifié.

| Cas                                                                | Résultat attendu                           | Résultat                                                       |
| ------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------- |
| Aucun package                                                      | Succès                                     | ✅ code 0                                                      |
| Package déclarant `catalog:` et `catalog:tooling`                  | Succès                                     | ✅ code 0                                                      |
| Package déclarant `@angular/core: ^20.0.0` et `typescript: ~5.9.0` | Échec, 2 violations signalées              | ✅ code 1, les deux violations nommées avec la valeur attendue |
| Résolution du catalog par bun                                      | `catalog:` résolu à la version centralisée | ✅ confirmé dans `bun.lock`                                    |

Le package de test a été supprimé après validation.

## État du workspace à l'issue de la phase

```
cmz-platform/
├── apps/                       ← vide (.gitkeep)
├── libs/                       ← vide (.gitkeep)
├── tools/
│   └── check-catalog-usage.mjs
├── package.json                ← workspaces.catalog + catalogs.tooling
└── docs/
```

## Points d'attention

- **Nx n'est volontairement pas au catalog.** `nx` et `@nx/*` restent des
  dépendances de la racine exclusivement : leur unicité découle de leur
  emplacement, pas d'une contrainte à vérifier.
- **Le script ne gère pas d'exceptions.** Si un package devait légitimement
  diverger, il faudra introduire une liste d'exclusion explicite — délibérément
  non anticipée tant que le besoin n'est pas réel.
- **La vérification n'est pas encore automatique.** Elle doit être lancée à la
  main jusqu'à son branchement en CI (Phase 06).
- **Portée limitée à l'écosystème JS/TS.** Les stacks Kotlin, Swift, PHP, Rust
  et Spring Boot nécessiteront leur propre mécanisme.

## Suite

**Phase 02 — Application Angular** : installation de `@nx/angular` et génération
de `apps/backoffice-angular` (package `@cmz/backoffice-angular`), premier
consommateur du catalog — et donc première vérification réelle de la politique.
