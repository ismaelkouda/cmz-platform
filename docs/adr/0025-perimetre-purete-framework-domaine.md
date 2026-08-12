# ADR-0025 — Périmètre de « pureté framework » pour `type:domain`/`type:constants` (RxJS autorisé, `@angular/*` interdit)

- **Statut :** Accepted
- **Date :** 2026-08-12

## Contexte

Le Chantier Q ([ADR-0024](./0024-decouplage-di-ports-shared.md)) a extrait des
interfaces pures pour 8 ports auparavant `abstract class`. L'étape suivante
(Q-6/Q-7, `strategie-cross-stack-revue.md` §3) consiste à écrire un garde
mécanique, bloquant en CI, qui vérifie le *layering test* posé par cette même
revue :

> Peut-on supprimer Angular de `package.json` et compiler encore le cœur ?

Avant d'écrire ce garde, une mesure réelle sur les 19 libs concernées
(18 `type:domain` + `shared-constants`, `type:constants`) était nécessaire
pour éviter d'écrire une règle contredite par l'état du dépôt dès le premier
run CI (l'écueil documenté ailleurs dans ce dépôt : « une règle non
instrumentée n'est qu'une intention »).

Résultat de la mesure (grep exhaustif, hors `*.spec.ts`) :

- **0 import `@angular/*`** dans les 19 libs.
- **0 décorateur** (`@Component`, `@Injectable`, `@Pipe`, `@Directive`, le
  décorateur custom `@Service` observé côté `type:application`/`type:ui`).
- **~90 imports `import { Observable } from 'rxjs'`**, concentrés dans les
  interfaces de repository (`libs/*/domain/src/lib/repositories/*.repository.ts`)
  — le type de retour contractuel des méthodes de lecture/écriture.

La question posée par cette mesure : RxJS doit-il être traité comme un
« import framework » au sens de Q-6, au même titre que `@angular/*` ?

## Options envisagées

### Option A — RxJS interdit au même titre qu'Angular

- Avantages : garde le plus strict possible ; aligne le domaine sur du
  TypeScript sans aucune dépendance runtime tierce, y compris réactive.
- Inconvénients : `rxjs` est classé dans le « catalog par défaut » du socle
  Angular par [ADR-0005](./0005-versions-du-socle.md) (même table de version
  que `@angular/*`/`zone.js`) — cette classification est une décision de
  *gestion de version*, pas une déclaration d'appartenance architecturale.
  Interdire RxJS exigerait de migrer ~90 signatures de repository vers
  `Promise` **avant même d'écrire le garde**, un chantier d'un tout autre
  ordre de grandeur que Q-6 tel que mesuré, et hors du périmètre qu'il
  couvre aujourd'hui (aucune mesure de ce coût n'existe, aucune décision
  de migration `Observable → Promise` n'a été prise ailleurs dans ce
  dépôt).

### Option B — RxJS autorisé, seul `@angular/*` (+ décorateurs Angular) interdit

- Avantages : RxJS est une primitive réactive framework-agnostique — elle
  s'exécute identiquement sous React, Vue, Node, ou aucun framework du
  tout ; ce n'est pas un point de couplage au sens du *layering test*
  (« peut-on retirer *Angular*, pas retirer *toute dépendance* »). Le garde
  reste vrai dès aujourd'hui, sans migration préalable : 0 faux positif.
- Inconvénients : un domaine « pur TS » au sens le plus strict n'existe pas
  encore ; RxJS reste une dépendance runtime du cœur, même si elle n'est pas
  Angular.

## Décision

**Option B.** `tools/check-framework-purity.mjs` interdit tout import
`@angular/*` et tout usage de décorateur Angular (`@Component`, `@Injectable`,
`@Pipe`, `@Directive`, `@Service`) dans `type:domain`/`type:constants`. RxJS
(`import ... from 'rxjs'`) est explicitement autorisé.

## Justification

