# Phase 01b — Corrections de socle

- **Statut :** ✅ Terminée
- **Date :** 2026-07-21
- **Prérequis :** [Phase 01](./phase-01-squelette-nx.md)
- **ADR associés :**
  [ADR-0003 — Nommage et structure](../adr/0003-nommage-et-structure-du-monorepo.md),
  [ADR-0004 — Graphe de dépendances déclarées](../adr/0004-graphe-de-dependances-declarees.md)
- **Origine :** [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Objectif

Traiter les points bloquants et les décisions structurantes identifiés par la
revue de socle, avant que le premier package applicatif n'existe et ne rende ces
corrections coûteuses.

## Périmètre

### Inclus

- Renommage du workspace et adoption du scope `@cmz/*` (C2).
- Passage à la structure `apps/` + `libs/` (C3).
- Arbitrage de la stratégie de graphe (C1) — décision documentée, application en
  Phase 03.
- Initialisation de Git (B1), contrainte des versions Node et bun (B2),
  correction de la licence (B3).
- Fichiers de socle manquants : `.editorconfig`, `.gitattributes`, `.nvmrc` (A1).

### Explicitement exclu

- Toujours aucune application ni bibliothèque : `apps/` et `libs/` sont vides.
- Politique de version unique entre packages (C4) : outillage à mettre en place
  en Phase 02, en même temps que les premières dépendances Angular.
- Conventions de commit et hooks Git (A2) : Phase 05.
- Nx Cloud (A3) et `CODEOWNERS` (A4) : Phase 06.

## Étapes exécutées

### 1. Renommage (C2)

```bash
mv cmz-backoffice-angular cmz-platform
```

`package.json` racine : `@cmz-backoffice-angular/source` → **`@cmz/source`**.

### 2. Structure `apps/` + `libs/` (C3)

```bash
mkdir -p apps libs && rm -rf packages
```

Répercuté à deux endroits — les *workspaces* bun et `workspaceLayout` de Nx :

```json
// package.json
"workspaces": ["apps/*", "libs/*"]
```

```json
// nx.json
"workspaceLayout": { "appsDir": "apps", "libsDir": "libs" }
```

### 3. Licence (B3)

`"license": "MIT"` (valeur par défaut de Nx) → **`"UNLICENSED"`**, conforme à la
nature propriétaire de l'applicatif.

### 4. Contrainte des versions (B2)

```json
"packageManager": "bun@1.3.14",
"engines": {
  "node": "^20.19.0 || ^22.12.0 || >=24.0.0",
  "bun": ">=1.3.0"
}
```

La plage Node reprend exactement celle exigée par `@angular/core` 21.2.x. Un
`.nvmrc` fixé à `22` complète le dispositif côté poste de développement.

> Cette contrainte corrige un défaut avéré du projet d'origine, dont la CI
> déclarait `NODE_VERSION: 18` alors que son `Dockerfile` partait de `node:22` —
> et qu'Angular 21 exige Node ≥ 20.19.

### 5. Fichiers de socle (A1)

- `.editorconfig` — indentation, encodage, fins de ligne, avec des règles par
  type de fichier (2 espaces pour JSON/YAML, tabulations pour les Makefile,
  préservation des espaces significatifs en Markdown).
- `.gitattributes` — normalisation LF, exceptions CRLF pour les scripts
  Windows, marquage des binaires et des lockfiles.

### 6. Initialisation de Git (B1)

```bash
git init -b main
git add -A && git commit -m "chore: squelette du monorepo Nx package-based"
```

`defaultBase: "main"` est déclaré dans `nx.json` : c'est la référence que
`nx affected` utilisera pour déterminer les projets impactés.

### 7. Stratégie de graphe (C1)

Décision prise et documentée dans
[ADR-0004](../adr/0004-graphe-de-dependances-declarees.md) : dépendances
déclarées en `workspace:*`, imports par nom de package, pas d'alias de chemins
entre packages. **Aucune application technique à ce stade** — la décision prend
effet au premier découpage, en Phase 03.

## État du workspace à l'issue de la phase

```
cmz-platform/
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .nvmrc
├── .vscode/extensions.json
├── apps/           ← vide (.gitkeep)
├── libs/           ← vide (.gitkeep)
├── bun.lock
├── docs/
│   ├── README.md
│   ├── adr/        0001 → 0004 + README + template
│   ├── phases/     README + template + phase-01 + phase-01b
│   └── reviews/    2026-07-21-revue-socle-avant-phase-02.md
├── nx.json
├── package.json
└── README.md
```

`nx.json` :

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "extends": "nx/presets/npm.json",
  "analytics": false,
  "defaultBase": "main",
  "workspaceLayout": { "appsDir": "apps", "libsDir": "libs" }
}
```

## Vérifications

| Contrôle | Commande | Résultat |
| --- | --- | --- |
| Nx lit toujours la configuration | `bunx nx show projects` | ✅ vide, sans erreur |
| Dépôt Git initialisé sur `main` | `git log --oneline` | ✅ 1 commit |
| Aucun fichier oublié | `git status --short` | ✅ arbre propre |
| `node_modules` et `.nx` bien exclus | `git ls-files` | ✅ 20 fichiers suivis, aucun artefact |

## Points d'attention

- **`packages/` a été supprimé.** Toute commande ou documentation externe y
  faisant référence doit viser `apps/` ou `libs/`.
- **La politique de version unique (C4) reste ouverte.** À trancher en Phase 02,
  au moment d'introduire Angular : sans elle, rien n'empêche deux packages
  d'embarquer deux versions du framework.
- **Aucun remote Git n'est configuré.** À faire avant tout travail collaboratif.
- Les points A2 à A5 de la revue restent ouverts et sont rattachés aux phases
  05 et 06.

## Suite

**Phase 02 — Application Angular** : installation de `@nx/angular`, génération de
`apps/backoffice-angular` (package `@cmz/backoffice-angular`) en Angular 21
standalone avec le builder `application`, et mise en place de la politique de
version unique pour le socle Angular/TypeScript/RxJS.
