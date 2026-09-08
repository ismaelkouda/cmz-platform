# Plan — installation réelle + preuves runtime des bibliothèques

- **Statut :** En implémentation. Sont livrés : le cœur `add-library` et ses
  neuf étapes, les quatre P0, les oracles runtime, le confinement macOS **et**
  conteneur, le recours LLM borné, l'intégration `create-app`, la gate
  d'intégration en CI, et la promotion gouvernée des matrices. **Reste** :
  requalifier les trois pistes — toutes `candidate` depuis que l'outillage a
  changé, donc `add-library` refuse actuellement toute bibliothèque, par
  construction. La qualification doit être la **dernière** opération : elle
  coûte plusieurs dizaines de minutes d'oracles réels et toute modification
  ultérieure du runner la périme (ADR-0042 § invariant 8).
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

`check:library-setup` garde la dérive structurelle. `add-library` exécute le «
comment » de la recette dans un candidat isolé puis ses `runtime_acceptance`. La
commande est fonctionnelle ; ce plan conserve les preuves acquises et les
derniers écarts nécessaires à son usage systématique.

## Décisions arbitrées

### D1 — `create-app` reste minimal ; les bibliothèques UI sont opt-in

`create-app` livre le shell et Transloco. Material et Tailwind sont ajoutés à la
demande par `add-library`, conformément à
[ADR-0044](../adr/0044-bibliotheques-ui-opt-in-apres-create-app.md), qui
supersède uniquement leur installation par défaut décidée dans ADR-0041. Leur
coexistence reste automatiquement prouvée lorsqu’ils sont tous deux présents.

### D2 — La coexistence navigateur exige un moteur, donc une extension de confiance

**Révisé le 2026-09-06, à la livraison.** La formulation initiale supposait
Playwright et un job CI séparé. Deux faits mesurés l'ont écartée.

D'abord, aucun moteur de rendu n'est atteignable dans la politique de résolution
telle qu'écrite : `allowed_registries` ne contient que `registry.npmjs.org`, et
Playwright comme Puppeteer téléchargent leur binaire **hors bande** depuis un
CDN, via un `postinstall` que `--ignore-scripts` coupe volontairement. Le moteur
n'était donc pas indisponible par accident, mais **par politique**.

Ensuite, un oracle sans moteur a été envisagé puis écarté sur mesure : jsdom ne
résout ni `var(--mat-*)` ni `@layer` — les deux moitiés exactes de la question —
et aurait passé quoi qu'il arrive. Un oracle fail-open est pire que pas
d'oracle.

**Décision.** La frontière de confiance est étendue explicitement, et uniquement
pour cet usage :

| Attribut          | Exigence                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Moteur            | `chrome-headless-shell` (Chrome for Testing), version épinglée dans `resolution-policy.json`                    |
| Origine           | un seul hôte, `download_host`, distinct de `allowed_registries` pour rester visible                             |
| Intégrité         | empreinte `sha256` par plateforme, vérifiée **avant extraction** — une archive divergente n'est jamais dézippée |
| Traçabilité       | le hash de la politique entre dans le `plan_id` : changer de moteur change l'identité du plan                   |
| Approvisionnement | phase de **résolution** seule ; archive immuable mise en cache et rehashée à chaque usage                       |
| Exécution         | extraction neuve dans le bail, montée en **lecture seule** ; réseau, dépôt, cache Bun et HOME réel refusés      |
| Extraction        | `--dump-dom` — **ni CDP, ni websocket, ni socket local**                                                        |

Le profil d'exécution est élargi aux services système que Chromium exige (mach,
mémoire partagée, sysctl, IOKit) : sans eux il meurt en `SIGSEGV`, mesuré. Cet
élargissement ne rouvre rien d'autre, et c'est vérifié sur le backend réel par
`sandbox.integration.test.mjs` (profil `renderer`) : HOME réel, dépôt, écriture
hors candidat et réseau restent refusés, **y compris pour Chromium lui-même**.

Ce que la preuve couvre : les jetons `--mat-*` se résolvent, une règle hors
couche n'est pas écrasée par le preflight Tailwind, une utilitaire Tailwind
s'applique encore. Ce qu'elle ne couvre pas : mise en page, peinture, états
focus/ripple — une app fraîchement équipée n'utilise encore aucun composant
Material, donc le bundle n'en contient aucune règle.

**Le backend conteneur est exercé depuis le 2026-09-07.** Il ne l'avait jamais
été : `selectSandboxBackend` ne rend qu'un backend — sur un Mac, toujours
`macos` — donc le chemin Docker n'était vérifié que par des tests mockés. Ils
asseyaient la chaîne `--mount type=bind,…,dst=/workspace,rw`, que Docker refuse
en **code 125 avant tout démarrage de conteneur** : `rw` n'est pas un champ
valide, seul `readonly` l'est comme champ nu. Le backend conteneur ne
fonctionnait donc **pour aucun profil**, et le test encodait le défaut au lieu
de l'attraper.

Corrigé, et la suite adversariale itère désormais sur **tous** les backends
disponibles (`availableSandboxBackends`), pas seulement sur celui que la
production choisirait : « les deux backends passent la même suite » devient un
mécanisme. Mesuré ici, Docker démarré sur macOS : **10 épreuves, 5 par backend,
toutes vertes** ; en réintroduisant la syntaxe fautive, les 4 épreuves Docker
tombent.

Résultats mesurés côté conteneur — profil d'exécution : écriture candidat
autorisée, dépôt et cache Bun **non montés** (`ENOENT`), HOME et rootfs en
lecture seule (`EROFS`), sous-processus bloqué, réseau coupé (`EAI_AGAIN`),
aucun credential, uid non-root. Profil de résolution : HOME jetable et cache
inscriptibles, dépôt inaccessible, registre joignable (`200`).

Une divergence est assumée et documentée dans la suite : le conteneur monte
`/tmp` en tmpfs inscriptible, donc l'invariant « `tmpdir` fermé » — qui protège
du chargement natif de Nx — n'a de sens que sur macOS.

**L'oracle navigateur tourne aussi en conteneur depuis le 2026-09-07.** L'image
`execution` est un `node` nu : mesuré, il y manque **21 bibliothèques
partagées** (glib, nss, atk, X11, gbm, alsa…) et le binaire refuse de se
charger. Le profil `renderer` a donc sa propre image, épinglée par digest dans
`sandbox.container_images.execution_renderer` (`mcr.microsoft.com/playwright`,
**3,55 Go** — coût assumé). Sans elle, `runConfined` **refuse** en le nommant
plutôt que d'émettre une commande qui échouerait obscurément ; ce refus est
lui-même testé, en retirant l'image de la politique.