- Le test de recevabilité posé par `strategie-cross-stack-revue.md` §2.3 est
  formulé en termes d'**Angular**, pas de « toute dépendance runtime » — le
  vrai risque à éliminer est le couplage à un framework applicatif
  spécifique (DI, décorateurs, cycle de vie de composant), pas l'usage d'une
  primitive de programmation réactive largement portable.
- RxJS a des implémentations/équivalents dans tout écosystème JS/TS
  (React avec `rxjs` directement, ou `Observable`-like via d'autres libs) —
  contrairement à `@angular/core`, dont l'API n'a de sens que dans une
  application Angular.
- Interdire RxJS sans l'avoir décidé et chiffré séparément aurait fait
  échouer Q-6/Q-7 dès son premier commit sur ~90 sites, forçant soit un
  contournement (allowlist large, contraire à l'esprit du garde), soit un
  chantier de migration non mandaté par cette tâche.

## Conséquences

### Positives

- Q-6/Q-7 peut être câblé en CI bloquant dès aujourd'hui, sans dette
  préexistante à tolérer.
- Le garde teste précisément ce que Q-8 (test destructif) devra confirmer
  mécaniquement — **addendum 2026-08-12** : Q-8 a été implémenté
  (`tools/check-framework-purity-destructive.mjs`). La méthode envisagée
  initialement (« retirer `@angular/*` des `paths` tsconfig ») s'est révélée
  **inopérante** à l'usage : avec `moduleResolution: "bundler"`
  (`tsconfig.base.json`), TypeScript résout un paquet npm réel via la
  résolution `node_modules` standard et ne consulte `paths` que pour les
  alias qui n'ont pas de résolution de module native — remapper
  `@angular/*` vers un chemin inexistant dans `paths` n'empêche pas la
  compilation de trouver `@angular/core` (vérifié : `libs/core` compilait
  toujours à 0 erreur). Le retrait doit être **physique** : ce monorepo
  utilise `bun`, qui matérialise `node_modules/@angular/*` en symlinks vers
  un store `node_modules/.bun/@angular+<pkg>@<version>+<hash>/` — renommer
  temporairement à la fois le lien et les répertoires du store (jamais de
  suppression, toujours réversible, restauration garantie par `finally` +
  handler `process.on('exit', ...)`) fait échouer réellement la
  compilation d'une lib qui dépend d'Angular. Vérifié sur les 19 libs
  `type:domain`/`type:constants` (0 échec) et sur 2 libs témoins connues
  pour dépendre d'Angular, `@cmz/core`/`@cmz/shared-application` (échec
  confirmé dans les deux cas — preuve que le test est significatif, pas un
  faux négatif silencieux). Volontairement **pas branché en CI bloquant à
  chaque commit** — Q-6/Q-7 (statique, rapide) couvre déjà le cas courant ;
  Q-8 manipule `node_modules` et prend plusieurs dizaines de secondes
  (~20 compilations `tsc` complètes), réservé à un usage manuel ou un job
  périodique (`bun run check:framework-purity:destructive`).
  ailleurs mais pas dans `type:domain`/`type:constants`) devra confirmer
  mécaniquement.

### Négatives / dette acceptée

- Le domaine n'est pas « zéro dépendance runtime » — RxJS reste un import
  tiers dans les contrats de repository. Ce choix n'est pas remis en cause
  ici ; seule la question « RxJS = framework à interdire ? » est tranchée.

### Points à réévaluer

- Si un futur portage effectif vers React/Node (au-delà du POC scratch de
  ROAD-3c) démontre que RxJS est en pratique un obstacle (ex. bundle size,
  absence de RxJS dans la stack cible), rouvrir cette décision avec un coût
  de migration `Observable → Promise` chiffré — pas avant.

## Références

- [ADR-0024](./0024-decouplage-di-ports-shared.md) — Chantier Q, ports en interface pure
- [ADR-0005](./0005-versions-du-socle.md) — classement `rxjs` dans le catalog par défaut
- [`strategie-cross-stack-revue.md`](../architecture/strategie-cross-stack-revue.md) §2.3, §3 (Q-6/Q-7/Q-8)
- `tools/check-framework-purity.mjs` (implémentation)
