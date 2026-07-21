# cmz-platform

Monorepo Nx de la plateforme CMZ (_Connect My Zone_). Il héberge la
reconstruction de `cmz-backoffice-frontend`, puis progressivement les autres
composants de la plateforme.

**État actuel : squelette du workspace, aucun package applicatif.** Voir le
[journal des phases](./docs/phases/README.md).

## Caractéristiques

| Aspect                  | Choix                                               | Décision                                                           |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Orchestrateur           | Nx 23.1.0                                           | —                                                                  |
| Style de workspace      | package-based                                       | [ADR-0001](./docs/adr/0001-monorepo-nx-package-based.md)           |
| Gestionnaire de paquets | bun 1.3.x                                           | [ADR-0002](./docs/adr/0002-bun-package-manager.md)                 |
| Structure               | `apps/` + `libs/`, scope `@cmz/*`                   | [ADR-0003](./docs/adr/0003-nommage-et-structure-du-monorepo.md)    |
| Graphe de dépendances   | Déclaré (`workspace:*`), pas d'alias inter-packages | [ADR-0004](./docs/adr/0004-graphe-de-dependances-declarees.md)     |
| Versions du socle       | Catalog bun centralisé + vérification               | [ADR-0005](./docs/adr/0005-politique-de-version-unique.md)         |
| Framework               | Angular 22.0.7                                      | [ADR-0009](./docs/adr/0009-cible-angular-22.md)                    |
| Reconstruction          | Génération pilotée par les patterns SEOS            | [ADR-0010](./docs/adr/0010-reconstruction-pilotee-par-patterns.md) |
| Commits                 | Conventional Commits, vérifiés par hook             | [ADR-0006](./docs/adr/0006-conventions-de-collaboration.md)        |
| Tests                   | Vitest (unitaire), Playwright (e2e)                 | [ADR-0008](./docs/adr/0008-outillage-de-tests.md)                  |

En mode package-based, chaque package est autonome : il porte son propre
`package.json` et ses propres dépendances. Nx apporte le graphe de dépendances,
le cache et `nx affected`, sans imposer de configuration commune — ce qui permet
d'accueillir des packages non-JS (Kotlin, Swift, PHP, Spring Boot, Rust) via un
simple `project.json`.

## Prérequis

| Outil | Version                                                         |
| ----- | --------------------------------------------------------------- |
| Node  | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` (cf. `.nvmrc` → 22.22.3) |
| bun   | `>= 1.3.0`                                                      |

Ces contraintes sont déclarées dans `engines` et `packageManager` : poste de
développement, CI et image Docker doivent s'y conformer.

## Démarrage

```bash
bun install                 # installe les dépendances du workspace
bunx nx show projects       # liste les packages du monorepo
bunx nx graph               # visualise le graphe de dépendances
bunx nx affected -t build   # ne reconstruit que ce qui a changé depuis `main`
bun run check:all           # moteurs, versions du socle, poids des fichiers
bun run format              # formate le dépôt avec Prettier
```

## Contribuer

Les commits suivent la convention **Conventional Commits**, vérifiée
automatiquement :

```
feat(backoffice-angular): ajoute la page de connexion
fix(shared-domain): corrige la validation des coordonnées
```

Cinq garde-fous s'exécutent automatiquement — versions de Node et bun au
`preinstall`, poids des fichiers et formatage au `pre-commit`, message au
`commit-msg`, politique de versions au `pre-push`. Détail et justification dans
l'[ADR-0006](./docs/adr/0006-conventions-de-collaboration.md).

## Versions du socle

Les versions d'Angular, TypeScript, RxJS et zone.js sont centralisées dans le
_catalog_ bun, à la racine du `package.json`. Un package ne les redéclare jamais
:

```json
{
    "dependencies": { "@angular/core": "catalog:" },
    "devDependencies": { "typescript": "catalog:tooling" }
}
```

`bun run check:versions` échoue si un package déclare une version en dur — cf.
[ADR-0005](./docs/adr/0005-politique-de-version-unique.md).

## Structure

```
apps/         # applications déployables (vide pour l'instant)
libs/         # bibliothèques réutilisables (vide pour l'instant)
docs/         # documentation — décisions, phases, revues, guides, architecture
nx.json       # configuration Nx
```

Le dossier ne désigne pas la technologie : celle-ci est portée par le nom du
package (`@cmz/backoffice-angular`, `@cmz/api-spring`) et par ses tags Nx. Une
application Spring Boot vit sous `apps/` au même titre qu'une application
Angular.

## Feuille de route

L'intégration se fait **stack par stack**, chacune découpée en phases validées
une à une.

1. **Angular 22** — en cours (phases 01 à 01e terminées). Reconstruction du
   back-office à partir des patterns SEOS.
2. React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana — non
   démarrées.

Le détail est tenu à jour dans
[`docs/phases/README.md`](./docs/phases/README.md).

## Documentation

Toute la documentation vit dans [`docs/`](./docs/README.md), organisée par
nature : décisions d'architecture (ADR), journal d'exécution des phases, revues
de socle, guides opérationnels et vue d'architecture courante. Chaque phase
produit son document et, le cas échéant, les ADR qui justifient ses choix.