Le conteneur de rendu est lancé en `--platform linux/amd64` : Chrome for Testing
ne publie **aucun** build linux-arm64, l'archive épinglée est x86-64. Sur un
runner amd64 c'est un no-op ; sur un hôte arm64 c'est de l'émulation. Pour la
même raison l'archive suit le **backend** et non la machine hôte — laisser
l'hôte décider marcherait par coïncidence sur un runner Linux et casserait
ailleurs.

Vérifié via le vrai code, sur le CSS réellement compilé, verdict **identique sur
les deux backends** : 165 jetons `--mat-*`, jeton résolu par le moteur, règle
hors couche à `7px` (donc non écrasée par le preflight), utilitaire Tailwind à
`rgb(18, 52, 86)`.

Défaut trouvé au passage, et corrigé : les deux backends n'ont pas la même
arborescence (`/workspace` et `/cmz-readonly-<n>` dans le conteneur, chemins
hôte sur macOS). Tout appelant écrivant un chemin absolu dans `argv` fabriquait
donc une commande juste d'un côté et fausse de l'autre — ce que les tests Docker
mockés ne pouvaient pas voir, faute de vérifier autre chose que des drapeaux.
Les chemins absolus passent désormais par des jetons (`{{candidate}}`,
`{{readonly:<n>}}`) résolus par `runConfined`, seul à connaître la
correspondance.

### D3 — La matrice de compatibilité est un fichier séparé

`conventions/libraries/<platform>/<library>.compat.json`, **schéma fermé et
validé** par `check:library-setup`. Mettre `tracks` **dans** la recette créerait
une auto-référence : une entrée porte l'empreinte de la recette, qui changerait
à chaque ajout d'entrée.

Champs référencés par chaque entrée :

- `platform` + `library` ;
- versions des paquets (`packages[]` résolus) ;
- versions d'outillage pertinentes : Angular, Nx, Bun, Node ;
- empreinte complète de la piste hors `status` et `verification` ;
- vecteur **exact** Node, Bun, Nx, framework et paquets réellement testé ;
- `plan_id`, `change_set_id`, empreinte de l'arbre applicatif et preuves runtime
  réellement retournés par `add-library` ;
- empreintes de la recette, des schémas, de la politique, de la configuration
  Nx/TypeScript et du runner partagé ;
- deux états sémantiques des dépendances : la projection initiale des seuls
  paquets demandés, puis leur fermeture transitive finale exacte dans `bun.lock`
  (dépendances, optionnelles présentes et peers requis). Une autre bibliothèque
  peut ainsi être ajoutée sans périmer cette preuve ; toute dérive d'un record
  réellement atteignable la périme ;
- commit Git de qualification, selon le format d'objet du dépôt.

Le chemin nominal sélectionne uniquement `verified`. Le chemin de qualification
est distinct et sélectionne uniquement `candidate`; aucune option cachée de
`add-library` ne permet de franchir cette frontière. En V1, une preuve ne vaut
que pour le vecteur exact testé : les plages de `requirements` décrivent les
versions candidates, pas une généralisation de la preuve.

Une promotion tient un verrou exclusif durable dans `.git` pendant toute la
qualification. Un propriétaire vivant fait échouer immédiatement une seconde
commande ; un propriétaire local prouvé mort est récupéré. Les octets de la
matrice sont relus avant publication : une édition concurrente est conservée et
fait échouer la promotion, elle n'est jamais écrasée.

### D4 — Le candidat est un workspace complet, hors du dépôt

Pas de copie minimale, **aucun `node_modules` partagé**. Forme retenue :
matérialisation **depuis le tree Git** — ni `git worktree`, ni `git archive` (P0
nº 1).

### D5 — Confinement OS obligatoire, partout

Conteneur en CI, `sandbox-exec` en local macOS, **échec avant toute exécution
tierce** si aucun backend conforme. Les deux backends passent la **même suite
adversariale**. Le confinement couvre aussi `bun install`.

### D6 — Aucun script tiers ; le cache est une optimisation, jamais une frontière

`bun install --ignore-scripts` : aucun code tiers ne s'exécute, ni celui du
projet ni celui d'une dépendance `trustedDependencies` (vérifié avec témoin).
Réseau ouvert pendant les phases de **résolution** — le protocole Bun en compte
trois — et **entièrement coupé** pendant toute phase d'**exécution**. Plus
besoin d'un « réseau limité au registre », inexprimable dans un conteneur
ordinaire comme dans `sandbox-exec`, et devenu sans objet. `--backend=copyfile`
obligatoire, `BUN_INSTALL_CACHE_DIR` dédié, global store désactivé, cache en
lecture seule pendant schematic / probes / LLM.

### D7 — Les commits Git remplacent les snapshots d'octets, pas la transaction

`update-ref` ne synchronise ni l'index ni le worktree : la publication reste une
transaction verrouillée, journalisée par phase et reprenable (P0 nº 2).

### D8 — Une seule commande nominale

`bun run add-library --app <app> --library <lib>` fait candidat → installation →
schematic → preuves → publication → **synchronisation locale**. `--dry-run` et
`--expect-plan <plan_id>` sont facultatifs ; le `plan_id` est **toujours**
affiché et journalisé.

Le décompte des étapes distingue les deux chemins, et ce n'est pas cosmétique :

| chemin      | étapes | dernière étape                              |
| ----------- | ------ | ------------------------------------------- |
| `--dry-run` | 8      | `dry-run-complete`, aucune écriture publiée |
| nominal     | 9      | synchronisation du `node_modules` local     |

La neuvième étape existe parce qu'une publication sans elle **ment** : le dépôt
porte le nouveau `package.json` et le nouveau `bun.lock`, mais son
`node_modules` est resté à l'état antérieur, donc le build local échoue alors
que la commande a annoncé un succès. Le contrat complet est en
[ADR-0042 § invariant 10](../adr/0042-modele-transactionnel-mutations-workspace.md).

La sortie du schematic est par ailleurs canonisée par le Prettier **du
candidat** avant le contrôle de périmètre final
([ADR-0042 § invariant 9](../adr/0042-modele-transactionnel-mutations-workspace.md))
: un schematic ne produit pas du texte canonique, et un commit publié doit
l'être.

