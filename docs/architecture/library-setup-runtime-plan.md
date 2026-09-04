# Plan — installation réelle + preuves runtime des bibliothèques

- **Statut :** Proposed. Les **arbitrages D1–D4 sont tranchés** (revue du
  2026-09-04) ; les quatre prérequis P0 sont **soumis à revue un par un**, dans
  l'ordre §« Ordre de revue ». **Aucun code `add-library` avant validation P0
  par P0.**
- **Amont :** [ADR-0041](../adr/0041-angular-material-tailwind-defaults.md)
  (défauts Material/Tailwind + recettes),
  [ADR-0042](../adr/0042-modele-transactionnel-mutations-workspace.md) (modèle
  d'isolation et de transaction — c'est l'ADR qui **décide**, ce document
  planifie), lot A mergé en `c6b5b64`.

## Contexte

`check:library-setup` est un garde-fou de **dérive de configuration** :
`static_invariants` vérifié à chaque run, `runtime_acceptance` **déclaré mais
jamais exécuté**. Rien n'installe : `install.command` / `reference_tool`
décrivent le « comment » sans l'exécuter. Le système n'est donc **pas utilisable
en production** — l'objectif de ce plan est d'y arriver.

## Décisions arbitrées

### D1 — `create-app` installe les trois bibliothèques par défaut

Transloco + Angular Material + Tailwind pour toute nouvelle application Angular.
**Déjà décidé** par
[ADR-0041 §Décision](../adr/0041-angular-material-tailwind-defaults.md).
Material ne peut pas redevenir opt-in sans un ADR qui **supersède** formellement
ADR-0041. Ce plan ne rouvre pas la question.

### D2 — La coexistence navigateur est un job CI dédié et obligatoire

Un check **`library-runtime-browser`**, distinct du smoke test de connexion. Il
peut partager le cache Playwright/Chromium, mais conserve :

| Attribut     | Exigence                                                            |
| ------------ | ------------------------------------------------------------------- |
| Diagnostic   | le sien (artefacts, trace, capture — jamais mêlés à l'e2e login)    |
| Déclencheurs | les siens (voir §Déclenchement CI)                                  |
| Timeout      | le sien                                                             |
| Statut       | **obligatoire** (required check), dès que le proof passe `enforced` |

### D3 — La matrice de compatibilité est un fichier séparé

`conventions/libraries/<platform>/<library>.compat.json`, **schéma fermé et
validé** par `check:library-setup`. Mettre `tracks` **dans** la recette créerait
une auto-référence : une entrée porte le `recipe_sha`, qui changerait à chaque
ajout d'entrée.

Champs référencés par chaque entrée :

- `platform` + `library` ;
- versions des paquets (`packages[]` résolus) ;
- versions d'outillage pertinentes : Angular, Nx, Bun, Node ;
- `recipe_sha` (hash de la recette validée) ;
- `runtime_proofs[]` réellement exécutés pour cette entrée ;
- `verified_at` (date) + `verified_commit` (SHA de validation).

### D4 — Le candidat est un workspace complet, hors du dépôt

Pas de copie minimale, **aucun `node_modules` partagé**. Voir §suivante : c'est
aussi le P0 nº 1.

## P0 nº 1 — Candidat isolé (workspace complet hors dépôt)

**Défaut corrigé.** La version précédente de ce document plaçait le candidat
sous `.cmz/library-candidates/…` avec un `node_modules` symlinké. Contre-preuve
exécutée en revue : Nx lancé depuis `.cmz/` **remonte à la racine réelle** et
charge le vrai `nx.json` et le vrai projet. Un schematic exécuté ainsi pouvait
écrire dans le vrai `package.json`. L'isolation annoncée était fausse.

### Forme

- **Export complet du workspace hors du dépôt** :
  `git worktree add --detach <mkdtemp hors dépôt> <commit>`. Ni sous le dépôt,
  ni sous `.cmz/`. C'est un workspace Nx **cohérent et complet** (`nx.json`,
  `package.json`, `tsconfig.base.json`, tous les `apps/` et `libs/`) figé à un
  commit — pas un fragment.
