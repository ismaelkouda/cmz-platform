# cmz-platform

Monorepo Nx de la plateforme CMZ (_Connect My Zone_). Il accueille la
reconstruction de `cmz-backoffice-frontend` en Angular 22, puis progressivement
les autres composants de la plateforme.

**État : socle outillé, aucun package applicatif.**

## Socle

| Aspect                     | Choix                             | Décision                                                           |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Orchestrateur              | Nx 23.1.0, mode package-based     | [ADR-0001](./docs/adr/0001-monorepo-nx-package-based.md)           |
| Gestionnaire de paquets    | bun 1.3.x                         | [ADR-0002](./docs/adr/0002-bun-package-manager.md)                 |
| Structure                  | `apps/` + `libs/`, scope `@cmz/*` | [ADR-0003](./docs/adr/0003-nommage-et-structure.md)                |
| Dépendances entre packages | Déclarées en `workspace:*`        | [ADR-0004](./docs/adr/0004-graphe-de-dependances-declarees.md)     |
| Framework et versions      | Angular 22.0.7, catalog bun       | [ADR-0005](./docs/adr/0005-versions-du-socle.md)                   |
| Commits                    | Conventional Commits, vérifiés    | [ADR-0006](./docs/adr/0006-conventions-de-collaboration.md)        |
| Tests                      | Vitest, Playwright                | [ADR-0008](./docs/adr/0008-outillage-de-tests.md)                  |
| Reconstruction             | Génération par patterns SEOS      | [ADR-0009](./docs/adr/0009-reconstruction-pilotee-par-patterns.md) |

En mode package-based, chaque package porte son propre `package.json` et ses
dépendances. Nx apporte le graphe, le cache et `nx affected` sans imposer de
configuration commune — ce qui permet d'accueillir des packages non-JS (Kotlin,
Swift, PHP, Spring Boot, Rust) via un simple `project.json`.

## Démarrage

```bash
nvm use                     # Node ^22.22.3 (cf. .nvmrc)
bun install                 # installe et active les hooks Git
bunx nx show projects       # liste les packages
bunx nx graph               # graphe de dépendances
bun run check:all           # moteurs, versions du socle, poids des fichiers
```

## Structure

```
apps/     applications déployables — vide
libs/     bibliothèques réutilisables — vide
tools/    scripts de vérification du socle
docs/     décisions, architecture, guides
```

Le dossier ne désigne pas la technologie : elle est portée par le nom du package
(`@cmz/backoffice-angular`, `@cmz/api-spring`) et par ses tags Nx. Une
application Spring Boot vit sous `apps/` au même titre qu'une application
Angular.

## Documentation

Tout est dans [`docs/`](./docs/README.md) :

- [État du socle](./docs/architecture/etat-du-socle.md) — ce qui existe
- [Contribuer](./docs/guides/contribuer.md) — prérequis, commandes, conventions
- [Feuille de route](./docs/architecture/feuille-de-route.md) — ce qui vient
- [Décisions](./docs/adr/README.md) — pourquoi
