# État du socle

Ce document décrit **ce qui existe aujourd'hui** dans le monorepo. Il est mis à
jour à chaque évolution du socle — il n'y a pas de journal historique à
consulter, l'historique Git fait foi.

- **Dernière mise à jour :** 2026-07-22
- **État :** socle outillé + **application Angular 22 générée et compilant**
  (Phase 02 en cours). Aucune bibliothèque, aucun contenu métier.

## Contenu du dépôt

```
apps/backoffice-angular   application Angular 22.0.7 — squelette, build vert
libs/                     bibliothèques réutilisables — vide
conventions/              profils de convention par version de framework
tools/                    scripts de vérification du socle
docs/                     décisions, architecture, guides
.husky/                   hooks Git
nx.json                   configuration Nx
package.json              catalog de versions + scripts
```

## Application Angular

`apps/backoffice-angular` (`@nx/angular` 23.1.0, Angular 22.0.7, esbuild,
Vitest). Build vérifié vert sur environnement conforme (Node 22.22.3) :
`bunx nx build backoffice-angular` → succès, bundle ~221 kB.

Détails et notes d'intégration :
[README de l'app](../../apps/backoffice-angular/README.md).

Élément cosmétique connu : le composant de démo `nx-welcome.ts` dépasse le
budget SCSS (+3 kB) ; il disparaîtra au câblage des vraies routes.

## Choix en vigueur

| Aspect                  | Choix                             | Décision                                                       |
| ----------------------- | --------------------------------- | -------------------------------------------------------------- |
| Orchestrateur           | Nx 23.1.0, mode package-based     | [ADR-0001](../adr/0001-monorepo-nx-package-based.md)           |
| Gestionnaire de paquets | bun 1.3.14                        | [ADR-0002](../adr/0002-bun-package-manager.md)                 |
| Structure               | `apps/` + `libs/`, scope `@cmz/*` | [ADR-0003](../adr/0003-nommage-et-structure.md)                |
| Graphe de dépendances   | Déclaré en `workspace:*`          | [ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)     |
| Framework               | Angular 22.0.7                    | [ADR-0005](../adr/0005-versions-du-socle.md)                   |
| Versions                | Catalog bun centralisé            | [ADR-0005](../adr/0005-versions-du-socle.md)                   |
| Collaboration           | Conventional Commits, hooks       | [ADR-0006](../adr/0006-conventions-de-collaboration.md)        |
| Configuration           | Injectée à l'exécution            | [ADR-0007](../adr/0007-configuration-runtime.md)               |
| Tests                   | Vitest, Playwright                | [ADR-0008](../adr/0008-outillage-de-tests.md)                  |
| Reconstruction          | Génération par patterns SEOS      | [ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md) |

## Versions du socle

Centralisées dans le _catalog_ bun du `package.json` racine. Un package ne les
redéclare jamais.

| Catalog    | Contenu                                 | Version |
| ---------- | --------------------------------------- | ------- |
| par défaut | `@angular/*` (framework)                | 22.0.7  |
| par défaut | `@angular/cdk`                          | 22.0.5  |
| par défaut | `rxjs`                                  | 7.8.2   |
| par défaut | `zone.js`                               | 0.16.2  |
| par défaut | `tslib`                                 | 2.8.1   |
| `tooling`  | `@angular/build`, `cli`, `compiler-cli` | 22.0.7  |
| `tooling`  | `typescript`                            | 6.0.3   |

Usage dans un package :

```json
{
    "dependencies": { "@angular/core": "catalog:" },
    "devDependencies": { "typescript": "catalog:tooling" }
}
```

Nx n'est **pas** au catalog : `nx` et `@nx/*` ne vivent qu'à la racine, leur
unicité découle de leur emplacement.

## Prérequis

| Outil | Version                                | Origine de la contrainte |
| ----- | -------------------------------------- | ------------------------ |
| Node  | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` | Exigence d'Angular 22    |
| bun   | `>= 1.3.0`                             | —                        |

Déclarés dans `engines` et `packageManager`, et **vérifiés** au `preinstall`.
`.nvmrc` fixe 22.22.3.

## Garde-fous automatisés

| Déclencheur  | Contrôle                          | Script                          |
| ------------ | --------------------------------- | ------------------------------- |
| `preinstall` | Node et bun conformes à `engines` | `tools/check-engines.mjs`       |
| `pre-commit` | Aucun fichier volumineux ajouté   | `tools/check-file-weight.mjs`   |
| `pre-commit` | Formatage des fichiers modifiés   | `lint-staged` + Prettier        |
| `commit-msg` | Message conforme à la convention  | `commitlint`                    |
| `pre-push`   | Politique de version unique       | `tools/check-catalog-usage.mjs` |

Chacun a été validé sur un cas nominal **et sur un cas d'échec délibéré**.

Deux limites connues :

- **Les hooks ne s'exécutent que localement.** Tant que la CI ne rejoue pas les
  mêmes contrôles, `--no-verify` suffit à les contourner.
- **Le `preinstall` contraint le `Dockerfile`** : `tools/` doit être copié avant
  `bun install`, sinon le schéma habituel `COPY package.json` →
  `RUN bun install` échoue.

## Commandes

```bash
bun install                 # installe (vérifie les moteurs au passage)
bun run check:all           # moteurs, versions du socle, poids des fichiers
bun run format              # formate le dépôt
bunx nx show projects       # liste les packages
bunx nx graph               # graphe de dépendances
bunx nx affected -t build   # ne reconstruit que ce qui a changé depuis main
```

## Points ouverts

| Point                                                                          | Échéance                              |
| ------------------------------------------------------------------------------ | ------------------------------------- |
| Nx Cloud non activé — nécessite un compte, `bunx nx connect`                   | Phase 06 (CI)                         |
| Contrôles non rejoués en CI                                                    | Phase 06                              |
| `Dockerfile` copiant `tools/` avant l'installation                             | Phase 06                              |
| `CODEOWNERS` à peupler — une équipe inexistante y est ignorée sans erreur      | À la constitution des équipes         |
| Cadrage IA (skills Angular, MCP Nx, Web Codegen Scorer) à installer localement | Phase 02, avant génération de contenu |
| Validation du pattern SEOS sur Angular 22 (étape 02.5)                         | Phase 02                              |
| `nx-welcome.ts` (dépasse le budget SCSS) à retirer                             | Au câblage des routes                 |
