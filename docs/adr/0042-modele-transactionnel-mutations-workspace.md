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

### Option D — Export `git archive` hors dépôt

- Avantages : n'écrit rien dans le dépôt, ne place aucun `.git` dans le candidat
  (vérifié) ; workspace Nx cohérent ; 1 s pour 3905 fichiers.
- Inconvénients : `git archive` applique les **attributs Git**, et les lit aussi
  depuis `$GIT_DIR/info/attributes` — un fichier **absent du commit**, donc
  invisible à toute revue de code. Test exécuté : un `export-ignore` placé dans
  `.git/info/attributes` **retire silencieusement** le fichier de l'archive.
  `export-subst` transformerait de même le contenu. L'intégrité ne serait alors
  garantie que par une vérification a posteriori. Rejetée.

### Option E — Matérialisation depuis le tree Git, sans script tiers, confinement OS obligatoire, transaction de publication journalisée

- Avantages : le contenu vient de `git ls-tree -r` + `git cat-file --batch` —
  **aucune machinerie d'attributs n'intervient**, donc `export-ignore`,
  `export-subst`, `.git/info/attributes` et `core.attributesFile` sont sans
  effet **par construction**, pas par détection. L'OID du blob **est**
  l'autorité de contenu. Mesuré : **0,6 s** pour 3906 entrées, plus rapide que
  l'archive. Aucune écriture dans le dépôt, aucun `.git` dans le candidat. Avec
  `--ignore-scripts`, **aucun code tiers ne s'exécute pendant l'installation** —
  vérifié : le candidat compile (`ngc --strictTemplates`, exit 0) et construit
  (`nx build:development`, exit 0, CSS émis).
- Inconvénients : la matérialisation est du code à écrire et à tester (modes,
  liens, inventaire) plutôt qu'un appel à `git archive` ; si une dépendance
  future exigeait réellement un script de cycle de vie, il faudrait une
  exception nommée et confinée.

## Décision

**Option E**, en sept invariants indissociables.

**1. Isolation — matérialisation depuis le tree, ni worktree ni archive.** Tout
exécutant tiers — schematic, script `reference-derived`, probe
`runtime_acceptance`, agent LLM — s'exécute dans un **workspace complet
matérialisé hors du dépôt** à partir du tree du commit `C`, lu avec
`git --no-replace-objects --no-lazy-fetch` : `ls-tree -r -z` pour l'inventaire
(chemin, **mode**, type, **OID**), un seul `cat-file --batch` pour les contenus,
écriture des **octets exacts du blob**.

Ces deux options ne sont pas décoratives. Sans `--no-replace-objects`, une ref
`refs/replace/<oid>` fait renvoyer par `cat-file` un **contenu falsifié** —
vérifié : `CONTENU FALSIFIE` au lieu de `VRAI CONTENU`. Sans `--no-lazy-fetch`,
un clone partiel irait chercher un objet manquant **sur le réseau**, pendant une
phase censée être hors ligne. `refs/replace` et le lazy-fetch appartiennent à la
même famille que `.git/info/attributes` : des mécanismes **hors commit** qui
changent silencieusement ce qui est lu. Éliminer cette famille exige de la
traiter mécanisme par mécanisme, jamais par généralisation.

Ni `git worktree` (il écrit dans `.git/worktrees` du dépôt réel — écriture
invisible à `git status --porcelain` — et place dans le candidat un `.git`
pointant vers le dépôt), ni `git archive` (ses attributs, lisibles depuis
`.git/info/attributes` hors commit, peuvent omettre ou transformer des entrées).

**Les chemins de `ls-tree -z` sont des octets**, jamais des chaînes. Politique
**fail-closed**, appliquée avant toute écriture :

| Cas                                                            | Règle                                                                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| UTF-8 invalide                                                 | refus                                                                                                                 |
| Deux chemins distincts se normalisant identiquement (NFC/NFD)  | refus                                                                                                                 |
| Collision insensible à la casse                                | refus — le système de fichiers cible peut l'être (vérifié sur ce Mac)                                                 |
| Segment `.git` **sous toute casse** ou toute forme équivalente | refus                                                                                                                 |
| Mode hors `100644` / `100755` / `120000` — dont `160000`       | refus                                                                                                                 |
| Type autre que `blob` à une feuille                            | refus                                                                                                                 |
| Entrées dupliquées ou conflit nom/type dans un même tree       | refus — non atteignable par l'index, mais **constructible par plomberie** (`git mktree` l'accepte, `fsck` le signale) |
| Lien symbolique dont la cible ne résout pas dans le candidat   | refus                                                                                                                 |