- **Dépendances propres** : `bun install --frozen-lockfile` **dans le candidat**
  (déterministe depuis `bun.lock`, sert du cache Bun global). `add-library` mute
  ensuite le `package.json` du candidat et relance `bun install`. **Aucun lien**
  candidat → `node_modules` réel.
- **Preuve de non-contamination** : hash de l'arbre du dépôt réel +
  `git status --porcelain` avant/après ; toute différence → échec bruyant.
  `git worktree remove --force` en fin de course, succès comme échec.

### Confinement du processus exécutant

Vaut pour **tout** exécutant : schematic `ng add`, script `reference-derived`,
probes runtime, agent LLM.

| Contrainte    | Mise en œuvre                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Écriture      | le répertoire candidat **seul** ; tout chemin hors candidat rejeté par le même confinement `resolveReal` que la gate (zéro lien symbolique traversé)  |
| Dépôt réel    | **inaccessible** au processus ; à défaut, monté en lecture seule — jamais dans le `cwd` ni dans un chemin transmis                                    |
| Environnement | nettoyé : allowlist de variables (`PATH`, `HOME` jetable, `CI`), **aucun credential VCS** (`GIT_*`, `GH_TOKEN`, `NPM_TOKEN`, `SSH_AUTH_SOCK` retirés) |
| Réseau        | ouvert **uniquement** pendant `bun install`, **fermé ensuite** — schematic, probes et LLM s'exécutent hors ligne                                      |
| Shell         | jamais : `execFileSync(executable, argv)`, pas d'interpolation hors `{{app}}`                                                                         |

### Cycle

- `--dry-run` : construit le candidat, exécute, capture le diff, calcule le
  `plan_id`, **jette** le candidat ;
- `--apply <plan-id>` : reconstruit un candidat neuf, recalcule le `plan_id`,
  **refuse** s'il diffère, puis **publie le change-set** (pas le schematic) sur
  le dépôt réel, sous transaction.

Le dépôt réel ne voit donc **jamais** un schematic s'exécuter : uniquement des
écritures de fichiers déjà diffées, hashées et validées.

## P0 nº 2 — Verrous et transaction

**Défaut corrigé.** La version précédente relâchait le verrou global avant de
prendre le verrou d'app : une transaction en rollback pouvait écraser les
mutations racine d'une transaction suivante.

### Acquisition

Ordre canonique **global → app**, les deux **conservés jusqu'au commit ou au
rollback final**. Aucune fenêtre intermédiaire.

| Verrou                      | Protège                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `<txn-root>/workspace.lock` | `package.json` racine, `bun.lock`, `workspaces.catalog[s]` |
| `<txn-root>/<app>.lock`     | `apps/<app>/**`                                            |

Contenu `{ pid, hostname, startedAt }` ; verrou dont le pid est mort =
récupérable (pattern `retire-module-transaction.mjs`). Impossible de prendre un
verrou → échec immédiat, jamais d'attente silencieuse.

### Journal & rollback

- **Journal** `<txn-root>/<app>-<library>/state.json`, écrit par `rename`
  atomique ;
  `status ∈ { planned, packages-installed, config-published, manifest-updated }`
  ; snapshot immuable (octets + sha256) de **tous** les fichiers cibles — racine
  et app — avant la première écriture.
- **Rollback** sur toute erreur : restauration octet pour octet depuis le
  snapshot, `bun install --frozen-lockfile` sur le `package.json` restauré,
  purge candidat + transaction. Rollback incomplet = arrêt bruyant.
- **Reprise SIGKILL** : `--resume` revalide les snapshots (dérive → `--abort`
  seul autorisé) ; `--abort` restaure et nettoie.

### Transactions imbriquées (`create-app`)

