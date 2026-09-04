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

### Option C — `git worktree` hors dépôt

- Avantages : workspace Nx cohérent, hors arborescence ; Nx ne remonte plus au
  vrai dépôt.
- Inconvénients : `git worktree add` **écrit dans le dépôt réel**
  (`.git/worktrees/<nom>`) — écriture invisible à `git status --porcelain`, donc
  la preuve de non-contamination ne la détecterait pas ; le candidat contient un
  `.git` qui pointe vers le dépôt, offert au schematic et au LLM. Rejetée.

### Option D — Export d'archive hors dépôt, confinement OS obligatoire, transaction de publication journalisée

- Avantages : `git archive` n'écrit rien dans le dépôt et ne place aucun `.git`
  dans le candidat (vérifié) ; le code tiers est confiné par le système, pas par
  convention ; les états initial et vérifié sont des commits Git, ce qui
  remplace les snapshots d'octets ; un `plan_id` porte le hash d'une sortie
  **réellement produite**.
- Inconvénients : coût mesuré sur ce dépôt — export 1 s, installation gelée avec
  `--backend=copyfile` et cache dédié **72 s à froid, 19 s à chaud** (contre 8,8
  s avec `clonefile` et cache partagé, écarté pour la raison donnée en Décision
  § 3) ; la publication reste une transaction à part entière, car `update-ref`
  ne synchronise ni l'index ni le worktree.

## Décision

**Option D**, en cinq invariants indissociables.

