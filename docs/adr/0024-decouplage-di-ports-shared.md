# ADR-0024 — Découpler le contrat de port du jeton d'injection Angular

- **Statut :** Accepted
- **Date :** 2026-08-12

## Contexte

[ADR-0012](./0012-strategie-cross-framework.md) actait une dette
explicite : *« extraire un cœur agnostique (logique des mappers,
services) séparé du décorateur `@Service`, **quand la partie React
démarrera**. Non résolu ici — signalé pour ne pas le découvrir trop
tard. »*

Le déclencheur s'est produit le 2026-08-12 : un POC React+TS
(`libs`-équivalent pour `settings-security/users`, construit hors de ce
dépôt) a prouvé que l'isolation en couches et l'Oracle de vérification
SEOS sont indépendants du framework — mais n'a fait que confirmer un
diagnostic déjà posé dix jours plus tôt dans
[`strategie-cross-stack-revue.md`](../architecture/strategie-cross-stack-revue.md),
resté sans suite jusqu'ici.

Mesure faite sur l'arbre de travail avant cette décision (pas une
estimation) : **9 `abstract class`** exportées dans `shared-domain`
(`ExcelExportPort`, `LoggerPort`, `NavigationPort`, `StoragePort`,
`TrustedOriginPort`, `DomainError`) et `shared-application`
(`ConfirmDialogPort`, `NotificationPort`, `TranslationPort`). 8 sur 9
n'ont **aucune logique** — uniquement des signatures `abstract` ; la
9ᵉ (`DomainError`) a un vrai constructeur (`super(message)`,
`this.name = this.constructor.name`) et n'est pas concernée par cette
décision (cf. §Conséquences).

Chaque port sert **deux rôles confondus dans une seule déclaration** :

1. **Contrat** — la signature que l'adaptateur doit respecter. Ce rôle
   est neutre : une `interface` TypeScript s'efface entièrement à la
   compilation, coût zéro, portable vers n'importe quel runtime JS/TS.
2. **Jeton d'injection** — la clé que `inject(TranslationPort)` et
   `{ provide: TranslationPort, useExisting: ... }` utilisent pour
   qu'Angular résolve l'implémentation au runtime. Ce rôle **n'est pas
   neutre** : Angular injecte par jeton de classe, un mécanisme que
   React (Context + hooks) n'a jamais utilisé et n'utilisera jamais.

Mesure de la surface réelle de consommation (`grep` sur `apps/`+`libs/`,
hors fichiers `.spec.ts`) :

| Port | Fichiers consommateurs | Adaptateur(s) |
| --- | --- | --- |
| `TranslationPort` | 102 | `I18nextTranslationService` (`shared-ui`) |
| `NotificationPort` | 49 | `CmzNotificationService` (`shared-ui`) |
| `ConfirmDialogPort` | 29 | `CmzConfirmDialogService` (`shared-ui`) |
| `ExcelExportPort` | 22 | `BrowserExcelExportAdapter` (`shared-browser`) |
| `StoragePort` | 10 | `BrowserStorageAdapter` (`shared-browser`) |
| `TrustedOriginPort` | 6 | `TrustedOriginAdapter` (`core`) |
| `NavigationPort` | 7 | `BrowserNavigationAdapter` (`shared-browser`) |
| `LoggerPort` | 4 | `ConsoleLoggerAdapter` (`shared-browser`) |

**Un seul point de composition root réel** : `apps/backoffice-
angular/src/app/app.config.ts` (chaque port apparaît une fois en
`{ provide: X, useExisting: Y }`). Les autres occurrences de `provide:`
trouvées par recherche large sont des `providers: [...]` locaux de
tests, pas du DI global.

## Options envisagées

### Option A — Ne rien faire avant l'arrivée d'un second consommateur réel

- Avantages : aucun coût immédiat ; évite de généraliser sur la base
  d'un unique consommateur (règle des deux implémentations, déjà citée
  dans `strategie-cross-stack-revue.md` §2.2a).
- Inconvénients : c'est exactement la situation qu'ADR-0012 avait déjà
  choisie, puis explicitement requalifiée de dette à réévaluer « quand
  React démarrera » — ce jour est arrivé. Différer une seconde fois
  revient à ignorer son propre déclencheur. Le coût documenté croît
  avec le nombre de consommateurs (18 modules aujourd'hui) : chaque
  semaine de délai ajoute des sites `inject(Port)` à migrer plus tard.

### Option B — Extraire une `interface` pure, jeton d'injection séparé (Angular-side)

- Avantages : coût mécanique, pas conceptuel — chaque site consommateur
  change de syntaxe (`inject(X)` → `inject(X_TOKEN)`), jamais de
  comportement. Le contrat (`interface`) devient immédiatement
  consommable par n'importe quel runtime JS/TS (React, Node, futur
  Kotlin/Swift via leurs propres mécanismes de contrat). Pose la
  **couture** sans construire la **généralisation** — exactement la
  discipline (a) de `strategie-cross-stack-revue.md` §2.2 : « design
  the seam now, build the abstraction later ».