`create-app` ouvre **une transaction parente** qui **possède** les verrous et
les passe aux enfants via un `TransactionContext` explicite. Les enfants
(`add-library ×3`) ne ré-acquièrent rien et n'ont pas le droit de relâcher.
Toute erreur d'un enfant → rollback enfant **puis** parent : `apps/<app>`
disparaît, `package.json` / `bun.lock` restaurés. **Un seul point de rollback
atomique.**

## P0 nº 3 — `plan_id` exhaustif et change-set déterministe

**Défaut corrigé.** Le `plan_id` précédent ne couvrait ni `bun.lock`, ni
`nx.json`, ni le code du runner, ni les schémas, ni les versions d'outillage :
deux plans identiques pouvaient correspondre à des exécutions différentes.

### Sources hashées

`plan_id = sha256` de la concaténation canonique de :

1. octets de la recette **et** de son schéma ;
2. octets de `package.json`, `bun.lock`, `nx.json`, `tsconfig.base.json` ;
3. arbre complet de `apps/<app>` — liste triée `path\0mode\0sha256` ;
4. outillage **lu, jamais supposé** : version Node, Bun, Nx, et du paquet
   fournissant le schematic ;
5. hash du module runner (`library-addition.mjs`) — un changement de runner
   invalide les plans antérieurs ;
6. valeur substituée à `{{app}}`.

### Change-set

Pas un patch textuel. Une entrée structurée par fichier :

```
{ op: "create" | "modify" | "delete" | "rename",
  path, from_path?, mode,
  sha256_before?, sha256_after,
  bytes_before?, bytes_after }
```

Les **octets exacts** avant/après sont conservés au journal → rollback
byte-exact quel que soit l'encodage ou les fins de ligne, et `--apply` écrit des
octets, pas un patch réinterprété. `op` couvre explicitement création,
modification, suppression, renommage et changement de mode.

## P0 nº 4 — Confinement de l'exécutant LLM

**Défaut corrigé.** La version précédente ne posait qu'un `prompt_contract` : un
prompt n'est pas une frontière d'exécution.

Le recours LLM (`install.method: llm-then-verified`) hérite **intégralement** du
confinement de processus du P0 nº 1 (candidat seul en écriture, dépôt réel
inaccessible, environnement nettoyé sans credential, réseau fermé, pas de
shell), et y ajoute :

- **Allowlist de chemins** déclarée dans la recette (`llm_write_paths[]`) —
  toute écriture hors liste rejette l'itération ;
- **Gate de diff par itération** : après chaque tour, le diff du candidat doit
  rester dans l'allowlist **et** progresser vers les `static_invariants` ;
- **Maximum 3 itérations**, puis échec dur ;
- **Journal complet** `<txn-root>/<txn>/llm-log.jsonl` : prompt, réponse et diff
  de chaque tour ;
- **Zéro publication directe** : la sortie est un diff candidat qui repasse par
  le `--apply` normal (`plan_id`, transaction, `check:library-setup` +
  `check:library-runtime` verts).

## Idempotence

Si le manifeste déclare déjà la bibliothèque **et** que `check:library-setup`
passe pour cette paire → `no-op` (exit 0, rien d'écrit, aucun verrou pris
au-delà de la lecture). Un `--apply` rejoué après succès est sûr.

## Harnais `runtime_acceptance`

`tools/check-library-runtime.mjs`. Toute preuve s'exécute **dans un candidat**,
jamais dans une vraie app.

