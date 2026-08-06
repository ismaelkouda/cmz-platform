# Knip (dead-code) — contrat monorepo

> `bun run check:dead-code` · CI job `dead-code` (`continue-on-error` tant
> que le socle d’instrumentation n’est pas verrouillé en bloquant).

## Causes historiques du faux rouge (corrigées)

1. **`knip.workspaces["."].entry` limité à `tools/**/*.mjs`**  
   Le reste du dépôt (app Angular, libs) n’était plus dans le graphe d’entries
   → dizaines de « Unused files » faux positifs (`main.ts`, routes, etc.).

2. **Chargement de `tools/vitest-lib.config.ts` sans `CMZ_VITEST_LIB_ROOT`**  
   Knip (plugin Vitest) charge les configs ; le default export throwait
   pour une config **partagée** prévue pour les cibles Nx qui injectent l’env.
   Désormais : throw seulement sous Vitest ; sinon config vide inoffensive.

## Modèle d’espace de travail

Package-based Bun (`workspaces.packages` : `apps/*`, `libs/*`, `libs/*/*`)
mais **l’app n’a pas de `package.json`** propre — elle vit dans le workspace
racine `.` :

| Workspace    | Rôle                                      |
| ------------ | ----------------------------------------- |
| `.`          | App `backoffice-angular` + outillage `tools/` |
| `libs/*`     | Noyaux monocouche (ex. `@cmz/core`)       |
| `libs/*/*`   | Volets module (domain/data/application/ui) |

Entries app : `main.ts` (bootstrap), `public/env.js` (script index — ADR-0007),
`tailwind.css` (styles Angular), guards/util de test **volontairement
conservés** hors routes prod (doc dans le fichier source).

## `ignoreDependencies` racine (non contournement du métier)

Deps listées à la racine pour **hoisting / catalog Bun** et build Angular,
mais importées seulement dans les libs (`catalog:` sur chaque package).
Knip analyse le workspace `.` sans compter les imports des workspaces enfants
comme usage du `package.json` racine. La vérité métier de « lib dépend-elle
de X ? » reste `check:declared-deps` + chaque `libs/**/package.json`.

Outils CLI peer (eslint, angular-cli, …) : même catégorie — référencés par
config/Nx, pas par import TS.

## Règles assouplies volontairement

| Règle     | Politique | Pourquoi |
| --------- | --------- | -------- |
| `catalog` | off       | Entrées catalog pour stack Angular future / peers non encore câblés |
| `types`   | off       | Types exportés de clés workflow (API publique domaine) peu consommés en TS encore |

Réactiver progressivement quand un nettoyage de surface publique est planifié.

## Vérif locale

```bash
bun run check:dead-code   # exit 0 attendu (hints de config possibles, pas d’issues)
```