- Inconvénients : surface de migration large (jusqu'à 102 fichiers pour
  un seul port) — nécessite un codemod, pas une édition manuelle
  fichier par fichier (discipline (d), déjà démontrée faisable dans ce
  dépôt : `codemod-strip-redundant-component-flags.mjs` a corrigé 105
  composants d'un coup). Risque d'erreur si fait à la main.

### Option C — Couche DI universelle (conteneur maison ou `inversify`)

- Avantages : un seul mécanisme d'injection pour toutes les stacks
  futures.
- Inconvénients : plus petit dénominateur commun — perd le
  tree-shaking natif d'Angular et l'ergonomie idiomatique de chaque
  framework cible. Explicitement écarté dans
  `strategie-cross-stack-revue.md` §4 (« chercher une couche DI
  universelle ») comme tentation à ne pas suivre.

## Décision

**Option B.** Pour les 8 ports sans logique (tous sauf `DomainError`) :

1. Le contrat devient une **`interface` TypeScript pure**, sans
   `abstract class`, vivant toujours dans `shared-domain` ou
   `shared-application` selon la couche actuelle.
2. Le jeton d'injection devient un **`InjectionToken<TInterface>`**
   explicite (`export const TRANSLATION_PORT = new
   InjectionToken<TranslationPort>('TranslationPort')`), déclaré
   **Angular-side** — pas dans `shared-domain`/`shared-application`,
   mais dans une couche qui connaît Angular (`shared-ui` pour les ports
   applicatifs consommés par l'UI, ou une nouvelle petite lib
   `shared-angular-tokens` si la dispersion s'avère pire que la
   centralisation — décision reportée à l'exécution, cf. Q-3).
3. `DomainError` reste une `abstract class` — c'est une hiérarchie
   d'erreur runtime légitime (elle a un constructeur avec logique),
   pas un contrat de port. Documenté comme exception, pas oublié.

## Justification

Le diagnostic de `strategie-cross-stack-revue.md` §1.2 tient à la
vérification directe : les 9 `abstract class` ne portent ni
`@Service()` ni `inject()` — elles ne sont **pas contaminées** par
Angular au sens d'un décorateur. L'argument correct, plus étroit et
vérifiable mécaniquement, est différent : une `abstract class` **émet
une classe JS réelle** et sert de **jeton de classe**, un idiome
qu'Angular seul utilise de cette façon. Un futur consommateur React
embarquerait ces classes sans jamais utiliser leur mécanisme
d'injection — coût non nul pour un bénéfice nul.

Le *layering test* proposé (`strategie-cross-stack-revue.md` §2.3) est
la métrique qui tranche : *« Peut-on supprimer Angular de
`package.json` et compiler encore le cœur ? »* Aujourd'hui, la réponse
est oui pour `shared-domain`/`shared-constants` en tant que fichiers,
mais seulement en apparence — dès qu'un port y est consommé par jeton
de classe, le cœur *compile* sans Angular installé, mais son **design**
présuppose déjà un mécanisme d'injection par classe qu'aucun autre
framework ne partage. Extraire l'interface rend le test vrai au sens
fort, pas seulement au sens de la compilation.

## Conséquences

### Positives

- Les 8 interfaces extraites deviennent consommables tel quel par tout
  futur consommateur non-Angular (React via Context, ou tout runtime
  qui accepte un contrat TypeScript), sans aucune adaptation.
- Le *layering test* devient vérifiable mécaniquement (Q-6/Q-7 dans
  `strategie-cross-stack-revue.md` §3) : `check-framework-purity.mjs`
  peut désormais exiger **zéro** `abstract class` non documentée en
  exception dans `type:domain`/`type:constants`, au lieu de zéro
  décorateur seulement (test déjà vrai aujourd'hui, donc trop faible).
- Précédent direct pour tout futur port ajouté à `shared-*` — la règle
  devient : un contrat est une `interface`, sauf exception documentée
  (hiérarchie d'erreur runtime comme `DomainError`).

### Négatives / dette acceptée

- Migration mécanique mais large : jusqu'à 102 sites `inject(X)` à
  faire pointer vers un `InjectionToken` pour `TranslationPort` seul.
  Un codemod est requis (pas une édition manuelle) — non écrit à la
  date de cette décision, cf. Q-2/Q-3 dans le backlog.
- Une indirection de plus pour tout nouveau port (déclarer l'interface
  **et** le token séparément) — coût de discipline permanent, accepté
  en échange de la portabilité.
- `check-framework-purity.mjs` (Q-6) n'existe pas encore à la date de
  cette décision — cette ADR pose la règle, ne construit pas encore le
  garde-fou qui la vérifie. Tant que Q-6/Q-7 ne sont pas faits, la règle
  reste une intention, pas un contrôle machine (risque déjà documenté
  ailleurs dans ce dépôt : « une règle non instrumentée n'est qu'une
  intention »).

### Points à réévaluer

- Si la migration des 102 sites `TranslationPort` révèle un coût
  d'édition (même via codemod) disproportionné par rapport au bénéfice
  mesuré, reconsidérer un séquencement port par port plutôt que les 8
  d'un coup — commencer par les ports à faible surface (`LoggerPort`,
  `NavigationPort`, `TrustedOriginPort`, 4 à 7 fichiers chacun) avant
  `TranslationPort`/`NotificationPort`/`ConfirmDialogPort`.
- Si un second consommateur réel (React ou autre) n'arrive jamais,
  cette décision reste un coût pur sans bénéfice réalisé — mais le
  micro-coût de discipline (interface + token) est jugé assez faible
  pour ne pas attendre une preuve d'usage avant de le payer, contrairement
  à la généralisation complète d'un chantier O (workflow-action) qui,
  elle, doit attendre un second cas réel.

## Références

- [ADR-0012](./0012-strategie-cross-framework.md) — dette actée, déclencheur de cette décision.
- [`strategie-cross-stack-revue.md`](../architecture/strategie-cross-stack-revue.md) — analyse source (chantier Q, Q-1 à Q-8), antérieure à cette ADR de 10 jours.
- [`taches-restantes.md`](../architecture/taches-restantes.md), ROAD-3a — suivi d'exécution.
- `codemod-strip-redundant-component-flags.mjs` — précédent de codemod à grande échelle dans ce dépôt (105 composants corrigés d'un coup), modèle pour Q-2/Q-3.
