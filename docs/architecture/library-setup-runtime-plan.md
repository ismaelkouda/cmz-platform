# Plan — installation réelle + preuves runtime des bibliothèques

- **Statut :** Proposed — **en attente de validation**. Révisé après la 2ᵉ revue
  Codex (verrou global, candidat isolé pour tout schematic/probe, rollback
  atomique des transactions imbriquées, découpage vertical, gouvernance
  d'upgrade). Aucun commit d'un lot 2–7 avant validation.
- **Amont :** [ADR-0041](../adr/0041-angular-material-tailwind-defaults.md),
  commits `a34ce65` / `94cd645` (+ le durcissement round 2 encore en revue).

## Contexte

`check:library-setup` est un garde-fou de dérive : `static_invariants` (présence
structurelle) vérifié à chaque run, `runtime_acceptance` **déclaré mais jamais
exécuté**. Rien n'installe : `install.command` / `reference_tool` décrivent le «
comment » sans l'exécuter. Le système n'est donc **pas utilisable en
production** — l'objectif de ce plan est d'y arriver.

## Découpage vertical (7 étapes)

Pas de découpage horizontal « tout `add-library` » puis « tout le harnais » :
chaque étape est une tranche verticale **installe → prouve** pour une
bibliothèque, gatée de bout en bout.

| #   | Étape                              | Livrable                                                                                                                                             | Preuve exigée pour clore                                                                       |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Durcissement `check:library-setup` | round 2 (verrou symlink racine d'app, plateforme indéterminée = échec, cohérence lockfile, `{{app}}`, périmètre Angular/React)                       | revue Codex sans P0                                                                            |
| 2   | Material — install + transaction   | `tools/add-library.mjs` + `core/library-addition.mjs` ; `add-library --dry-run` / `--apply <plan-id>` ; Material installé dans une app **candidate** | `material-component-compiles` **enforced** (ngc `--strictTemplates` réel dans le candidat)     |
| 3   | Tailwind — install + règle CSS     | `add-library` pour `reference-derived` ; Tailwind câblé dans le candidat                                                                             | `sentinel-class-emits-rule` **enforced** (classe sentinelle → règle dans le CSS de build réel) |
| 4   | Coexistence Material/Tailwind      | page de coexistence + harnais Playwright                                                                                                             | `material-tailwind-render-together` **enforced** (test navigateur)                             |
| 5   | Transloco + `create-app` atomique  | `add-library` pour Transloco ; `create-app` écrit le manifeste et enchaîne `add-library ×3` sous **une** transaction                                 | E2E `create-app → add-library ×3 → frozen → build → lint → test → gate → abort` vert           |
| 6   | Gouvernance d'upgrade              | matrice de compat, revalidation sur bump, migration de recette, politique Renovate                                                                   | bump simulé → gate rouge attendu → recette migrée → vert                                       |
| 7   | Recours LLM borné                  | `install.method: llm-then-verified` outillé                                                                                                          | schematic cassé simulé → LLM complète → `check:library-setup` + harnais verts                  |

Chaque étape = plusieurs commits petits et gatés.

## Candidat isolé — invariant transverse

**Aucun schematic ni probe ne s'exécute sur le workspace réel avant que son diff
soit connu.** Tout (schematic `ng-add`, probe `compile-component`, probe
`compiled-css-rule`, page de coexistence) tourne dans un **candidat** :

```
.cmz/library-candidates/<app>-<library>-<planId>/
```

copie de travail de `apps/<app>` (fichiers réguliers seulement, symlinks
refusés) + `node_modules` symlinké depuis la racine. Le schematic/probe y écrit,
son diff est **capturé, hashé, validé** contre les `static_invariants` de la
recette, puis :

- `--dry-run` : émet le diff + `plan_id` et **jette** le candidat ;
- `--apply <plan-id>` : recalcule le diff dans un candidat neuf, exige `plan_id`
  identique, puis **publie le diff** (pas le schematic) sur le vrai `apps/<app>`
  sous la transaction.

C'est l'extension du pattern `apps/.{name}.create-app-candidate-<planId>` de
`tools/generator-platform/core/application-shell-publication.mjs`. Réponse
directe aux points Codex : le `plan_id` porte le hash d'une sortie de schematic
**réellement produite**, jamais devinée ; le vrai workspace ne voit que des
écritures de fichiers déjà diffées.

## Transactions & verrous

### Deux niveaux de verrou

| Verrou                                                | Protège                                                    | Portée                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **global** `.cmz/library-transactions/workspace.lock` | `package.json` racine, `bun.lock`, `workspaces.catalog[s]` | tout `add-library` / `create-app` qui installe — **un seul à la fois**, quelle que soit l'app ou la bibliothèque |
| **par app** `.cmz/library-transactions/<app>.lock`    | `apps/<app>/**`                                            | sérialise les écritures d'une même app                                                                           |

Un `add-library` prend le verrou global le temps de la mutation `package.json` +
`bun install`, puis le relâche et prend le verrou d'app pour la config. Deux
installs concurrentes ne peuvent donc jamais toucher `package.json` / `bun.lock`
en même temps (point Codex).

### Journal & rollback

Réutilise `create-module` / `retire-module-transaction.mjs` (tests
`module-lifecycle.test.mjs`) :

- **Journal** `.cmz/library-transactions/<app>-<library>/state.json`, `rename`
  atomique,
  `status ∈ { planned, packages-installed, config-published, manifest-updated }`,
  snapshot immuable (contenu + sha) de **tous** les fichiers cibles — racine et
  app — avant la 1ʳᵉ écriture.
- **Rollback** sur toute erreur : restaure chaque fichier du snapshot octet pour
  octet, `bun install --frozen-lockfile` sur le `package.json` restauré, purge
  candidats + dossier de transaction. Échec de rollback = arrêt bruyant.
- **Reprise SIGKILL** : `--resume` revalide les snapshots (dérive → `--abort`
  seul) et reprend ; `--abort` restaure et nettoie.

### Transactions imbriquées (`create-app`)

`create-app` ouvre **une transaction parente** qui possède : le scaffold du
shell + 3 transactions `add-library` enfants. Le verrou global est pris **une
fois** par la parente (pas 3 fois). Toute erreur d'un enfant → rollback de
l'enfant **puis** de la parente → `apps/<app>` n'existe plus, `package.json` /
`bun.lock` restaurés. Un seul point de rollback atomique (point Codex).

## `--dry-run` / `--apply <plan-id>`

- `--dry-run --app <a> --library <l>` : construit le candidat, exécute
  schematic/script, émet
  `{ plan_id, app, library, platform, package_changes[], file_writes[{path, sha256, patch}], sources: { recipe_sha, app_tree_sha, package_json_sha, catalog_sha } }`,
  jette le candidat.
- `plan_id = sha256(sources ∥ file_writes)` — inclut le hash du diff réellement
  produit.
- `--apply <plan-id>` : reconstruit, recalcule `plan_id`, **refuse** si ≠
  (l'arbre a bougé), sinon applique `file_writes` + les `package_changes` sous
  transaction.

## Idempotence

Avant d'agir : si le manifeste déclare déjà la bibliothèque **et**
`check:library-setup` passe pour cette paire → `no-op` (exit 0, rien d'écrit,
aucun verrou pris au-delà de la lecture). `--apply` rejoué après succès est sûr.

## Commandes

`install.command = { executable: "nx", argv }` avec un `{{app}}` substitué par
le nom du projet Nx. Exécuté par `execFileSync('bunx', ['nx', ...argv])` dans le
candidat — jamais `exec`/shell, jamais d'interpolation ailleurs que `{{app}}`.

## Harnais `runtime_acceptance` (`tools/check-library-runtime.mjs`)

**Job CI dédié `library-runtime`**, hors du job `guardrails`. Précédent :
`check:application-pipeline` + le job Playwright (`timeout-minutes: 25`) paient
déjà de vrais builds hors chemin critique.

| `proof`               | Exécution (dans un candidat, jamais une vraie app)                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile-component`   | candidat = app + composant sentinelle important la primitive ; `bunx nx run <candidat>:build` ou `ngc --noEmit` ; échec = type/template invalide   |
| `compiled-css-rule`   | candidat + classe sentinelle unique (`text-[#123456]`) ; build ; la règle `color:#123456` doit être dans le CSS émis                               |
| `browser-coexistence` | candidat + page bouton Material + utilitaires Tailwind ; Playwright : styles Material préservés, utilitaires appliqués, pas de régression du reset |

Bascule `status: harness-pending → enforced` recette par recette quand le proof
correspondant est vert en CI. `check:library-setup` refuse déjà `enforced` sans
harnais — la bascule EST le signal de livraison.

### Budget CI

| Preuve                | Coût                         | Placement                       |
| --------------------- | ---------------------------- | ------------------------------- |
| `compile-component`   | ~30–60 s / lib               | job `library-runtime`           |
| `compiled-css-rule`   | ~60–120 s                    | idem                            |
| `browser-coexistence` | ~90–150 s (chromium partagé) | fusion avec le job e2e existant |

Cible : `library-runtime` **≤ 6 min**, `fail-fast: false`, `paths:` sur
`apps/**` + `conventions/libraries/**`. Non bloquant tant que tout est
`harness-pending` ; bloquant proof par proof.

## Gouvernance d'upgrade (étape 6)

- **Matrice de compatibilité**
  `conventions/libraries/<platform>/<library>.compat.json` :
  `{ package: "@angular/material", tracks: [{ range: ">=22 <23", recipe_sha, verified_at }] }`.
  `check:library-setup` échoue si la version résolue sort de tout `range`
  vérifié.
- **Renovate/Dependabot** : un bump ouvre une PR ; le job `library-runtime`
  s'exécute ; s'il casse un `static_invariant` → changement de mécanisme →
  migration de recette **dans la PR** (nouvelle entrée `tracks`), jamais un
  générateur touché.
- **Migration de recette** tracée : un ADR court ou une entrée `tracks` avec la
  raison (ex. « `provideAnimations` retiré en v23 → `animate.enter` »).

## Recours LLM borné (étape 7)

`install.method: llm-then-verified` : quand un schematic est cassé ou qu'une
étape manuelle nouvelle apparaît, un LLM borné complète la config **dans le
candidat**, le diff est validé contre les `static_invariants` +
`runtime_acceptance`, aucun merge sans les deux verts. Le `prompt_contract` de
la recette fixe le périmètre autorisé.

## Points à trancher (utilisateur)

1. **`create-app` par défaut = 3 libs** (`transloco` + `angular-material` +
   `tailwind`) pour tout profil `angular-pwa` ? Ou Material opt-in ?
2. **`browser-coexistence`** : job Playwright séparé, ou fusionné avec le job
   e2e existant (chromium partagé) ?
3. **Matrice de compat** : fichier `.compat.json` par recette (proposé), ou
   champ `tracks` **dans** la recette ?
4. **Candidat** : copie complète de `apps/<app>` (simple, ~lent) ou copie
   minimale (`src/` + configs, plus rapide, risque de rater un fichier) ?

## Coordination — session `cmz-platform-42` (renderer)

- Elle possède `angular-pwa-shell-renderer.mjs`, `application-shell.test.mjs`,
  `core/page-realization.mjs`, `archetype-role-model.md` (non commités).
- **Étapes 2–4 ne touchent aucun de ces fichiers** : `tools/add-library.mjs`,
  `tools/generator-platform/core/library-addition.mjs`,
  `tools/check-library-runtime.mjs` sont neufs ; les candidats et pages de test
  vivent sous `.cmz/` ou dans un fixture jetable.
- **Étape 5 touche `create-app`** (mais pas forcément le renderer lui-même :
  l'écriture du manifeste peut vivre dans `application-shell-publication.mjs`) →
  séquencée après le merge de `cmz-platform-42`, conçue **avec** elle.
- Ce document est le point de rendez-vous : le mettre à jour, pas le dupliquer.
