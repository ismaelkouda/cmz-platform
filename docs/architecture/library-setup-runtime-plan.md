# Plan — installation réelle + preuves runtime des bibliothèques

- **Statut :** Proposed. Les **arbitrages D1–D8 sont tranchés** (revues du
  2026-09-04) ; les quatre prérequis P0 sont **soumis à revue un par un**, dans
  l'ordre §« Ordre de revue ». **Aucun code `add-library` avant validation P0
  par P0.**
- **Objectif servi :** créer une application sans écrire de code, puis ajouter
  une bibliothèque par **une seule commande** —
  `bun run add-library --app clean-street --library angular-material` — qui
  installe la bonne version, applique la configuration, vérifie que
  l'application compile, vérifie que la bibliothèque fonctionne, met à jour le
  manifeste, et annule tout en cas d'erreur.
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

Pas de copie minimale, **aucun `node_modules` partagé**. Forme retenue :
matérialisation **depuis le tree Git** — ni `git worktree`, ni `git archive` (P0
nº 1).

### D5 — Confinement OS obligatoire, partout

Conteneur en CI, `sandbox-exec` en local macOS, **échec avant toute exécution
tierce** si aucun backend conforme. Les deux backends passent la **même suite
adversariale**. Le confinement couvre aussi `bun install`.

### D6 — Aucun script tiers ; le cache est une optimisation, jamais une frontière

`bun install --ignore-scripts` : aucun code tiers ne s'exécute pendant la
récupération. Réseau ouvert pour la seule récupération, **coupé** ensuite — plus
besoin d'un « réseau limité au registre », inexprimable dans un conteneur
ordinaire comme dans `sandbox-exec`, et devenu inutile. `--backend=copyfile`
obligatoire, `BUN_INSTALL_CACHE_DIR` dédié, global store désactivé, cache en
lecture seule pendant schematic / probes / LLM.

### D7 — Les commits Git remplacent les snapshots d'octets, pas la transaction

`update-ref` ne synchronise ni l'index ni le worktree : la publication reste une
transaction verrouillée, journalisée par phase et reprenable (P0 nº 2).

### D8 — Une seule commande nominale

`bun run add-library --app <app> --library <lib>` fait candidat → installation →
schematic → preuves → publication. `--dry-run` et `--expect-plan <plan_id>` sont
facultatifs ; le `plan_id` est **toujours** affiché et journalisé.

## P0 nº 1 — Candidat isolé (workspace complet hors dépôt)

**Défaut corrigé.** La version précédente de ce document plaçait le candidat
sous `.cmz/library-candidates/…` avec un `node_modules` symlinké. Contre-preuve
exécutée en revue : Nx lancé depuis `.cmz/` **remonte à la racine réelle** et
charge le vrai `nx.json` et le vrai projet. Un schematic exécuté ainsi pouvait
écrire dans le vrai `package.json`. L'isolation annoncée était fausse.