| `proof`               | Exécution                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile-component`   | candidat + composant sentinelle important la primitive ; `ngc --strictTemplates` / build Nx ; échec = type ou template invalide                     |
| `compiled-css-rule`   | candidat + classe sentinelle unique (`text-[#123456]`) ; build ; la règle `color:#123456` doit figurer dans le CSS émis                             |
| `browser-coexistence` | candidat + page bouton Material et utilitaires Tailwind ; Playwright : styles Material préservés, utilitaires appliqués, pas de régression du reset |

Bascule `harness-pending → enforced` recette par recette quand le proof est vert
en CI. `check:library-setup` refuse déjà `enforced` sans harnais : **la bascule
EST le signal de livraison**.

### Jobs et déclenchement CI

Deux jobs, hors du job `guardrails` :

| Job                       | Contenu                                  | Statut                                      |
| ------------------------- | ---------------------------------------- | ------------------------------------------- |
| `library-runtime`         | `compile-component`, `compiled-css-rule` | obligatoire dès le premier proof `enforced` |
| `library-runtime-browser` | `browser-coexistence` (D2)               | obligatoire dès ce proof `enforced`         |

**Aucun filtre `paths:`** : un filtre qui rate un déclencheur est un trou
silencieux, et les entrées pertinentes débordent largement `apps/**` —
`package.json`, `bun.lock`, catalog, versions Angular/Nx/Bun/Node, scripts du
harnais, `nx.json`, le renderer `create-app`, et le workflow CI lui-même. Les
jobs tournent donc sur **toute PR**, `fail-fast: false`. Budget cible :
`library-runtime` ≤ 6 min, `library-runtime-browser` ≤ 4 min.

## Gouvernance d'upgrade

- **Matrice** `<library>.compat.json` (D3). `check:library-setup` échoue si la
  version résolue sort de toute entrée vérifiée.
- **Renovate / Dependabot** : un bump ouvre une PR ; `library-runtime` et
  `library-runtime-browser` s'exécutent ; un `static_invariant` cassé signale un
  changement de mécanisme → **migration de la recette dans la PR**, avec une
  nouvelle entrée `compat` — jamais un générateur touché.
- **Traçabilité** : chaque migration porte sa raison (ex. « `provideAnimations`
  retiré en v23 → `animate.enter` ») et un `verified_commit`.

## Ordre de revue et de livraison

Revue **P0 par P0** ; aucun code d'un lot tant que le P0 dont il dépend n'est
pas validé.

| #   | Étape                                   | Sortie                                                                          |
| --- | --------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | ~~Durcissement `check:library-setup`~~  | **livré**, mergé en `c6b5b64`                                                   |
| 2   | P0 nº 1 — candidat isolé                | conception validée                                                              |
| 3   | P0 nº 2 — verrous et transaction        | conception validée                                                              |
| 4   | P0 nº 3 — `plan_id` / change-set        | conception validée                                                              |
| 5   | P0 nº 4 — confinement exécutants et LLM | conception validée                                                              |
| 6   | Tranche verticale Material              | `add-library` + `material-component-compiles` **enforced**                      |
| 7   | Tranche verticale Tailwind              | `sentinel-class-emits-rule` **enforced**                                        |
| 8   | Coexistence navigateur                  | `material-tailwind-render-together` **enforced**                                |
| 9   | Transloco + `create-app` atomique       | E2E `create-app → add-library ×3 → frozen → build → lint → test → gate → abort` |
| 10  | Gouvernance d'upgrade                   | `.compat.json` + revalidation sur bump                                          |
| 11  | Recours LLM borné                       | schematic cassé simulé → LLM → gates vertes                                     |

Chaque étape ≥ 6 : branche dédiée, PR, CI verte, revue, validation, puis merge.

## Coordination — session `cmz-platform-42` (renderer)

- Elle possède `angular-pwa-shell-renderer.mjs`, `application-shell.test.mjs`,
  `core/page-realization.mjs`, `archetype-role-model.md`, `docs/adr/0040-*` (non
  commités).
- **Étapes 6–8 ne touchent aucun de ces fichiers** : `tools/add-library.mjs`,
  `tools/generator-platform/core/library-addition.mjs` et
  `tools/check-library-runtime.mjs` sont neufs ; candidats et pages de test
  vivent hors dépôt ou dans un fixture jetable.
- **Étape 9 touche `create-app`** — pas forcément le renderer : l'écriture du
  manifeste peut vivre dans `application-shell-publication.mjs`. Séquencée après
  le merge de `cmz-platform-42`, conçue **avec** elle.
- Ce document est le point de rendez-vous : le mettre à jour, pas le dupliquer.
