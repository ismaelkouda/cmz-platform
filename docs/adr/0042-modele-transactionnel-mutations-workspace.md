# ADR-0042 — Modèle transactionnel et d'isolation des mutations de workspace

- **Statut :** Proposed
- **Date :** 2026-09-04

## Contexte

[ADR-0041](./0041-angular-material-tailwind-defaults.md) fait de Transloco +
Angular Material + Tailwind les défauts de toute nouvelle application Angular,
et décrit le setup de chaque bibliothèque par une recette
`conventions/libraries/<platform>/<library>.setup.json`. `check:library-setup`
(mergé en `c6b5b64`) vérifie que ces recettes ne dérivent pas.

Rien n'**installe** encore. Le pas suivant — un outil `add-library` qui exécute
réellement le schematic du vendeur ou le script `reference-derived`, puis un
harnais qui exécute les `runtime_acceptance` — mute le workspace :
`package.json` racine, `bun.lock`, le catalog, l'arborescence de l'app, son
manifeste. Il fait en outre exécuter du **code tiers** (schematic `ng add`), et,
en dernier recours, un **agent LLM**.

Quatre propriétés doivent être décidées **avant** d'écrire cet outil, parce
qu'elles ne peuvent pas être ajoutées après coup sans réécrire son cœur :

1. où s'exécute le code tiers, et ce qu'il peut atteindre ;
2. comment les mutations concurrentes sont sérialisées, et jusqu'où le rollback
   est atomique ;
3. ce qui identifie un plan, et sous quelle forme un changement est appliqué ;
4. ce qui borne un agent LLM — au-delà d'une consigne textuelle.

Une première rédaction de ces propriétés (dans
[`library-setup-runtime-plan.md`](../architecture/library-setup-runtime-plan.md))
a été invalidée par contre-preuve : un « candidat » placé sous `.cmz/` avec un
`node_modules` symlinké **n'isole rien** — Nx remonte jusqu'à la racine réelle
du workspace et charge le vrai projet. Un schematic exécuté ainsi pouvait écrire
dans le vrai `package.json`.

Le dépôt possède déjà un précédent applicable : `create-module` /
`retire-module` (transaction journalisée, verrou avec récupération de pid mort,
rollback octet pour octet, reprise après SIGKILL — testés par
`module-lifecycle.test.mjs`), et `create-app` (`--dry-run` / `--apply <plan-id>`
avec candidat et contrôle de fraîcheur).

## Options envisagées

### Option A — Exécuter le schematic dans le workspace réel, puis relire le diff

- Avantages : aucun outillage d'isolation ; rapide à écrire ; le résultat est
  immédiatement celui qu'on veut.
- Inconvénients : le code tiers écrit **avant** qu'on sache ce qu'il écrit ; un
  schematic cassé ou hostile corrompt le dépôt ; le rollback doit deviner ce qui
  a bougé ; un `--dry-run` honnête est impossible (on ne connaît la sortie d'un
  schematic qu'en l'exécutant).

### Option B — « Candidat » local sous `.cmz/`, `node_modules` partagé

- Avantages : léger, rapide ; réutilise le cache d'installation.
- Inconvénients : **isolation fausse** — contre-preuve exécutée, Nx découvre la
  racine réelle depuis `.cmz/` et charge le vrai projet ; le `node_modules`
  partagé offre en outre un chemin d'écriture indirect vers le dépôt réel.
  Rejetée sur preuve.

### Option C — Workspace complet hors dépôt, transaction à verrous tenus, plan hashé exhaustivement, exécutants confinés

- Avantages : le code tiers ne peut atteindre que le candidat ; le dépôt réel ne
  reçoit que des écritures d'octets déjà diffées et hashées ; un `--dry-run`
  porte le hash d'une sortie **réellement produite** ; les mutations
  concurrentes sont impossibles ; le rollback est byte-exact et atomique jusqu'à
  la transaction parente ; un agent LLM est borné par le système de fichiers,
  pas par un prompt.
- Inconvénients : coût — un `git worktree` + `bun install --frozen-lockfile` par
  `--dry-run` et par `--apply` (~1–3 min) ; plus de machinerie à écrire et à
  tester ; `add-library` devient un outil de dev/CI, jamais du chemin critique.

## Décision

**Option C**, en quatre invariants indissociables.