Une seconde forme a ensuite été écartée, elle aussi sur preuve :
`git worktree add --detach` **écrit dans le dépôt réel** (`.git/worktrees/<nom>`
— écriture qu'un contrôle par `git status --porcelain` ne verrait pas) et place
dans le candidat un `.git` pointant vers le dépôt, offert au code tiers.

### Forme retenue — matérialisation depuis le tree Git

Une troisième forme a été écartée sur preuve : `git archive` applique les
attributs Git, **et les lit aussi depuis `.git/info/attributes`**, un fichier
absent du commit donc invisible à toute revue. Test exécuté : un `export-ignore`
placé dans `.git/info/attributes` **retire silencieusement** le fichier de
l'archive ; `export-subst` en transformerait de même le contenu.

Le candidat est donc matérialisé **depuis le tree** du commit `C`, dans un
`mkdtemp` hors du dépôt :

- `git ls-tree -r -z <C>` → inventaire complet `(mode, type, OID, chemin)` ;
- un seul `git cat-file --batch` → contenus ;
- écriture des **octets exacts du blob**. L'OID **est** l'autorité de contenu :
  aucune machinerie d'attributs n'intervient, donc `export-ignore`,
  `export-subst`, `.git/info/attributes` et `core.attributesFile` sont sans
  effet **par construction**, pas par vérification a posteriori.

Règles d'intégrité, appliquées entrée par entrée :

| Contrôle        | Règle                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode            | `100644`, `100755`, `120000` uniquement. Tout autre — dont `160000` (sous-module) — fait échouer la commande. Ce dépôt : 3897 / 8 / 1, aucun autre.                                                                 |
| Type            | `blob` seulement ; `commit` (sous-module) et `tree` inattendu refusés                                                                                                                                               |
| Contenu         | octets du blob écrits tels quels ; aucun fichier créé hors de l'inventaire                                                                                                                                          |
| Lien symbolique | cible = contenu exact du blob, créée **seulement** si elle résout à l'intérieur du candidat. Ce dépôt en a un (`.claude/skills/angular-developer → ../../.agents/skills/angular-developer`, cible suivie — vérifié) |
| Chemin          | normalisé, refus de tout segment `..` ou absolu                                                                                                                                                                     |

Mesuré sur ce dépôt :

| Contrôle                              | Résultat                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Matérialisation depuis le tree        | **0,6 s**, 3906 entrées — plus rapide que `git archive` (1 s)                      |
| `.git` dans le candidat               | **absent**                                                                         |
| Écriture dans le dépôt réel           | **aucune**                                                                         |
| Workspace complet                     | `nx.json`, `package.json`, `tsconfig.base.json`, `bun.lock`, `apps/*/project.json` |
| `nx workspaceRoot` depuis le candidat | **= le candidat**                                                                  |

L'affirmation « archive byte-identique à un checkout » est **retirée** : elle
n'est pas un contrat portable entre systèmes. La source de vérité est le tree
Git, jamais l'arbre de travail local.

### Dépendances du candidat — sans aucun script tiers

`bun install --frozen-lockfile --ignore-scripts --backend=copyfile --cache-dir=<cache dédié>`,
dans le candidat, **sous bac à sable**.

`--ignore-scripts` est l'invariant central : pendant la récupération, **seul le
code de Bun s'exécute** (téléchargement, extraction). Il n'existe donc **aucune
phase où du code tiers tourne avec le réseau ou le cache ouverts**. Deux
exigences antérieures deviennent sans objet :

- « cache inaccessible seulement après l'installation » — le cache n'est jamais
  atteignable par du code tiers, puisqu'il n'y en a pas qui s'exécute ;
- « réseau limité au registre » — inexprimable dans un conteneur ordinaire comme
  dans `sandbox-exec`, et **inutile** : réseau ouvert pour la seule
  récupération, **entièrement coupé** ensuite.

**Vérifié sur ce dépôt, sans aucun script** : `ngc --strictTemplates` sort en 0
(12 s) et `nx run backoffice-angular:build:development` sort en 0 (16 s) avec
`dist/apps/backoffice-angular/browser/styles.css` émis — la preuve
`compiled-css-rule` est donc réalisable dans ces conditions.

`--backend=copyfile` reste obligatoire (sans lui Bun relie `node_modules` au
cache : `hardlink` sous Linux, `clonefile` sous macOS), global store désactivé,
cache en lecture seule pendant schematic / probes / LLM — défense en profondeur.
Le cache **partagé** redevient acceptable, ce qui ramène l'installation de 72 s
à froid à **19 s à chaud**.

`--ignore-scripts` neutralise aussi les scripts du dépôt (`preinstall`,
`prepare`) : les contrôles correspondants (`check-engines`) sont exécutés par
`add-library` lui-même, jamais hérités de l'installation. Si une dépendance
exigeait un jour un script de cycle de vie, ce serait une **exception nommée,
justifiée et confinée** — phase dédiée, sans réseau — jamais un assouplissement
global. La suite adversariale contient une fixture à `postinstall` dont le
marqueur doit rester **absent**.

### Confinement OS — obligatoire, partout

Aucun code tiers ne s'exécute sans bac à sable du système. Backends conformes :
**conteneur** (CI) et **`sandbox-exec`** (macOS local). Aucun disponible → la
commande **échoue avant** toute exécution tierce. Une fonction ne porte le nom
`runConfined` que si un bac à sable réel l'applique.

| Contrainte    | Mise en œuvre                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Écriture      | le répertoire candidat **seul**, imposé par le bac à sable                                                                                                                       |
| Dépôt réel    | jamais monté en écriture ; hors du `cwd` et de tout chemin transmis                                                                                                              |
| Réseau        | **limité au registre** pendant l'installation, **coupé** pour schematic / probes / LLM                                                                                           |
| Environnement | allowlist (`PATH`, `HOME` jetable, `CI`) ; **aucun credential** (`GIT_*`, `GH_TOKEN`, `NPM_TOKEN`, `SSH_AUTH_SOCK`)                                                              |
| Shell         | jamais : `execFile(executable, argv)`, pas d'interpolation hors `{{app}}`                                                                                                        |
| Binaires      | résolus **explicitement** dans le candidat (`<cand>/node_modules/.bin/nx`) ; **`bunx` interdit** en phase hors ligne — il installe un paquet absent dans un cache global partagé |

`sandbox-exec` a été prouvé sur cette machine : écriture hors candidat →
`Operation not permitted` ; réseau refusé → `Could not resolve host` ; les deux
autorisés hors bac à sable. Docker est installé mais **son démon est
injoignable** ici : exiger Docker en local rendrait la commande inutilisable.

Les **deux** backends passent la même suite adversariale : écriture et lecture
hors candidat, réseau, lien symbolique d'évasion, sous-processus, credentials,
chemins absolus.

### Précondition — dépôt entièrement propre

Toute entrée non commitée fait échouer la commande. Contrôler seulement l'app,
`package.json`, `bun.lock`, `nx.json` et `tsconfig.base.json` serait insuffisant
: la recette, son schéma, le module runner et `.gitattributes` entrent aussi
dans le `plan_id`. Une fermeture exacte sur les entrées du plan pourra venir
plus tard ; la V1 exige un worktree propre.

### Cycle

Chemin nominal — **une seule commande** :

```
bun run add-library --app clean-street --library angular-material
```

candidat → installation → schematic → preuves → publication. Le `plan_id` est
**toujours** calculé, affiché et journalisé. Options : `--dry-run` (s'arrête
avant publication) et `--expect-plan <plan_id>` (reproductibilité en CI).

### Ordre imposé pour le déterminisme

Un schematic qui résout sa version depuis le réseau rend le `plan_id`
irréproductible. D'où :

1. sélectionner une entrée de compatibilité validée (`.compat.json`) ;
2. écrire les versions exactes dans le catalog **du candidat** ;
3. produire et vérifier son lockfile ;
4. **couper le réseau** ;
5. exécuter le générateur **déjà installé**, via le binaire Nx du candidat, en
   échouant si sa version ne correspond pas au lockfile (lue dans
   `node_modules/nx/package.json`, pas par analyse d'une sortie `--version`).

Les recettes utilisent déjà `nx g @angular/material:ng-add` et non `ng add` : la
collection est locale, donc exécutable sans résolution distante.

### Cycle de vie du candidat — bail journalisé

Un `SIGKILL` empêche tout `finally` ou `dispose()` : « zéro résidu immédiat »
n'est pas un contrat tenable. Le contrat réel est un **bail**. Et « propriétaire
mort détecté, purge sûre » n'est pas assez précis : un PID réutilisé ou un
journal altéré ferait supprimer le mauvais répertoire. Conditions
**cumulatives** de purge :

| Condition    | Règle                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Identité     | identifiant **aléatoire, non réutilisable** (≥ 128 bits), jamais dérivé d'un compteur ni d'un PID                                         |
| Propriétaire | **PID + instant de démarrage du processus** (`ps -o lstart= -p <pid>`, vide si le PID n'existe pas — vérifié) ; un PID seul ne suffit pas |
| Emplacement  | chemin **canonique** sous une racine temporaire dédiée à l'outil ; refus si un ancêtre est un lien symbolique                             |
| Propriété    | propriétaire et permissions attendus, vérifiés avant toute suppression                                                                    |
| Marqueur     | fichier d'identité **dans** le candidat, contenant l'identifiant du bail                                                                  |
| Concordance  | **aucune suppression** si journal et marqueur ne concordent pas — le candidat est alors signalé, jamais effacé                            |

Un candidat dont le propriétaire est mort et dont toutes les conditions
concordent est purgé au démarrage suivant. Sinon il est laissé en place et
rapporté : mieux vaut un résidu qu'une suppression erronée.

## P0 nº 2 — Verrous et transaction

**Défaut corrigé.** La version précédente relâchait le verrou global avant de
prendre le verrou d'app : une transaction en rollback pouvait écraser les
mutations racine d'une transaction suivante.

Un second défaut a été écarté : proposer de **remplacer toute la transaction par
un `commit` + un compare-and-swap sur la ref**. C'est faux —
`git update-ref <branche> C' C` ne met à jour **que la ref** ; l'index et le
worktree restent à `C`, et Git présenterait alors le diff inverse en
modifications locales. Synchroniser les trois est une seconde opération, non
atomique avec la première ; et rien n'empêche un humain ou un autre agent de
toucher au worktree pendant les minutes de génération.

**Ce que Git remplace vraiment : les snapshots d'octets, pas la transaction.**

### Acquisition

Ordre canonique **global → app**, les deux **conservés jusqu'à la
synchronisation complète ref + index + worktree**. Aucune fenêtre intermédiaire.

| Verrou                      | Protège                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `<txn-root>/workspace.lock` | `package.json` racine, `bun.lock`, `workspaces.catalog[s]` |
| `<txn-root>/<app>.lock`     | `apps/<app>/**`                                            |

Contenu `{ pid, hostname, startedAt }` ; verrou dont le pid est mort =
récupérable (pattern `retire-module-transaction.mjs`). Impossible de prendre un
verrou → échec immédiat, jamais d'attente silencieuse.

### États Git et journal minimal

- `C` = état initial (le dépôt propre, à ce commit) ; `C'` = état **vérifié**,
  construit à partir du change-set du candidat. Tous deux sont de vrais commits.
- Une ref temporaire `refs/cmz/transactions/<id>` retient `C` et `C'` et empêche
  leur ramassage par `git gc`.
- **Journal** `<txn-root>/<app>-<library>/state.json`, écrit par `rename`
  atomique, contenant `{ état, C, C', phase de publication, plan_id, candidat }`
  — **plus aucun snapshot d'octets** : `C` est le snapshot.
- **Publication** par phases journalisées (ref, puis index, puis worktree),
  **reprenable** après crash sous verrous tenus. Échec avant la première phase →
  le dépôt n'a jamais bougé ; échec en cours → reprise ou retour à `C`, jamais
  un état mi-publié laissé sans trace.
- Purge de la ref temporaire, du candidat et de la transaction après succès.

### Transactions imbriquées (`create-app`)

`create-app` ouvre **une transaction parente** qui **possède** les verrous et
les passe aux enfants via un `TransactionContext` explicite. Les enfants
(`add-library ×3`) ne ré-acquièrent rien et n'ont pas le droit de relâcher. Un
seul `C'` est publié pour l'ensemble ; l'échec d'un enfant laisse le dépôt à
`C`.

## P0 nº 3 — `plan_id` exhaustif et change-set déterministe

**Défaut corrigé.** Le `plan_id` précédent ne couvrait ni `bun.lock`, ni
`nx.json`, ni le code du runner, ni les schémas, ni les versions d'outillage :
deux plans identiques pouvaient correspondre à des exécutions différentes.

### Sources hashées

`plan_id = sha256` de la concaténation canonique de :

1. octets de la recette **et** de son schéma ;
2. octets de `package.json`, `bun.lock`, `nx.json`, `tsconfig.base.json`,
   `.gitattributes` (sans effet sur la matérialisation, mais il gouverne le
   contenu du dépôt et donc le résultat du schematic) ;
3. commit `C` et arbre complet de `apps/<app>` — liste triée
   `path\0mode\0sha256` ;
4. outillage **lu, jamais supposé** : version Node, Bun, Nx (depuis
   `node_modules/nx/package.json`), et du paquet fournissant le schematic ;
5. hash du module runner (`library-addition.mjs`) — un changement de runner
   invalide les plans antérieurs ;
6. valeur substituée à `{{app}}` ;
7. entrée `.compat.json` retenue (versions épinglées avant le schematic).

Le `plan_id` est **toujours** calculé, affiché et journalisé — même sans
`--dry-run`. `--expect-plan <plan_id>` le rend contraignant en CI.

### Change-set

Pas un patch textuel. Une entrée structurée par fichier :

```
{ op: "create" | "modify" | "delete" | "rename",
  path, from_path?, mode,
  sha256_before?, sha256_after }
```

`op` couvre explicitement création, modification, suppression, renommage et
changement de mode. Le contenu n'est pas dupliqué dans le journal : il est déjà
dans les objets Git de `C'`, retenus par la ref temporaire. Un patch textuel
serait réinterprété (encodage, fins de ligne) ; des blobs Git ne le sont pas.

## P0 nº 4 — Confinement de l'exécutant LLM

**Défaut corrigé.** La version précédente ne posait qu'un `prompt_contract` : un
prompt n'est pas une frontière d'exécution.

Le recours LLM (`install.method: llm-then-verified`) hérite **intégralement** du
confinement OS du P0 nº 1 — bac à sable obligatoire, candidat seul inscriptible,
réseau coupé, cache inaccessible, pas de shell, aucun credential — et y ajoute :

- **Allowlist de chemins** déclarée dans la recette (`llm_write_paths[]`) —
  toute écriture hors liste rejette l'itération ;
- **Gate de diff par itération** : après chaque tour, le diff du candidat doit
  rester dans l'allowlist **et** progresser vers les `static_invariants` ;
- **Maximum 3 itérations**, puis échec dur ;
- **Journal complet** `<txn-root>/<txn>/llm-log.jsonl` : prompt, réponse et diff
  de chaque tour ;
- **Zéro publication directe** : sa sortie est un change-set candidat qui
  repasse par la publication normale (`plan_id`, transaction,
  `check:library-setup` + `check:library-runtime` verts).

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

### Suite adversariale du bac à sable (préalable à l'étape 6)

Identique pour les deux backends, chaque cas devant **échouer** :

| Cas                                                     | Attendu                                                |
| ------------------------------------------------------- | ------------------------------------------------------ |
| écriture hors candidat (chemin absolu)                  | refusée par l'OS                                       |
| lecture d'un chemin du dépôt réel                       | refusée ou hors d'atteinte                             |
| lien symbolique d'évasion créé puis suivi               | refusé                                                 |
| sous-processus tentant les mêmes accès                  | refusé (le confinement est hérité)                     |
| accès réseau en phase hors ligne                        | refusé                                                 |
| lecture d'une variable de credential                    | absente de l'environnement                             |
| `bunx <paquet-absent>`                                  | refusé — binaire résolu explicitement dans le candidat |
| cache de paquets pendant schematic / probes             | en lecture seule, jamais inscriptible                  |
| dépendance fixture à `postinstall` écrivant un marqueur | marqueur **absent** (`--ignore-scripts` effectif)      |
| entrée de tree en mode `160000` ou type inattendu       | matérialisation refusée                                |
| lien symbolique dont la cible sort du candidat          | refusé                                                 |
| `.git/info/attributes` hostile dans le dépôt            | sans effet (matérialisation depuis le tree)            |
| PID réutilisé pointant sur un autre processus           | purge refusée (instant de démarrage discordant)        |
| marqueur du candidat ne concordant pas avec le journal  | purge refusée, candidat signalé                        |

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
