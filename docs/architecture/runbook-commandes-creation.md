# Runbook humain — créer une app, ajouter une bibliothèque, créer un module

Ce guide sert à comprendre et dépanner les trois commandes quotidiennes. Il ne
remplace pas leurs contrôles : en cas de doute, la commande échoue sans publier.

## Réflexe commun : `--explain`

Avant une première utilisation ou après une évolution du socle :

```bash
bun run create-app --explain
bun run add-library --explain
bun run create-module --explain
```

La sortie JSON versionnée indique les fichiers possédés, les phases, les checks,
les fichiers temporaires, le journal éventuel et la procédure de reprise. Elle
ne demande aucun autre argument, n'inspecte pas le workspace et n'écrit rien.
`--explain` s'utilise seul afin que sa signification reste stable.

Règle de diagnostic : repérer la dernière phase affichée, vérifier uniquement
les fichiers déclarés dans `ownership`, puis suivre la rubrique `transaction`.
Ne jamais supprimer un journal à la main avant d'avoir compris son état.

## 1. `create-app`

But : produire un shell Angular/PWA autonome depuis un application design.

```bash
bun run create-app --design <design.json> --experience <id> --app <nom>
bun run create-app --design <design.json> --experience <id> \
  --app <nom> --dry-run
bun run create-app --design <design.json> --experience <id> \
  --app <nom> --expect-plan <plan_id>
```

La première commande est la voie nominale : elle calcule, vérifie et publie
directement. `--dry-run` affiche le plan sans écrire. `--expect-plan` conserve
une revue préalable facultative et refuse la publication si le plan a changé.
`--apply` n'existe plus afin d'éviter une seconde commande obligatoire.

Ce qui peut changer : uniquement `apps/<nom>/**`. La commande n'ajoute aucune
bibliothèque UI optionnelle et ne modifie aucune configuration racine.

Ce qui est vérifié : schémas du design et des contrats backend, tombstone,
inventaire et empreintes des fichiers, `ngc`, build de production et lint.

En cas d'échec :

1. avant publication, le candidat reste sous
   `apps/.<nom>.create-app-candidate-<plan_id>/` ;
2. une relance directe avec les mêmes entrées revérifie ce candidat exact ;
3. un verrou mort `apps/.<nom>.generation-lock/` est récupéré automatiquement ;
4. si `apps/<nom>/` existe, la commande n'accepte que l'arbre exact du plan ;
5. ne jamais fusionner manuellement candidat et sortie.

Il n'existe ni `--resume` ni `--abort` : la reprise est automatique et fondée
sur les empreintes. Un plan attendu devenu obsolète doit être recalculé par
`--dry-run`, ou omis si aucune revue préalable n'est nécessaire.

## 2. `add-library`

But : appliquer un adaptateur déjà qualifié à une application existante.

```bash
bun run add-library --app <nom> --library <id> --dry-run
bun run add-library --app <nom> --library <id>
bun run add-library --app <nom> --library <id> \
  --expect-plan <library-plan:id>
```

Préconditions : dépôt entièrement propre, branche locale attachée, bibliothèque
provisionnée à la racine et piste `verified` compatible avec les versions
réelles. `--dry-run` exécute aussi l'installation et les checks dans le
candidat, mais ne publie pas de commit.

Ce qui peut changer : uniquement `apps/<nom>/**`, dans un unique commit
fast-forward. `package.json`, `bun.lock` et le reste du dépôt sont hors portée.

Les huit phases visibles sont : `preconditions`, `qualified-track`, `candidate`,
`adapter`, `install-without-scripts`, `targeted-checks`, `plan`, `publication`.
Les checks ciblés sont build obligatoire, puis lint et test lorsqu'ils existent.

En cas d'échec :

1. avant `publication`, le worktree principal est inchangé ; corriger la cause
   puis relancer la commande ;
2. le candidat temporaire est supprimé automatiquement, même après un échec ;
3. si `HEAD` a bougé pendant les checks, la publication est refusée ;
4. après le fast-forward, le commit entier constitue le résultat : il n'existe
   pas d'état partiellement publié ni de commande `--resume` ;
5. un dépôt sale doit être examiné avec `git status`, jamais nettoyé à
   l'aveugle.

Une erreur `qualified-track` signifie que la qualification est absente ou
périmée. Elle se corrige dans le chantier de qualification, pas en contournant
`add-library`.

## 3. `create-module`

But : générer les projets Nx d'un module, les câbler et vérifier le résultat.

```bash
bun run create-module --definition <definition.json> \
  [--allow-experimental] [--dry-run]
bun run create-module --resume --module <nom>
bun run create-module --abort --module <nom>
```

Ce qui peut changer : `libs/<nom>/**`, les attaches ciblées dans
`eslint.config.mjs` et `tsconfig.base.json`, et `bun.lock` si Bun doit le
synchroniser. Les octets de ces fichiers, de `knip.json` et de `package.json`
sont protégés par le journal pour permettre une restauration sûre.

Journal : `.cmz/create-module-transactions/<nom>/state.json`. Ses états sont
`planned`, `generated` et `configured`. Il conserve aussi un snapshot immuable
de la définition. Le verrou de cycle de vie partagé est actuellement sous
`.cmz/retire-module-transactions/.lock/`. Ce nom historique est conservé pour la
reprise des transactions existantes ; le code partagé porte désormais le nom
neutre `workspace-transaction`.

Le chemin nominal n'exécute que les validations utiles aux sorties touchées :
installation Bun sans scripts, build de chaque projet créé, lint de cette liste
et Prettier sous `libs/<nom>`. Les audits globaux des noms, targets et
dépendances restent des steps directes et bloquantes de la CI ; ils ne sont pas
répétés pendant chaque création locale.

En cas d'échec normal, la commande tente un rollback complet. Si le message dit
que le journal est conservé, ou après un arrêt brutal :

1. arrêter toute autre création ou suppression de module ;
2. lire `state.json` et noter `status`, `gitHead`, `gitBranch` et `outputRoot` ;
3. exécuter `git status` sans modifier les fichiers ;
4. si les changements correspondent à la transaction, reprendre avec
   `bun run create-module --resume --module <nom>` ;
5. pour renoncer et restaurer les octets initiaux, utiliser
   `bun run create-module --abort --module <nom>` ;
6. si la commande refuse une dérive externe, conserver le journal et faire une
   revue humaine : elle refuse volontairement d'écraser un travail ambigu.

`--allow-experimental` vaut uniquement pour la création initiale. Il ne saute
aucun contrôle et ne doit pas être ajouté à `--resume` ou `--abort`.

## Lecture rapide d'un échec

- Argument ou précondition : rien ne doit avoir été publié.
- Candidat ou génération : inspecter uniquement le chemin temporaire annoncé.
- Check Angular/Nx : corriger le code ou la configuration ordinaire indiquée.
- Publication : vérifier `git status`, la branche et `HEAD` avant toute action.
- Rollback ambigu : ne rien supprimer ; préserver journal et sortie écartée.
- Qualification périmée : requalifier la bibliothèque, ne pas forcer la CLI.

Après succès, lire le diff comme du code Angular/Nx normal. Aucun runtime de
générateur n'est requis par l'application ou le module produit.