## P0 nº 1 — Candidat isolé (workspace complet hors dépôt)

Trois formes ont été écartées **sur contre-preuve exécutée** : candidat sous
`.cmz/` (Nx remonte à la racine réelle), `git worktree` (écrit dans
`.git/worktrees` du dépôt, invisible à `git status`), `git archive` (honore
`.git/info/attributes`, fichier hors commit). Le détail des options et leur
justification sont dans
[ADR-0042 § Options](../adr/0042-modele-transactionnel-mutations-workspace.md) —
ce document ne les redit pas.

### Forme retenue — matérialisation depuis le tree Git

Le candidat est donc matérialisé **depuis le tree** du commit `C`, dans un
`mkdtemp` hors du dépôt, avec `git --no-replace-objects --no-lazy-fetch` :

- `ls-tree -r -z <C>` → inventaire complet `(mode, type, OID, chemin)` ;
- un seul `cat-file --batch` → contenus ;
- écriture des **octets exacts du blob**.

**Les deux options ne sont pas décoratives.** Sans `--no-replace-objects`, une
ref `refs/replace/<oid>` détourne `cat-file` — vérifié : `CONTENU FALSIFIE` au
lieu de `VRAI CONTENU`. Sans `--no-lazy-fetch`, un clone partiel irait chercher
un objet manquant **sur le réseau** pendant une phase censée être hors ligne.
`refs/replace`, le lazy-fetch et `.git/info/attributes` sont la même famille :
des mécanismes **hors commit**. L'affirmation « l'OID est l'autorité de contenu
» n'est vraie **qu'avec** ces deux options.

### Chemins : des octets, politique fail-closed

Les chemins de `ls-tree -z` sont traités comme des **octets**, jamais comme des
chaînes. Avant toute écriture :

| Cas                                                           | Règle                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| UTF-8 invalide                                                | refus                                                         |
| Deux chemins distincts se normalisant identiquement (NFC/NFD) | refus                                                         |
| Collision insensible à la casse                               | refus — le système cible peut l'être (**vérifié sur ce Mac**) |
| Segment `.git` **sous toute casse** ou forme équivalente      | refus                                                         |
| Mode hors `100644` / `100755` / `120000` — dont `160000`      | refus                                                         |
| Type autre que `blob` à une feuille                           | refus                                                         |
| Entrées dupliquées ou conflit nom/type dans un même tree      | refus                                                         |
| Lien symbolique dont la cible ne résout pas dans le candidat  | refus                                                         |

Ce dépôt aujourd'hui : 3897 `100644`, 8 `100755`, 1 `120000`, aucune collision
de casse, tous chemins ASCII, 0 entrée sous l'unique lien. Aucun de ces chiffres
n'est un invariant — `add-library` matérialise un commit **arbitraire**.

Sur le conflit nom/type, une précision qui change le test à écrire : un tel tree
**n'est pas atteignable par l'index** (vérifié — l'index remplace `x` par
`x/evil`), mais il **est constructible par plomberie** : `git mktree` accepte
deux entrées nommées `x`, l'une `120000 blob`, l'autre `040000 tree` ;
`git fsck` le signale (`duplicateEntries`) mais l'objet existe et est
référençable. Le refus est donc nécessaire, et c'est un **troisième** cas,
distinct des deux menaces de lien symbolique.

### Écriture : la traversée, pas seulement la feuille

Chaque répertoire est créé explicitement et tout composant déjà présent en
non-répertoire fait échouer la matérialisation. `O_EXCL` **ne suffit pas** :
vérifié, `writeFileSync` à travers un répertoire symlinké **écrit hors du
candidat** malgré `flag: 'wx'` ; seul `O_NOFOLLOW` protège la dernière
composante (`EEXIST` sur le lien).

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

### Dépendances du candidat — protocole Bun en trois temps

Toutes les installations passent
`--ignore-scripts --backend=copyfile --cache-dir=<cache dédié>`, **sous le
profil `resolution`**.

| Temps                       | Où                  | Commande                                                                                                                            | Rôle                                                                                 |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1. base                     | candidat            | `bun install --frozen-lockfile --ignore-scripts`                                                                                    | matérialise l'état déterministe du commit. **Exige `bun.lock` présent dans le tree** |
| 2. génération contrôlée     | candidat            | versions épinglées écrites dans le catalog, puis `bun install --ignore-scripts` (non gelée)                                         | régénère `bun.lock`                                                                  |
| 3. vérification depuis zéro | **second candidat** | matérialisé depuis le tree, `package.json` et `bun.lock` **finaux** injectés, puis `bun install --frozen-lockfile --ignore-scripts` | prouve qu'un environnement **neuf** est reconstructible depuis le lockfile final     |

Le temps 3 se fait dans un **second candidat de vérification**, pas dans le
premier. Relancer une installation gelée sur un `node_modules` déjà peuplé ne
prouve rien : elle constaterait « no changes » sans jamais reconstruire.
L'alternative — supprimer intégralement le `node_modules` du premier candidat
puis réinstaller — est acceptable mais plus faible : elle laisse en place tout
état résiduel produit par le temps 2.

Chaque temps est vérifié, pas supposé :

- **`bun.lock` doit être présent** au temps 1 — avec un lockfile absent,
  `--frozen-lockfile` **ne échoue pas** : il résout et installe. La « base
  déterministe » serait alors vide de sens. C'est une condition d'entrée.
- **Le temps 2 est nécessaire** — muter `package.json` puis relancer
  `--frozen-lockfile` échoue : `lockfile had changes, but lockfile is frozen`
  (exit 1, vérifié).
- **Le temps 3 est nécessaire** — sans reconstruction depuis zéro, on publierait
  un lockfile jamais prouvé installable.

#### Overlay du second candidat — ensemble clos et ordonné

« Injecter les `package.json` et `bun.lock` finaux » est trop vague : ce dépôt
compte **73 `package.json`**. L'overlay est donc un ensemble **clos, ordonné et
inventorié**.

| Ordre | Chemin                  | Mode     | Peut changer ?                                                                                                 |
| ----- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | `package.json` (racine) | `100644` | **oui** — `dependencies` / `devDependencies` et `workspaces.catalog[s]`, seuls porteurs des versions épinglées |
| 2     | `bun.lock`              | `100644` | **oui** — produit au temps 2                                                                                   |