**1. Isolation.** Tout exécutant tiers — schematic `ng add`, script
`reference-derived`, probe `runtime_acceptance`, agent LLM — s'exécute dans un
**export complet du workspace hors du dépôt** (`git worktree add --detach` vers
un répertoire temporaire hors arborescence), avec ses **propres dépendances**
(`bun install --frozen-lockfile` dans le candidat, **aucun `node_modules`
partagé ni symlinké**). Le processus est confiné : le candidat seul est
inscriptible, le dépôt réel inaccessible ou en lecture seule, l'environnement
nettoyé sans credential VCS, le réseau fermé après l'installation, aucun shell
(`execFileSync(executable, argv)`). La non-contamination du dépôt réel est
**prouvée** (hash de l'arbre + `git status` avant/après) et son échec est
bruyant.

**2. Transaction.** Les verrous sont pris dans l'ordre canonique **global →
app** et **conservés jusqu'au commit ou au rollback final** — jamais relâchés
entre deux étapes. Une transaction parente (`create-app`) **possède** les
verrous et les transmet par un contexte explicite à ses transactions enfants
(`add-library`), qui ne les ré-acquièrent ni ne les relâchent. Le journal
conserve un snapshot d'octets de tous les fichiers cibles avant la première
écriture ; le rollback est byte-exact, et remonte de l'enfant au parent en un
seul point atomique. Reprise après SIGKILL par `--resume`, abandon sûr par
`--abort`.

**3. Identité du plan.** `plan_id` hashe **toutes** les entrées qui peuvent
changer la sortie : recette et schéma, `package.json`, `bun.lock`, `nx.json`,
`tsconfig.base.json`, l'arbre complet de l'app (`path\0mode\0sha256`), les
versions d'outillage **lues** (Node, Bun, Nx, paquet du schematic), le hash du
module runner, et la valeur substituée à `{{app}}`. Un changement est représenté
par un **change-set structuré** — `op ∈ {create, modify, delete, rename}`, mode,
`sha256` avant/après et **octets exacts** au journal — jamais par un patch
textuel.

**4. Frontière de l'agent LLM.** Le recours `llm-then-verified` hérite
intégralement du confinement (1), et y ajoute une allowlist de chemins déclarée
dans la recette, une gate de diff à chaque itération, un maximum de 3
itérations, un journal complet des prompts/réponses/diffs, et **zéro publication
directe** : sa sortie est un diff candidat qui repasse par `--apply`.

## Justification

**L'isolation est une propriété prouvée, pas déclarée.** L'Option B semblait
suffisante et ne l'était pas : c'est une contre-preuve exécutée, pas un
raisonnement, qui l'a écartée. Un `git worktree` détaché hors dépôt est la seule
forme testée qui donne à Nx une racine cohérente **sans** que cette racine soit
le vrai dépôt. Le coût de `bun install --frozen-lockfile` est le prix de cette
garantie, et il est acceptable parce que `add-library` n'est pas sur le chemin
critique.

**Un `--dry-run` doit porter une sortie réelle.** On ne peut pas prédire ce
qu'écrit `ng add @angular/material` sans l'exécuter. Le seul `--dry-run` honnête
exécute donc le schematic — d'où l'obligation d'un lieu d'exécution sûr, et d'un
`plan_id` qui hashe le diff produit plutôt qu'une intention.

**Les verrous tenus évitent une classe entière de corruption.** Relâcher le
verrou global entre la mutation racine et la configuration de l'app ouvre une
fenêtre où le rollback d'une transaction écrase les écritures légitimes d'une
autre. Tenir les deux verrous jusqu'au bout supprime la fenêtre ; faire posséder
les verrous par la transaction parente supprime la même fenêtre entre enfants.

**Des octets, pas un patch.** Un patch textuel réinterprète l'encodage et les
fins de ligne ; un rollback « best effort » n'est pas un rollback. Stocker les
octets exacts rend la restauration vérifiable.

**Un prompt n'est pas une frontière de sécurité.** La seule borne fiable pour un
agent est celle que le système de fichiers et le processus imposent. Le
`prompt_contract` reste utile comme cadrage, jamais comme garantie.

## Conséquences

### Positives

- Le dépôt réel ne voit jamais s'exécuter un schematic, un probe ou un LLM :
  seulement des écritures d'octets déjà diffées, hashées et validées.
- `--dry-run` est reproductible et vérifiable ; `--apply` refuse un plan périmé.
- Deux `add-library` concurrents sont impossibles ; `create-app` a un seul point
  de rollback atomique.
- La même frontière d'exécution sert au schematic, aux probes et au LLM — une
  seule mécanique à écrire, à tester et à auditer.

### Négatives / dette acceptée

- **Coût** : un worktree + une installation gelée par `--dry-run` et par
  `--apply` (~1–3 min). `add-library` est un outil de dev/CI, jamais interactif
  ni sur le chemin critique.
- **Volume d'outillage** : transaction, verrous, journal, change-set,
  confinement et harnais représentent l'essentiel du travail — bien plus que
  l'installation elle-même.
- Le journal conserve des octets de fichiers : les transactions doivent être
  purgées après succès, et `.cmz/` reste hors Git.
- Aucune de ces garanties n'est acquise tant que le code n'existe pas : cet ADR
  décide un modèle, il ne le livre pas. Les quatre `runtime_acceptance` de
  ADR-0041 restent `harness-pending`.

### Points à réévaluer

- Si le coût du candidat devient prohibitif en CI, envisager une **réutilisation
  contrôlée** (worktree conservé entre deux proofs d'une même exécution, purgé
  entre deux exécutions) — jamais un retour au `node_modules` partagé.
- Si un schematic exige réellement le réseau après l'installation, il faudra une
  exception **nommée, justifiée et bornée** dans la recette — pas un
  assouplissement global.
- Si un exécutant tiers doit un jour écrire hors du candidat (cas non identifié
  aujourd'hui), cet ADR doit être remplacé, pas contourné.

## Références

- [ADR-0041](./0041-angular-material-tailwind-defaults.md) — défauts
  Material/Tailwind, recettes et séparation `static_invariants` /
  `runtime_acceptance`.
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md) — contrat de
  durabilité de la publication générée (même exigence de reprise vérifiable).
- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md) —
  régénération non destructive.
- [`library-setup-runtime-plan.md`](../architecture/library-setup-runtime-plan.md)
  — plan d'exécution, ordre de revue P0 par P0, budget CI.
- Précédents dans le dépôt : `tools/retire-module-transaction.mjs`,
  `tools/create-module.mjs` (transaction, verrou, reprise SIGKILL),
  `tools/generator-platform/core/application-shell-publication.mjs` (`--dry-run`
  / `--apply <plan-id>`).