L'écriture elle-même crée chaque répertoire explicitement et refuse tout
composant déjà présent en non-répertoire : `O_EXCL` ne protège que la dernière
composante, pas la traversée — vérifié, `writeFileSync` à travers un répertoire
symlinké **écrit hors du candidat** malgré `flag: 'wx'`.

Le candidat a ses **propres dépendances** — **aucun `node_modules` partagé, lié
ou en lien dur**.

**2. Aucun script tiers ; le réseau n'est ouvert qu'en résolution.** Toute
installation passe `--ignore-scripts`, ce qui neutralise les scripts du projet
**et** ceux d'une dépendance explicitement listée en `trustedDependencies` —
vérifié avec témoin : la fixture s'exécute sans le drapeau, jamais avec. Il
n'existe donc **aucune phase où du code tiers s'exécute**, et le réseau peut
rester ouvert pendant les phases de **résolution** sans exposer quoi que ce
soit. Il est **entièrement coupé** pour toute phase d'**exécution** — schematic,
probes, LLM. L'exigence antérieure « réseau limité au registre », qu'aucun
conteneur ordinaire ni `sandbox-exec` ne sait exprimer, est donc sans objet.

Le protocole Bun se déroule en **trois temps distincts** :

1. **base** — `bun install --frozen-lockfile --ignore-scripts`. Le `bun.lock`
   **doit être présent dans le tree** : vérifié, avec un lockfile absent
   `--frozen-lockfile` ne échoue pas, il résout et installe — la « base
   déterministe » serait alors vide de sens ;
2. **génération contrôlée** — après écriture des versions épinglées dans le
   catalog du candidat, `bun install --ignore-scripts` (non gelée) régénère
   `bun.lock`. Vérifié : muter `package.json` puis relancer `--frozen-lockfile`
   échoue avec `lockfile had changes, but lockfile is frozen` ;
3. **validation du diff, puis réinstallation propre** — le diff du lockfile est
   inspecté (seuls les paquets attendus apparaissent), puis
   `bun install --frozen-lockfile --ignore-scripts` **revalide** le lockfile
   produit. Sans ce troisième temps, on publierait un lockfile jamais prouvé
   installable.

Si une dépendance exigeait un jour un script de cycle de vie, ce sera une
**exception nommée, justifiée et confinée** — phase dédiée, sans réseau — jamais
un assouplissement global.

**3. Confinement OS obligatoire, en deux profils.** Aucun code tiers ne
s'exécute sans bac à sable du système : **conteneur** en CI, **`sandbox-exec`**
en local macOS. Aucun backend conforme → la commande **échoue avant** d'exécuter
quoi que ce soit. Deux profils distincts, car un profil unique serait incohérent
— la résolution doit écrire hors du candidat (cache, `HOME` jetable) : profil
`resolution` (candidat + cache + `HOME` jetable inscriptibles, réseau ouvert,
scripts interdits) et profil `execution` (`<lease>/workspace/` seul
inscriptible, cache absent ou en lecture seule, réseau interdit). Un exécutant
tiers ne tourne **jamais** sous le profil `resolution`. Tout binaire est résolu
**explicitement** dans le candidat (`node_modules/.bin/…`), sa version comparée
au lockfile ; `bunx` est interdit — il installe un paquet absent dans un cache
global partagé. **Chaque profil a sa propre suite adverse.** « Meilleur effort
plus détection » n'est pas un confinement, et une fonction ne porte le nom
`runConfined` que si un bac à sable réel l'applique. Le confinement couvre
**aussi `bun install`**. Le dépôt réel n'est jamais monté en écriture. Les deux
backends passent la **même suite adversariale** : écriture et lecture hors
candidat, réseau, lien symbolique d'évasion, sous-processus, credentials,
chemins absolus, et **fixture à `postinstall`** dont le marqueur doit rester
absent.

**4. Cache de paquets — optimisation, jamais frontière.**
`BUN_INSTALL_CACHE_DIR` dédié, `--backend=copyfile` **obligatoire**, global
store désactivé, cache **inaccessible** pendant schematic / probes / LLM. Sans
`copyfile`, Bun relie `node_modules` au cache (`hardlink` sous Linux,
`clonefile` sous macOS) : un exécutant modifiant `node_modules` corromprait le
cache partagé. Le cache est indexé par nom/version, **pas** adressé par contenu
: sa présence ne prouve rien. Un cache partagé reste acceptable **parce que**
l'invariant 2 garantit qu'aucun code tiers ne s'exécute pendant qu'il est
inscriptible ; à défaut de cet invariant, il devrait être jetable par candidat.

**5. Transaction de publication — les commits remplacent les snapshots d'octets,
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