Les **72 autres** `package.json` (`libs/*`, `apps/*`) sont **hors overlay** :
`add-library` ne les touche pas. Les fichiers modifiés par le schematic
(`project.json`, `app.config.ts`, styles…) sont hors overlay eux aussi — ils
appartiennent au change-set publié, pas à la vérification de résolution.

**Périmètre assumé** : le second candidat prouve qu'un environnement de
dépendances neuf est reconstructible depuis le lockfile final. Il ne rejoue ni
le schematic ni les probes — ce n'est pas son rôle.

Déroulé, sans ambiguïté :

1. matérialiser un candidat neuf depuis le **même tree `C`**, avec les mêmes
   contrôles (§ Chemins, § Écriture) ;
2. **vérification finale du tree** — identique à celle du premier candidat ;
3. appliquer l'overlay dans l'ordre canonique ci-dessus, chaque écriture donnant
   un OID Git recalculé qui doit égaler l'OID du blob final attendu ;
4. **re-vérifier** : toute entrée doit correspondre au tree `C`, **sauf** les
   deux chemins de l'overlay, qui doivent correspondre à leurs OID finaux —
   aucun autre écart toléré ;
5. `bun install --frozen-lockfile --ignore-scripts`, sous profil `resolution`.

L'overlay entre dans le `plan_id` sous forme structurée — la liste ordonnée
`{ path, mode, oid_final }` — et non comme deux fichiers cités en prose.

#### Sources de résolution — contrôle AVANT tout appel à Bun

`--ignore-scripts` bloque l'**exécution**, pas les **sources**. Bun accepte des
dépendances Git/SSH, des tarballs par URL, et lit registres et credentials d'un
`.npmrc`. Contrôler « chaque nouvelle entrée du lockfile » arriverait **trop
tard** : un dépôt dont l'état **initial** contient déjà une dépendance
`git+ssh:` la verrait résolue au temps 1, réseau ouvert, avant tout rejet.

L'ordre est donc inversé. **Avant le premier appel à Bun** :

