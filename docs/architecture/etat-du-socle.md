# État du socle

Ce document décrit **ce qui existe aujourd'hui** dans le monorepo. Il est mis à
jour à chaque évolution du socle — il n'y a pas de journal historique à
consulter, l'historique Git fait foi.

<!-- BEGIN:GENERATED:monorepo-status -->
- **Dernière mise à jour :** 2026-08-10 (généré par `tools/generate-status.mjs`)
- **État :** **Phase 08** — génération depuis patterns ([ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md)). Socle outillé + Kernel `shared/` / `@cmz/core` + **18** modules livrés/compilants (**71** libs + **1** app ; **2 724** `.ts` hors tests). Voir [`STATUS.md`](../../STATUS.md).
- **Familles IR :** `workflow-action` **4/4**, `read-only-view` **4/4**. Corpus **1 507** paires. CI `corpus:ci` (structural-only) + `corpus-full` (main) + Tier 2 nightly.
<!-- END:GENERATED:monorepo-status -->

## Contenu du dépôt

```
apps/backoffice-angular   application Angular 22.0.7 — compilante, routes câblées
libs/core                 configuration runtime & tokens d'injection (@cmz/core)
libs/shared               Kernel transverse (@cmz/shared-{domain,data,application,ui,constants})
libs/<module>             packages découplés (@cmz/<module>-{domain,data,application,ui})
conventions/              profils de convention par version de framework
tools/seos-adapter/       adaptateur monorepo (sortie générateur → libs de couche)
tools/                    scripts de vérification du socle & mock-server
docs/                     décisions, architecture, guides, plans de modules
LLM_CONTEXT.md            guide maître d'architecture et de cadrage IA
nx.json                   configuration Nx
package.json              catalog de versions + scripts (workspaces libs/*/*)
```

L'adaptateur `tools/seos-adapter/` est validé (Phase 04) : il transforme la
sortie plate d'un générateur SEOS en libs
`@cmz/<module>-{domain,data,application,ui,feature}` — distribution, réécriture
d'imports, `package.json`/`project.json`/paths TS. Voir son
[README](../../tools/seos-adapter/README.md).

## Application Angular

`apps/backoffice-angular` (`@nx/angular` 23.1.0, Angular 22.0.7, esbuild,
Vitest). Build production : `bunx nx run backoffice-angular:build:production`.

