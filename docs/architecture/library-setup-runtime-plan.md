# Plan B–E — `add-library`, preuves runtime, intégration `create-app`

- **Statut :** Proposed — en attente de validation. **Aucun commit B–E avant
  validation de ce plan.**
- **Amont :** [ADR-0041](../adr/0041-angular-material-tailwind-defaults.md),
  commit `94cd645` (cluster A — `check:library-setup` durci).
- **Suivi :** 7 étapes ; l'étape 1 (audit Codex) et le cluster A sont faits.

## Contexte

Le cluster A a rendu `check:library-setup` honnête : `static_invariants`
(présence structurelle, garde-fou de dérive) est vérifié à chaque run ;
`runtime_acceptance` (`compile-component`, `compiled-css-rule`,
`browser-coexistence`) est **déclaré, `status: harness-pending`, jamais
exécuté**. Il n'existe pas d'outil d'installation : `install.command` /
`reference_tool` décrivent le « comment » sans que rien ne l'exécute.

B–E ferment ces deux trous : un outil `add-library` transactionnel qui
**installe et configure réellement**, un harnais qui **exécute les
`runtime_acceptance`**, l'intégration dans `create-app`, puis la gouvernance
d'upgrade.

## Découpage

| Lot   | Contenu                                                                                                                                                                             | Dépend de                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **B** | `tools/add-library.mjs` + `core/library-addition.mjs` : `--dry-run` / `--apply <plan-id>`, transaction, verrou, journal, rollback, reprise SIGKILL, idempotence                     | A                         |
| **C** | Harnais `runtime_acceptance` : `tools/check-library-runtime.mjs` (job CI dédié) — compile Material, règle CSS Tailwind, coexistence navigateur                                      | A                         |
| **D** | `create-app` écrit `.cmz/libraries.json` + délègue à `add-library` pour les 3 défauts ; test E2E `create-app → add-library → install → frozen → build → lint → test → gate → abort` | B, C, **coord. renderer** |
| **E** | Gouvernance d'upgrade (bump de version → revalidation) + recours LLM borné quand `add-library` échoue                                                                               | B, C, D                   |

Chaque lot = plusieurs commits petits et gatés (convention du dépôt).

## B — `add-library` transactionnel

### Frontières de transaction

Une exécution `--apply` est **une** transaction atomique. Périmètre écrit :