1. analyser **tous** les `package.json` du workspace (73 aujourd'hui) — pas
   seulement celui de la racine ;
2. analyser **l'intégralité** du `bun.lock` initial, entrée par entrée ;
3. refuser toute source hors politique — **la commande échoue sans avoir lancé
   Bun** ;
4. imposer explicitement l'origine du registre approuvé ;
5. refaire **le même contrôle complet sur l'état final**, pas seulement sur le
   diff.

| Autorisé                                                                     | Refusé                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| `catalog:` / `catalog:<nom>` — protocole dominant de ce dépôt                | `git:`, `git+ssh:`, `git+https:`, `github:` |
| `workspace:`                                                                 | `file:`, `link:`                            |
| version ou plage résolue depuis **le registre approuvé**, intégrité `sha512` | tarball par URL (`http:`, `https:`)         |

Mesuré aujourd'hui : **2037 paquets, 0 source non-registre, 0 paquet externe
sans `sha512`** ; les 72 entrées sans intégrité sont les `@cmz/*` du workspace,
ce qui est normal. L'allowlist passe **sans aucune exception**.

Pendant la résolution : `.npmrc` et `bunfig.toml` du dépôt, du `HOME` jetable et
du système **neutralisés** (aucun n'existe — vérifié) ; configurations Git
globale et système neutralisées (`GIT_CONFIG_GLOBAL` / `GIT_CONFIG_SYSTEM` vers
`/dev/null`) ; **aucun accès** au trousseau SSH ni au credential helper.

#### La politique est un artefact, pas un tableau

Un inventaire en Markdown ne peut être ni consommé ni comparé : « comparé au
`package.json`, pas mémorisé dans le code » serait impossible sans coder les
règles en dur ou analyser de la prose. La politique vit donc dans un fichier
**JSON versionné et à schéma fermé**, validé par `check:library-setup` :

```
conventions/libraries/resolution-policy.json
```

| Champ                  | Contenu                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`       | version de la politique                                                                                                            |
| `lifecycle_scripts[]`  | `{ name, command, classification }` — `classification ∈ { replay, omit, reject }`, `command` étant la commande **exacte** attendue |
| `allowed_registries[]` | origine(s) exacte(s) approuvée(s)                                                                                                  |
| `allowed_protocols[]`  | `catalog:`, `workspace:`                                                                                                           |
| `integrity`            | algorithme exigé (`sha512`) et portée (toute entrée non-workspace)                                                                 |
| `exceptions[]`         | **nommées**, avec raison et date de revue ; vide aujourd'hui                                                                       |

Son **hash entre dans le `plan_id`** : changer la politique invalide les plans
antérieurs. Contenu initial dérivé de l'état réel du dépôt :

| Script racine                                 | `classification` | Raison                                                  |
| --------------------------------------------- | ---------------- | ------------------------------------------------------- |
| `preinstall` = `node tools/check-engines.mjs` | `replay`         | exécuté par `add-library` avant la résolution           |
| `prepare` = `husky`                           | `omit`           | pas de `.git` dans le candidat, donc aucun hook à poser |

Tout script **apparaissant, disparaissant ou dont la commande change** sans
entrée correspondante fait **échouer la gate** : la comparaison porte sur le
`package.json` du candidat **contre la politique**, jamais contre une constante
du code.

#### Diff de lockfile accepté — définition sémantique

Le diff n'est pas « inspecté » au jugé. Est **accepté** exactement :

| Autorisé                                  | Interdit                                                         |
| ----------------------------------------- | ---------------------------------------------------------------- |
| ajout des paquets demandés par la recette | ajout hors fermeture transitive des paquets demandés             |
| ajout de leur **fermeture transitive**    | **suppression** d'une entrée préexistante                        |
| —                                         | **downgrade** d'une entrée préexistante                          |
| —                                         | changement de **source** (registre, tarball, git) hors fermeture |
| —                                         | changement d'**intégrité** (`sha512`) d'une entrée préexistante  |
| —                                         | changement de version d'une entrée préexistante hors fermeture   |

Tout écart fait échouer la commande avant publication.

**La fermeture transitive est une traversée du graphe, pas une observation.** On
part des paquets **directs attendus** (ceux de la recette), on parcourt le
graphe de dépendances du **lockfile final**, et l'ensemble atteint constitue la
fermeture autorisée. Toute entrée ajoutée hors de cet ensemble est refusée. La
déduire du diff observé reviendrait à faire valider par le contrôle ce qu'il est
censé contraindre.

### Réseau : résolution ouverte, exécution fermée

`--ignore-scripts` neutralise les scripts du projet **et** ceux d'une dépendance
explicitement listée en `trustedDependencies` — vérifié **avec témoin** :

| Scénario                                             | Marqueur                            |
| ---------------------------------------------------- | ----------------------------------- |
| dépendance non fiable, sans le drapeau               | absent (défaut sûr de Bun)          |
| **témoin** — `trustedDependencies` + sans le drapeau | **présent** : la fixture fonctionne |
| `trustedDependencies` + `--ignore-scripts`           | **absent**                          |

Sans le témoin, l'absence de marqueur n'aurait rien prouvé.

Il n'existe donc **aucune phase où du code tiers s'exécute**. Le réseau peut
rester ouvert pendant les phases de **résolution** (temps 1, 2, 3) sans rien
exposer, et il est **entièrement coupé** pour toute phase d'**exécution** —
schematic, probes, LLM. La formulation antérieure « réseau ouvert seulement pour
la récupération initiale » était fausse : le temps 2 rouvre nécessairement la
résolution. L'exigence « réseau limité au registre », qu'aucun conteneur
ordinaire ni `sandbox-exec` ne sait exprimer, est sans objet.

**Vérifié sans aucun script** : `ngc --strictTemplates` sort en 0 (12 s) et
`nx run backoffice-angular:build:development` sort en 0 (16 s) avec
`dist/apps/backoffice-angular/browser/styles.css` émis — la preuve
`compiled-css-rule` reste réalisable dans ces conditions.

`--backend=copyfile` reste obligatoire (sans lui Bun relie `node_modules` au
cache : `hardlink` sous Linux, `clonefile` sous macOS), global store désactivé,
cache en lecture seule pendant schematic / probes / LLM. Le cache **partagé**
redevient acceptable, ce qui ramène l'installation de 72 s à froid à **19 s à
chaud**.

### Confinement OS — deux profils, obligatoires, partout

Aucun code tiers ne s'exécute sans bac à sable du système. Backends conformes :
**conteneur** (CI) et **`sandbox-exec`** (macOS local). Aucun disponible → la
commande **échoue avant** toute exécution tierce. Une fonction ne porte le nom
`runConfined` que si un bac à sable réel l'applique.

Un profil unique était incohérent : la résolution doit écrire hors du candidat
(cache, `HOME` jetable), ce que « candidat seul inscriptible » interdit. Il y a
donc **deux profils distincts**, et un exécutant ne tourne jamais sous le profil
de résolution.

|                         | `resolution` (temps 1, 2, 3 du protocole Bun)                                                                                                                | `execution` (schematic, probes, LLM) |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Écriture                | candidat + `BUN_INSTALL_CACHE_DIR` dédié + `HOME` jetable                                                                                                    | **`<lease>/workspace/` seul**        |
| Cache Bun               | inscriptible                                                                                                                                                 | **absent ou lecture seule**          |
| Réseau                  | **ouvert** — aucun code tiers ne s'exécute (`--ignore-scripts`)                                                                                              | **interdit**                         |
| Scripts de cycle de vie | **interdits** (`--ignore-scripts`, témoins à l'appui)                                                                                                        | sans objet                           |
| Dépôt réel              | jamais monté en écriture, hors du `cwd` et de tout chemin transmis                                                                                           | idem                                 |
| Environnement           | allowlist (`PATH`, `HOME` jetable, `CI`), **aucun credential** (`GIT_*`, `GH_TOKEN`, `NPM_TOKEN`, `SSH_AUTH_SOCK`)                                           | idem                                 |
| Shell                   | jamais : `execFile(executable, argv)`, pas d'interpolation hors `{{app}}`                                                                                    | idem                                 |
| Binaires                | résolus **explicitement** dans le candidat (`<cand>/node_modules/.bin/nx`) ; **`bunx` interdit** — il installe un paquet absent dans un cache global partagé | idem                                 |

**Chaque profil a sa propre suite adverse** (§ Suite adversariale) : ce qui est
légitimement inscriptible en `resolution` doit être refusé en `execution`.

`sandbox-exec` a été prouvé sur cette machine : écriture hors candidat →
`Operation not permitted` ; réseau refusé → `Could not resolve host` ; les deux
autorisés hors bac à sable. Docker est installé mais **son démon est
injoignable** ici — contrat retenu : `sandbox-exec` prouvé **localement** sur
macOS, conteneur prouvé par un **check Linux obligatoire en CI**, et la PR de
code n'est fusionnée que si **les deux matrices** passent.

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

### Cycle de vie du candidat — machine d'états du bail

Un `SIGKILL` empêche tout `finally` ou `dispose()` : « zéro résidu immédiat »
n'est pas un contrat tenable. Une liste de conditions ne l'est pas davantage :
elle ne dit ni **où** un crash peut tomber, ni **qui** a le droit d'écrire le
marqueur.

#### Disposition — le marqueur hors de portée de l'exécutant

```
<lease-root>/<id>/marker      <- journal d'identité, JAMAIS inscriptible par un exécutant
<lease-root>/<id>/workspace/  <- le candidat ; seul répertoire inscriptible en profil `execution`
```

Le bac à sable ne donne l'écriture que sur `workspace/`. Sans cette séparation,
un exécutant tiers pourrait altérer le marqueur et forcer une **quarantaine
permanente** — un déni de service durable sur la racine de bail.

#### Frontières observables, et état de récupération après chacune

Aucun « `rename` atomique » ni aucune « matérialisation » ne masque plusieurs
**états observables**. Une ligne peut regrouper des appels système dont tous les
résultats intermédiaires ont la même classification (par exemple un temporaire
absent, vide ou partiel), mais chaque crash a **un seul** état de récupération.

| #   | Opération réelle                                 | État de récupération                                     |
| --- | ------------------------------------------------ | -------------------------------------------------------- |
| 1   | `mkdir <lease>/<id>`                             | `unclaimed`                                              |
| 2   | `open`+`write`+`close` `<lease>/<id>/marker.tmp` | `unclaimed-with-temp`                                    |
| 3   | `rename marker.tmp → marker`                     | `quarantined` (marqueur sans journal)                    |
| 4   | `open`+`write`+`close` `<lease>/<id>/state.tmp`  | `quarantined` (idem — le temporaire ne vaut pas journal) |
| 5   | `rename state.tmp → state.json` = `creating`     | `creating`                                               |
| 6   | `mkdir <lease>/<id>/workspace/`                  | `creating`                                               |
| 7   | matérialisation, entrée par entrée               | `creating`                                               |
| 8   | vérification finale du tree                      | `creating` (vérifié, non promu)                          |
| 9   | `open`+`write`+`close` `state.tmp` (= `active`)  | `creating`                                               |
| 10  | `rename state.tmp → state.json`                  | `active`                                                 |

Deux règles rendent ce tableau non ambigu :

- un **temporaire** ne fait jamais avancer un état ; sa seule présence distingue
  `unclaimed` de `unclaimed-with-temp` ;
- le **journal** (`state.json`) est la seule autorité d'état ; le marqueur ne
  sert qu'à prouver l'identité.

`unclaimed-with-temp` n'est **pas** purgeable directement par `rmdir` (le
dossier n'est pas vide). Il n'est pas non plus `quarantined` — aucun marqueur
n'existe encore, donc aucune discordance. Les états pré-identité ont un contrat
propre : nom aléatoire conforme, parent canonique, vrai dossier possédé par
l'UID attendu, permissions exactes et inventaire strictement vide (`unclaimed`)
ou réduit au seul fichier régulier `marker.tmp` (`unclaimed-with-temp`). Dans le
second cas, seuls `unlink(marker.tmp)` puis `rmdir` sont permis. PID, instant de
démarrage et vivacité ne sont vérifiables qu'après publication du marqueur et ne
sont donc jamais prétendus pour ces deux états. Tout écart devient
`quarantined`.

#### États et transitions

| État                  | Signification                                                | Transition légale                                                                       |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `unclaimed`           | dossier nu, sans marqueur ni journal                         | → `rmdir` seulement sous le contrat pré-identité, sinon → `quarantined`                 |
| `unclaimed-with-temp` | dossier nu + `marker.tmp` seul                               | → `unlink` ciblé puis `rmdir` sous le contrat pré-identité, sinon → `quarantined`       |
| `creating`            | journal et marqueur concordants, matérialisation non achevée | → `active` (vérification finale du tree réussie) · → `orphaned` (**propriétaire mort**) |
| `active`              | candidat utilisable                                          | → `releasing` · → `orphaned` (**propriétaire mort**)                                    |
| `releasing`           | purge en cours                                               | → `released` ; reprise idempotente si le propriétaire meurt                             |
| `released`            | purge achevée                                                | terminal                                                                                |
| `orphaned`            | propriétaire mort, depuis `creating` ou `active`             | → `releasing` **si** toutes les conditions d'identité concordent, sinon → `quarantined` |
| `quarantined`         | journal et marqueur discordent, ou conditions non réunies    | terminal — **jamais** purgé automatiquement, signalé                                    |

**Correction d'une contradiction de la version précédente** : un candidat trouvé
en `creating` ne part **pas** systématiquement en purge. Un second processus
peut le voir alors que son propriétaire est **vivant** — il doit alors le
laisser intact. Seul un propriétaire **mort** fait passer `creating` en
`orphaned`.

#### Conditions cumulatives après publication du marqueur

| Condition    | Règle                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Identité     | identifiant **aléatoire non réutilisable** (≥ 128 bits), jamais dérivé d'un compteur ni d'un PID                                       |
| Propriétaire | **PID + instant de démarrage** (`ps -o lstart= -p <pid>` — sortie vide si le PID n'existe pas, vérifié) ; un PID seul est réutilisable |
| Vivacité     | un propriétaire **vivant** interdit toute action d'un tiers, quel que soit l'état                                                      |
| Emplacement  | chemin **canonique** sous la racine de bail dédiée ; refus si un ancêtre est un lien symbolique                                        |
| Propriété    | propriétaire et permissions attendus                                                                                                   |
| Marqueur     | `<lease-root>/<id>/marker`, **hors** de `workspace/`, jamais inscriptible par un exécutant                                             |
| Concordance  | journal et marqueur discordants → `quarantined`, jamais de suppression                                                                 |

### Vérification finale du tree — condition de `creating → active`

« Matérialisation complète et vérifiée » n'est pas une formule : c'est une
comparaison entre l'inventaire attendu (issu de `ls-tree`) et l'état réel sur
disque, **avant** toute promotion en `active`.

#### L'OID n'est pas le hash du contenu

Un OID Git est le hash de `blob <taille>\0<contenu>`, avec l'algorithme **du
dépôt**. Vérifié :

|                       |                                            |
| --------------------- | ------------------------------------------ |
| sha1 brut de `abc`    | `a9993e364706816aba3e25717850c26c9cd0d89d` |
| `git hash-object`     | `f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f` |
| sha1 de `blob 3\0abc` | `f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f` |

La formulation précédente — « hash du fichier == OID du blob attendu » — était
donc **fausse**. Le contrat est :

- lire l'algorithme par `git rev-parse --show-object-format` (`sha1` ici, mais
  **jamais supposé**, et **aucune longueur d'OID codée en dur**) ;
- recalculer l'OID Git **complet** (en-tête incluse) ou passer par
  `git hash-object` avec les mêmes garde-fous que la matérialisation
  (`--no-replace-objects`, chemins en octets) ;
- comparer à l'OID attendu ;
- **ne jamais** présenter un hash brut comme équivalent.

#### Ce qui est compté, et comment

`git ls-tree -r` inventorie les **feuilles**, pas les répertoires. Le contrôle
distingue donc trois ensembles :

| Ensemble               | Source                                          | Contrôle                                   |
| ---------------------- | ----------------------------------------------- | ------------------------------------------ |
| Feuilles Git attendues | `ls-tree -r`                                    | égalité exacte, une pour une               |
| Répertoires attendus   | **dérivés** des chemins des feuilles            | égalité exacte — aucun répertoire en trop  |
| Métadonnées du bail    | `<lease>/marker`, `<lease>/state.json`, `*.tmp` | **hors `workspace/`**, exclues du comptage |

| Contrôle            | Règle                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| Chemins             | canoniques, un pour un avec l'inventaire                                     |
| Type réel           | par `lstat` — fichier, lien ou répertoire, conforme au mode Git attendu      |
| Mode                | mode Git normalisé (`100644` / `100755` / `120000`) conforme                 |
| Contenu             | **OID Git recalculé** == OID attendu (§ ci-dessus)                           |
| Liens               | cible **exactement** égale au contenu du blob, et résolvant dans le candidat |
| Fichiers inattendus | **aucun** sous `workspace/` hors inventaire                                  |

Un échec laisse le bail en `creating` : il ne devient jamais `active`, donc
jamais utilisable par un exécutant.

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
2. les **quatre** états de dépendances : `package.json` racine **initial** (du
   tree) et **final**, `bun.lock` **initial** et **final** ; exprimés par
   l'**overlay structuré** `{ path, mode, oid_final }` ordonné canoniquement,
   plus les OID initiaux correspondants ;
3. hash de `conventions/libraries/resolution-policy.json` — changer la politique
   invalide les plans antérieurs ;
4. octets de `nx.json`, `tsconfig.base.json`, `.gitattributes` (sans effet sur
   la matérialisation, mais il gouverne le contenu du dépôt et donc le résultat
   du schematic) ;
5. commit `C` et arbre complet de `apps/<app>` — liste triée
   `path\0mode\0sha256` ;
6. outillage **lu, jamais supposé** : version Node, Bun, Nx (depuis
   `node_modules/nx/package.json`), et du paquet fournissant le schematic ;
7. hash du module runner (`library-addition.mjs`) — un changement de runner
   invalide les plans antérieurs ;
8. valeur substituée à `{{app}}` ;
9. entrée `.compat.json` retenue (versions épinglées avant le schematic).

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

Le recours LLM (`install.method: llm-then-verified`) est plus étroit que le
confinement OS : le modèle ne reçoit jamais le chemin du candidat, aucun accès
fichier, aucun shell et aucun outil réseau. L’adaptateur fournisseur est un
**contrôleur de confiance hors processus**. Son exécutable doit être absolu,
canonique et exécutable ; son `argv` suit un schéma fermé. Il reçoit la requête
sur `stdin` et ne retourne que la réponse JSON sur `stdout`, sous un
environnement minimal sans `PATH` ni secret hérité. Le contrôleur reste une
partie de confiance à auditer séparément : ce contrat borne l’autorité du
**modèle**, il ne prétend pas transformer un binaire fournisseur hostile en code
sûr.

Le passage hors processus est nécessaire pour rendre le timeout exécutoire : un
`Promise.race` avec `AbortSignal` rend la main mais ne peut pas arrêter un
adaptateur qui ignore le signal. Sur les hôtes POSIX supportés, chaque appel
possède son groupe de processus ; timeout, `stdout` ou `stderr` hors borne
provoquent un `SIGKILL` du groupe et la fermeture est attendue avant de rendre
la main. La réponse doit être UTF-8 strict, JSON strict et sans clé dupliquée ;
le `stderr`, potentiellement sensible, n’est jamais recopié dans les diagnostics
(taille et empreinte seulement).

La boucle conserve ensuite les garanties suivantes :

- **Allowlist de chemins** déclarée dans la recette (`llm_write_paths[]`) —
  toute écriture hors liste rejette l'itération ;
- **Réponse à schéma fermé** : opérations `create` / `modify` uniquement,
  précondition SHA obligatoire pour une modification, validation de toute la
  réponse avant la première écriture ;
- **Gate de diff et oracles par itération** : le diff doit rester dans
  l'allowlist et progresser vers les invariants ; un vérificateur qui mute le
  candidat est lui-même refusé ;
- **Contexte, réponse, timeout et nombre de tours bornés** ; maximum 3
  itérations, puis échec dur ;
- **Journal complet et durable** `.cmz/library-llm-audit/<candidate-id>.jsonl`,
  mode privé, append-only et fsyncé ; son hash entre dans le `plan_id` ;
- **Zéro publication directe** : sa sortie est un change-set candidat qui
  repasse par la publication normale (`plan_id`, transaction,
  `check:library-setup` + oracles runtime verts).

Aucun adaptateur OpenAI, Anthropic ou autre n’est livré ni choisi par ce lot.
Sans adaptateur explicitement injecté, le CLI refuse une recette
`llm-then-verified` **avant** de créer le candidat. La frontière est donc
implémentée et testée ; l’intégration fournisseur reste volontairement absente.

## Idempotence

Si le manifeste déclare déjà la bibliothèque, la commande refuse explicitement
de la réinstaller. Elle ne masque donc ni dérive ni intention ambiguë sous un
`no-op`. La gate structurelle reste le moyen de vérifier une app déjà équipée.

## Harnais `runtime_acceptance`

`tools/library-setup/runtime-proofs.mjs`, appelé par `add-library`. Toute preuve
s'exécute **dans un candidat**, jamais dans le worktree réel.

| `proof`               | Exécution                                                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile-component`   | candidat + composant sentinelle important la primitive ; `ngc --strictTemplates` / build Nx ; échec = type ou template invalide                                                                                                                                      |
| `compiled-css-rule`   | candidat + classe sentinelle unique (`text-[#123456]`) ; build ; la règle `color:#123456` doit figurer dans le CSS émis                                                                                                                                              |
| `production-build`    | build Nx de production hors réseau ; toute ressource distante ou configuration réservée au développement provoque un échec                                                                                                                                           |
| `browser-coexistence` | candidat + page portant le CSS **réellement compilé** de l'app ; `chrome-headless-shell` épinglé par empreinte, résultat extrait par `--dump-dom` : jetons `--mat-*` résolus, règle hors couche non écrasée par le preflight, utilitaire Tailwind toujours appliquée |

`status` n'est pas une promesse : `check:library-setup` le confronte au registre
d'oracles de `library-setup/runtime-proofs.mjs`, **dans les deux sens**.
`enforced` sans oracle est une garantie creuse ; `harness-pending` avec oracle
cache une preuve déjà livrée — c'est ce second cas qui masquait trois oracles
réels jusqu'au 2026-09-06. La correspondance EST le signal de livraison.

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
  retiré en v23 → `animate.enter` »), son commit, ses identités de plan et de
  change-set, ses versions exactes et les empreintes de ses entrées.

## Ordre de revue et de livraison

Revue **P0 par P0** ; aucun code d'un lot tant que le P0 dont il dépend n'est
pas validé.

| #   | Étape                                           | Statut                      | Sortie                                                             |
| --- | ----------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| 1   | Durcissement `check:library-setup`              | **livré**                   | mergé en `c6b5b64`                                                 |
| 2   | P0 nº 1 — candidat isolé                        | **livré**                   | matérialisation tree + baux vérifiés                               |
| 3   | P0 nº 2 — verrous et transaction de publication | **livré**                   | reprise SIGKILL et rollback adverse                                |
| 4   | P0 nº 3 — `plan_id` / change-set                | **livré**                   | identité et change-set déterministes                               |
| 5   | P0 nº 4 — confinement des exécutants et du LLM  | **livré**                   | sandbox macOS/Docker + frontière LLM data-only                     |
| 6   | Frontière candidate + suites adverses           | **livré**                   | 10/10 attaques réelles macOS et Docker                             |
| 7   | Schéma `.compat.json` + premières pistes        | **livré**                   | schéma fermé et trois matrices candidates                          |
| 8   | Tranche verticale Material                      | **livré**                   | compilation stricte + build production                             |
| 9   | Tranche verticale Tailwind                      | **livré**                   | règle CSS compilée + build production                              |
| 10  | Coexistence navigateur                          | **livré**                   | résultat identique macOS/Docker, ordre inverse couvert             |
| 11  | `create-app → add-library`                      | **livré**                   | E2E réel : shell puis Material/Tailwind, zéro édition manuelle     |
| 12  | Gouvernance d'upgrade                           | **implémentation en revue** | sélection fail-closed + promotion transactionnelle et périssable   |
| 13  | Recours LLM borné                               | **livré sans fournisseur**  | boucle adverse couverte ; CLI fail-closed sans adaptateur approuvé |

Aucune ligne n'est marquée « validée » : la validation est un acte de revue, pas
une déclaration de ce document. Le schéma `.compat.json` et sa première entrée
passent **avant** la tranche Material (étape 7), puisque celle-ci exige une
entrée de compatibilité validée — les placer en gouvernance d'upgrade créait une
dépendance vers l'arrière.

Chaque étape ≥ 6 : branche dédiée, PR, CI verte, revue, validation, puis merge.

### Suite adversariale (préalable à toute implémentation d'`add-library`)

Chaque cas doit **échouer avant le correctif** et **passer après** — sinon il ne
prouve rien. Les cas de confinement sont exécutés **à l'identique sur les deux
backends** (conteneur Linux, `sandbox-exec` macOS).

**Matérialisation** — le tree comme autorité :

| Cas                                                         | Attendu                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `refs/replace/<oid>` actif substituant un contenu           | contenu **vrai** matérialisé (`--no-replace-objects`) ; le test doit échouer sans l'option |
| objet manquant + clone partiel                              | échec, **aucun accès réseau** (`--no-lazy-fetch`)                                          |
| tree contenant `x → /tmp` (lien d'évasion)                  | refus à la matérialisation                                                                 |
| tree à entrées dupliquées / conflit nom-type (`git mktree`) | refus à la matérialisation                                                                 |
| entrée en mode `160000` ou type non-`blob` à une feuille    | refus                                                                                      |
| chemin en UTF-8 invalide                                    | refus                                                                                      |
| deux chemins se normalisant identiquement (NFC/NFD)         | refus                                                                                      |
| collision insensible à la casse                             | refus                                                                                      |
| segment `.git` sous toute casse                             | refus                                                                                      |
| `.git/info/attributes` hostile dans le dépôt                | **sans effet** (aucune machinerie d'attributs)                                             |

**Confinement** — l'OS comme frontière :

| Cas                                                                                   | Attendu                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| écriture hors candidat (chemin absolu)                                                | refusée par l'OS                                       |
| **exécutant créant un lien d'évasion après matérialisation, puis écrivant à travers** | refusé par le bac à sable                              |
| lecture d'un chemin du dépôt réel                                                     | refusée ou hors d'atteinte                             |
| sous-processus tentant les mêmes accès                                                | refusé (confinement hérité)                            |
| accès réseau en phase d'exécution                                                     | refusé                                                 |
| lecture d'une variable de credential                                                  | absente de l'environnement                             |
| `bunx <paquet-absent>`                                                                | refusé — binaire résolu explicitement dans le candidat |
| cache de paquets pendant schematic / probes                                           | en lecture seule                                       |
| aucun backend de bac à sable disponible                                               | **échec avant** toute exécution tierce                 |

Les deux menaces de lien symbolique sont **deux tests distincts** : un tree
hostile (refusé à la matérialisation) et un exécutant hostile (refusé par le bac
à sable). Elles ne se recouvrent pas.

**Scripts de cycle de vie** — discriminant, avec témoins :

| Scénario                                                               | Marqueur attendu     |
| ---------------------------------------------------------------------- | -------------------- |
| script `preinstall` / `prepare` du projet, **sans** `--ignore-scripts` | **présent** (témoin) |
| dépendance `trustedDependencies`, **sans** `--ignore-scripts`          | **présent** (témoin) |
| les deux, **avec** `--ignore-scripts`                                  | **absents**          |

**Protocole Bun** :

| Cas                                            | Attendu                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `bun.lock` absent du tree                      | échec explicite au temps 1 (sinon `--frozen-lockfile` résout silencieusement) |
| `package.json` muté puis `--frozen-lockfile`   | échec `lockfile had changes`                                                  |
| diff du lockfile contenant un paquet inattendu | refus                                                                         |
| lockfile régénéré puis revalidé                | succès                                                                        |

**Bail** — crash injecté à **chaque** transition :

| Cas                                      | Attendu                                         |
| ---------------------------------------- | ----------------------------------------------- |
| crash en `creating`                      | reprise → `orphaned` → purge ; jamais `active`  |
| crash en `active`                        | reprise → `orphaned` → purge                    |
| crash en `releasing`                     | purge reprise (idempotente)                     |
| PID réutilisé par un autre processus     | purge refusée (instant de démarrage discordant) |
| marqueur discordant du journal           | `quarantined`, signalé, **jamais** supprimé     |
| ancêtre du chemin devenu lien symbolique | purge refusée                                   |

## État de livraison restant

- Le renderer `create-app` produit déjà un manifeste valide déclarant Transloco.
  La preuve bout-en-bout doit encore créer un vrai shell, le committer dans le
  dépôt fixture, puis lui ajouter Material et Tailwind sans édition manuelle.
- La CI doit exécuter un vrai `add-library --dry-run` dans un environnement
  Docker, et vérifier que le worktree reste inchangé.
- Les trois pistes de compatibilité restent `candidate` jusqu'à l'exécution de
  `bun run promote-library-compatibility --app <référence> --library <lib>`. La
  commande exécute le vrai pipeline en candidat, exige toutes les preuves de la
  recette — coexistences comprises — puis ne modifie que la matrice ciblée. Le
  bloc JSON est une attestation de contenu vérifiable et périssable, **pas une
  signature ni une preuve cryptographique de CI** : l'approbation demeure portée
  par la revue et les checks obligatoires du commit.