<!-- BEGIN:GENERATED:bundle-metrics -->
- **Bundle initial (production, raw)** : **882.18 kB** — source [`bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json) (mesuré 2026-08-03 via `bun run bundle:record` après build).
- **ExcelJS (lazy)** : **948.32 kB** raw — hors budget initial.
- **Budgets** (`project.json`) : warning `900kb` / error `1mb` — politique [ADR-0016](../adr/0016-politique-budget-bundle.md) (hausse interdite sans ADR).
<!-- END:GENERATED:bundle-metrics -->

Détails et notes d'intégration :
[README de l'app](../../apps/backoffice-angular/README.md).

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

- **Les hooks ne s'exécutent que localement** ; la CI les rejoue (`ci.yml`).
  `--no-verify` ne contourne pas la forge — voir
  [`docs/guides/contribuer.md`](../guides/contribuer.md) (G-3).
- **Le `preinstall` contraint le `Dockerfile`** : `tools/` est copié **avant**
  `bun install` (voir [`Dockerfile`](../../Dockerfile) à la racine, G-4).

> Liste **exhaustive** des tâches encore à faire, classée par les **13 audits
> Big Tech** (architecture, sécu, SRE, code health) + audits workspace :
> [`taches-restantes.md`](./taches-restantes.md) (2026-08-05). Ci-dessous :
> uniquement les 2 points du tableau de suivi historique (E-7 / P1-10).

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

> Audit E-7 / P1-10 (2026-08-02) : retirés « Contrôles non rejoués en CI »
> (`ci.yml` les rejoue) et « `nx-welcome.ts` à retirer » (fichier déjà
> supprimé). Colonne **Vérifié** = dernière confirmation que le point est encore
> ouvert.

| Point                                                                            | Vérifié        | Suite             |
| -------------------------------------------------------------------------------- | -------------- | ----------------- |
| Cadrage IA local (skills Angular, MCP Nx, Web Codegen Scorer)                    | **2026-08-02** | outillage agent   |
| Narrowing des `catch` dans l'archétype d'erreur (app plus stricte que la source) | **2026-08-02** | contrats Phase 04 |

**Remédiation G-1 (2026-08-02) :** `.github/CODEOWNERS` peuplé par zone (socle /
kernel / modules / apps / docs / corpus), handles `@ismaelkouda` (équipes de 1)
— prêt à substituer des équipes GitHub `@cmz/…` sans refactor.

**Remédiation G-2 (2026-08-02) :** protection `main` versionnée dans
[`.github/branch-protection.main.json`](../../.github/branch-protection.main.json)
(1 approval, checks CI bloquants, no force-push, `enforce_admins`). Appliquer
sur la forge : `gh auth login && bun run protect:main`.

**Remédiation G-4 (2026-08-02) :** [`Dockerfile`](../../Dockerfile) multi-stage
(`oven/bun` → nginx) : `COPY tools/` avant `bun install` (contrainte
`preinstall`), build `backoffice-angular:production`, écoute `:8080`.

**Remédiation G-5 (2026-08-02) :** `window.__env` extrait de `index.html` vers
[`public/env.js`](../../apps/backoffice-angular/public/env.js) ; template
[`deploy/env.template.js.in`](../../deploy/env.template.js.in) substitué par
[`deploy/docker-entrypoint.sh`](../../deploy/docker-entrypoint.sh) (`CMZ_*`).

**Remédiation G-6 (2026-08-02) :** `assertAppConfig` dans `@cmz/core` —
validation de forme au bootstrap (`APP_CONFIG`) avec diagnostic exploitable.

**Remédiation G-7 (2026-08-02, révisée 2026-08-06) :** `nxCloudId`
`6a6fc43fcf076738a1d8db2e` écrit via `bunx nx connect` (remote
`ismaelkouda/cmz-platform`). **Décision produit :** *claim + activer* (pas de
`neverConnectToCloud` / `NX_NO_CLOUD`). Tant que le workspace n’est pas claimé
sous 3 jours **ou** que le secret CI `NX_CLOUD_ACCESS_TOKEN` manque, Nx
loggue encore des **401** / « unconnected » — bruit sans cache, **pas** un
gate CI. Runbook humain (porteurs) : (1) [cloud.nx.app](https://cloud.nx.app)
→ claim / rattacher le workspace à l’org ; (2) générer un CI Access Token ;
(3) secret GitHub `NX_CLOUD_ACCESS_TOKEN` (repo + forks selon politique) ;
(4) vérifier un `nx` en CI sans message 401 et avec hits de remote cache.
T6-4 / OPS-3.

**Remédiation G-8 (2026-08-02) :** `concurrency: cancel-in-progress` sur
`ci.yml` (par PR/ref), `nightly-integration.yml` (workflow), `corpus-full.yml`
(par ref) — un seul run actif, pas d’empilement.

**Remédiation H-1 (2026-08-02) :** oracle G-V-R à deux niveaux structurels —
`:build` + `:test` (Vitest / chantier C) via
[`tools/corpus/oracle-levels.mjs`](../../tools/corpus/oracle-levels.mjs) ;
attaché auto dès qu’un `project.json` déclare `targets.test`.

**Remédiation H-2 (2026-08-02) :** gate module
[`module-gate.mjs`](../../tools/corpus/module-gate.mjs) — `build` + `lint` (+
`test` si target) verts sur `tag:scope:<module>` avant écriture JSONL /
`--verify` ; sinon exit 1, pas d’émission.

**Remédiation H-3 (2026-08-02) :** contrainte
`constraints.no_cross_module_byte_identical_files` dans `workflow-action` +
`read-only-view` pattern.json ; enforcement `check:duplicates` (bloquant CI +
`check:all`) et gate corpus `--module=<m>`.

**Étape 02.5 — validée** : les patterns SEOS tiennent sur Angular 22 (structurel
106/106, 0 erreur de syntaxe/décorateur). Détail :
[README de l'app](../../apps/backoffice-angular/README.md).