**6. Bail du candidat — une machine d'états, pas une promesse.** Un `SIGKILL`
empêche tout `finally` : le cycle de vie du candidat est donc un **bail**
journalisé par `rename` atomique, avec des états explicites (`creating`,
`active`, `releasing`, `released`, `orphaned`, `quarantined`) et un ordre
d'écritures physiques défini, entre lesquelles un crash reste observable et
classable. Un candidat n'est promu en `active` qu'après **vérification finale du
tree** (nombre d'entrées, chemins canoniques, type par `lstat`, mode Git
normalisé, hash des contenus, cible exacte des liens, aucun fichier inattendu).
Un propriétaire **vivant** interdit toute action d'un tiers, quel que soit
l'état ; seul un propriétaire mort fait passer `creating` ou `active` en
`orphaned`. Journal et marqueur discordants → `quarantined`, signalé et **jamais
purgé automatiquement**. Le marqueur vit **hors** du répertoire inscriptible par
l'exécutant (`<lease>/marker` contre `<lease>/workspace/`), faute de quoi un
exécutant tiers pourrait forcer une quarantaine permanente — un déni de service
durable sur la racine de bail.

**7. Identité du plan et frontière de l'agent LLM.** `plan_id` hashe **toutes**
les entrées qui peuvent changer la sortie : recette et schéma, `package.json`,
`bun.lock`, `nx.json`, `tsconfig.base.json`, `.gitattributes`, l'arbre complet
de l'app (`path\0mode\0sha256`), les versions d'outillage **lues** (Node, Bun,
Nx, paquet du schematic), le hash du module runner, et la valeur substituée à
`{{app}}`. Il est **toujours** calculé, affiché et journalisé — même sans
`--dry-run`. Un changement est un **change-set structuré**
(`op ∈ {create, modify, delete, rename}`, mode, `sha256` avant/après). Le
recours `llm-then-verified` hérite intégralement de (1) à (4) et y ajoute une
allowlist de chemins déclarée dans la recette, une gate de diff à chaque
itération, un maximum de 3 itérations, un journal complet des prompts / réponses
/ diffs, et **zéro publication directe**.

## Justification

**L'isolation est une propriété prouvée, pas déclarée.** Trois options ont été
écartées par contre-preuve exécutée, pas par raisonnement : B (Nx remonte à la
racine réelle depuis `.cmz/`), C (`git worktree` écrit dans `.git/worktrees`,
invisible à `git status`) et D (`git archive` honore `.git/info/attributes`, un
fichier hors commit — test exécuté : un `export-ignore` y retire silencieusement
un fichier de l'archive). La matérialisation depuis le tree a été vérifiée sur
ce dépôt : zéro écriture dans le dépôt, aucun `.git` dans le candidat, workspace
Nx complet, `nx` y résout la racine **du candidat**, et **aucune machinerie
d'attributs n'intervient** — la propriété est obtenue par construction, pas par
vérification a posteriori.

**Supprimer la menace vaut mieux que la contenir.** Le cache exposé pendant
l'installation et le « réseau limité au registre » étaient deux faces du même
fait : du code tiers s'exécutait pendant que le réseau et le cache étaient
ouverts. `--ignore-scripts` supprime ce fait — y compris pour une dépendance
explicitement `trustedDependencies`, vérifié avec témoin. La mesure le confirme
: sans aucun script, `ngc --strictTemplates` et `nx run build:development`
sortent en 0, avec le CSS émis. Il n'y a donc plus de fenêtre à contenir, ni de
règle réseau fine à exprimer — et le cache partagé redevient acceptable, ce qui
ramène l'installation de 72 s à froid à 19 s à chaud.

**Une classe de menaces ne se ferme pas par généralisation.** Passer au tree a
éliminé les attributs Git, et j'en ai conclu à tort que l'OID devenait
l'autorité de contenu : `refs/replace` la détourne, le lazy-fetch la fait
dépendre du réseau. Une correction locale ne vaut que pour le mécanisme qu'elle
vise ; chaque autre mécanisme hors commit doit être fermé nommément, et prouvé
fermé. Le même raisonnement vaut pour l'écriture : `O_EXCL` protège la dernière
composante et non la traversée — établi par preuve, pas par intuition.

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

- **Coût mesuré** : matérialisation 0,6 s, installation gelée
  `--ignore-scripts --backend=copyfile` **19 s à chaud** (72 s si le cache est
  froid), `ngc --strictTemplates` 12 s, `nx build:development` 16 s, auxquels
  s'ajoutent la génération et la revalidation du lockfile, le schematic et la
  preuve navigateur. Une commande qui tient les six promesses se compte en
  **minutes**, pas en secondes. `add-library` est un outil de dev/CI, jamais
  interactif.
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