| Cible                                    | Écriture                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` racine                    | ajout des `packages[]` de la recette (via schematic ou script)                                                                         |
| `bun.lock`                               | régénéré par `bun install`                                                                                                             |
| catalog racine (`workspaces.catalog[s]`) | épingle de version si `catalog:`                                                                                                       |
| `apps/<app>/…`                           | fichiers de config dérivés (`.postcssrc.json`, `src/tailwind.css`, `src/styles.scss`, `src/app/app.config.ts`, entrées `project.json`) |
| `apps/<app>/.cmz/libraries.json`         | ajout de l'id de bibliothèque au manifeste                                                                                             |

**Hors périmètre, jamais touché :** tout autre `apps/*`, tout `libs/*`, les
workflows CI, les autres recettes. Un `add-library` qui voudrait écrire hors de
cette liste échoue avant toute écriture.

### `--dry-run` / `--apply <plan-id>` (calqué sur `create-app`)

- `--dry-run` : calcule le plan sans écrire, émet un JSON
  `{ plan_id, library, app, package_changes[], file_writes[{path, sha256}], reference_shas }`.
  `plan_id = sha256(library ∥ app ∥ recette_sha ∥ arbre_app_sha ∥ package.json_sha ∥ reference_tool_sha)`.
- `--apply <plan-id>` : recalcule le plan ; si `plan_id` ≠ celui fourni → refus
  (l'arbre a bougé depuis le dry-run). Sinon exécute la transaction.
- Le `plan_id` est le même contrat de fraîcheur que `publishApplicationShell`
  (`tools/generator-platform/core/application-shell-publication.mjs`).

### Transaction, verrou, journal, rollback, reprise SIGKILL

Réutilise le mécanisme éprouvé de `create-module` /
`retire-module-transaction.mjs` (tests : `module-lifecycle.test.mjs`) :

- **Verrou** : `.cmz/add-library-transactions/<app>-<library>.lock`
  (`{ pid, hostname }`) ; un verrou dont le pid est mort est récupéré. Sérialise
  les `add-library` concurrents sur la même paire.
- **Journal** : `.cmz/add-library-transactions/<app>-<library>/state.json`,
  écrit par `rename` atomique.
  `status ∈ { planned, packages-installed, app-configured, manifest-updated }`.
  Snapshot immuable des fichiers cibles (contenu + sha) avant la première
  écriture.
- **Rollback** : sur toute erreur (schematic, `bun install`, gate), restaure
  chaque fichier du snapshot octet pour octet, régénère `bun.lock` par
  `bun install --frozen-lockfile` sur le `package.json` restauré, supprime le
  dossier de transaction. Échoue bruyamment si le rollback est incomplet.
- **Reprise SIGKILL** : `--resume --app <a> --library <l>` relit `state.json`,
  revalide les snapshots (dérive → refus de reprise, `--abort` seul autorisé),
  reprend à l'étape suivante. `--abort` restaure et nettoie.
- **Confinement anti-symlink** : chaque chemin écrit passe le même
  `safeResolveWithin` que le gate (aucun segment lien symbolique, fichier
  régulier).

### Commandes structurées

`install.command = { executable, argv }` est exécuté par `execFileSync` (jamais
`exec` / shell), résolu via `bunx` :
`execFileSync('bunx', [executable, ...argv])`. Pas d'interpolation, pas de `cwd`
hors de l'app.

### Idempotence

Avant d'agir : si `apps/<app>/.cmz/libraries.json` déclare déjà la bibliothèque
**et** `check:library-setup` passe pour cette paire → `add-library` sort en
`no-op` (exit 0, rien d'écrit). Un `--apply` rejoué après succès est donc sûr.

## C — Harnais `runtime_acceptance`

`tools/check-library-runtime.mjs` — **job CI dédié**, pas dans le job
`guardrails` (rapide). Précédent : `check:application-pipeline` et le job
Playwright (`.github/workflows/ci.yml`, `timeout-minutes: 25`) paient déjà de
vrais builds hors du chemin critique.

Pour chaque `runtime_acceptance` d'une recette adoptée par une app :

| `proof`               | Preuve exécutée                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile-component`   | écrit un composant sentinelle sous `apps/<app>/src/app/.library-probe/` qui importe la primitive (ex. `MatButton`, `TranslocoDirective`) ; `bunx ngc -p apps/<app>/tsconfig.app.json --noEmit` ; échec = template/type invalide. Nettoyé ensuite. |
| `compiled-css-rule`   | ajoute une classe sentinelle unique (`cmz-tw-probe-<rand>` mappée à `text-[#123456]`) dans un template ; `bunx nx run <app>:build:development` ; grep la règle `color:#123456` dans le CSS émis ; échec = Tailwind ne compile pas.                |
| `browser-coexistence` | page de test dédiée (bouton Material + utilitaires Tailwind) ; Playwright : le bouton garde sa hauteur/ripple/focus Material **et** les utilitaires Tailwind s'appliquent ; assert aucune régression du reset.                                    |

Quand un `proof` est outillé et vert en CI, sa recette passe
`status: "harness-pending"` → `"enforced"` (le gate cluster A refuse déjà
`enforced` sans harnais — cette bascule est le signal que C est livré pour ce
proof).

### Budget de temps CI

| Preuve                                      | Coût estimé                                                        | Placement                                       |
| ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `compile-component` (ngc `--noEmit`, 1 app) | ~20–40 s                                                           | job `library-runtime` dédié                     |
| `compiled-css-rule` (1 build dev)           | ~40–90 s                                                           | idem                                            |
| `browser-coexistence` (Playwright chromium) | ~60–120 s + install navigateur (déjà payé par le job e2e existant) | fusion possible avec le job Playwright existant |

Cible : job `library-runtime` **≤ 5 min**, `fail-fast: false`, déclenché sur
`apps/**` ou `conventions/libraries/**` modifiés (`paths:` filter). Ne bloque
pas le merge tant que tous les proofs sont `harness-pending` ; devient bloquant
proof par proof à mesure qu'ils passent `enforced`.

## D — Intégration `create-app`

**Le renderer
`tools/generator-platform/renderers/angular-pwa-shell-renderer.mjs` est en cours
de modification par la session `cmz-platform-42`. Ce lot ne démarre pas avant
que cette session ait mergé sa tranche, et la conception de l'écriture du
manifeste sera faite _avec_ elle** (voir Coordination).

- `create-app` (`planApplicationShell` / `publishApplicationShell`) écrit
  `apps/<app>/.cmz/libraries.json` avec les 3 défauts
  (`["transloco", "angular-material", "tailwind"]` pour le profil
  `angular-pwa`).
- Après scaffold du shell, `create-app` invoque `add-library` (mode `--apply`
  avec le plan calculé) pour chacun, dans sa propre transaction, avec rollback
  remontant jusqu'à l'annulation du `create-app`.
- Test E2E (`tools/*.test.mjs`, job dédié) : `create-app` → `add-library ×3` →
  `bun install --frozen-lockfile` → `nx build` → `nx lint` → `nx test` →
  `check:library-setup` vert → `retire-app` (abort) restaure l'arbre octet pour
  octet.

## E — Gouvernance d'upgrade + recours LLM

- Bump de version (`@angular/material`, `tailwindcss`…) dans le catalog →
  `check:library-runtime` rejoué ; un `static_invariant` cassé par la nouvelle
  version signale un changement de mécanisme → mise à jour de la recette (jamais
  du générateur), consignée.
- Si `add-library` échoue (schematic cassé, étape manuelle nouvelle) : `install`
  gagne une branche `llm-then-verified` documentée — un LLM borné complète la
  config, `check:library-setup` + `check:library-runtime` revérifient, aucun
  merge sans les deux verts.

## Points à trancher (utilisateur)

1. **Périmètre `add-library` : par app, ou aussi « workspace-level » ?** Le plan
   ci-dessus est strictement par app. Les paquets vont au `package.json` racine
   (monorepo) — assumé.
2. **`browser-coexistence` : job Playwright séparé ou fusionné** avec le job e2e
   existant (partage l'install chromium) ?
3. **`create-app` par défaut = 3 libs** (`transloco` + `angular-material` +
   `tailwind`) pour tout profil `angular-pwa` ? Ou Material opt-in ?
4. **Ordre B→C ou C→B ?** B (add-library) débloque D ; C (preuves) est
   indépendant. Reco : **C d'abord** (rend `runtime_acceptance` réel sur
   `backoffice-angular` sans rien installer de neuf), puis B.

## Coordination — session `cmz-platform-42` (renderer)

- Elle possède `angular-pwa-shell-renderer.mjs`, `application-shell.test.mjs`,
  `core/page-realization.mjs` (non commités au moment de ce plan).
- **Lots B et C ne touchent aucun de ces fichiers.** B crée
  `tools/add-library.mjs` + `core/library-addition.mjs` (neufs) ; C crée
  `tools/check-library-runtime.mjs` (neuf) + une page de test sous
  `apps/backoffice-angular/`.
- **Lot D touche le renderer** → séquencé après le merge de `cmz-platform-42`,
  conçu avec elle (interface : le renderer appelle `planLibraryAddition` ou
  écrit le manifeste puis laisse `create-app` appeler `add-library`).
- Ce document est le point de rendez-vous ; le mettre à jour, pas le dupliquer.