**1. Isolation — export d'archive, jamais de worktree.** Tout exécutant tiers —
schematic, script `reference-derived`, probe `runtime_acceptance`, agent LLM —
s'exécute dans un **export complet du workspace hors du dépôt**, obtenu par
`git archive <commit> | tar -x` vers un répertoire temporaire. **Pas**
`git worktree` : celui-ci écrit dans le dépôt réel (`.git/worktrees/<nom>`, une
écriture qu'un contrôle par `git status --porcelain` ne verrait pas) et place
dans le candidat un `.git` qui pointe vers le dépôt — un chemin d'accès offert
au code tiers. L'export d'archive n'écrit rien dans le dépôt et ne contient
aucun `.git`. Le candidat a ses **propres dépendances** — **aucun `node_modules`
partagé, lié ou en lien dur**.

**2. Confinement OS obligatoire, partout.** Aucun code tiers ne s'exécute sans
bac à sable du système : **conteneur** en CI, **`sandbox-exec`** en local macOS.
Aucun backend conforme disponible → la commande **échoue avant** d'exécuter quoi
que ce soit. « Meilleur effort plus détection » n'est pas un confinement, et une
fonction ne porte le nom `runConfined` que si un bac à sable réel l'applique. Le
confinement couvre **aussi `bun install`** : Bun exécute les scripts de cycle de
vie du projet (ce dépôt a `preinstall` et `prepare`) et ceux des dépendances
autorisées. Phases : installation avec réseau **limité au registre**, puis
schematic / probes / LLM **réseau coupé**. Le dépôt réel n'est jamais monté en
écriture. Les deux backends passent la **même suite adversariale** : écriture et
lecture hors candidat, réseau, lien symbolique d'évasion, sous-processus,
credentials, chemins absolus.

**3. Cache de paquets — optimisation, jamais frontière.**
`BUN_INSTALL_CACHE_DIR` dédié, `--backend=copyfile` **obligatoire**, global
store désactivé, cache rendu **inaccessible** pendant schematic / probes / LLM.
Sans cela, Bun relie `node_modules` au cache (`hardlink` par défaut sous Linux,
`clonefile` sous macOS) : un exécutant qui modifie un fichier de `node_modules`
corromprait le cache partagé, donc toutes les installations ultérieures. Le
cache est indexé par nom/version, **pas** adressé par contenu : sa présence ne
prouve rien.

**4. Transaction de publication — les commits remplacent les snapshots d'octets,
pas la transaction.** Les verrous sont pris dans l'ordre canonique **global →
app** et **conservés jusqu'à la synchronisation complète ref + index +
worktree**. Une transaction parente (`create-app`) possède les verrous et les
transmet par contexte explicite à ses enfants (`add-library`), qui ne les
ré-acquièrent ni ne les relâchent. L'état initial `C` et l'état vérifié `C'`
sont des **commits Git**, retenus par une ref temporaire
`refs/cmz/transactions/<id>` qui empêche leur ramassage ; le journal ne conserve
donc que `{ état, C, C', phase de publication }`, plus de snapshot d'octets. La
publication **n'est pas atomique** : `git update-ref` ne met à jour que la ref —
l'index et le worktree restent à `C`, et Git présenterait alors le diff inverse
en modifications locales. Elle est donc journalisée par phase et **reprenable**
après crash, sous verrous tenus.

**5. Identité du plan et frontière de l'agent LLM.** `plan_id` hashe **toutes**
les entrées qui peuvent changer la sortie : recette et schéma, `package.json`,
`bun.lock`, `nx.json`, `tsconfig.base.json`, `.gitattributes`, l'arbre complet
de l'app (`path\0mode\0sha256`), les versions d'outillage **lues** (Node, Bun,
Nx, paquet du schematic), le hash du module runner, et la valeur substituée à
`{{app}}`. Il est **toujours** calculé, affiché et journalisé — même sans
`--dry-run`. Un changement est un **change-set structuré**
(`op ∈ {create, modify, delete, rename}`, mode, `sha256` avant/après). Le
recours `llm-then-verified` hérite intégralement de (1) à (3) et y ajoute une
allowlist de chemins déclarée dans la recette, une gate de diff à chaque
itération, un maximum de 3 itérations, un journal complet des prompts / réponses
/ diffs, et **zéro publication directe**.

## Justification

**L'isolation est une propriété prouvée, pas déclarée.** Deux options
successives ont été écartées par contre-preuve exécutée, pas par raisonnement :
B (Nx remonte à la racine réelle depuis `.cmz/`) et C (`git worktree` écrit dans
`.git/worktrees`, invisible à `git status`). L'export d'archive a été vérifié
sur ce dépôt : zéro écriture dans le dépôt, aucun `.git` dans le candidat,
workspace Nx complet, et `nx` y résout la racine **du candidat**.

**Un confinement partiel n'est pas un confinement.** « Prévention en CI,
meilleur effort en local » laisse un schematic cassé ou hostile corrompre le
dépôt local avant toute détection. Puisque `sandbox-exec` est disponible sur
macOS et a été prouvé capable de refuser une écriture hors candidat comme un
accès réseau, il n'y a pas de raison d'accepter moins. Un backend manquant doit
donc faire échouer la commande, pas la dégrader silencieusement.

**Le cache de paquets n'est pas une frontière.** Il est indexé par nom/version,
pas adressé par contenu, et Bun relie par défaut `node_modules` au cache. Un
répertoire de cache distinct ne garantit donc pas des octets indépendants : seul
`--backend=copyfile` le fait. Le surcoût mesuré (19 s à chaud contre 8,8 s) est
le prix d'une frontière réelle.

**Un `--dry-run` doit porter une sortie réelle.** On ne peut pas prédire ce
qu'écrit un schematic sans l'exécuter. Le seul `--dry-run` honnête l'exécute
donc — d'où l'obligation d'un lieu d'exécution sûr, et d'un `plan_id` qui hashe
le diff produit plutôt qu'une intention. Corollaire : le `plan_id` n'a de sens
que si le schematic est déterministe, ce qui impose d'**épingler les versions
avant** de le lancer (voir § Conséquences).

**Les commits remplacent les snapshots, mais pas la transaction.** `C` et `C'`
sont des états Git complets et vérifiables : reconstruire un snapshot d'octets
par-dessus serait redondant. En revanche `git update-ref` ne met à jour que la
ref — l'index et le worktree restent en arrière, et Git afficherait le diff
inverse en modifications locales. Synchroniser les trois est une seconde
opération, non atomique avec la première ; et rien n'empêche un humain ou un
autre agent de toucher au worktree pendant les minutes de génération. D'où des
verrous tenus jusqu'à la synchronisation complète, et un journal de phase
reprenable.

**Un prompt n'est pas une frontière de sécurité.** La seule borne fiable pour un
agent est celle que le système de fichiers et le processus imposent. Le
`prompt_contract` reste utile comme cadrage, jamais comme garantie.

## Conséquences

### Positives

- Le dépôt réel ne voit jamais s'exécuter un schematic, un probe ou un LLM :
  seulement une publication journalisée d'un état déjà vérifié.
- La commande nominale est **unique** :
  `bun run add-library --app <app> --library <lib>` enchaîne candidat →
  installation → schematic → preuves → publication. `--dry-run` et
  `--expect-plan <plan_id>` restent facultatifs ; le `plan_id` est **toujours**
  affiché et journalisé.
- Deux exécutions concurrentes sont impossibles ; un crash pendant la
  publication est **reprenable**, `C` et `C'` étant retenus par une ref
  temporaire.
- La même frontière d'exécution sert au schematic, aux probes et au LLM — une
  seule mécanique à écrire, à tester et à auditer.

### Négatives / dette acceptée

- **Coût mesuré** : export 1 s, installation gelée `--backend=copyfile` **72 s à
  froid, 19 s à chaud**, auxquels s'ajoutent schematic et preuves. Une commande
  qui tient les six promesses se compte en **minutes**, pas en secondes.
  `add-library` est un outil de dev/CI, jamais interactif.
- **Dépôt entièrement propre exigé** pour la V1 : toute entrée non commitée fait
  échouer la commande. Une fermeture exacte sur les seules entrées du `plan_id`
  pourra venir plus tard ; contrôler « juste l'app » serait faux, car la
  recette, son schéma, le runner et `.gitattributes` influencent aussi le
  résultat.
- **Volume d'outillage** : confinement, transaction de publication, journal,
  change-set et harnais représentent l'essentiel du travail — bien plus que
  l'installation elle-même.
- `refs/cmz/transactions/*` et `.cmz/` doivent être purgés après succès ; une
  ref temporaire oubliée retient des objets indéfiniment.
- Aucune de ces garanties n'est acquise tant que le code n'existe pas : cet ADR
  décide un modèle, il ne le livre pas. Les quatre `runtime_acceptance` de
  ADR-0041 restent `harness-pending`.

### Points à réévaluer

- Si le coût du candidat devient prohibitif en CI, envisager une **réutilisation
  contrôlée** (candidat conservé entre deux preuves d'une même exécution, purgé
  entre deux exécutions) — jamais un retour au `node_modules` ou au cache
  partagé en `hardlink`.
- Si un schematic exige réellement le réseau après l'installation, il faudra une
  exception **nommée, justifiée et bornée** dans la recette — pas un
  assouplissement global.
- `sandbox-exec` est déprécié par Apple. S'il disparaît, le backend local devra
  être remplacé (conteneur exigé en local), pas contourné.
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
